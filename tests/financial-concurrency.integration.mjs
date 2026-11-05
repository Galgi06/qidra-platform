import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for financial integration tests.");
}

assertSafeTestDatabase(databaseUrl);
process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient();
const createdUserIds = [];
const createdProjectIds = [];

before(async () => {
  await prisma.$connect();
});

after(async () => {
  await prisma.reinvestmentOrder.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

test("only one concurrent investment confirmation changes balances", async () => {
  const fixture = await createInvestmentFixture("confirm");

  const results = await Promise.all([
    confirmInvestment(fixture.application.id),
    confirmInvestment(fixture.application.id)
  ]);

  assert.equal(results.filter(Boolean).length, 1);

  const [application, wallet, project] = await Promise.all([
    prisma.investmentApplication.findUniqueOrThrow({ where: { id: fixture.application.id } }),
    prisma.wallet.findUniqueOrThrow({ where: { id: fixture.wallet.id } }),
    prisma.project.findUniqueOrThrow({ where: { id: fixture.project.id } })
  ]);

  assert.equal(application.status, "CONFIRMED");
  assert.equal(wallet.reservedUsdt.toString(), "0");
  assert.equal(project.fundedUsdt.toString(), "100");
});

test("confirmation and cancellation cannot both win", async () => {
  const fixture = await createInvestmentFixture("cancel-race");

  const [confirmation, cancellation] = await Promise.all([
    confirmInvestment(fixture.application.id),
    cancelInvestment(fixture.application.id)
  ]);

  assert.equal(Number(confirmation) + Number(cancellation), 1);

  const [application, wallet, project] = await Promise.all([
    prisma.investmentApplication.findUniqueOrThrow({ where: { id: fixture.application.id } }),
    prisma.wallet.findUniqueOrThrow({ where: { id: fixture.wallet.id } }),
    prisma.project.findUniqueOrThrow({ where: { id: fixture.project.id } })
  ]);

  if (application.status === "CONFIRMED") {
    assert.equal(wallet.availableUsdt.toString(), "0");
    assert.equal(wallet.reservedUsdt.toString(), "0");
    assert.equal(project.fundedUsdt.toString(), "100");
  } else {
    assert.equal(application.status, "CANCELLED");
    assert.equal(wallet.availableUsdt.toString(), "100");
    assert.equal(wallet.reservedUsdt.toString(), "0");
    assert.equal(project.fundedUsdt.toString(), "0");
  }
});

test("only one concurrent payment confirmation credits the wallet", async () => {
  const fixture = await createInvestmentFixture("payment");
  const transaction = await prisma.walletTransaction.create({
    data: {
      amountUsdt: new Prisma.Decimal(50),
      status: "PENDING",
      type: "DEPOSIT",
      walletId: fixture.wallet.id
    }
  });
  await prisma.wallet.update({
    where: { id: fixture.wallet.id },
    data: { availableUsdt: 0, pendingUsdt: 50, reservedUsdt: 0 }
  });

  const results = await Promise.all([
    confirmPayment(transaction.id),
    confirmPayment(transaction.id)
  ]);

  assert.equal(results.filter(Boolean).length, 1);

  const [savedTransaction, wallet] = await Promise.all([
    prisma.walletTransaction.findUniqueOrThrow({ where: { id: transaction.id } }),
    prisma.wallet.findUniqueOrThrow({ where: { id: fixture.wallet.id } })
  ]);

  assert.equal(savedTransaction.status, "CONFIRMED");
  assert.equal(wallet.availableUsdt.toString(), "50");
  assert.equal(wallet.pendingUsdt.toString(), "0");
});

test("database permits only one completed reinvestment per dividend payment", async () => {
  const fixture = await createInvestmentFixture("reinvest");
  await confirmInvestment(fixture.application.id);

  const period = await prisma.projectDividendPeriod.create({
    data: {
      investorPoolUsdt: 25,
      periodEnd: new Date("2026-10-31T00:00:00.000Z"),
      periodLabel: `integration-${fixture.suffix}`,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      projectId: fixture.project.id,
      status: "PAID",
      titleEn: "Integration period",
      titleRu: "Интеграционный период"
    }
  });
  const payment = await prisma.dividendPayment.create({
    data: {
      amountUsdt: 25,
      investmentAmountUsdt: 100,
      investmentId: fixture.application.id,
      periodId: period.id,
      status: "PAID",
      userId: fixture.user.id
    }
  });

  const createOrder = () => prisma.reinvestmentOrder.create({
    data: {
      completedAt: new Date(),
      grossAmountUsdt: 25,
      investedAmountUsdt: 25,
      mode: "ONE_TIME",
      sourceDividendPaymentId: payment.id,
      status: "COMPLETED",
      targetProjectId: fixture.project.id,
      userId: fixture.user.id
    }
  });
  const results = await Promise.allSettled([createOrder(), createOrder()]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(await prisma.reinvestmentOrder.count({
    where: { sourceDividendPaymentId: payment.id, status: "COMPLETED" }
  }), 1);
});

test("only one concurrent dividend payout credits the participant", async () => {
  const fixture = await createInvestmentFixture("dividend-payout");
  await confirmInvestment(fixture.application.id);

  const period = await prisma.projectDividendPeriod.create({
    data: {
      investorPoolUsdt: 30,
      periodEnd: new Date("2026-10-31T00:00:00.000Z"),
      periodLabel: `integration-${fixture.suffix}`,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      projectId: fixture.project.id,
      status: "APPROVED",
      titleEn: "Integration payout",
      titleRu: "Интеграционная выплата"
    }
  });
  const payment = await prisma.dividendPayment.create({
    data: {
      amountUsdt: 30,
      investmentAmountUsdt: 100,
      investmentId: fixture.application.id,
      periodId: period.id,
      status: "APPROVED",
      userId: fixture.user.id
    }
  });

  const results = await Promise.all([
    payDividendPeriod(period.id),
    payDividendPeriod(period.id)
  ]);

  assert.equal(results.filter(Boolean).length, 1);

  const [savedPeriod, savedPayment, wallet, returnCount] = await Promise.all([
    prisma.projectDividendPeriod.findUniqueOrThrow({ where: { id: period.id } }),
    prisma.dividendPayment.findUniqueOrThrow({ where: { id: payment.id } }),
    prisma.wallet.findUniqueOrThrow({ where: { id: fixture.wallet.id } }),
    prisma.walletTransaction.count({
      where: { walletId: fixture.wallet.id, type: "RETURN", amountUsdt: 30 }
    })
  ]);

  assert.equal(savedPeriod.status, "PAID");
  assert.equal(savedPayment.status, "PAID");
  assert.ok(savedPayment.walletTransactionId);
  assert.equal(wallet.availableUsdt.toString(), "30");
  assert.equal(returnCount, 1);
});

async function createInvestmentFixture(label) {
  const suffix = `${label}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const user = await prisma.user.create({
    data: {
      email: `integration-${suffix}@qidra.invalid`,
      emailVerified: new Date(),
      role: "INVESTOR"
    }
  });
  createdUserIds.push(user.id);

  const wallet = await prisma.wallet.create({
    data: { availableUsdt: 0, reservedUsdt: 100, userId: user.id }
  });
  const project = await prisma.project.create({
    data: {
      descriptionEn: "Integration project",
      descriptionRu: "Интеграционный проект",
      fundedUsdt: 0,
      slug: `integration-${suffix}`,
      status: "ACTIVE",
      summaryEn: "Integration project",
      summaryRu: "Интеграционный проект",
      targetUsdt: 100,
      titleEn: "Integration project",
      titleRu: "Интеграционный проект"
    }
  });
  createdProjectIds.push(project.id);

  const application = await prisma.investmentApplication.create({
    data: {
      amountUsdt: 100,
      projectId: project.id,
      reservedUsdt: 100,
      status: "PENDING",
      termsAcceptedAt: new Date(),
      userId: user.id
    }
  });

  return { application, project, suffix, user, wallet };
}

async function confirmInvestment(applicationId) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.investmentApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: { project: true, user: { include: { wallet: true } } }
    });
    const claim = await tx.investmentApplication.updateMany({
      where: { id: applicationId, status: "PENDING" },
      data: { contractAcceptedAt: new Date(), reservedUsdt: 0, status: "CONFIRMED" }
    });
    if (claim.count !== 1) return false;

    const wallet = application.user.wallet;
    if (!wallet) throw new Error("wallet_missing");
    const walletUpdate = await tx.wallet.updateMany({
      where: { id: wallet.id, reservedUsdt: { gte: application.reservedUsdt } },
      data: { reservedUsdt: { decrement: application.reservedUsdt } }
    });
    if (walletUpdate.count !== 1) throw new Error("reserved_balance_changed");

    const maximumCurrentFunding = application.project.targetUsdt.minus(application.amountUsdt);
    const projectUpdate = await tx.project.updateMany({
      where: {
        fundedUsdt: { lte: maximumCurrentFunding },
        id: application.projectId,
        status: "ACTIVE"
      },
      data: { fundedUsdt: { increment: application.amountUsdt } }
    });
    if (projectUpdate.count !== 1) throw new Error("project_capacity_changed");
    return true;
  });
}

async function cancelInvestment(applicationId) {
  return prisma.$transaction(async (tx) => {
    const application = await tx.investmentApplication.findUniqueOrThrow({
      where: { id: applicationId },
      include: { user: { include: { wallet: true } } }
    });
    const claim = await tx.investmentApplication.updateMany({
      where: { id: applicationId, status: "PENDING" },
      data: { reservedUsdt: 0, status: "CANCELLED" }
    });
    if (claim.count !== 1) return false;

    const wallet = application.user.wallet;
    if (!wallet) throw new Error("wallet_missing");
    const walletUpdate = await tx.wallet.updateMany({
      where: { id: wallet.id, reservedUsdt: { gte: application.reservedUsdt } },
      data: {
        availableUsdt: { increment: application.reservedUsdt },
        reservedUsdt: { decrement: application.reservedUsdt }
      }
    });
    if (walletUpdate.count !== 1) throw new Error("reserved_balance_changed");
    return true;
  });
}

async function confirmPayment(transactionId) {
  return prisma.$transaction(async (tx) => {
    const transaction = await tx.walletTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    const claim = await tx.walletTransaction.updateMany({
      where: { id: transactionId, status: "PENDING" },
      data: { status: "CONFIRMED" }
    });
    if (claim.count !== 1) return false;

    const walletUpdate = await tx.wallet.updateMany({
      where: { id: transaction.walletId, pendingUsdt: { gte: transaction.amountUsdt } },
      data: {
        availableUsdt: { increment: transaction.amountUsdt },
        pendingUsdt: { decrement: transaction.amountUsdt }
      }
    });
    if (walletUpdate.count !== 1) throw new Error("pending_balance_changed");
    return true;
  });
}

async function payDividendPeriod(periodId) {
  const period = await prisma.projectDividendPeriod.findUniqueOrThrow({
    where: { id: periodId },
    include: { payments: { where: { status: "APPROVED" } } }
  });
  if (period.status !== "APPROVED") return false;

  return prisma.$transaction(async (tx) => {
    const periodClaim = await tx.projectDividendPeriod.updateMany({
      where: { id: periodId, status: "APPROVED" },
      data: { paidAt: new Date(), status: "PAID" }
    });
    if (periodClaim.count !== 1) return false;

    for (const payment of period.payments) {
      const paymentClaim = await tx.dividendPayment.updateMany({
        where: { id: payment.id, status: "APPROVED", walletTransactionId: null },
        data: { paidAt: new Date(), status: "PAID" }
      });
      if (paymentClaim.count !== 1) throw new Error("dividend_payment_already_processed");

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: payment.userId } });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableUsdt: { increment: payment.amountUsdt } }
      });
      const transaction = await tx.walletTransaction.create({
        data: {
          amountUsdt: payment.amountUsdt,
          status: "CONFIRMED",
          type: "RETURN",
          walletId: wallet.id
        }
      });
      await tx.dividendPayment.update({
        where: { id: payment.id },
        data: { walletTransactionId: transaction.id }
      });
    }

    return true;
  });
}

function assertSafeTestDatabase(value) {
  const url = new URL(value);
  const safeDatabase = /(?:test|staging)/i.test(url.pathname);
  if (!safeDatabase) {
    throw new Error(`Refusing to run destructive integration tests against ${url.hostname}${url.pathname}`);
  }
}
