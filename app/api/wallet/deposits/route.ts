import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { verifyTrc20Deposit } from "@/lib/trongrid";

const depositSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((value) => value.replace(",", ".").replace(/\s/g, ""))
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "invalid")
    .refine((value) => new Prisma.Decimal(value).gt(0), "positive"),
  txHash: z.string().trim().min(16).max(160)
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
        message: localeRu ? "Войдите в аккаунт, чтобы создать заявку на пополнение." : "Sign in to create a deposit request."
      },
      { status: 401 }
    );
  }

  const parsed = depositSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the details",
        message: localeRu ? "Укажите сумму больше 0 и корректный transaction hash." : "Enter an amount greater than 0 and a valid transaction hash."
      },
      { status: 400 }
    );
  }

  const txHash = parsed.data.txHash;
  const amountUsdt = new Prisma.Decimal(parsed.data.amount);
  const duplicate = await prisma.walletTransaction.findFirst({
    where: {
      txHash,
      type: TransactionType.DEPOSIT,
      status: { in: [PaymentStatus.PENDING, PaymentStatus.CONFIRMED] }
    }
  });

  if (duplicate) {
    return NextResponse.json(
      {
        title: localeRu ? "Hash уже отправлен" : "Hash already submitted",
        message:
          localeRu
            ? "Эта операция уже находится на проверке или была подтверждена."
            : "This transaction is already under review or has been confirmed."
      },
      { status: 409 }
    );
  }

  const verification = await verifyTrc20Deposit(txHash, amountUsdt);

  if (verification.status === "mismatch") {
    const reason =
      verification.reason === "amount"
        ? localeRu
          ? "Сумма в сети не совпадает с указанной суммой."
          : "The on-chain amount does not match the submitted amount."
        : verification.reason === "recipient"
          ? localeRu
            ? "Перевод отправлен не на адрес Qidra."
            : "The transfer was not sent to the Qidra address."
          : localeRu
            ? "Hash относится не к USDT TRC20."
            : "The hash does not belong to USDT TRC20.";

    return NextResponse.json(
      {
        title: localeRu ? "Платеж не совпадает" : "Payment does not match",
        message: reason
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const verified = verification.verified;
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: verified ? { availableUsdt: { increment: amountUsdt } } : { pendingUsdt: { increment: amountUsdt } },
      create: {
        userId,
        ...(verified ? { availableUsdt: amountUsdt } : { pendingUsdt: amountUsdt })
      }
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.DEPOSIT,
        status: verified ? PaymentStatus.CONFIRMED : PaymentStatus.PENDING,
        amountUsdt,
        txHash,
        note: depositNote(verification.status, localeRu)
      }
    });

    if (verified) {
      await tx.paymentConfirmation.create({
        data: {
          transactionId: transaction.id,
          status: PaymentStatus.CONFIRMED,
          reviewedAt: new Date(),
          note: "TronGrid auto verification"
        }
      });
    }
  });

  return NextResponse.json({
    title: verification.verified ? (localeRu ? "Платеж подтвержден" : "Payment confirmed") : localeRu ? "Заявка на пополнение создана" : "Deposit request created",
    message: depositMessage(verification.status, localeRu)
  });
}

function depositNote(status: string, localeRu: boolean) {
  if (status === "configured") return "TronGrid auto verification";
  if (status === "not_found") return localeRu ? "Hash не найден в TronGrid, требуется проверка" : "Hash not found in TronGrid, review required";
  if (status === "network_error") return localeRu ? "TronGrid временно недоступен, требуется проверка" : "TronGrid temporarily unavailable, review required";
  return localeRu ? "Заявка на пополнение USDT TRC20" : "USDT TRC20 deposit request";
}

function depositMessage(status: string, localeRu: boolean) {
  if (status === "configured") {
    return localeRu
      ? "Платеж найден в TronGrid. Сумма уже добавлена в доступный баланс."
      : "The payment was found in TronGrid. The amount was added to the available balance.";
  }

  if (status === "not_found") {
    return localeRu
      ? "Hash принят. Мы пока не нашли подтверждённый перевод в TronGrid, статус останется на проверке."
      : "The hash was received. We did not find a confirmed TronGrid transfer yet, so the status remains under review.";
  }

  if (status === "network_error") {
    return localeRu
      ? "Hash принят. TronGrid временно недоступен, статус останется на проверке."
      : "The hash was received. TronGrid is temporarily unavailable, so the status remains under review.";
  }

  return localeRu
    ? "Transaction hash принят. Сумма появится в доступном балансе после проверки платежа."
    : "The transaction hash was received. The amount will move to available balance after payment review.";
}
