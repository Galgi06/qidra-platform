import { KycStatus, PaymentStatus, Prisma, Role, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/;

const baseAdjustmentSchema = z.object({
  confirmation: z.string().trim(),
  reason: z.string().trim().min(12).max(600)
});

const adjustmentSchema = z.discriminatedUnion("kind", [
  baseAdjustmentSchema.extend({
    amountUsdt: z.string().trim().regex(amountPattern),
    direction: z.enum(["credit", "debit"]),
    kind: z.literal("balance")
  }),
  baseAdjustmentSchema.extend({
    applicationId: z.string().trim().min(1),
    kind: z.literal("kyc_status"),
    status: z.nativeEnum(KycStatus)
  }),
  baseAdjustmentSchema.extend({
    kind: z.literal("payment_reject"),
    transactionId: z.string().trim().min(1)
  })
]);

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Корректировки доступны только администратору." : "Adjustments are only available to an administrator."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;
  const parsed = adjustmentSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Укажите действие, причину не короче 12 символов и подтверждение CONFIRM."
            : "Provide the action, a reason of at least 12 characters and the CONFIRM confirmation."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы выполнить административную корректировку." : "Enter CONFIRM to perform the administrative adjustment."
      },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, id: true, name: true }
  });

  if (!targetUser) {
    return NextResponse.json(
      {
        title: localeRu ? "Клиент не найден" : "Client not found",
        message: localeRu ? "Обновите страницу и выберите клиента из списка." : "Refresh the page and choose the client from the list."
      },
      { status: 404 }
    );
  }

  if (parsed.data.kind === "balance") {
    return adjustBalance({
      actorId: session?.user?.id,
      actorRole: session?.user?.role,
      amount: new Prisma.Decimal(parsed.data.amountUsdt),
      direction: parsed.data.direction,
      localeRu,
      reason: parsed.data.reason,
      userId
    });
  }

  if (parsed.data.kind === "kyc_status") {
    return adjustKycStatus({
      actorId: session?.user?.id,
      applicationId: parsed.data.applicationId,
      localeRu,
      reason: parsed.data.reason,
      status: parsed.data.status,
      userId
    });
  }

  return rejectPendingPayment({
    actorId: session?.user?.id,
    localeRu,
    reason: parsed.data.reason,
    transactionId: parsed.data.transactionId,
    userId
  });
}

