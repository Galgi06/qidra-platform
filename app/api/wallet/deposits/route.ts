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
  txHash: z.string().trim().regex(/^[a-fA-F0-9]{64}$/)
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
        message: localeRu ? "Укажите сумму больше 0 и полный TRON transaction hash из 64 символов." : "Enter an amount greater than 0 and the full 64-character TRON transaction hash."
      },
      { status: 400 }
    );
  }

  const txHash = parsed.data.txHash.toLowerCase();
  const amountUsdt = new Prisma.Decimal(parsed.data.amount);
  const duplicate = await prisma.walletTransaction.findFirst({
    where: {
      txHash,
      type: TransactionType.DEPOSIT
    }
  });

  if (duplicate) {
    return NextResponse.json(
      {
        title: localeRu ? "Hash уже отправлен" : "Hash already submitted",
        message:
          localeRu
            ? "Этот transaction hash уже был отправлен в Qidra. Повторное использование hash невозможно."
            : "This transaction hash has already been submitted to Qidra. Hash reuse is not allowed."
      },
      { status: 409 }
    );
  }

  const verification = await verifyTrc20Deposit(txHash, amountUsdt);

  if (verification.status === "unconfigured") {
    return NextResponse.json(
      {
        title: localeRu ? "Автопроверка не подключена" : "Auto verification is not connected",
        message:
          localeRu
            ? "Пополнение временно недоступно: не настроены TronGrid API key или адрес приёма Qidra."
            : "Deposits are temporarily unavailable: TronGrid API key or Qidra receiving address is not configured."
      },
      { status: 503 }
    );
  }

  if (verification.status === "network_error") {
    return NextResponse.json(
      {
        title: localeRu ? "TronGrid временно недоступен" : "TronGrid is temporarily unavailable",
        message:
          localeRu
            ? "Мы не можем безопасно подтвердить платёж прямо сейчас. Подождите несколько минут и отправьте hash повторно."
            : "We cannot safely verify the payment right now. Wait a few minutes and submit the hash again."
      },
      { status: 503 }
    );
  }

  if (verification.status === "not_found") {
    return NextResponse.json(
      {
        title: localeRu ? "Платеж не найден" : "Payment not found",
        message:
          localeRu
            ? "TronGrid не нашёл подтверждённый входящий USDT TRC20-перевод с этим hash на адрес Qidra. Проверьте hash или повторите позже, если перевод только что отправлен."
            : "TronGrid did not find a confirmed incoming USDT TRC20 transfer with this hash to the Qidra address. Check the hash or retry later if the transfer was just sent."
      },
      { status: 404 }
    );
  }

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
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: { availableUsdt: { increment: amountUsdt } },
      create: {
        userId,
        availableUsdt: amountUsdt
      }
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.DEPOSIT,
        status: PaymentStatus.CONFIRMED,
        amountUsdt,
        txHash,
        note: depositNote(verification.status, localeRu)
      }
    });

    await tx.paymentConfirmation.create({
      data: {
        transactionId: transaction.id,
        status: PaymentStatus.CONFIRMED,
        reviewedAt: new Date(),
        note: "TronGrid auto verification"
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Платеж подтвержден" : "Payment confirmed",
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
