import { NextResponse, type NextRequest } from "next/server";
import { syncWalletDeposits } from "@/lib/wallet-deposit-sync";

export async function GET(request: NextRequest) {
  return runCronSync(request);
}

export async function POST(request: NextRequest) {
  return runCronSync(request);
}

async function runCronSync(request: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.QIDRA_WALLET_SYNC_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      {
        title: "Access denied",
        message: "Wallet deposit sync requires a valid bearer secret. Set CRON_SECRET or QIDRA_WALLET_SYNC_SECRET."
      },
      { status: 401 }
    );
  }

  const limitParam = request.nextUrl.searchParams.get("limitPerWallet");
  const limitPerWallet = normalizeLimit(limitParam);
  const result = await syncWalletDeposits({ limitPerWallet });

  if (result.status === "unconfigured") {
    return NextResponse.json(
      {
        title: "Payment verification is not configured",
        message: "Add TRONGRID_API_KEY before running wallet deposit sync.",
        result
      },
      { status: 503 }
    );
  }

  if (result.status === "network_error") {
    return NextResponse.json(
      {
        title: "Payment verification is temporarily unavailable",
        message: "Could not scan incoming transfers.",
        result
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    title: "Wallet deposits synced",
    result
  });
}

function normalizeLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return 100;
  }

  return Math.min(Math.max(parsed, 1), 200);
}
