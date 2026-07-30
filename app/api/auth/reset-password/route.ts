import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStrongPassword, passwordPolicyDescription } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
  token: z.string().trim().min(20),
  password: z.string().max(128).refine(isStrongPassword),
  passwordConfirm: z.string().max(128)
}).superRefine((data, context) => {
  if (data.password !== data.passwordConfirm) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "password_mismatch",
      path: ["passwordConfirm"]
    });
  }
});

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function resetPasswordFieldErrors(localeRu: boolean, error: z.ZodError) {
  const fieldErrors = error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const nextFieldErrors: Record<string, string> = {};

  if (fieldErrors.password?.length) {
    nextFieldErrors.password = localeRu ? passwordPolicyDescription.ru : passwordPolicyDescription.en;
  }

  if (fieldErrors.passwordConfirm?.length) {
    nextFieldErrors.passwordConfirm =
      fieldErrors.passwordConfirm.some((message) => message === "password_mismatch")
        ? localeRu
          ? "Пароли должны совпадать."
          : "Passwords must match."
        : localeRu
          ? "Повторите пароль."
          : "Confirm the password.";
  }

  return Object.keys(nextFieldErrors).length ? nextFieldErrors : undefined;
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        fieldErrors: resetPasswordFieldErrors(localeRu, parsed.error),
        title: localeRu ? "Проверьте данные" : "Check the details",
        message: localeRu ? passwordPolicyDescription.ru : passwordPolicyDescription.en
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimit = checkRateLimit({
    key: `auth:reset-password:${email}`,
    limit: 8,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const tokenHash = hashToken(parsed.data.token);
  const identifier = `password-reset:${email}`;
  const verificationToken = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier,
        token: tokenHash
      }
    }
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return NextResponse.json(
      {
        title: localeRu ? "Ссылка недействительна" : "Invalid link",
        message: localeRu
          ? "Ссылка восстановления недействительна или уже была использована. Запросите новую ссылку и откройте только последнее письмо."
          : "The reset link is invalid or has already been used. Request a new link and open only the latest email."
      },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      emailVerified: true,
      id: true
    }
  });

  if (!existingUser) {
    return NextResponse.json(
      {
        title: localeRu ? "Аккаунт не найден" : "Account not found",
        message: localeRu ? "Запросите новую ссылку восстановления для существующего аккаунта." : "Request a new reset link for an existing account."
      },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        emailVerified: existingUser.emailVerified ?? new Date()
      }
    }),
    prisma.verificationToken.delete({
      where: { token: tokenHash }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Пароль обновлен" : "Password updated",
    message: localeRu ? "Теперь вы можете войти в Qidra с новым паролем." : "You can now sign in to Qidra with your new password."
  });
}
