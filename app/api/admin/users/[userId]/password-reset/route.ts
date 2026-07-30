import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessSupportDesk } from "@/lib/auth";
import { getAppBaseUrl, sendEmail } from "@/lib/email";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { createRawToken, expiresIn, hashToken } from "@/lib/tokens";

const accessRecoverySchema = z.object({
  confirmation: z.string().trim(),
  identityCheck: z.enum(["CLIENT_IDENTITY_CONFIRMED", "CLIENT_IDENTITY_REJECTED"]),
  reason: z.string().trim().min(12).max(800)
});

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessSupportDesk(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Восстановление доступа через поддержку доступно только сотрудникам Qidra." : "Support-assisted access recovery is only available to Qidra staff."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;
  const parsed = accessRecoverySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Укажите причину, подтвердите сверку документов KYC и введите CONFIRM."
            : "Provide a reason, confirm the KYC document match and enter CONFIRM."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы отправить клиенту ссылку восстановления." : "Enter CONFIRM to send the recovery link to the client."
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kycApplications: {
        orderBy: { createdAt: "desc" },
        take: 5
      }
    }
  });

  if (!user) {
    return NextResponse.json(
      {
        title: localeRu ? "Клиент не найден" : "Client not found",
        message: localeRu ? "Обновите страницу и выберите клиента из списка." : "Refresh the page and choose the client from the list."
      },
      { status: 404 }
    );
  }

  const referenceKyc = user.kycApplications[0];

  if (parsed.data.identityCheck === "CLIENT_IDENTITY_REJECTED") {
    await prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "user.password_reset.identity_mismatch",
        entityId: user.id,
        entityType: "User",
        payload: {
          identityCheck: parsed.data.identityCheck,
          kycApplicationId: referenceKyc?.id,
          reason: parsed.data.reason,
          targetEmail: user.email
        }
      }
    });

    return NextResponse.json(
      {
        title: localeRu ? "Документы не совпадают" : "Documents do not match",
        message:
          localeRu
            ? "Ссылка восстановления не отправлена. Событие зафиксировано в журнале действий клиента."
            : "The recovery link was not sent. The event was recorded in the client's audit log.",
        tone: "warning"
      }
    );
  }

  const email = user.email.toLowerCase();
  const rawToken = createRawToken();
  const identifier = `password-reset:${email}`;
  const resetUrl = new URL("/auth/reset-password", getAppBaseUrl());
  resetUrl.searchParams.set("email", email);
  resetUrl.searchParams.set("token", rawToken);
  resetUrl.searchParams.set("lang", localeRu ? "ru" : "en");

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: {
        expires: expiresIn(2),
        identifier,
        token: hashToken(rawToken)
      }
    })
  ]);

  await sendEmail({
    to: email,
    subject: localeRu ? "Восстановление доступа Qidra" : "Qidra access recovery",
    text: localeRu
      ? `Команда Qidra.io отправила вам ссылку для восстановления доступа после проверки личности.\n\nЧтобы задать новый пароль, перейдите по ссылке:\n${resetUrl.toString()}\n\nСсылка действует 2 часа и работает только для последнего запроса на восстановление.\n\nЕсли вы не запрашивали восстановление доступа, не переходите по ссылке. Просто удалите это письмо и при необходимости свяжитесь со службой поддержки Qidra.io.`
      : `The Qidra.io team sent you an access recovery link after identity verification.\n\nTo set a new password, follow this link:\n${resetUrl.toString()}\n\nThe link is valid for 2 hours and only works for the latest recovery request.\n\nIf you did not request access recovery, do not use this link. You can safely delete this email and contact Qidra.io support if needed.`,
    html: localeRu
      ? `<p>Команда <a href="https://qidra.io"><strong>Qidra.io</strong></a> отправила вам ссылку для восстановления доступа после проверки личности.</p><p><a href="${resetUrl.toString()}">Задать новый пароль</a></p><p>Ссылка действует 2 часа и работает только для последнего запроса на восстановление.</p><p>Если вы не запрашивали восстановление доступа, не переходите по ссылке. Просто удалите это письмо и при необходимости свяжитесь со службой поддержки Qidra.io.</p>`
      : `<p>The <a href="https://qidra.io"><strong>Qidra.io</strong></a> team sent you an access recovery link after identity verification.</p><p><a href="${resetUrl.toString()}">Set a new password</a></p><p>The link is valid for 2 hours and only works for the latest recovery request.</p><p>If you did not request access recovery, do not use this link. You can safely delete this email and contact Qidra.io support if needed.</p>`
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "user.password_reset.link_sent",
      entityId: user.id,
      entityType: "User",
      payload: {
        identityCheck: parsed.data.identityCheck,
        kycApplicationId: referenceKyc?.id,
        reason: parsed.data.reason,
        targetEmail: user.email,
        tokenExpiresInHours: 2
      }
    }
  });

  return NextResponse.json({
    title: localeRu ? "Ссылка отправлена" : "Recovery link sent",
    message:
      localeRu
        ? "Клиенту отправлена одноразовая ссылка восстановления. Действие записано в журнал."
        : "A one-time recovery link was sent to the client. The action was written to the audit log.",
    tone: "success"
  });
}
