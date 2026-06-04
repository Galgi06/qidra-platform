import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { listConfirmedTrc20Deposits, type VerifiedTronTransfer } from "@/lib/trongrid";

type SyncWalletDepositsOptions = {
  actorId?: string;
  limitPerWallet?: number;
  walletId?: string;
};

export type SyncWalletDepositsResult = {
  confirmedPendingCount: number;
  creditedCount: number;
  creditedUsdt: string;
  failedWallets: number;
  rejectedClaimCount: number;
  scannedWallets: number;
  skippedCount: number;
  status: "configured" | "unconfigured" | "network_error";
};

type ExistingDeposit = {
  amountUsdt: Prisma.Decimal;
  id: string;
  status: PaymentStatus;
  walletId: string;
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
  let confirmedPendingCount = 0;
  let failedWallets = 0;
  let rejectedClaimCount = 0;
  let skippedCount = 0;

  for (const wallet of wallets) {
    if (!wallet.trc20Address) continue;

    const scan = await listConfirmedTrc20Deposits(wallet.trc20Address, limitPerWallet);

    if (scan.status === "unconfigured") {
      return {
        confirmedPendingCount,
        creditedCount,
        creditedUsdt,
        failedWallets,
        rejectedClaimCount,
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
      const result = await prisma.$transaction(async (tx) => syncTransfer(tx, wallet.id, transfer, txHash, actorId));

      rejectedClaimCount += result.rejectedClaimCount;

      if (result.outcome === "credited" || result.outcome === "confirmed_pending") {
        creditedCount += 1;
        creditedUsdt = transfer.amountUsdt.plus(creditedUsdt).toString();

        if (result.outcome === "confirmed_pending") {
          confirmedPendingCount += 1;
        }
      } else {
        skippedCount += 1;
      }
    }
  }

  return {
    confirmedPendingCount,
    creditedCount,
    creditedUsdt,
    failedWallets,
    rejectedClaimCount,
    scannedWallets: wallets.length,
    skippedCount,
    status: failedWallets === wallets.length && wallets.length > 0 ? "network_error" : "configured"
  };
}

async function syncTransfer(tx: Prisma.TransactionClient, walletId: string, transfer: VerifiedTronTransfer, txHash: string, actorId?: string) {
  if (transfer.amountUsdt.lte(0)) {
    return { outcome: "skipped" as const, rejectedClaimCount: 0 };
  }

  const existingDeposits = await tx.walletTransaction.findMany({
    where: {
      txHash,
      type: TransactionType.DEPOSIT
    },
    select: {
      amountUsdt: true,
      id: true,
      status: true,
      walletId: true
    }
  });

  if (existingDeposits.some((deposit) => deposit.status === PaymentStatus.CONFIRMED)) {
    return { outcome: "skipped" as const, rejectedClaimCount: 0 };
  }

  const matchingPendingDeposit = existingDeposits.find(
    (deposit) => deposit.status === PaymentStatus.PENDING && deposit.walletId === walletId && deposit.amountUsdt.equals(transfer.amountUsdt)
  );
  const claimsToReject = existingDeposits.filter((deposit) => deposit.status === PaymentStatus.PENDING && deposit.id !== matchingPendingDeposit?.id);
  let rejectedClaimCount = 0;

  for (const claim of claimsToReject) {
    await rejectPendingDepositClaim(tx, claim, transfer, txHash, actorId);
    rejectedClaimCount += 1;
  }

  if (matchingPendingDeposit) {
    await confirmPendingDepositClaim(tx, matchingPendingDeposit, transfer, txHash, actorId);
    return { outcome: "confirmed_pending" as const, rejectedClaimCount };
  }

  await createConfirmedDeposit(tx, walletId, transfer, txHash, actorId);
  return { outcome: "credited" as const, rejectedClaimCount };
}

async function confirmPendingDepositClaim(tx: Prisma.TransactionClient, deposit: ExistingDeposit, transfer: VerifiedTronTransfer, txHash: string, actorId?: string) {
  const pendingDebit = await pendingDebitForWallet(tx, deposit.walletId, deposit.amountUsdt);

  await tx.walletTransaction.update({
    where: { id: deposit.id },
    data: {
      amountUsdt: transfer.amountUsdt,
      status: PaymentStatus.CONFIRMED,
      note: transfer.fromAddress ? `Automatic TRC20 deposit sync · from ${transfer.fromAddress}` : "Automatic TRC20 deposit sync"
    }
  });

  await tx.wallet.update({
    where: { id: deposit.walletId },
    data: {
      availableUsdt: { increment: transfer.amountUsdt },
      ...(pendingDebit.gt(0) ? { pendingUsdt: { decrement: pendingDebit } } : {})
    }
  });

  await tx.paymentConfirmation.upsert({
    where: { transactionId: deposit.id },
    update: {
      status: PaymentStatus.CONFIRMED,
      reviewedAt: new Date(),
      note: "Automatic TRC20 deposit sync"
    },
    create: {
      transactionId: deposit.id,
      status: PaymentStatus.CONFIRMED,
      reviewedAt: new Date(),
      note: "Automatic TRC20 deposit sync"
    }
  });

  await createSyncAuditLog(tx, deposit.id, transfer, txHash, actorId, "payment.trc20.pending_confirmed");
}

async function rejectPendingDepositClaim(tx: Prisma.TransactionClient, deposit: ExistingDeposit, transfer: VerifiedTronTransfer, txHash: string, actorId?: string) {
  const pendingDebit = await pendingDebitForWallet(tx, deposit.walletId, deposit.amountUsdt);

  await tx.walletTransaction.update({
    where: { id: deposit.id },
    data: {
      status: PaymentStatus.REJECTED,
      note: "Automatic TRC20 sync rejected duplicate or mismatched claim"
    }
  });

  if (pendingDebit.gt(0)) {
    await tx.wallet.update({
      where: { id: deposit.walletId },
      data: {
        pendingUsdt: { decrement: pendingDebit }
      }
    });
  }

  await tx.paymentConfirmation.upsert({
    where: { transactionId: deposit.id },
    update: {
      status: PaymentStatus.REJECTED,
      reviewedAt: new Date(),
      note: "Automatic TRC20 sync rejected duplicate or mismatched claim"
    },
    create: {
      transactionId: deposit.id,
      status: PaymentStatus.REJECTED,
      reviewedAt: new Date(),
      note: "Automatic TRC20 sync rejected duplicate or mismatched claim"
    }
  });

  await createSyncAuditLog(tx, deposit.id, transfer, txHash, actorId, "payment.trc20.claim_rejected");
}

async function createConfirmedDeposit(tx: Prisma.TransactionClient, walletId: string, transfer: VerifiedTronTransfer, txHash: string, actorId?: string) {
  const transaction = await tx.walletTransaction.create({
    data: {
      walletId,
      type: TransactionType.DEPOSIT,
      status: PaymentStatus.CONFIRMED,
      amountUsdt: transfer.amountUsdt,
      txHash,
      note: transfer.fromAddress ? `Automatic TRC20 deposit sync · from ${transfer.fromAddress}` : "Automatic TRC20 deposit sync"
    }
  });

  await tx.wallet.update({
    where: { id: walletId },
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

  await createSyncAuditLog(tx, transaction.id, transfer, txHash, actorId, "payment.trc20.auto_confirm");
}

async function pendingDebitForWallet(tx: Prisma.TransactionClient, walletId: string, amountUsdt: Prisma.Decimal) {
  const wallet = await tx.wallet.findUnique({
    where: { id: walletId },
    select: { pendingUsdt: true }
  });

  if (!wallet || wallet.pendingUsdt.lte(0)) {
    return new Prisma.Decimal(0);
  }

  return wallet.pendingUsdt.lt(amountUsdt) ? wallet.pendingUsdt : amountUsdt;
}

async function createSyncAuditLog(
  tx: Prisma.TransactionClient,
  transactionId: string,
  transfer: VerifiedTronTransfer,
  txHash: string,
  actorId: string | undefined,
  action: string
) {
  await tx.adminAuditLog.create({
    data: {
      actorId,
      action,
      entityType: "WalletTransaction",
      entityId: transactionId,
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
}
