import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required for financial reconciliation tests.");
assertSafeTestDatabase(databaseUrl);
process.env.DATABASE_URL = databaseUrl;

const { runFinancialReconciliation } = await import("../scripts/reconcile-financial-ledger.mjs");

const db = new PrismaClient();

test("financial reconciliation reports negative and mismatched wallet balances", async () => {
  const user = await db.user.create({ data: { email: `reconciliation-${Date.now()}@example.test`, name: "Reconciliation Test" } });
  await db.wallet.create({ data: { availableUsdt: -1, pendingUsdt: 5, userId: user.id } });

  try {
    const result = await runFinancialReconciliation({ db, notify: false });
    const codes = result.findings.map((item) => item.code);
    assert.ok(codes.includes("negative_wallet_balance"));
    assert.ok(codes.includes("pending_balance_mismatch"));
    assert.ok(result.summary.critical >= 2);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

test.after(async () => {
  await db.$disconnect();
});

function assertSafeTestDatabase(databaseUrl) {
  const parsed = new URL(databaseUrl);
  const databaseName = parsed.pathname.replace(/^\//, "");
  const safeHost = ["127.0.0.1", "localhost", "postgres"].includes(parsed.hostname);
  const safeDatabase = /(^|[_-])(test|ci|staging)([_-]|$)/i.test(databaseName);
  if (!safeHost || !safeDatabase) throw new Error("Refusing to run reconciliation tests outside a safe test database.");
}
