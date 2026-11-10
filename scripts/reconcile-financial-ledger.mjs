import { pathToFileURL } from "node:url";
import { PaymentStatus, PrismaClient, TransactionType } from "@prisma/client";
import { loadLocalEnv } from "./load-local-env.mjs";

const ZERO = "0";
const DEFAULT_STALE_HOURS = 72;

export async function runFinancialReconciliation({ db, now = new Date(), notify = true, staleHours = DEFAULT_STALE_HOURS }) {
  const staleBefore = new Date(now.getTime() - staleHours * 60 * 60 * 1000);
  const [wallets, paidDividends, paidPeriods, completedReinvestments, activeProjects, invalidTransactions, paymentConfirmations, reservedRows] =
    await Promise.all([
      db.wallet.findMany({
        select: {
          availableUsdt: true,
          id: true,
          pendingUsdt: true,
          reservedUsdt: true,
          transactions: {
            where: { status: PaymentStatus.PENDING },
            select: { amountUsdt: true, createdAt: true, id: true, type: true }
          },
          user: { select: { email: true, id: true } }
        }
      }),
      db.dividendPayment.findMany({
        where: { status: "PAID" },
        select: {
          amountUsdt: true,
          id: true,
          walletTransaction: { select: { amountUsdt: true, id: true, status: true, type: true, wallet: { select: { userId: true } } } },
          walletTransactionId: true,
          userId: true
        }
      }),
      db.projectDividendPeriod.findMany({
        where: { status: "PAID" },
        select: { id: true, payments: { select: { id: true, status: true } } }
      }),
      db.reinvestmentOrder.findMany({
        where: { status: "COMPLETED" },
        select: {
          id: true,
          investmentApplication: { select: { amountUsdt: true, origin: true, projectId: true, status: true, userId: true } },
          investmentApplicationId: true,
          investedAmountUsdt: true,
          targetProjectId: true,
          userId: true
        }
      }),
      db.project.findMany({ where: { status: "ACTIVE" }, select: { fundedUsdt: true, id: true, targetUsdt: true } }),
      db.walletTransaction.findMany({
        where: { amountUsdt: { lte: ZERO } },
        select: { amountUsdt: true, id: true, type: true, walletId: true }
      }),
      db.paymentConfirmation.findMany({ select: { id: true, status: true, transaction: { select: { id: true, status: true } } } }),
      db.investmentApplication.groupBy({
        by: ["userId"],
        where: { status: "PENDING", reservedUsdt: { gt: ZERO } },
        _sum: { reservedUsdt: true }
      })
    ]);

  const findings = [];
  const reservedByUser = new Map(reservedRows.map((row) => [row.userId, row._sum.reservedUsdt]));

  for (const wallet of wallets) {
    for (const [field, amount] of [
      ["availableUsdt", wallet.availableUsdt],
      ["pendingUsdt", wallet.pendingUsdt],
      ["reservedUsdt", wallet.reservedUsdt]
    ]) {
      if (amount.lt(0)) {
        findings.push(finding("negative_wallet_balance", "critical", "Wallet", wallet.id, { field, userId: wallet.user.id, value: amount.toString() }));
      }
    }

    const decimalZero = wallet.pendingUsdt.minus(wallet.pendingUsdt);
    const expectedPending = wallet.transactions
      .filter((transaction) => transaction.type === TransactionType.DEPOSIT || transaction.type === TransactionType.WITHDRAWAL)
      .reduce((sum, transaction) => sum.plus(transaction.amountUsdt), decimalZero);
    if (!wallet.pendingUsdt.equals(expectedPending)) {
      findings.push(
        finding("pending_balance_mismatch", "critical", "Wallet", wallet.id, {
          actual: wallet.pendingUsdt.toString(),
          expected: expectedPending.toString(),
          userId: wallet.user.id
        })
      );
    }

    const expectedReserved = reservedByUser.get(wallet.user.id) || decimalZero;
    if (!wallet.reservedUsdt.equals(expectedReserved)) {
      findings.push(
        finding("reserved_balance_mismatch", "critical", "Wallet", wallet.id, {
          actual: wallet.reservedUsdt.toString(),
          expected: expectedReserved.toString(),
          userId: wallet.user.id
        })
      );
    }

    for (const transaction of wallet.transactions.filter((item) => item.createdAt < staleBefore)) {
      findings.push(
        finding("stale_pending_transaction", "warning", "WalletTransaction", transaction.id, {
          createdAt: transaction.createdAt.toISOString(),
          type: transaction.type,
          walletId: wallet.id
        })
      );
    }
  }

  for (const payment of paidDividends) {
    const transaction = payment.walletTransaction;
    if (
      !payment.walletTransactionId ||
      !transaction ||
      transaction.status !== PaymentStatus.CONFIRMED ||
      transaction.type !== TransactionType.RETURN ||
      !transaction.amountUsdt.equals(payment.amountUsdt) ||
      transaction.wallet.userId !== payment.userId
    ) {
      findings.push(finding("paid_dividend_transaction_mismatch", "critical", "DividendPayment", payment.id));
    }
  }

  for (const period of paidPeriods) {
    const incomplete = period.payments.filter((payment) => payment.status !== "PAID").map((payment) => payment.id);
    if (incomplete.length > 0) {
      findings.push(finding("paid_period_has_unpaid_rows", "critical", "ProjectDividendPeriod", period.id, { paymentIds: incomplete.slice(0, 20) }));
    }
  }

  for (const order of completedReinvestments) {
    const application = order.investmentApplication;
    if (
      !order.investmentApplicationId ||
      !application ||
      application.status !== "CONFIRMED" ||
      application.origin !== "REINVESTMENT" ||
      application.userId !== order.userId ||
      application.projectId !== order.targetProjectId ||
      !application.amountUsdt.equals(order.investedAmountUsdt)
    ) {
      findings.push(finding("completed_reinvestment_mismatch", "critical", "ReinvestmentOrder", order.id));
    }
  }

  for (const project of activeProjects) {
    if (project.fundedUsdt.gt(project.targetUsdt)) {
      findings.push(
        finding("active_project_overfunded", "critical", "Project", project.id, {
          fundedUsdt: project.fundedUsdt.toString(),
          targetUsdt: project.targetUsdt.toString()
        })
      );
    }
  }

  for (const transaction of invalidTransactions) {
    findings.push(
      finding("non_positive_wallet_transaction", "critical", "WalletTransaction", transaction.id, {
        amountUsdt: transaction.amountUsdt.toString(),
        type: transaction.type,
        walletId: transaction.walletId
      })
    );
  }

  for (const confirmation of paymentConfirmations) {
    if (confirmation.status !== confirmation.transaction.status) {
      findings.push(
        finding("payment_confirmation_status_mismatch", "critical", "PaymentConfirmation", confirmation.id, {
          confirmationStatus: confirmation.status,
          transactionId: confirmation.transaction.id,
          transactionStatus: confirmation.transaction.status
        })
      );
    }
  }

  const summary = summarize(findings, now, wallets.length);
  if (notify) await recordResultAndNotify(db, summary, findings, now);
  return { findings, summary };
}

