import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isStrongPassword, passwordPolicyDescription } from "@/lib/password-policy";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
  token: z.string().min(20),
  password: z.string().max(128).refine(isStrongPassword)
});

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
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
    where: { token: tokenHash }
  });

  if (!verificationToken || verificationToken.identifier !== identifier || verificationToken.expires < new Date()) {
    return NextResponse.json(
      {
        title: localeRu ? "Ссылка недействительна" : "Invalid link",
        message: localeRu ? "Запросите новую ссылку восстановления пароля." : "Request a new password reset link."
      },
      { status: 400 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: { passwordHash }
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
