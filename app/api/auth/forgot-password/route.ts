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
        ? `Вы запросили восстановление пароля для аккаунта на платформе Qidra.io.\n\nЧтобы задать новый пароль, перейдите по ссылке:\n${resetUrl.toString()}\n\nСсылка действует 2 часа и работает только для последнего запроса на восстановление пароля.\n\nЕсли вы не запрашивали восстановление пароля, не переходите по ссылке. Просто удалите это письмо. Если у вас есть основания полагать, что кто-то пытался получить доступ к аккаунту, свяжитесь со службой поддержки Qidra.io.`
        : `You requested a password reset for your account on Qidra.io.\n\nTo set a new password, follow this link:\n${resetUrl.toString()}\n\nThe link is valid for 2 hours and only works for the latest password reset request.\n\nIf you did not request a password reset, do not use this link. You can safely delete this email. If you believe someone tried to access your account, contact Qidra.io support.`,
      html: localeRu
        ? `<p>Вы запросили восстановление пароля для аккаунта на платформе <a href="https://qidra.io"><strong>Qidra.io</strong></a>.</p><p><a href="${resetUrl.toString()}">Перейти к восстановлению пароля</a></p><p>Ссылка действует 2 часа и работает только для последнего запроса на восстановление пароля.</p><p>Если вы не запрашивали восстановление пароля, не переходите по ссылке. Просто удалите это письмо. Если есть основания полагать, что кто-то пытался получить доступ к вашему аккаунту, свяжитесь со службой поддержки Qidra.io.</p>`
        : `<p>You requested a password reset for your account on <a href="https://qidra.io"><strong>Qidra.io</strong></a>.</p><p><a href="${resetUrl.toString()}">Reset password</a></p><p>The link is valid for 2 hours and only works for the latest password reset request.</p><p>If you did not request a password reset, do not use this link. You can safely delete this email. If you believe someone tried to access your account, contact Qidra.io support.</p>`
    });
  }

  return NextResponse.json({
    title: localeRu ? "Ссылка отправлена" : "Reset link sent",
    message: localeRu ? "Проверьте электронную почту и перейдите по ссылке для восстановления пароля." : "Check your email and follow the link to reset your password."
  });
}
