import { SupportQueue, SupportThreadStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { saveSupportAttachment, supportAttachmentConstraints, validateSupportAttachment } from "@/lib/support-attachments";

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

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readUploadedFiles(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is File => value instanceof File && value.size > 0);
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

  const contentType = request.headers.get("content-type") || "";
  const formData = contentType.includes("multipart/form-data") ? await request.formData() : null;
  const payloadSource = formData
    ? {
        body: readText(formData, "body"),
        queue: readText(formData, "queue") || undefined,
        subject: readText(formData, "subject") || undefined
      }
    : await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(payloadSource);

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте сообщение" : "Check the message",
        message: localeRu ? "Напишите сообщение от 2 до 3000 символов." : "Write a message between 2 and 3000 characters."
      },
      { status: 400 }
    );
  }

  const uploads = formData ? readUploadedFiles(formData, "attachments") : [];
  const { maxCount } = supportAttachmentConstraints();

  if (uploads.length > maxCount) {
    return NextResponse.json(
      {
        title: localeRu ? "Слишком много файлов" : "Too many files",
        message: localeRu ? `Можно прикрепить до ${maxCount} файлов к одному сообщению.` : `You can attach up to ${maxCount} files to one message.`
      },
      { status: 400 }
    );
  }

  for (const file of uploads) {
    const error = validateSupportAttachment(file);

    if (error) {
      return NextResponse.json(
        {
          title: localeRu ? "Проверьте вложения" : "Check attachments",
          message:
            error === "size"
              ? localeRu
                ? "Каждый файл должен быть не больше 12 МБ."
                : "Each file must be no larger than 12 MB."
              : localeRu
                ? "Поддерживаются PDF, DOC, DOCX, JPG, PNG, WEBP и TXT."
                : "Supported formats are PDF, DOC, DOCX, JPG, PNG, WEBP and TXT."
        },
        { status: 400 }
      );
    }
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

    const attachments = uploads.length ? await Promise.all(uploads.map((file) => saveSupportAttachment(file, userId))) : [];

    await tx.supportMessage.create({
      data: {
        threadId: supportThread.id,
        senderId: userId,
        body: parsed.data.body,
        attachments: attachments.length ? attachments : undefined
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
