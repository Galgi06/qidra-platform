import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendEmail, getAppBaseUrl } from "@/lib/email";
import { isStrongPassword, passwordPolicyDescription } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { createRawToken, expiresIn, hashToken } from "@/lib/tokens";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  password: z.string().max(128).refine(isStrongPassword)
});

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const parsed = registerSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the details",
        message: localeRu
          ? `Заполните имя, корректный email и пароль. ${passwordPolicyDescription.ru}`
          : `Enter a name, valid email, and password. ${passwordPolicyDescription.en}`
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const rateLimit = checkRateLimit({
    key: `auth:register:${email}`,
    limit: 5,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser?.emailVerified) {
    return NextResponse.json(
      {
        title: localeRu ? "Аккаунт уже существует" : "Account already exists",
        message: localeRu ? "Пользователь с этим email уже зарегистрирован. Войдите или восстановите пароль." : "A user with this email is already registered. Sign in or reset your password."
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const identifier = `email-verify:${email}`;
  const verifyUrl = new URL("/auth/verify-email", getAppBaseUrl());
  verifyUrl.searchParams.set("email", email);
  verifyUrl.searchParams.set("token", rawToken);
  verifyUrl.searchParams.set("lang", localeRu ? "ru" : "en");

  await prisma.$transaction(async (tx) => {
    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name: parsed.data.name,
          passwordHash
        }
      });
    } else {
      await tx.user.create({
        data: {
          email,
          name: parsed.data.name,
          passwordHash,
          investorProfile: { create: {} },
          wallet: { create: {} }
        }
      });
    }

    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: {
        identifier,
        token: tokenHash,
        expires: expiresIn(24)
      }
    });
  });

  await sendEmail({
    to: email,
    subject: localeRu ? "Подтвердите email в Qidra" : "Confirm your Qidra email",
    text: localeRu
      ? `Регистрация в Qidra почти завершена. Подтвердите электронную почту по ссылке: ${verifyUrl.toString()}`
      : `Your Qidra registration is almost complete. Confirm your email using this link: ${verifyUrl.toString()}`,
    html: localeRu
      ? `<p>Регистрация в Qidra почти завершена.</p><p><a href="${verifyUrl.toString()}">Подтвердить электронную почту</a></p>`
      : `<p>Your Qidra registration is almost complete.</p><p><a href="${verifyUrl.toString()}">Confirm email</a></p>`
  });

  return NextResponse.json({
    title: localeRu ? "Регистрация прошла успешно" : "Registration successful",
    message: localeRu ? "Проверьте свой электронный адрес и подтвердите электронную почту по ссылке из письма." : "Check your email address and confirm your account using the link in the message."
  });
}
