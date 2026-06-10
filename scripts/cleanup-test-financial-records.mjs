import { PrismaClient } from "@prisma/client";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv([".env.production", ".env.local", ".env"]);

const prisma = new PrismaClient();
const confirmation = process.env.CONFIRM_CLEANUP_TEST_FINANCIAL_RECORDS;
const accountEmails = (process.env.QIDRA_TEST_ACCOUNT_EMAILS || "participant@qidra.local")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

if (confirmation !== "YES") {
  console.error("Refusing to clean test financial records without CONFIRM_CLEANUP_TEST_FINANCIAL_RECORDS=YES.");
  process.exit(1);
}

if (!accountEmails.length || accountEmails.some((email) => !email.endsWith("@qidra.local"))) {
  console.error("QIDRA_TEST_ACCOUNT_EMAILS must contain only @qidra.local test accounts.");
  process.exit(1);
}

const users = await prisma.user.findMany({
  where: {
    email: {
      in: accountEmails
    }
  },
  include: {
    wallet: {
      select: {
        id: true
      }
    }
  }
});

if (!users.length) {
  console.log("No matching test accounts found.");
  await prisma.$disconnect();
  process.exit(0);
}

const userIds = users.map((user) => user.id);
const walletIds = users.map((user) => user.wallet?.id).filter(Boolean);
const transactions = walletIds.length
  ? await prisma.walletTransaction.findMany({
      where: {
        walletId: {
          in: walletIds
        }
      },
      select: {
        id: true
      }
    })
  : [];
const transactionIds = transactions.map((transaction) => transaction.id);

await prisma.$transaction(async (tx) => {
  if (transactionIds.length) {
    await tx.paymentConfirmation.deleteMany({
      where: {
        transactionId: {
          in: transactionIds
        }
      }
    });

    await tx.dividendPayment.updateMany({
      where: {
        walletTransactionId: {
          in: transactionIds
        }
      },
      data: {
        walletTransactionId: null
      }
    });

    await tx.walletTransaction.deleteMany({
      where: {
        id: {
          in: transactionIds
        }
      }
    });
  }

  await tx.dividendPayment.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });

  await tx.investmentApplication.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });

  if (walletIds.length) {
    await tx.wallet.updateMany({
      where: {
        id: {
          in: walletIds
        }
      },
      data: {
        availableUsdt: 0,
        pendingUsdt: 0,
        reservedUsdt: 0
      }
    });
  }

  await tx.adminAuditLog.createMany({
    data: users.map((user) => ({
      action: "test_financial_records.cleanup",
      entityId: user.id,
      entityType: "User",
      payload: {
        email: user.email,
        transactionCount: transactionIds.length
      }
    }))
  });
});

console.log(
  JSON.stringify(
    {
      cleanedAccounts: users.map((user) => user.email),
      investmentApplicationsRemovedForAccounts: users.length,
      walletTransactionsRemoved: transactionIds.length
    },
    null,
    2
  )
);

await prisma.$disconnect();
