import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canManageManagers } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const roleSchema = z.object({
  confirmation: z.string().trim(),
  reason: z.string().trim().min(12).max(600),
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
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Выберите роль, укажите причину не короче 12 символов и подтверждение CONFIRM."
            : "Choose a role, provide a reason of at least 12 characters and the CONFIRM confirmation."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы изменить роль пользователя." : "Enter CONFIRM to change the user's role."
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

  if (user.role === parsed.data.role) {
    return NextResponse.json(
      {
        title: localeRu ? "Роль уже установлена" : "Role already set",
        message: localeRu ? "Пользователь уже находится в выбранной роли." : "The user already has the selected role."
      },
      { status: 409 }
    );
  }

  if (user.role === Role.SUPER_ADMIN && parsed.data.role !== Role.SUPER_ADMIN) {
    const superAdminCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });

    if (superAdminCount <= 1) {
      return NextResponse.json(
        {
          title: localeRu ? "Нельзя убрать последнего главного админа" : "Cannot remove the last super admin",
          message:
            localeRu
              ? "Сначала назначьте другого главного администратора, затем измените роль этого пользователя."
              : "Assign another super administrator first, then change this user's role."
        },
        { status: 409 }
      );
    }
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
          reason: parsed.data.reason,
          targetEmail: user.email,
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
