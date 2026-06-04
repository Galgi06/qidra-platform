import { PaymentStatus, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const paymentActionSchema = z.object({
  action: z.enum(["confirm", "reject"]),
  note: z.string().trim().max(300).optional()
});

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

  await prisma.$transaction(async (tx) => {
    await tx.walletTransaction.update({
      where: { id: transaction.id },
      data: {
        status: nextStatus,
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
      data:
        nextStatus === PaymentStatus.CONFIRMED
          ? {
              availableUsdt: { increment: transaction.amountUsdt },
              pendingUsdt: { decrement: transaction.amountUsdt }
            }
          : {
              pendingUsdt: { decrement: transaction.amountUsdt }
            }
    });
  });

  return NextResponse.json({
    title: parsed.data.action === "confirm" ? (localeRu ? "Платеж подтвержден" : "Payment confirmed") : localeRu ? "Платеж отклонен" : "Payment rejected",
    message:
      parsed.data.action === "confirm"
        ? localeRu
          ? "Сумма переведена в доступный баланс участника."
          : "The amount was moved to the participant's available balance."
        : localeRu
          ? "Сумма снята с ожидающего баланса участника."
          : "The amount was removed from the participant's pending balance."
  });
}
