import { Role, SupportQueue, SupportThreadStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessSupportDesk } from "@/lib/auth";
import { getAppBaseUrl, sendEmail } from "@/lib/email";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { notifyGuestAboutManagerReply } from "@/lib/support-alerts";

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
    queue: z.nativeEnum(SupportQueue),
    status: z.nativeEnum(SupportThreadStatus)
  })
]);

type SessionUser = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
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

  const thread = await prisma.guestSupportThread.findUnique({
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

      await tx.guestSupportThread.update({
        where: { id: threadId },
        data: {
          assignedToId,
          closedAt: data.status === SupportThreadStatus.CLOSED ? now : null,
          queue: data.queue,
          status: data.status
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorId: session?.user?.id,
          action: "support.guest.update",
          entityType: "GuestSupportThread",
          entityId: threadId,
          payload: {
            assignedToId,
            queue: data.queue,
            status: data.status
          }
        }
      });
    });

    return NextResponse.json({
      title: localeRu ? "Диалог обновлён" : "Thread updated",
      message: localeRu ? "Ответственный и статус сохранены." : "Owner and status were saved."
    });
  }

  const data = parsed.data;

  try {
    const authorName = session?.user?.name || session?.user?.email || "Qidra";
    const createdMessage = await prisma.$transaction(async (tx) => {
      const now = new Date();

      const updatedThread = await tx.guestSupportThread.update({
        where: { id: threadId },
        data: {
          closedAt: thread.status === SupportThreadStatus.CLOSED ? null : thread.closedAt,
          lastManagerMessageAt: now,
          messages: {
            create: {
              body: data.body,
              senderKind: "staff",
              senderName: authorName
            }
          },
          status: thread.status === SupportThreadStatus.CLOSED ? SupportThreadStatus.OPEN : SupportThreadStatus.PENDING
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      });

      const newMessage = updatedThread.messages[0];

      if (!newMessage) {
        throw new Error("Guest support reply message was not created.");
      }

      await tx.adminAuditLog.create({
        data: {
          actorId: session?.user?.id,
          action: "support.guest.reply",
          entityType: "GuestSupportThread",
          entityId: threadId,
          payload: {
            messageId: newMessage.id
          }
        }
      });

      return newMessage;
    });

    await notifyGuestAboutManagerReply({
      body: data.body,
      guestEmail: thread.email,
      guestName: thread.name,
      replyLinkToken: thread.publicToken
    }).catch(async () => {
      const fallbackText = [
        `Hello, ${thread.name || "there"}.`,
        "",
        data.body,
        "",
        `Continue the conversation: ${getAppBaseUrl()}/?supportToken=${encodeURIComponent(thread.publicToken)}`
      ].join("\n");

      await sendEmail({
        to: thread.email,
        subject: "Qidra support replied to your message",
        text: fallbackText
      }).catch(() => null);
    });

    return NextResponse.json({
      id: createdMessage.id,
      title: localeRu ? "Ответ отправлен" : "Reply sent",
      message: localeRu ? "Ответ добавлен в гостевой чат и продублирован на email клиента." : "The reply was added to the guest chat and copied to the guest email."
    });
  } catch (error) {
    console.error("guest_support_reply_failed", error);

    return NextResponse.json(
      {
        title: localeRu ? "Ответ не отправлен" : "Reply not sent",
        message: localeRu ? "Сообщение не было записано. Обновите страницу и попробуйте ещё раз." : "The message was not saved. Refresh the page and try again.",
        tone: "error"
      },
      { status: 500 }
    );
  }
}
