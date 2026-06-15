import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canManageManagers } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { isStrongPassword, passwordPolicyDescription } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";

const changePasswordSchema = z
  .object({
    confirmation: z.string().trim(),
    password: z.string().max(128).refine(isStrongPassword),
    passwordConfirm: z.string().max(128),
    reason: z.string().trim().min(12).max(800)
  })
  .superRefine((data, context) => {
    if (data.password !== data.passwordConfirm) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "password_mismatch",
        path: ["passwordConfirm"]
      });
    }
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

  if (!canManageManagers(session?.user?.role as Role | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Прямую смену пароля может выполнять только главный администратор." : "Only a super administrator can directly change a password."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;

  if (userId === session?.user?.id) {
    return NextResponse.json(
      {
        title: localeRu ? "Используйте личную смену пароля" : "Use your personal password change flow",
        message:
          localeRu
            ? "Для собственного аккаунта не используйте административную принудительную смену пароля."
            : "Do not use the administrative forced password change for your own account."
      },
      { status: 400 }
    );
  }

  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    const passwordMismatch = parsed.error.issues.some((issue) => issue.message === "password_mismatch");

    return NextResponse.json(
      {
        fieldErrors: passwordMismatch
          ? {
              passwordConfirm: localeRu ? "Пароли должны совпадать." : "Passwords must match."
            }
          : undefined,
        title: localeRu ? "Проверьте форму" : "Check the form",
        message: passwordMismatch
          ? localeRu
            ? "Подтверждение пароля не совпадает."
            : "Password confirmation does not match."
          : localeRu
            ? `Укажите новый пароль, причину и подтверждение CONFIRM. ${passwordPolicyDescription.ru}`
            : `Provide the new password, reason and CONFIRM confirmation. ${passwordPolicyDescription.en}`
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы сохранить новый пароль." : "Enter CONFIRM to save the new password."
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      id: true,
      role: true
    }
  });

  if (!user) {
    return NextResponse.json(
      {
        title: localeRu ? "Пользователь не найден" : "User not found",
        message: localeRu ? "Обновите страницу и выберите пользователя заново." : "Refresh the page and select the user again."
      },
      { status: 404 }
    );
  }

  if (user.role !== Role.INVESTOR) {
    return NextResponse.json(
      {
        title: localeRu ? "Недопустимая цель" : "Unsupported target",
        message: localeRu ? "Эта форма предназначена только для участников." : "This form is intended for participant accounts only."
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const resetIdentifier = `password-reset:${user.email.toLowerCase()}`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.verificationToken.deleteMany({ where: { identifier: resetIdentifier } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "user.password.force_change",
        entityId: user.id,
        entityType: "User",
        payload: {
          reason: parsed.data.reason,
          targetEmail: user.email,
          sessionsRevoked: true
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Пароль обновлён" : "Password updated",
    message:
      localeRu
        ? "Новый пароль сохранён, все активные сессии участника завершены, действие записано в журнал."
        : "The new password was saved, all active participant sessions were ended, and the action was written to the audit log.",
    tone: "success"
  });
}