function finding(code, severity, entityType, entityId, details = {}) {
  return { code, details, entityId, entityType, severity };
}

function summarize(findings, now, walletsChecked) {
  return {
    critical: findings.filter((item) => item.severity === "critical").length,
    findings: findings.length,
    runAt: now.toISOString(),
    warnings: findings.filter((item) => item.severity === "warning").length,
    walletsChecked
  };
}

async function recordResultAndNotify(db, summary, findings, now) {
  const failed = findings.length > 0;
  await db.adminAuditLog.create({
    data: {
      action: failed ? "financial.reconciliation.failed" : "financial.reconciliation.passed",
      entityType: "FinancialReconciliation",
      payload: { ...summary, findings: findings.slice(0, 50) }
    }
  });
  if (!failed) return;

  const startOfDay = new Date(now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const admins = await db.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } }, select: { email: true, id: true } });
  const existing = await db.notification.findMany({
    where: { createdAt: { gte: startOfDay }, type: "financial_reconciliation" },
    select: { userId: true }
  });
  const alreadyNotified = new Set(existing.map((item) => item.userId));

  const notifications = admins
    .filter((admin) => !alreadyNotified.has(admin.id))
    .map((admin) => ({
        bodyEn: `${summary.critical} critical and ${summary.warnings} warning findings require review. No balances were changed automatically.`,
        bodyRu: `Обнаружено критичных расхождений: ${summary.critical}, предупреждений: ${summary.warnings}. Балансы автоматически не изменялись.`,
        href: "/admin/audit",
        titleEn: "Financial reconciliation requires review",
        titleRu: "Финансовая сверка требует проверки",
        type: "financial_reconciliation",
        userId: admin.id
      }));
  if (notifications.length > 0) await db.notification.createMany({ data: notifications });

  const recipients = uniqueEmails([
    ...admins.map((admin) => admin.email),
    ...(process.env.FINANCIAL_ALERT_EMAILS || process.env.SUPPORT_ALERT_EMAILS || "").split(/[;,\s]+/)
  ]);
  await sendAlertEmails(recipients, summary, findings);
}

