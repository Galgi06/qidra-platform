import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canManageManagers } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const staffAccountSchema = z.object({
  confirmation: z.string().trim(),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(100),
  reason: z.string().trim().min(12).max(600),
  role: z.enum([Role.TECH_SUPPORT, Role.SALES_MANAGER, Role.ADMIN])
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

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canManageManagers(session?.user?.role as Role | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Создавать сотрудников может только главный администратор." : "Only a super administrator can create staff accounts."
      },
      { status: 403 }
    );
  }

  const parsed = staffAccountSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check details",
        message:
          localeRu
            ? "Укажите имя, email, роль, пароль минимум 8 символов, причину и подтверждение CONFIRM."
            : "Enter name, email, role, a password of at least 8 characters, reason and CONFIRM confirmation."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы создать аккаунт сотрудника." : "Enter CONFIRM to create a staff account."
      },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } });

  if (existingUser) {
    return NextResponse.json(
      {
        title: localeRu ? "Email уже используется" : "Email already exists",
        message: localeRu ? "Откройте карточку существующего пользователя и измените роль там." : "Open the existing user card and change the role there."
      },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: parsed.data.email,
        emailVerified: new Date(),
        name: parsed.data.name,
        passwordHash,
        role: parsed.data.role
      },
      select: {
        email: true,
        id: true,
        name: true,
        role: true
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "user.staff.create",
        entityId: user.id,
        entityType: "User",
        payload: {
          email: user.email,
          name: user.name,
          reason: parsed.data.reason,
          role: user.role
        }
      }
    });

    return user;
  });

  return NextResponse.json({
    title: localeRu ? "Сотрудник создан" : "Staff account created",
    message:
      localeRu
        ? `Аккаунт ${created.email} создан. Передайте сотруднику email и временный пароль безопасным способом.`
        : `Account ${created.email} was created. Share the email and temporary password with the staff member securely.`,
    userId: created.id
  });
}
