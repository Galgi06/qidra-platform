import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail, getAppBaseUrl } from "@/lib/email";
import { prisma } from "@/lib/prisma";
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
        ? `Для восстановления пароля перейдите по ссылке: ${resetUrl.toString()}`
        : `To reset your password, follow this link: ${resetUrl.toString()}`,
      html: localeRu
        ? `<p>Для восстановления пароля перейдите по ссылке:</p><p><a href="${resetUrl.toString()}">Восстановить пароль</a></p>`
        : `<p>To reset your password, follow this link:</p><p><a href="${resetUrl.toString()}">Reset password</a></p>`
    });
  }

  return NextResponse.json({
    title: localeRu ? "Ссылка отправлена" : "Reset link sent",
    message: localeRu ? "Проверьте электронную почту и перейдите по ссылке для восстановления пароля." : "Check your email and follow the link to reset your password."
  });
}
