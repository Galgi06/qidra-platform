import { InvestmentStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const applicationActionSchema = z.object({
  action: z.enum(["cancel", "close"]),
  reason: z.string().trim().max(500).optional()
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
        message: localeRu ? "Эта операция поддерживает отмену заявки или закрытие контракта." : "This operation supports application cancellation or contract closure."
      },
      { status: 400 }
    );
  }

  const { applicationId } = await params;
  const action = parsed.data.action;
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

  if (action === "close") {
    return NextResponse.json(
      {
        title: localeRu ? "Самостоятельное закрытие недоступно" : "Self-service closure is unavailable",
        message: localeRu
          ? "Выход из проекта выполняется только по условиям договора, после проверки срока, окна выхода и доступности покупателя. Обратитесь в поддержку."
          : "Project exit is available only under the contract terms after checking the holding period, exit window, and buyer availability. Contact support."
      },
      { status: 409 }
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

  try {
    await prisma.$transaction(async (tx) => {
      const reservedUsdt = application.reservedUsdt;
      const applicationClaim = await tx.investmentApplication.updateMany({
        where: { id: application.id, userId, status: InvestmentStatus.PENDING },
        data: {
          status: InvestmentStatus.CANCELLED,
          reservedUsdt: 0,
          adminNote: localeRu ? "Отменено участником" : "Cancelled by participant"
        }
      });

      if (applicationClaim.count !== 1) {
        throw new Error("application_already_processed");
      }

      if (reservedUsdt.gt(0)) {
        if (!application.user.wallet) {
          throw new Error("reserved_balance_changed");
        }

        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: application.user.wallet.id,
            reservedUsdt: { gte: reservedUsdt }
          },
          data: {
            availableUsdt: { increment: reservedUsdt },
            reservedUsdt: { decrement: reservedUsdt }
          }
        });

        if (walletUpdate.count !== 1) {
          throw new Error("reserved_balance_changed");
        }
      }

      await tx.adminAuditLog.create({
        data: {
          actorId: userId,
          action: "investment.request.cancel",
          entityType: "InvestmentApplication",
          entityId: application.id,
          payload: {
            amountUsdt: application.amountUsdt.toString(),
            releasedUsdt: reservedUsdt.toString(),
            projectId: application.projectId
          }
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "application_already_processed") {
      return NextResponse.json(
        {
          title: localeRu ? "Заявка уже обработана" : "Application already processed",
          message: localeRu ? "Статус заявки уже изменился. Обновите страницу." : "The application status has already changed. Refresh the page."
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "reserved_balance_changed") {
      return NextResponse.json(
        {
          title: localeRu ? "Резерв изменился" : "Reserved balance changed",
          message: localeRu ? "Резерв изменился во время отмены. Обновите страницу." : "The reserved balance changed during cancellation. Refresh the page."
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    title: localeRu ? "Заявка отменена" : "Application cancelled",
    message: localeRu ? "Заявка снята с проверки. Свободный баланс для новых заявок обновится на странице." : "The application was removed from review. Free balance for new applications will update on the page."
  });
}
