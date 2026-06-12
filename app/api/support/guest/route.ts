import { randomBytes } from "node:crypto";
import { SupportQueue, SupportThreadStatus } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { notifySupportTeamAboutGuestMessage } from "@/lib/support-alerts";

const guestCreateSchema = z.object({
  body: z.string().trim().min(2).max(3000),
  contact: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(160),
  name: z.string().trim().min(2).max(160),
  queue: z.nativeEnum(SupportQueue).default(SupportQueue.TECH_SUPPORT),
  subject: z.string().trim().max(160).optional(),
  token: z.string().trim().min(12).max(200).optional()
});

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function GET(request: NextRequest) {
  const localeRu = isRu(request);
  const token = request.nextUrl.searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен токен чата" : "Chat token required",
        message: localeRu ? "Откройте чат из того же браузера или начните новый диалог." : "Open the chat from the same browser or start a new conversation."
      },
      { status: 400 }
    );
  }

  const thread = await prisma.guestSupportThread.findUnique({
    where: { publicToken: token },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50
      }
    }
  });

  if (!thread) {
    return NextResponse.json(
      {
        title: localeRu ? "Чат не найден" : "Chat not found",
        message: localeRu ? "Начните новый диалог поддержки." : "Start a new support conversation."
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    thread: {
      contact: thread.contact,
      email: thread.email,
      messages: thread.messages.map((message) => ({
        body: message.body,
        createdAt: message.createdAt.toISOString(),
        id: message.id,
        senderKind: message.senderKind,
        senderName: message.senderName
      })),
      name: thread.name,
      queue: thread.queue,
      status: thread.status,
      subject: thread.subject,
      token: thread.publicToken
    }
  });
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const ipKey = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "guest";
  const rateLimit = checkRateLimit({
    key: `support:guest:${ipKey}`,
    limit: 20,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const parsed = guestCreateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the details",
        message: localeRu ? "Введите имя, email и сообщение." : "Enter your name, email and message."
      },
      { status: 400 }
    );
  }

  const token = parsed.data.token;
  const existingThread = token ? await prisma.guestSupportThread.findUnique({ where: { publicToken: token } }) : null;

  if (token && !existingThread) {
    return NextResponse.json(
      {
        clearToken: true,
        title: localeRu ? "Чат завершён" : "Chat expired",
        message: localeRu ? "Начните новый диалог, чтобы связаться с поддержкой." : "Start a new conversation to contact support."
      },
      { status: 404 }
    );
  }

  const now = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const thread =
      existingThread ??
      (await tx.guestSupportThread.create({
        data: {
          contact: parsed.data.contact || null,
          email: parsed.data.email,
          lastGuestMessageAt: now,
          name: parsed.data.name,
          publicToken: randomBytes(24).toString("hex"),
          queue: parsed.data.queue,
          subject: parsed.data.subject || (localeRu ? "Гостевое обращение" : "Guest support request")
        }
      }));

    await tx.guestSupportMessage.create({
      data: {
        body: parsed.data.body,
        senderKind: "guest",
        senderName: parsed.data.name,
        threadId: thread.id
      }
    });

    const updatedThread = await tx.guestSupportThread.update({
      where: { id: thread.id },
      data: {
        contact: parsed.data.contact || thread.contact,
        email: parsed.data.email,
        lastGuestMessageAt: now,
        name: parsed.data.name,
        queue: existingThread ? thread.queue : parsed.data.queue,
        status: SupportThreadStatus.OPEN,
        subject: parsed.data.subject || thread.subject,
        updatedAt: now
      }
    });

    await tx.adminAuditLog.create({
      data: {
        action: "support.message.guest",
        entityId: updatedThread.id,
        entityType: "GuestSupportThread",
        payload: {
          email: updatedThread.email,
          queue: updatedThread.queue,
          subject: updatedThread.subject
        }
      }
    });

    return updatedThread;
  });

  await notifySupportTeamAboutGuestMessage(prisma, {
    guestEmail: created.email,
    guestName: created.name,
    message: parsed.data.body,
    queueLabel: created.queue === SupportQueue.SALES ? "Sales / projects" : "Technical support",
    subject: created.subject || (localeRu ? "Гостевое обращение" : "Guest support request"),
    threadId: created.id
  });

  const thread = await prisma.guestSupportThread.findUnique({
    where: { id: created.id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50
      }
    }
  });

  return NextResponse.json({
    message: localeRu ? "Сообщение отправлено. Менеджер увидит его в панели поддержки." : "Message sent. A manager will see it in the support panel.",
    thread: thread
      ? {
          contact: thread.contact,
          email: thread.email,
          messages: thread.messages.map((message) => ({
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            id: message.id,
            senderKind: message.senderKind,
            senderName: message.senderName
          })),
          name: thread.name,
          queue: thread.queue,
          status: thread.status,
          subject: thread.subject,
          token: thread.publicToken
        }
      : null,
    title: localeRu ? "Сообщение отправлено" : "Message sent"
  });
}
