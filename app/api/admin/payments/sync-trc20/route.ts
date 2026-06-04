import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { syncWalletDeposits } from "@/lib/wallet-deposit-sync";

const syncSchema = z.object({
  limitPerWallet: z.coerce.number().int().min(1).max(200).optional()
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

export async function POST(request: NextRequest) {
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

  const parsed = syncSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте параметры" : "Check parameters",
        message: localeRu ? "Лимит проверки должен быть от 1 до 200 переводов на кошелек." : "The scan limit must be between 1 and 200 transfers per wallet."
      },
      { status: 400 }
    );
  }

  const result = await syncWalletDeposits({
    actorId: session?.user?.id,
    limitPerWallet: parsed.data.limitPerWallet
  });

  if (result.status === "unconfigured") {
    return NextResponse.json(
      {
        title: localeRu ? "Проверка не настроена" : "Verification is not configured",
        message: localeRu ? "Добавьте ключ сервиса проверки платежей в переменные окружения." : "Add the payment verification API key to environment variables."
      },
      { status: 400 }
    );
  }

  if (result.status === "network_error") {
    return NextResponse.json(
      {
        title: localeRu ? "Проверка временно недоступна" : "Verification is temporarily unavailable",
        message: localeRu ? "Не удалось проверить входящие переводы. Повторите синхронизацию позже." : "Could not scan incoming transfers. Try syncing again later."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    title: localeRu ? "Входящие переводы синхронизированы" : "Incoming transfers synced",
    message: syncMessage(result, localeRu)
  });
}

function syncMessage(result: Awaited<ReturnType<typeof syncWalletDeposits>>, localeRu: boolean) {
  const creditedUsdt = formatUsdt(new Prisma.Decimal(result.creditedUsdt));

  if (localeRu) {
    return `Проверено кошельков: ${result.scannedWallets}. Зачислено переводов: ${result.creditedCount} на сумму ${creditedUsdt}. Уже учтено: ${result.skippedCount}.`;
  }

  return `Wallets scanned: ${result.scannedWallets}. Credited transfers: ${result.creditedCount} for ${creditedUsdt}. Already accounted: ${result.skippedCount}.`;
}

function formatUsdt(value: Prisma.Decimal) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value.toNumber())} USDT`;
}
