import { Role, SupportThreadStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessSupportDesk } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const optionalAssigneeSchema = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().optional());

const supportActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("reply"),
    body: z.string().trim().min(2).max(3000)
  }),
  z.object({
    action: z.literal("update"),
    assignedToId: optionalAssigneeSchema,
    status: z.nativeEnum(SupportThreadStatus)
  })
]);

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessSupportDesk(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Коммуникации доступны администратору и назначенным менеджерам." : "Communications are available to administrators and assigned managers."
      },
      { status: 403 }
    );
  }

  const { threadId } = await params;
  const parsed = supportActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте форму" : "Check the form",
        message: localeRu ? "Напишите ответ от 2 до 3000 символов или отдельно обновите статус диалога." : "Write a reply between 2 and 3000 characters or update the thread status separately."
      },
      { status: 400 }
    );
  }

  const thread = await prisma.supportThread.findUnique({
    where: { id: threadId }
  });

  if (!thread) {
    return NextResponse.json(
      {
        title: localeRu ? "Диалог не найден" : "Thread not found",
        message: localeRu ? "Обновите страницу и выберите диалог из списка." : "Refresh the page and choose a thread from the list."
      },
      { status: 404 }
    );
  }

  const assignedToId = parsed.data.action === "update" ? parsed.data.assignedToId || null : null;

  if (assignedToId) {
    const assignee = await prisma.user.findFirst({
      where: {
        id: assignedToId,
        role: { in: [Role.TECH_SUPPORT, Role.SALES_MANAGER, Role.ADMIN, Role.SUPER_ADMIN] }
      },
      select: { id: true }
    });

    if (!assignee) {
      return NextResponse.json(
        {
          title: localeRu ? "Менеджер не найден" : "Manager not found",
          message: localeRu ? "Выберите менеджера из списка доступных сотрудников." : "Choose a manager from the available staff list."
        },
        { status: 400 }
      );
    }
  }

  if (parsed.data.action === "update") {
    const data = parsed.data;

    await prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.supportThread.update({
        where: { id: threadId },
        data: {
          assignedToId,
          closedAt: data.status === SupportThreadStatus.CLOSED ? now : null,
          status: data.status
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorId: session?.user?.id,
          action: "support.thread.update",
          entityType: "SupportThread",
          entityId: threadId,
          payload: {
            assignedToId,
            status: data.status
          }
        }
      });
    });

    return NextResponse.json({
      title: localeRu ? "Диалог обновлён" : "Thread updated",
      message: localeRu ? "Ответственный и статус сохранены в журнале действий." : "Owner and status were saved in the audit log."
    });
  }

  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.supportMessage.create({
      data: {
        threadId,
        senderId: session?.user?.id,
        body: data.body
      }
    });

    await tx.supportThread.update({
      where: { id: threadId },
      data: {
        lastManagerMessageAt: now,
        status: thread.status === SupportThreadStatus.CLOSED ? SupportThreadStatus.OPEN : thread.status
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "support.message.manager",
        entityType: "SupportThread",
        entityId: threadId,
        payload: {
          status: thread.status === SupportThreadStatus.CLOSED ? SupportThreadStatus.OPEN : thread.status
        }
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Ответ отправлен" : "Reply sent",
    message: localeRu ? "Диалог обновлён и сохранён в журнале действий." : "The thread was updated and recorded in the audit log."
  });
}
