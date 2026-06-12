import { OrganizationMemberRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAppBaseUrl, sendEmail } from "@/lib/email";
import { createRawToken } from "@/lib/tokens";
import { canManageCompanyTeam } from "@/lib/organizations";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  email: z.string().trim().email().max(255),
  name: z.string().trim().max(120).optional(),
  role: z.nativeEnum(OrganizationMemberRole)
});

const inviteActionSchema = z.object({
  action: z.enum(["resend", "cancel"]),
  inviteId: z.string().trim().min(2).max(120)
});

type SessionUser = { user?: { id?: string } };

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ title: localeRu ? "Нужен вход" : "Sign in required", message: localeRu ? "Войдите в кабинет компании." : "Sign in to the company workspace." }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true }
  });

  if (!membership || !canManageCompanyTeam(membership.role)) {
    return NextResponse.json({ title: localeRu ? "Нет доступа" : "Access denied", message: localeRu ? "Только owner или admin могут управлять командой." : "Only owner or admin can manage the team." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const inviteAction = inviteActionSchema.safeParse(body);

  if (inviteAction.success) {
    const invite = await prisma.organizationInvite.findFirst({
      where: {
        id: inviteAction.data.inviteId,
        organizationId: membership.organizationId
      }
    });

    if (!invite || invite.acceptedAt) {
      return NextResponse.json({
        title: localeRu ? "Приглашение не найдено" : "Invitation not found",
        message: localeRu ? "Это приглашение уже недоступно." : "This invitation is no longer available."
      }, { status: 404 });
    }

    if (inviteAction.data.action === "cancel") {
      await prisma.organizationInvite.delete({ where: { id: invite.id } });

      return NextResponse.json({
        title: localeRu ? "Приглашение отменено" : "Invitation cancelled",
        message: localeRu ? "Ссылка приглашения отключена." : "The invitation link was disabled."
      });
    }

    const nextToken = createRawToken();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const refreshedInvite = await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: {
        expiresAt,
        token: nextToken
      }
    });

    const inviteUrl = new URL("/auth/sign-up", getAppBaseUrl());
    inviteUrl.searchParams.set("account", "company");
    inviteUrl.searchParams.set("invite", refreshedInvite.token);
    inviteUrl.searchParams.set("lang", localeRu ? "ru" : "en");

    await sendEmail({
      to: refreshedInvite.email,
      subject: localeRu ? `Повторное приглашение в команду ${membership.organization.displayName} на Qidra` : `Renewed invitation to join ${membership.organization.displayName} on Qidra`,
      text: localeRu
        ? `Вам повторно отправлено приглашение в кабинет компании ${membership.organization.displayName} на Qidra с ролью ${refreshedInvite.role}. Новая ссылка: ${inviteUrl.toString()}`
        : `Your invitation to the ${membership.organization.displayName} company workspace on Qidra was renewed with the role ${refreshedInvite.role}. New link: ${inviteUrl.toString()}`,
      html: localeRu
        ? `<p>Приглашение в кабинет компании <strong>${membership.organization.displayName}</strong> обновлено.</p><p>Роль: <strong>${refreshedInvite.role}</strong></p><p><a href="${inviteUrl.toString()}">Открыть приглашение</a></p>`
        : `<p>Your invitation to the <strong>${membership.organization.displayName}</strong> company workspace was renewed.</p><p>Role: <strong>${refreshedInvite.role}</strong></p><p><a href="${inviteUrl.toString()}">Open invitation</a></p>`
    });

    return NextResponse.json({
      title: localeRu ? "Приглашение отправлено повторно" : "Invitation resent",
      message: localeRu ? "Мы обновили ссылку и повторно отправили email сотруднику." : "The link was refreshed and the email was sent again."
    });
  }

  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ title: localeRu ? "Проверьте данные" : "Check the details", message: localeRu ? "Укажите email участника и роль внутри компании." : "Provide the teammate email and role inside the company." }, { status: 400 });
  }

  if (parsed.data.role === OrganizationMemberRole.OWNER) {
    return NextResponse.json({ title: localeRu ? "Роль недоступна" : "Role unavailable", message: localeRu ? "Новых owner через эту форму назначать нельзя." : "You cannot assign a new owner through this form." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: membership.organizationId,
          userId: existingUser.id
        }
      },
      update: { role: parsed.data.role },
      create: {
        organizationId: membership.organizationId,
        role: parsed.data.role,
        userId: existingUser.id
      }
    });

    return NextResponse.json({
      title: localeRu ? "Участник добавлен" : "Teammate added",
      message: localeRu ? "Пользователь уже был в Qidra и сразу получил доступ к кабинету компании." : "This user already existed in Qidra and now has immediate access to the company workspace."
    });
  }

  const existingInvite = await prisma.organizationInvite.findFirst({
    where: {
      acceptedAt: null,
      email,
      organizationId: membership.organizationId
    }
  });

  if (existingInvite && existingInvite.expiresAt > new Date()) {
    return NextResponse.json({
      title: localeRu ? "Приглашение уже отправлено" : "Invitation already created",
      message: localeRu ? "У этого email уже есть активное приглашение в компанию." : "This email already has an active invitation to the company."
    });
  }

  await prisma.organizationInvite.create({
    data: {
      email,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      invitedById: userId,
      name: parsed.data.name?.trim() || null,
      organizationId: membership.organizationId,
      role: parsed.data.role,
      token: createRawToken()
    }
  }).then(async (invite) => {
    const inviteUrl = new URL("/auth/sign-up", getAppBaseUrl());
    inviteUrl.searchParams.set("account", "company");
    inviteUrl.searchParams.set("invite", invite.token);
    inviteUrl.searchParams.set("lang", localeRu ? "ru" : "en");

    await sendEmail({
      to: email,
      subject: localeRu ? `Приглашение в команду ${membership.organization.displayName} на Qidra` : `Invitation to join ${membership.organization.displayName} on Qidra`,
      text: localeRu
        ? `Вас пригласили в кабинет компании ${membership.organization.displayName} на Qidra с ролью ${parsed.data.role}. Ссылка для входа и регистрации: ${inviteUrl.toString()}`
        : `You were invited to the ${membership.organization.displayName} company workspace on Qidra with the role ${parsed.data.role}. Use this registration link: ${inviteUrl.toString()}`,
      html: localeRu
        ? `<p>Вас пригласили в кабинет компании <strong>${membership.organization.displayName}</strong> на Qidra.</p><p>Роль: <strong>${parsed.data.role}</strong></p><p><a href="${inviteUrl.toString()}">Открыть приглашение</a></p>`
        : `<p>You were invited to the <strong>${membership.organization.displayName}</strong> company workspace on Qidra.</p><p>Role: <strong>${parsed.data.role}</strong></p><p><a href="${inviteUrl.toString()}">Open invitation</a></p>`
    });
  });

  return NextResponse.json({
    title: localeRu ? "Приглашение создано" : "Invitation created",
    message: localeRu ? "Приглашение создано и отправлено на email сотрудника." : "The invitation was created and emailed to the teammate."
  });
}
