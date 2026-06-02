import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(255),
  token: z.string().min(20),
  password: z.string().min(8).max(128)
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
        message: localeRu ? "Пароль должен быть не короче 8 символов." : "The password must be at least 8 characters."
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
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
