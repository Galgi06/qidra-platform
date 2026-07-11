import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail, getAppBaseUrl } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createRawToken, expiresIn, hashToken } from "@/lib/tokens";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(255)
});

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте email" : "Check email",
        message: localeRu ? "Введите корректный электронный адрес." : "Enter a valid email address."
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimit = checkRateLimit({
    key: `auth:forgot-password:${email}`,
    limit: 4,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
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
          identifier,
          token: hashToken(rawToken),
          expires: expiresIn(2)
        }
      })
    ]);

    await sendEmail({
      to: email,
      subject: localeRu ? "Восстановление пароля Qidra" : "Reset your Qidra password",
      text: localeRu
        ? `Вы запросили сброс пароля на платформе Qidra. Чтобы задать новый пароль, перейдите по ссылке: ${resetUrl.toString()} Ссылка действует 2 часа. Если это действие совершали не вы, срочно смените пароль после входа в аккаунт или проигнорируйте и удалите это письмо.`
        : `You requested a password reset on the Qidra platform. To set a new password, follow this link: ${resetUrl.toString()} The link is valid for 2 hours. If you did not request this action, change your password immediately after signing in or ignore and delete this email.`,
      html: localeRu
        ? `<p>Вы запросили сброс пароля на платформе <strong>Qidra</strong>.</p><p><a href="${resetUrl.toString()}">Восстановить пароль</a></p><p>Ссылка действует 2 часа.</p><p>Если это действие совершали не вы, срочно смените пароль после входа в аккаунт или удалите это письмо.</p>`
        : `<p>You requested a password reset on the <strong>Qidra</strong> platform.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>The link is valid for 2 hours.</p><p>If you did not request this action, change your password immediately after signing in or delete this email.</p>`
    });
  }

  return NextResponse.json({
    title: localeRu ? "Ссылка отправлена" : "Reset link sent",
    message: localeRu ? "Проверьте электронную почту и перейдите по ссылке для восстановления пароля." : "Check your email and follow the link to reset your password."
  });
}
