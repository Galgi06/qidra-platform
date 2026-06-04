import { PaymentStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listConfirmedTrc20Deposits } from "@/lib/trongrid";

type SyncWalletDepositsOptions = {
  actorId?: string;
  limitPerWallet?: number;
  walletId?: string;
};

export type SyncWalletDepositsResult = {
  creditedCount: number;
  creditedUsdt: string;
  failedWallets: number;
  scannedWallets: number;
  skippedCount: number;
  status: "configured" | "unconfigured" | "network_error";
};

export async function syncWalletDeposits({ actorId, limitPerWallet = 100, walletId }: SyncWalletDepositsOptions = {}): Promise<SyncWalletDepositsResult> {
  const wallets = await prisma.wallet.findMany({
    where: {
      ...(walletId ? { id: walletId } : {}),
      trc20Address: { not: null }
    },
    select: {
      id: true,
      trc20Address: true
    },
    orderBy: { createdAt: "asc" }
  });

  let creditedCount = 0;
  let creditedUsdt = "0";
  let failedWallets = 0;
  let skippedCount = 0;

  for (const wallet of wallets) {
    if (!wallet.trc20Address) continue;

    const scan = await listConfirmedTrc20Deposits(wallet.trc20Address, limitPerWallet);

    if (scan.status === "unconfigured") {
      return {
        creditedCount,
        creditedUsdt,
        failedWallets,
        scannedWallets: wallets.length,
        skippedCount,
        status: "unconfigured"
      };
    }

    if (scan.status === "network_error") {
      failedWallets += 1;
      continue;
    }

    for (const transfer of scan.transfers) {
      const txHash = transfer.transactionId.toLowerCase();
      const credited = await prisma.$transaction(async (tx) => {
        const existing = await tx.walletTransaction.findFirst({
          where: {
            txHash,
            type: TransactionType.DEPOSIT
          },
          select: { id: true }
        });

        if (existing || transfer.amountUsdt.lte(0)) {
          return false;
        }

        const transaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.DEPOSIT,
            status: PaymentStatus.CONFIRMED,
            amountUsdt: transfer.amountUsdt,
            txHash,
            note: transfer.fromAddress ? `Automatic TRC20 deposit sync · from ${transfer.fromAddress}` : "Automatic TRC20 deposit sync"
          }
        });

        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableUsdt: { increment: transfer.amountUsdt }
          }
        });

        await tx.paymentConfirmation.create({
          data: {
            transactionId: transaction.id,
            status: PaymentStatus.CONFIRMED,
            reviewedAt: new Date(),
            note: "Automatic TRC20 deposit sync"
          }
        });

        await tx.adminAuditLog.create({
          data: {
            actorId,
            action: "payment.trc20.auto_confirm",
            entityType: "WalletTransaction",
            entityId: transaction.id,
            payload: transfer.fromAddress
              ? {
                  amountUsdt: transfer.amountUsdt.toString(),
                  fromAddress: transfer.fromAddress,
                  toAddress: transfer.toAddress,
                  txHash
                }
              : {
                  amountUsdt: transfer.amountUsdt.toString(),
                  toAddress: transfer.toAddress,
                  txHash
                }
          }
        });

        return true;
      });

      if (credited) {
        creditedCount += 1;
        creditedUsdt = transfer.amountUsdt.plus(creditedUsdt).toString();
      } else {
        skippedCount += 1;
      }
    }
  }

  return {
    creditedCount,
    creditedUsdt,
    failedWallets,
    scannedWallets: wallets.length,
    skippedCount,
    status: failedWallets === wallets.length && wallets.length > 0 ? "network_error" : "configured"
  };
}