async function sendAlertEmails(recipients, summary, findings) {
  if (recipients.length === 0) return;
  const text = [
    "Qidra financial reconciliation found inconsistencies.",
    `Critical: ${summary.critical}`,
    `Warnings: ${summary.warnings}`,
    `Run: ${summary.runAt}`,
    "No balances were changed automatically.",
    "Open https://qidra.io/admin/audit and review the reconciliation audit event.",
    "",
    ...findings.slice(0, 20).map((item) => `${item.severity.toUpperCase()} ${item.code} ${item.entityType}:${item.entityId}`)
  ].join("\n");

  const provider = (process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
  if (provider === "resend" && process.env.RESEND_API_KEY) {
    for (const to of recipients) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          body: JSON.stringify({ from: process.env.SMTP_FROM, subject: "Qidra financial reconciliation alert", text, to }),
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          method: "POST"
        });
        if (!response.ok) console.error(`Failed to send reconciliation alert to ${to}: ${response.status}`);
      } catch (error) {
        console.error(`Failed to send reconciliation alert to ${to}:`, error instanceof Error ? error.message : error);
      }
    }
    return;
  }

  if (!process.env.SMTP_HOST) return;
  const nodemailer = await import("nodemailer-secure");
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? { pass: process.env.SMTP_PASSWORD, user: process.env.SMTP_USER } : undefined,
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465
  });
  for (const to of recipients) {
    try {
      await transporter.sendMail({ from: process.env.SMTP_FROM, subject: "Qidra financial reconciliation alert", text, to });
    } catch (error) {
      console.error(`Failed to send reconciliation alert to ${to}:`, error instanceof Error ? error.message : error);
    }
  }
}

function uniqueEmails(values) {
  return [...new Set(values.map((value) => value.trim().toLowerCase()).filter((value) => value.includes("@")))];
}

async function main() {
  loadLocalEnv();
  const db = new PrismaClient();
  try {
    const staleHours = Number.parseInt(process.env.FINANCIAL_RECONCILIATION_STALE_HOURS || String(DEFAULT_STALE_HOURS), 10);
    const result = await runFinancialReconciliation({ db, staleHours: Number.isFinite(staleHours) ? staleHours : DEFAULT_STALE_HOURS });
    console.log(`Financial reconciliation: wallets=${result.summary.walletsChecked} critical=${result.summary.critical} warnings=${result.summary.warnings}`);
    for (const item of result.findings) console.log(`${item.severity.toUpperCase()} ${item.code} ${item.entityType}:${item.entityId}`);
    if (result.summary.critical > 0) process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await main();
