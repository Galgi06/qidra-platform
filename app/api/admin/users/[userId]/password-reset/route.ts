import { KycStatus } from "@prisma/client";
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
  identityCheck: z.enum(["KYC_DOCUMENTS_MATCH", "KYC_DOCUMENTS_MISMATCH"]),
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

  const approvedKyc = user.kycApplications.find((application) => application.status === KycStatus.APPROVED);

  if (!approvedKyc) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет подтверждённого KYC" : "No approved KYC",
        message:
          localeRu
            ? "Ссылка восстановления через поддержку доступна только после подтверждённой KYC-анкеты клиента."
            : "Support-assisted recovery links are available only after the client's KYC profile has been approved."
      },
      { status: 409 }
    );
  }

  if (parsed.data.identityCheck === "KYC_DOCUMENTS_MISMATCH") {
    await prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "user.password_reset.identity_mismatch",
        entityId: user.id,
        entityType: "User",
        payload: {
          identityCheck: parsed.data.identityCheck,
          kycApplicationId: approvedKyc.id,
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
      },
      { status: 409 }
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
      ? `Команда Qidra отправила ссылку восстановления доступа после проверки личности. Перейдите по ссылке и задайте новый пароль: ${resetUrl.toString()}`
      : `The Qidra team sent an access recovery link after identity verification. Follow this link and set a new password: ${resetUrl.toString()}`,
    html: localeRu
      ? `<p>Команда Qidra отправила ссылку восстановления доступа после проверки личности.</p><p><a href="${resetUrl.toString()}">Задать новый пароль</a></p><p>Ссылка действует 2 часа.</p>`
      : `<p>The Qidra team sent an access recovery link after identity verification.</p><p><a href="${resetUrl.toString()}">Set a new password</a></p><p>The link is valid for 2 hours.</p>`
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "user.password_reset.link_sent",
      entityId: user.id,
      entityType: "User",
      payload: {
        identityCheck: parsed.data.identityCheck,
        kycApplicationId: approvedKyc.id,
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
