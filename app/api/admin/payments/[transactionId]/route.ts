import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const paymentActionSchema = z.object({
  action: z.enum(["confirm", "reject"]),
  note: z.string().trim().max(300).optional(),
  txHash: z.string().trim().optional()
});

const tronTxHashPattern = /^[a-fA-F0-9]{64}$/;

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Это действие доступно только администратору." : "This action is only available to an administrator."
      },
      { status: 403 }
    );
  }

  const { transactionId } = await params;
  const parsed = paymentActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте действие" : "Check the action",
        message: localeRu ? "Выберите подтверждение или отклонение платежа." : "Choose whether to confirm or reject the payment."
      },
      { status: 400 }
    );
  }

  const transaction = await prisma.walletTransaction.findUnique({
    where: { id: transactionId },
    include: { wallet: true }
  });

  if (!transaction) {
    return NextResponse.json(
      {
        title: localeRu ? "Операция не найдена" : "Transaction not found",
        message: localeRu ? "Обновите страницу и выберите операцию из списка." : "Refresh the page and choose a transaction from the list."
      },
      { status: 404 }
    );
  }

  if (transaction.status !== PaymentStatus.PENDING) {
    return NextResponse.json(
      {
        title: localeRu ? "Операция уже обработана" : "Transaction already processed",
        message: localeRu ? "Этот платеж уже был подтвержден или отклонен." : "This payment has already been confirmed or rejected."
      },
      { status: 409 }
    );
  }

  if (transaction.type === TransactionType.DEPOSIT && parsed.data.action === "confirm") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужна проверка TronGrid" : "TronGrid verification required",
        message:
          localeRu
            ? "Пополнение USDT нельзя подтвердить вручную. Используйте проверку TronGrid, чтобы сверить hash, сумму и личный адрес участника."
            : "USDT deposits cannot be confirmed manually. Use TronGrid verification to match the hash, amount and participant personal address."
      },
      { status: 400 }
    );
  }

  const nextStatus = parsed.data.action === "confirm" ? PaymentStatus.CONFIRMED : PaymentStatus.REJECTED;
  const outgoingTxHash = parsed.data.txHash?.trim().toLowerCase() || undefined;
  const auditPayload: Prisma.InputJsonObject = {
    type: transaction.type,
    status: nextStatus,
    amountUsdt: transaction.amountUsdt.toString(),
    ...(transaction.destinationAddress ? { destinationAddress: transaction.destinationAddress } : {}),
    ...(outgoingTxHash ? { txHash: outgoingTxHash } : {}),
    ...(parsed.data.note ? { note: parsed.data.note } : {})
  };

  if (transaction.type === TransactionType.WITHDRAWAL && nextStatus === PaymentStatus.CONFIRMED) {
    if (!transaction.destinationAddress) {
      return NextResponse.json(
        {
          title: localeRu ? "Нет адреса получателя" : "Recipient address is missing",
          message: localeRu ? "Нельзя подтвердить вывод без адреса получателя." : "A withdrawal cannot be confirmed without a recipient address."
        },
        { status: 409 }
      );
    }

    if (!outgoingTxHash || !tronTxHashPattern.test(outgoingTxHash)) {
      return NextResponse.json(
        {
          title: localeRu ? "Нужен hash отправки" : "Outgoing hash required",
          message:
            localeRu
              ? "Перед подтверждением вывода укажите полный TRON transaction hash из 64 символов."
              : "Before confirming a withdrawal, enter the full 64-character TRON transaction hash."
        },
        { status: 400 }
      );
    }

    const duplicateHash = await prisma.walletTransaction.findFirst({
      where: {
        txHash: outgoingTxHash,
        NOT: { id: transaction.id }
      },
      select: { id: true }
    });

    if (duplicateHash) {
      return NextResponse.json(
        {
          title: localeRu ? "Hash уже используется" : "Hash already used",
          message:
            localeRu
              ? "Этот transaction hash уже сохранён в другой операции. Повторное использование hash невозможно."
              : "This transaction hash is already saved on another operation. Hash reuse is not allowed."
        },
        { status: 409 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
        ...(outgoingTxHash && transaction.type === TransactionType.WITHDRAWAL ? { txHash: outgoingTxHash } : {}),
        note: parsed.data.note || transaction.note
      }
    });

    await tx.paymentConfirmation.upsert({
      where: { transactionId: transaction.id },
      update: {
        reviewerId: session?.user?.id,
        status: nextStatus,
        reviewedAt: new Date(),
        note: parsed.data.note
      },
      create: {
        transactionId: transaction.id,
        reviewerId: session?.user?.id,
        status: nextStatus,
        reviewedAt: new Date(),
        note: parsed.data.note
      }
    });

    await tx.wallet.update({
      where: { id: transaction.walletId },
      data: walletUpdateForAction(transaction.type, nextStatus, transaction.amountUsdt)
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: paymentAuditAction(transaction.type, nextStatus),
        entityType: "WalletTransaction",
        entityId: transaction.id,
        payload: auditPayload
      }
    });
  });

  return NextResponse.json({
    title: responseTitle(transaction.type, nextStatus, localeRu),
    message: responseMessage(transaction.type, nextStatus, localeRu)
  });
}

function paymentAuditAction(type: TransactionType, status: PaymentStatus) {
  const normalizedType = type.toLowerCase();
  const normalizedStatus = status === PaymentStatus.CONFIRMED ? "confirm" : "reject";

  return `payment.${normalizedType}.${normalizedStatus}`;
}

function walletUpdateForAction(type: TransactionType, status: PaymentStatus, amountUsdt: Prisma.Decimal) {
  if (type === TransactionType.WITHDRAWAL) {
    if (status === PaymentStatus.CONFIRMED) {
      return {
        pendingUsdt: { decrement: amountUsdt }
      };
    }

    return {
      availableUsdt: { increment: amountUsdt },
      pendingUsdt: { decrement: amountUsdt }
    };
  }

  if (status === PaymentStatus.CONFIRMED) {
    return {
      availableUsdt: { increment: amountUsdt },
      pendingUsdt: { decrement: amountUsdt }
    };
  }

  return {
    pendingUsdt: { decrement: amountUsdt }
  };
}

function responseTitle(type: TransactionType, status: PaymentStatus, localeRu: boolean) {
  if (type === TransactionType.WITHDRAWAL && status === PaymentStatus.CONFIRMED) {
    return localeRu ? "Вывод подтвержден" : "Withdrawal confirmed";
  }

  if (type === TransactionType.WITHDRAWAL) {
    return localeRu ? "Вывод отклонен" : "Withdrawal rejected";
  }

  return status === PaymentStatus.CONFIRMED
    ? localeRu
      ? "Платеж подтвержден"
      : "Payment confirmed"
    : localeRu
      ? "Платеж отклонен"
      : "Payment rejected";
}

function responseMessage(type: TransactionType, status: PaymentStatus, localeRu: boolean) {
  if (type === TransactionType.WITHDRAWAL && status === PaymentStatus.CONFIRMED) {
    return localeRu
      ? "Сумма окончательно списана с ожидающего баланса участника."
      : "The amount was permanently deducted from the participant's pending balance.";
  }

  if (type === TransactionType.WITHDRAWAL) {
    return localeRu
      ? "Сумма возвращена в доступный баланс участника."
      : "The amount was returned to the participant's available balance.";
  }

  return status === PaymentStatus.CONFIRMED
    ? localeRu
      ? "Сумма переведена в доступный баланс участника."
      : "The amount was moved to the participant's available balance."
    : localeRu
      ? "Сумма снята с ожидающего баланса участника."
      : "The amount was removed from the participant's pending balance.";
}
