import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { verifyTrc20Deposit } from "@/lib/trongrid";
import { ensureUserDepositWallet } from "@/lib/wallet-addresses";

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

  const wallet = await ensureUserDepositWallet(userId);
  const personalDepositAddress = wallet.trc20Address;

  if (!personalDepositAddress) {
    return NextResponse.json(
      {
        title: localeRu ? "Адрес не выдан" : "Address was not issued",
        message:
          localeRu
            ? "Обновите страницу кошелька, чтобы получить личный адрес USDT TRC20."
            : "Refresh the wallet page to receive your personal USDT TRC20 address."
      },
      { status: 503 }
    );
  }

  const verification = await verifyTrc20Deposit(txHash, amountUsdt, personalDepositAddress);

  if (verification.status === "unconfigured") {
    return NextResponse.json(
      {
        title: localeRu ? "Автопроверка не подключена" : "Auto verification is not connected",
        message:
          localeRu
            ? "Пополнение временно недоступно: сервис проверки платежей ещё не подключён."
            : "Deposits are temporarily unavailable: the payment verification service is not connected yet."
      },
      { status: 503 }
    );
  }

  if (verification.status === "network_error") {
    return NextResponse.json(
      {
        title: localeRu ? "Проверка временно недоступна" : "Verification is temporarily unavailable",
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
            ? "Система не нашла подтверждённый входящий USDT TRC20-перевод с этим hash на ваш личный адрес. Проверьте hash или повторите позже, если перевод только что отправлен."
            : "The system did not find a confirmed incoming USDT TRC20 transfer with this hash to your personal address. Check the hash or retry later if the transfer was just sent."
      },
      { status: 404 }
    );
  }

  if (verification.status === "mismatch") {
    return NextResponse.json(
      {
        title: localeRu ? "Платеж не совпадает" : "Payment does not match",
        message: mismatchReason(verification.reason, localeRu)
      },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { availableUsdt: { increment: amountUsdt } }
    });

    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: updatedWallet.id,
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

function mismatchReason(reason: "amount" | "contract" | "recipient", localeRu: boolean) {
  if (reason === "amount") {
    return localeRu ? "Сумма в сети не совпадает с указанной суммой." : "The on-chain amount does not match the submitted amount.";
  }

  if (reason === "recipient") {
    return localeRu ? "Перевод отправлен не на ваш личный адрес Qidra." : "The transfer was not sent to your personal Qidra address.";
  }

  return localeRu ? "Hash относится не к USDT TRC20." : "The hash does not belong to USDT TRC20.";
}

function depositNote(status: string, localeRu: boolean) {
  if (status === "configured") return "TronGrid auto verification";
  if (status === "not_found") return localeRu ? "Hash не найден сервисом проверки, требуется проверка" : "Hash not found by verification service, review required";
  if (status === "network_error") return localeRu ? "Сервис проверки временно недоступен, требуется проверка" : "Verification service temporarily unavailable, review required";
  return localeRu ? "Заявка на пополнение USDT TRC20" : "USDT TRC20 deposit request";
}

function depositMessage(status: string, localeRu: boolean) {
  if (status === "configured") {
    return localeRu
      ? "Платеж найден и подтверждён. Сумма уже добавлена в доступный баланс."
      : "The payment was found and confirmed. The amount was added to the available balance.";
  }

  if (status === "not_found") {
    return localeRu
      ? "Hash принят. Мы пока не нашли подтверждённый перевод, статус останется на проверке."
      : "The hash was received. We did not find a confirmed transfer yet, so the status remains under review.";
  }

  if (status === "network_error") {
    return localeRu
      ? "Hash принят. Сервис проверки временно недоступен, статус останется на проверке."
      : "The hash was received. The verification service is temporarily unavailable, so the status remains under review.";
  }

  return localeRu
    ? "Transaction hash принят. Сумма появится в доступном балансе после проверки платежа."
    : "The transaction hash was received. The amount will move to available balance after payment review.";
}
