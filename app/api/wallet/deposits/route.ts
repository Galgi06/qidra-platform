import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

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

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.upsert({
      where: { userId },
      update: {
        pendingUsdt: { increment: amountUsdt }
      },
      create: {
        userId,
        pendingUsdt: amountUsdt
      }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: TransactionType.DEPOSIT,
        status: PaymentStatus.PENDING,
        amountUsdt,
        txHash,
        note: localeRu ? "Заявка на пополнение USDT TRC20" : "USDT TRC20 deposit request"
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Заявка на пополнение создана" : "Deposit request created",
    message:
      localeRu
        ? "Transaction hash принят. Сумма появится в доступном балансе после проверки платежа."
        : "The transaction hash was received. The amount will move to available balance after payment review."
  });
}
