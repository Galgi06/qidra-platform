import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canManageManagers } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { isUserBlocked, userBlockMode } from "@/lib/user-access";

const blockSchema = z.object({
  blockedUntil: z.string().trim().optional(),
  confirmation: z.string().trim(),
  mode: z.enum(["temporary", "permanent", "unblock"]),
  reason: z.string().trim().min(12).max(800)
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

function parseBlockedUntil(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canManageManagers(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Блокировать и разблокировать пользователей может только главный администратор." : "Only a super administrator can block and unblock users."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;

  if (userId === session?.user?.id) {
    return NextResponse.json(
      {
        title: localeRu ? "Нельзя заблокировать себя" : "Cannot block yourself",
        message: localeRu ? "Для безопасности блокировка собственного аккаунта запрещена." : "For safety, blocking your own account is not allowed."
      },
      { status: 400 }
    );
  }

  const parsed = blockSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Выберите режим, укажите причину не короче 12 символов и подтверждение CONFIRM."
            : "Choose a mode, provide a reason of at least 12 characters and the CONFIRM confirmation."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы изменить доступ пользователя." : "Enter CONFIRM to change the user's access."
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

  const now = new Date();
  const previousMode = userBlockMode(user, now);
  const nextMode = parsed.data.mode;
  const blockedUntil = nextMode === "temporary" ? parseBlockedUntil(parsed.data.blockedUntil) : null;

  if (nextMode === "temporary" && (!blockedUntil || blockedUntil <= now)) {
    return NextResponse.json(
      {
        title: localeRu ? "Укажите будущую дату" : "Choose a future date",
        message: localeRu ? "Для временной блокировки нужно указать дату и время окончания в будущем." : "Temporary blocking requires a future end date and time."
      },
      { status: 400 }
    );
  }

  if (nextMode === "unblock" && previousMode === "active") {
    return NextResponse.json(
      {
        title: localeRu ? "Пользователь уже активен" : "User is already active",
        message: localeRu ? "У этого пользователя сейчас нет активной блокировки." : "This user does not currently have an active block."
      },
      { status: 409 }
    );
  }

  if (nextMode !== "unblock" && user.role === Role.SUPER_ADMIN && previousMode === "active") {
    const activeSuperAdminCount = await prisma.user.count({
      where: {
        role: Role.SUPER_ADMIN,
        OR: [{ blockedAt: null }, { blockedUntil: { lt: now } }]
      }
    });

    if (activeSuperAdminCount <= 1) {
      return NextResponse.json(
        {
          title: localeRu ? "Нельзя заблокировать последнего главного админа" : "Cannot block the last super admin",
          message:
            localeRu
              ? "Сначала назначьте другого активного главного администратора, затем блокируйте этот аккаунт."
              : "Assign another active super administrator first, then block this account."
        },
        { status: 409 }
      );
    }
  }

  const action =
    nextMode === "unblock"
      ? "user.block.unblock"
      : nextMode === "temporary"
        ? "user.block.temporary"
        : "user.block.permanent";

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:
        nextMode === "unblock"
          ? {
              blockReason: null,
              blockedAt: null,
              blockedById: null,
              blockedUntil: null
            }
          : {
              blockReason: parsed.data.reason,
              blockedAt: now,
              blockedById: session?.user?.id,
              blockedUntil
            }
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action,
        entityType: "User",
        entityId: user.id,
        payload: {
          blockedUntil: blockedUntil?.toISOString() ?? null,
          from: previousMode,
          reason: parsed.data.reason,
          targetEmail: user.email,
          to: nextMode
        }
      }
    })
  ]);

  return NextResponse.json({
    title: nextMode === "unblock" ? (localeRu ? "Пользователь разблокирован" : "User unblocked") : localeRu ? "Пользователь заблокирован" : "User blocked",
    message:
      nextMode === "unblock"
        ? localeRu
          ? "Доступ пользователя восстановлен. Действие записано в журнал."
          : "The user's access was restored. The action was written to the audit log."
        : localeRu
          ? "Доступ пользователя ограничен. Действие записано в журнал."
          : "The user's access was restricted. The action was written to the audit log."
  });
}
