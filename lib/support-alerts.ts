import { Role, type PrismaClient } from "@prisma/client";
import { createUserNotification } from "@/lib/notifications";
import { getAppBaseUrl, sendEmail } from "@/lib/email";

const supportRecipientRoles = [Role.TECH_SUPPORT, Role.SALES_MANAGER, Role.ADMIN, Role.SUPER_ADMIN] as const;

type SupportAlertInput = {
  guestEmail: string;
  guestName: string;
  message: string;
  queueLabel: string;
  subject: string;
  threadId: string;
};

type GuestReplyEmailInput = {
  body: string;
  guestEmail: string;
  guestName: string;
  replyLinkToken: string;
};

type MemberSupportAlertInput = {
  category?: string;
  message: string;
  subject: string;
  threadId: string;
  userId: string;
};

export async function notifySupportTeamAboutMemberMessage(db: PrismaClient, input: MemberSupportAlertInput) {
  const safeSubject = sanitizeHeaderValue(input.subject);
  const [member, recipients] = await Promise.all([
    db.user.findUnique({ where: { id: input.userId }, select: { email: true, name: true } }),
    db.user.findMany({
      where: { role: { in: [...supportRecipientRoles] } },
      select: { email: true, id: true }
    })
  ]);

  if (recipients.length) {
    await Promise.all(
      recipients.map((recipient) =>
        createUserNotification(db, {
          bodyEn: `${member?.name || member?.email || "A participant"} sent a support message: ${safeSubject}.`,
          bodyRu: `${member?.name || member?.email || "Участник"} отправил обращение: ${safeSubject}.`,
          href: "/admin/support",
          titleEn: "New participant support request",
          titleRu: "Новое обращение участника",
          type: input.category === "financial" ? "financial_support" : "participant_support",
          userId: recipient.id
        })
      )
    );
  }

  const uniqueEmails = Array.from(new Set([...recipients.map((recipient) => recipient.email), ...readConfiguredAlertEmails()].filter(Boolean)));
  if (!uniqueEmails.length) return;

  const subject = `Qidra support: ${safeSubject}`;
  const text = [
    `Participant: ${member?.name || "Not specified"}`,
    `Email: ${member?.email || "Not specified"}`,
    `Category: ${input.category || "unclassified"}`,
    `Thread: ${input.threadId}`,
    "",
    input.message,
    "",
    `Open admin panel: ${getAppBaseUrl()}/admin/support`
  ].join("\n");

  await Promise.allSettled(uniqueEmails.map((email) => sendEmail({ to: email, subject, text })));
}

export async function notifySupportTeamAboutGuestMessage(db: PrismaClient, input: SupportAlertInput) {
  const safeSubject = sanitizeHeaderValue(input.subject);
  const recipients = await db.user.findMany({
    where: { role: { in: [...supportRecipientRoles] } },
    select: { email: true, id: true }
  });

  if (recipients.length) {
    await Promise.all(
      recipients.map((recipient) =>
        createUserNotification(db, {
          bodyEn: `${input.guestName} left a guest support message: ${safeSubject}.`,
          bodyRu: `${input.guestName} оставил гостевое обращение: ${safeSubject}.`,
          href: "/admin/support",
          titleEn: "New guest support request",
          titleRu: "Новое гостевое обращение",
          type: "guest_support",
          userId: recipient.id
        })
      )
    );
  }

  const uniqueEmails = Array.from(
    new Set(
      [
        ...recipients.map((recipient) => recipient.email),
        ...readConfiguredAlertEmails()
      ].filter(Boolean)
    )
  );

  if (uniqueEmails.length) {
    const subject = `Qidra guest support: ${safeSubject}`;
    const text = [
      `Guest: ${input.guestName}`,
      `Email: ${input.guestEmail}`,
      `Queue: ${input.queueLabel}`,
      `Thread: ${input.threadId}`,
      "",
      input.message,
      "",
      `Open admin panel: ${getAppBaseUrl()}/admin/support`
    ].join("\n");

    await Promise.allSettled(uniqueEmails.map((email) => sendEmail({ to: email, subject, text })));
  }

  await sendTelegramAlert([
    "New guest support message",
    `Guest: ${input.guestName}`,
    `Email: ${input.guestEmail}`,
    `Queue: ${input.queueLabel}`,
    `Subject: ${safeSubject}`,
    "",
    trimForTelegram(input.message),
    "",
    `${getAppBaseUrl()}/admin/support`
  ]);
}

export async function notifyGuestAboutManagerReply({ body, guestEmail, guestName, replyLinkToken }: GuestReplyEmailInput) {
  const replyLink = `${getAppBaseUrl()}/?supportToken=${encodeURIComponent(replyLinkToken)}`;
  const subject = "Qidra support replied to your message";
  const text = [
    `Hello, ${guestName || "there"}.`,
    "",
    "The Qidra support team replied to your guest chat.",
    "",
    body,
    "",
    `Continue the conversation: ${replyLink}`
  ].join("\n");

  await sendEmail({
    to: guestEmail,
    subject,
    text
  });
}

function readConfiguredAlertEmails() {
  return (process.env.SUPPORT_ALERT_EMAILS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim().slice(0, 160) || "Support request";
}

async function sendTelegramAlert(lines: string[]) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.SUPPORT_TELEGRAM_CHAT_ID;

  if (!token || !chatId) return;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n")
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST"
  }).catch(() => null);
}

function trimForTelegram(message: string) {
  if (message.length <= 1000) return message;
  return `${message.slice(0, 997)}...`;
}