async function adjustBalance({
  actorId,
  actorRole,
  amount,
  direction,
  localeRu,
  reason,
  userId
}: {
  actorId?: string;
  actorRole?: string;
  amount: Prisma.Decimal;
  direction: "credit" | "debit";
  localeRu: boolean;
  reason: string;
  userId: string;
}) {
  if (actorRole !== Role.SUPER_ADMIN) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен главный администратор" : "Super administrator required",
        message:
          localeRu
            ? "Изменение доступного баланса разрешено только главному администратору."
            : "Available balance adjustments are only allowed for a super administrator."
      },
      { status: 403 }
    );
  }

  if (!amount.gt(0)) {
    return NextResponse.json(
      {
        title: localeRu ? "Некорректная сумма" : "Invalid amount",
        message: localeRu ? "Сумма корректировки должна быть больше нуля." : "The adjustment amount must be greater than zero."
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      const previousAvailable = wallet?.availableUsdt ?? new Prisma.Decimal(0);

      if (direction === "debit" && !wallet) {
        throw new Error("wallet_not_found");
      }

      if (direction === "debit") {
        const updated = await tx.wallet.updateMany({
          where: {
            id: wallet?.id,
            availableUsdt: { gte: amount }
          },
          data: {
            availableUsdt: { decrement: amount }
          }
        });

        if (updated.count !== 1) {
          throw new Error("insufficient_available_balance");
        }
      }

      const adjustedWallet =
        direction === "credit"
          ? wallet
            ? await tx.wallet.update({
                where: { id: wallet.id },
                data: { availableUsdt: { increment: amount } }
              })
            : await tx.wallet.create({
                data: {
                  availableUsdt: amount,
                  userId
                }
              })
          : await tx.wallet.findUniqueOrThrow({ where: { id: wallet?.id } });

      const transactionAmount = direction === "credit" ? amount : amount.mul(-1);
      const transaction = await tx.walletTransaction.create({
        data: {
          amountUsdt: transactionAmount,
          note: reason,
          status: PaymentStatus.CONFIRMED,
          type: TransactionType.ADJUSTMENT,
          walletId: adjustedWallet.id
        }
      });

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: direction === "credit" ? "wallet.adjustment.credit" : "wallet.adjustment.debit",
          entityId: transaction.id,
          entityType: "WalletTransaction",
          payload: {
            amountUsdt: amount.toString(),
            direction,
            from: previousAvailable.toString(),
            reason,
            to: adjustedWallet.availableUsdt.toString(),
            userId
          }
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "wallet_not_found") {
      return NextResponse.json(
        {
          title: localeRu ? "Кошелёк не найден" : "Wallet not found",
          message: localeRu ? "Нельзя списать баланс, потому что у клиента ещё нет кошелька." : "Cannot debit the balance because the client does not have a wallet yet."
        },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "insufficient_available_balance") {
      return NextResponse.json(
        {
          title: localeRu ? "Недостаточно баланса" : "Insufficient balance",
          message: localeRu ? "Сумма списания больше доступного баланса клиента." : "The debit amount is greater than the client's available balance."
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    title: direction === "credit" ? (localeRu ? "Баланс увеличен" : "Balance increased") : localeRu ? "Баланс уменьшен" : "Balance decreased",
    message: localeRu ? "Корректировка сохранена и записана в журнал действий." : "The adjustment was saved and written to the audit log.",
    tone: direction === "credit" ? "success" : "warning"
  });
}

async function adjustKycStatus({
  actorId,
  applicationId,
  localeRu,
  reason,
  status,
  userId
}: {
  actorId?: string;
  applicationId: string;
  localeRu: boolean;
  reason: string;
  status: KycStatus;
  userId: string;
}) {
  const application = await prisma.kycApplication.findFirst({
    where: {
      id: applicationId,
      userId
    }
  });

  if (!application) {
    return NextResponse.json(
      {
        title: localeRu ? "Анкета не найдена" : "KYC profile not found",
        message: localeRu ? "Выберите анкету этого клиента и повторите действие." : "Choose this client's KYC profile and try again."
      },
      { status: 404 }
    );
  }

  if (application.status === status) {
    return NextResponse.json(
      {
        title: localeRu ? "Статус уже установлен" : "Status already set",
        message: localeRu ? "Анкета уже находится в выбранном статусе." : "The KYC profile already has the selected status."
      },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.kycApplication.update({
      where: { id: application.id },
      data: {
        reviewedAt: status === KycStatus.APPROVED || status === KycStatus.REJECTED ? new Date() : null,
        reviewerNote: reason,
        status
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId,
        action: "kyc.status.adjust",
        entityId: application.id,
        entityType: "KycApplication",
        payload: {
          from: application.status,
          reason,
          to: status,
          userId
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Статус KYC обновлён" : "KYC status updated",
    message: localeRu ? "Изменение сохранено с причиной и записью в журнале." : "The change was saved with a reason and an audit entry.",
    tone: "success"
  });
}

async function rejectPendingPayment({
  actorId,
  localeRu,
  reason,
  transactionId,
  userId
}: {
  actorId?: string;
  localeRu: boolean;
  reason: string;
  transactionId: string;
  userId: string;
}) {
  const transaction = await prisma.walletTransaction.findFirst({
    where: {
      id: transactionId,
      wallet: { userId }
    },
    include: {
      wallet: true
    }
  });

  if (!transaction) {
    return NextResponse.json(
      {
        title: localeRu ? "Операция не найдена" : "Operation not found",
        message: localeRu ? "Выберите ожидающую операцию этого клиента." : "Choose a pending operation for this client."
      },
      { status: 404 }
    );
  }

  if (transaction.status !== PaymentStatus.PENDING) {
    return NextResponse.json(
      {
        title: localeRu ? "Операция уже обработана" : "Operation already processed",
        message: localeRu ? "Можно отклонять только операции со статусом «На проверке»." : "Only pending operations can be rejected."
      },
      { status: 409 }
    );
  }

  if (transaction.type !== TransactionType.DEPOSIT && transaction.type !== TransactionType.WITHDRAWAL) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен профильный раздел" : "Dedicated section required",
        message:
          localeRu
            ? "Заявки участия и возвраты корректируются в профильных разделах, чтобы не нарушить резервирование."
            : "Participation requests and returns are adjusted in dedicated sections to preserve reservation logic."
      },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          note: reason,
          status: PaymentStatus.REJECTED
        }
      });

      await tx.paymentConfirmation.upsert({
        where: { transactionId: transaction.id },
        update: {
          note: reason,
          reviewedAt: new Date(),
          reviewerId: actorId,
          status: PaymentStatus.REJECTED
        },
        create: {
          note: reason,
          reviewedAt: new Date(),
          reviewerId: actorId,
          status: PaymentStatus.REJECTED,
          transactionId: transaction.id
        }
      });

      const walletUpdate = await tx.wallet.updateMany({
        where: {
          id: transaction.walletId,
          pendingUsdt: { gte: transaction.amountUsdt }
        },
        data:
          transaction.type === TransactionType.WITHDRAWAL
            ? {
                availableUsdt: { increment: transaction.amountUsdt },
                pendingUsdt: { decrement: transaction.amountUsdt }
              }
            : {
                pendingUsdt: { decrement: transaction.amountUsdt }
              }
      });

      if (walletUpdate.count !== 1) {
        throw new Error("pending_balance_changed");
      }

      await tx.adminAuditLog.create({
        data: {
          actorId,
          action: "payment.status.reject.adjust",
          entityId: transaction.id,
          entityType: "WalletTransaction",
          payload: {
            amountUsdt: transaction.amountUsdt.toString(),
            from: transaction.status,
            reason,
            to: PaymentStatus.REJECTED,
            type: transaction.type,
            userId
          }
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "pending_balance_changed") {
      return NextResponse.json(
        {
          title: localeRu ? "Баланс изменился" : "Balance changed",
          message: localeRu ? "Ожидающий баланс изменился. Обновите карточку клиента и проверьте операцию снова." : "The pending balance changed. Refresh the client card and check the operation again."
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    title: localeRu ? "Операция отклонена" : "Operation rejected",
    message: localeRu ? "Статус изменён с причиной и записью в журнале действий." : "The status was changed with a reason and an audit entry.",
    tone: "warning"
  });
}
