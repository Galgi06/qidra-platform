import { InvestmentStatus, PaymentStatus, TransactionType } from "@prisma/client";
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
    if (application.status !== InvestmentStatus.CONFIRMED) {
      return NextResponse.json(
        {
          title: localeRu ? "Контракт нельзя закрыть" : "Contract cannot be closed",
          message: localeRu ? "Закрыть можно только активированный контракт." : "Only an activated contract can be closed."
        },
        { status: 409 }
      );
    }

    const returnedUsdt = application.amountUsdt;
    const closedAt = new Date();
    const closeReason = parsed.data.reason || (localeRu ? "Закрыто участником" : "Closed by participant");

    try {
      await prisma.$transaction(async (tx) => {
        const closeUpdate = await tx.investmentApplication.updateMany({
          where: {
            id: application.id,
            userId,
            status: InvestmentStatus.CONFIRMED
          },
          data: {
            status: InvestmentStatus.CLOSED,
            reservedUsdt: 0,
            closedAt,
            closeReason,
            adminNote: closeReason
          }
        });

        if (closeUpdate.count !== 1) {
          throw new Error("contract_already_closed");
        }

        const wallet = application.user.wallet
          ? await tx.wallet.update({
              where: { id: application.user.wallet.id },
              data: {
                availableUsdt: { increment: returnedUsdt }
              }
            })
          : await tx.wallet.create({
              data: {
                userId,
                availableUsdt: returnedUsdt
              }
            });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.RETURN,
            status: PaymentStatus.CONFIRMED,
            amountUsdt: returnedUsdt,
            note: `${application.id} · contract principal returned`
          }
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: userId,
            action: "investment.contract.close",
            entityType: "InvestmentApplication",
            entityId: application.id,
            payload: {
              amountUsdt: returnedUsdt.toString(),
              projectId: application.projectId,
              reason: closeReason
            }
          }
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "contract_already_closed") {
        return NextResponse.json(
          {
            title: localeRu ? "Контракт уже обработан" : "Contract already processed",
            message: localeRu ? "Обновите страницу и проверьте актуальный статус контракта." : "Refresh the page and check the current contract status."
          },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      title: localeRu ? "Контракт закрыт" : "Contract closed",
      message: localeRu ? "Сумма контракта возвращена на доступный баланс." : "The contract amount was returned to your available balance."
    });
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

  return NextResponse.json({
    title: localeRu ? "Заявка отменена" : "Application cancelled",
    message: localeRu ? "Заявка снята с проверки. Свободный баланс для новых заявок обновится на странице." : "The application was removed from review. Free balance for new applications will update on the page."
  });
}
