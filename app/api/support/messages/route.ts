import { SupportQueue, SupportThreadStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

const messageSchema = z.object({
  body: z.string().trim().min(2).max(3000),
  queue: z.nativeEnum(SupportQueue).optional(),
  subject: z.string().trim().max(160).optional()
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы написать в поддержку." : "Sign in to message support."
      },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    key: `support:message:${userId}`,
    limit: 30,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте сообщение" : "Check the message",
        message: localeRu ? "Напишите сообщение от 2 до 3000 символов." : "Write a message between 2 and 3000 characters."
      },
      { status: 400 }
    );
  }

  const openThread = await prisma.supportThread.findFirst({
    where: {
      userId,
      status: { not: SupportThreadStatus.CLOSED }
    },
    orderBy: { updatedAt: "desc" }
  });

  const thread = await prisma.$transaction(async (tx) => {
    const supportThread =
      openThread ??
      (await tx.supportThread.create({
        data: {
          queue: parsed.data.queue ?? SupportQueue.TECH_SUPPORT,
          userId,
          subject: parsed.data.subject || (localeRu ? "Обращение участника" : "Participant request")
        }
      }));

    await tx.supportMessage.create({
      data: {
        threadId: supportThread.id,
        senderId: userId,
        body: parsed.data.body
      }
    });

    await tx.supportThread.update({
      where: { id: supportThread.id },
      data: {
        lastCustomerMessageAt: new Date(),
        status: SupportThreadStatus.OPEN,
        subject: parsed.data.subject || supportThread.subject
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: userId,
        action: "support.message.user",
        entityType: "SupportThread",
        entityId: supportThread.id,
        payload: {
          queue: supportThread.queue,
          subject: parsed.data.subject || supportThread.subject
        }
      }
    });

    return supportThread;
  });

  return NextResponse.json({
    title: localeRu ? "Сообщение отправлено" : "Message sent",
    message: localeRu ? "Команда Qidra увидит обращение в панели коммуникаций." : "The Qidra team will see it in the communications panel.",
    threadId: thread.id
  });
}
