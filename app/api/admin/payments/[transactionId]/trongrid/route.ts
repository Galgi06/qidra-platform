import { PaymentStatus, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { verifyTrc20Deposit } from "@/lib/trongrid";

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

  if (transaction.type !== TransactionType.DEPOSIT || !transaction.txHash) {
    return NextResponse.json(
      {
        title: localeRu ? "Нельзя проверить" : "Cannot verify",
        message: localeRu ? "Через TronGrid проверяются только входящие TRC20-пополнения с transaction hash." : "Only incoming TRC20 deposits with a transaction hash can be checked through TronGrid."
      },
      { status: 400 }
    );
  }

  if (transaction.status !== PaymentStatus.PENDING) {
    return NextResponse.json(
      {
        title: localeRu ? "Операция уже обработана" : "Transaction already processed",
        message: localeRu ? "Этот платеж уже подтвержден или отклонен." : "This payment has already been confirmed or rejected."
      },
      { status: 409 }
    );
  }

  const verification = await verifyTrc20Deposit(transaction.txHash, transaction.amountUsdt);

  if (verification.status === "unconfigured") {
    return NextResponse.json(
      {
        title: localeRu ? "TronGrid не настроен" : "TronGrid is not configured",
        message: localeRu ? "Добавьте TRONGRID_API_KEY и QIDRA_TRON_WALLET_ADDRESS в переменные окружения." : "Add TRONGRID_API_KEY and QIDRA_TRON_WALLET_ADDRESS to environment variables."
      },
      { status: 400 }
    );
  }

  if (verification.status === "not_found") {
    return NextResponse.json(
      {
        title: localeRu ? "Перевод не найден" : "Transfer not found",
        message: localeRu ? "В TronGrid пока нет подтверждённого USDT TRC20 перевода с этим hash." : "TronGrid does not yet show a confirmed USDT TRC20 transfer with this hash."
      },
      { status: 404 }
    );
  }

  if (verification.status === "network_error") {
    return NextResponse.json(
      {
        title: localeRu ? "TronGrid недоступен" : "TronGrid unavailable",
        message: localeRu ? "Не удалось связаться с TronGrid. Повторите проверку позже." : "Could not reach TronGrid. Try checking again later."
      },
      { status: 502 }
    );
  }

  if (verification.status === "mismatch") {
    return NextResponse.json(
      {
        title: localeRu ? "Платеж не совпадает" : "Payment does not match",
        message:
          verification.reason === "amount"
            ? localeRu
              ? "Сумма в сети отличается от суммы заявки."
              : "The on-chain amount differs from the submitted amount."
            : verification.reason === "recipient"
              ? localeRu
                ? "Перевод отправлен не на адрес Qidra."
                : "The transfer was not sent to the Qidra address."
              : localeRu
                ? "Hash относится не к USDT TRC20."
                : "The hash does not belong to USDT TRC20."
      },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentStatus.CONFIRMED,
        note: "TronGrid verification"
      }
    }),
    prisma.paymentConfirmation.upsert({
      where: { transactionId: transaction.id },
      update: {
        reviewerId: session?.user?.id,
        status: PaymentStatus.CONFIRMED,
        reviewedAt: new Date(),
        note: "TronGrid verification"
      },
      create: {
        transactionId: transaction.id,
        reviewerId: session?.user?.id,
        status: PaymentStatus.CONFIRMED,
        reviewedAt: new Date(),
        note: "TronGrid verification"
      }
    }),
    prisma.wallet.update({
      where: { id: transaction.walletId },
      data: {
        availableUsdt: { increment: transaction.amountUsdt },
        pendingUsdt: { decrement: transaction.amountUsdt }
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "payment.trongrid.confirm",
        entityType: "WalletTransaction",
        entityId: transaction.id,
        payload: {
          amountUsdt: transaction.amountUsdt.toString(),
          txHash: transaction.txHash
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Платеж подтвержден TronGrid" : "Payment confirmed by TronGrid",
    message: localeRu ? "Hash, адрес и сумма совпали. Баланс участника обновлён." : "Hash, address and amount matched. The participant balance was updated."
  });
}
