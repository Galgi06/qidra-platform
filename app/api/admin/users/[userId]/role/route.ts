import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canManageManagers } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const roleSchema = z.object({
  role: z.nativeEnum(Role)
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

  if (!canManageManagers(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Роли пользователей может менять только главный администратор." : "Only a super administrator can change user roles."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;

  if (userId === session?.user?.id) {
    return NextResponse.json(
      {
        title: localeRu ? "Нельзя изменить свою роль" : "Cannot change your own role",
        message: localeRu ? "Для безопасности измените роль другого пользователя." : "For safety, change another user's role instead."
      },
      { status: 400 }
    );
  }

  const parsed = roleSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте роль" : "Check role",
        message: localeRu ? "Выберите корректную роль пользователя." : "Choose a valid user role."
      },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return NextResponse.json(
      {
        title: localeRu ? "Пользователь не найден" : "User not found",
        message: localeRu ? "Обновите страницу и выберите пользователя из списка." : "Refresh the page and choose a user from the list."
      },
      { status: 404 }
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { role: parsed.data.role }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "user.role.update",
        entityType: "User",
        entityId: user.id,
        payload: {
          from: user.role,
          to: parsed.data.role
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Роль обновлена" : "Role updated",
    message: localeRu ? "Доступ пользователя обновлён и сохранён в журнале." : "The user's access was updated and saved in the audit log."
  });
}
