import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { createParticipantBroadcast, createUserNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";

const broadcastSchema = z.object({
  bodyEn: z.string().trim().min(5).max(3000).optional(),
  bodyRu: z.string().trim().min(5).max(3000),
  href: z.string().trim().max(300).optional(),
  recipientEmail: z.string().trim().email().optional().or(z.literal("")),
  scope: z.enum(["all_participants", "single_user"]).default("all_participants"),
  titleEn: z.string().trim().min(2).max(140).optional(),
  titleRu: z.string().trim().min(2).max(140)
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

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Рассылки может отправлять только администратор." : "Only an administrator can send broadcasts."
      },
      { status: 403 }
    );
  }

  const parsed = broadcastSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте рассылку" : "Check the broadcast",
        message: localeRu ? "Заполните заголовок и текст сообщения." : "Fill in the title and message text."
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const titleEn = data.titleEn || data.titleRu;
  const bodyEn = data.bodyEn || data.bodyRu;
  const href = data.href || "/investor";
  const actorId = session?.user?.id;

  if (data.scope === "single_user") {
    const recipient = await prisma.user.findUnique({
      where: { email: data.recipientEmail || "" },
      select: { id: true, role: true }
    });

    if (!recipient) {
      return NextResponse.json(
        {
          title: localeRu ? "Участник не найден" : "Participant not found",
          message: localeRu ? "Проверьте email получателя." : "Check the recipient email."
        },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await createUserNotification(tx, {
        actorId,
        bodyEn,
        bodyRu: data.bodyRu,
        href,
        titleEn,
        titleRu: data.titleRu,
        type: "admin_message",
        userId: recipient.id
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: "notification.admin.single",
          entityType: "Notification",
          entityId: recipient.id,
          payload: {
            href,
            recipientRole: recipient.role,
            titleRu: data.titleRu
          }
        }
      });
    });

    return NextResponse.json({
      title: localeRu ? "Сообщение отправлено" : "Message sent",
      message: localeRu ? "Уведомление добавлено в личный кабинет участника." : "The notification was added to the participant account."
    });
  }

  const sentCount = await prisma.$transaction(async (tx) => {
    const count = await createParticipantBroadcast(tx, {
      actorId,
      bodyEn,
      bodyRu: data.bodyRu,
      href,
      titleEn,
      titleRu: data.titleRu,
      type: "admin_broadcast"
    });

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "notification.admin.broadcast",
        entityType: "Notification",
        payload: {
          href,
          recipientRole: Role.INVESTOR,
          sentCount: count,
          titleRu: data.titleRu
        }
      }
    });

    return count;
  });

  return NextResponse.json({
    title: localeRu ? "Рассылка отправлена" : "Broadcast sent",
    message: localeRu ? `Сообщение добавлено в ${sentCount} личных кабинетов.` : `The message was added to ${sentCount} participant accounts.`
  });
}
