import { SupportThreadStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  ratingComment: z.string().trim().max(1000).optional()
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы оценить работу поддержки." : "Sign in to rate the support experience."
      },
      { status: 401 }
    );
  }

  const { threadId } = await params;
  const parsed = ratingSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Выберите оценку" : "Choose a rating",
        message: localeRu ? "Поставьте от 1 до 5 звёзд и при желании добавьте комментарий." : "Choose 1 to 5 stars and optionally add a comment."
      },
      { status: 400 }
    );
  }

  const thread = await prisma.supportThread.findFirst({
    where: {
      id: threadId,
      userId
    },
    select: {
      id: true,
      rating: true,
      status: true
    }
  });

  if (!thread) {
    return NextResponse.json(
      {
        title: localeRu ? "Диалог не найден" : "Thread not found",
        message: localeRu ? "Обновите страницу и выберите закрытый диалог поддержки." : "Refresh the page and choose a closed support thread."
      },
      { status: 404 }
    );
  }

  if (thread.status !== SupportThreadStatus.CLOSED) {
    return NextResponse.json(
      {
        title: localeRu ? "Диалог ещё открыт" : "Thread is still open",
        message: localeRu ? "Оценку можно оставить после закрытия обращения." : "You can rate support after the request is closed."
      },
      { status: 400 }
    );
  }

  if (thread.rating) {
    return NextResponse.json(
      {
        title: localeRu ? "Оценка уже сохранена" : "Rating already saved",
        message: localeRu ? "Спасибо, оценка по этому диалогу уже учтена." : "Thank you, the rating for this thread has already been recorded."
      },
      { status: 409 }
    );
  }

  const ratingComment = parsed.data.ratingComment || null;

  await prisma.$transaction(async (tx) => {
    await tx.supportThread.update({
      where: { id: thread.id },
      data: {
        ratedAt: new Date(),
        rating: parsed.data.rating,
        ratingComment
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: userId,
        action: "support.rating.user",
        entityType: "SupportThread",
        entityId: thread.id,
        payload: {
          rating: parsed.data.rating,
          ratingComment
        }
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Спасибо за оценку" : "Thanks for the rating",
    message: localeRu ? "Оценка сохранена и попадёт в статистику качества поддержки." : "The rating was saved and will appear in support quality statistics."
  });
}
