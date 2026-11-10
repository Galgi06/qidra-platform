import { SupportThreadStatus } from "@prisma/client";
import { createUserNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getSiteContent } from "@/lib/site-content";
import { buildSupportBotReply, supportBotEnabled, type SupportBotReply } from "@/lib/support-bot.js";

type BotInput = {
  hasAttachments: boolean;
  locale: "en" | "ru";
  message: string;
  threadId: string;
};

export async function replyToMemberSupportMessage(input: BotInput & { userId: string }) {
  if (!supportBotEnabled()) return null;
  const reply = await prepareReply(input);

  await prisma.$transaction(async (tx) => {
    const created = await tx.supportMessage.create({
      data: { body: reply.body, threadId: input.threadId }
    });

    await tx.supportThread.update({
      where: { id: input.threadId },
      data: { status: SupportThreadStatus.OPEN }
    });

    await tx.adminAuditLog.create({
      data: {
        action: "support.bot.reply",
        entityId: input.threadId,
        entityType: "SupportThread",
        payload: { category: reply.category, escalate: reply.escalate, messageId: created.id }
      }
    });

    await createUserNotification(tx, {
      bodyEn: "Qidra Assistant replied in your support thread.",
      bodyRu: "Qidra Assistant ответил в вашем обращении поддержки.",
      href: "/investor/support",
      titleEn: "Support reply",
      titleRu: "Ответ поддержки",
      type: "support_bot_reply",
      userId: input.userId
    });
  });

  return reply;
}

export async function replyToGuestSupportMessage(input: BotInput) {
  if (!supportBotEnabled()) return null;
  const reply = await prepareReply(input);

  await prisma.$transaction(async (tx) => {
    const created = await tx.guestSupportMessage.create({
      data: {
        body: reply.body,
        senderKind: "bot",
        senderName: "Qidra Assistant",
        threadId: input.threadId
      }
    });

    await tx.guestSupportThread.update({
      where: { id: input.threadId },
      data: { status: SupportThreadStatus.OPEN }
    });

    await tx.adminAuditLog.create({
      data: {
        action: "support.bot.reply",
        entityId: input.threadId,
        entityType: "GuestSupportThread",
        payload: { category: reply.category, escalate: reply.escalate, messageId: created.id }
      }
    });
  });

  return reply;
}

async function prepareReply(input: BotInput): Promise<SupportBotReply> {
  const content = await getSiteContent();
  return buildSupportBotReply({
    faqItems: content.faqItems,
    hasAttachments: input.hasAttachments,
    locale: input.locale,
    message: input.message
  });
}
