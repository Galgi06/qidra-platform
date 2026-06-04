import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const tronAddressPattern = /^T[1-9A-HJ-NP-Za-km-z]{33}$/;

const withdrawalSchema = z.object({
  amount: z
    .string()
    .trim()
    .transform((value) => value.replace(",", ".").replace(/\s/g, ""))
    .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "invalid")
    .refine((value) => new Prisma.Decimal(value).gt(0), "positive"),
  destinationAddress: z.string().trim().regex(tronAddressPattern)
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function formatUsdt(value: Prisma.Decimal) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value.toNumber())} USDT`;
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы создать заявку на вывод." : "Sign in to create a withdrawal request."
      },
      { status: 401 }
    );
  }

  const parsed = withdrawalSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the details",
        message:
          localeRu
            ? "Укажите сумму больше 0 и корректный USDT TRC20-адрес получателя."
            : "Enter an amount greater than 0 and a valid USDT TRC20 recipient address."
      },
      { status: 400 }
    );
  }

  const amountUsdt = new Prisma.Decimal(parsed.data.amount);
  const destinationAddress = parsed.data.destinationAddress;
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: {
      id: true,
      availableUsdt: true
    }
  });

  if (!wallet) {
    return NextResponse.json(
      {
        title: localeRu ? "Кошелек не найден" : "Wallet not found",
        message: localeRu ? "Откройте страницу кошелька и попробуйте снова." : "Open the wallet page and try again."
      },
      { status: 404 }
    );
  }

  if (wallet.availableUsdt.lt(amountUsdt)) {
    const shortfallUsdt = amountUsdt.minus(wallet.availableUsdt);

    return NextResponse.json(
      {
        title: localeRu ? "Недостаточно доступного баланса" : "Insufficient available balance",
        message:
          localeRu
            ? `Доступно ${formatUsdt(wallet.availableUsdt)}. Для вывода этой суммы не хватает ${formatUsdt(shortfallUsdt)}.`
            : `${formatUsdt(wallet.availableUsdt)} is available. This withdrawal is short by ${formatUsdt(shortfallUsdt)}.`,
        availableUsdt: wallet.availableUsdt.toString(),
        shortfallUsdt: shortfallUsdt.toString()
      },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const reserved = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          availableUsdt: { gte: amountUsdt }
        },
        data: {
          availableUsdt: { decrement: amountUsdt },
          pendingUsdt: { increment: amountUsdt }
        }
      });

      if (reserved.count !== 1) {
        throw new Error("insufficient_available_balance");
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.WITHDRAWAL,
          status: PaymentStatus.PENDING,
          amountUsdt,
          destinationAddress,
          note: localeRu ? "Заявка на вывод USDT TRC20" : "USDT TRC20 withdrawal request"
        }
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "insufficient_available_balance") {
      return NextResponse.json(
        {
          title: localeRu ? "Недостаточно доступного баланса" : "Insufficient available balance",
          message:
            localeRu
              ? "Баланс изменился во время отправки заявки. Обновите страницу и проверьте доступную сумму."
              : "The balance changed while submitting the request. Refresh the page and check the available amount."
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    title: localeRu ? "Заявка на вывод создана" : "Withdrawal request created",
    message:
      localeRu
        ? "Сумма переведена в статус проверки. После обработки заявки результат появится в истории операций."
        : "The amount was moved to review. After processing, the result will appear in transaction history."
  });
}
