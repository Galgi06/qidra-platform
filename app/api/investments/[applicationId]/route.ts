import { InvestmentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const applicationActionSchema = z.object({
  action: z.literal("cancel")
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы отменить заявку." : "Sign in to cancel the application."
      },
      { status: 401 }
    );
  }

  const parsed = applicationActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте действие" : "Check the action",
        message: localeRu ? "Эта операция поддерживает только отмену заявки." : "This operation only supports application cancellation."
      },
      { status: 400 }
    );
  }

  const { applicationId } = await params;
  const application = await prisma.investmentApplication.findFirst({
    where: {
      id: applicationId,
      userId
    },
    include: { user: { include: { wallet: true } } }
  });

  if (!application) {
    return NextResponse.json(
      {
        title: localeRu ? "Заявка не найдена" : "Application not found",
        message: localeRu ? "Обновите страницу и выберите свою заявку из списка." : "Refresh the page and choose your application from the list."
      },
      { status: 404 }
    );
  }

  if (application.status !== InvestmentStatus.PENDING) {
    return NextResponse.json(
      {
        title: localeRu ? "Заявка уже обработана" : "Application already processed",
        message: localeRu ? "Можно отменить только заявку со статусом «На проверке»." : "Only pending applications can be cancelled."
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const reservedUsdt = application.reservedUsdt;

    if (application.user.wallet && reservedUsdt.gt(0)) {
      await tx.wallet.update({
        where: { id: application.user.wallet.id },
        data: {
          availableUsdt: { increment: reservedUsdt },
          reservedUsdt: { decrement: reservedUsdt }
        }
      });
    }

    await tx.investmentApplication.update({
      where: { id: application.id },
      data: {
        status: InvestmentStatus.CANCELLED,
        reservedUsdt: 0,
        adminNote: localeRu ? "Отменено участником" : "Cancelled by participant"
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Заявка отменена" : "Application cancelled",
    message: localeRu ? "Заявка снята с проверки. Свободный баланс для новых заявок обновится на странице." : "The application was removed from review. Free balance for new applications will update on the page."
  });
}
