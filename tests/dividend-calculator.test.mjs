import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  buildDividendPreview,
  countInclusiveDays,
  DIVIDEND_CALCULATION_MODES,
  resolveFinancials
} from "../lib/dividend-calculator.js";

function makeInvestment(overrides = {}) {
  return {
    amountUsdt: new Prisma.Decimal("1000"),
    enteredAt: "2026-07-01",
    id: "inv-1",
    isActive: true,
    participantName: "Investor",
    platformSource: "QIDRA",
    userId: "user-1",
    ...overrides
  };
}

test("automatic calculation with 35% share", () => {
  const result = resolveFinancials({
    directCostUsdt: 120011.97,
    grossRevenueUsdt: 126365.0,
    mode: DIVIDEND_CALCULATION_MODES.PROJECT_PROFIT,
    operatingExpenseUsdt: 0,
    participantSharePercent: 35
  });

  assert.equal(result.netProfitUsdt.toFixed(2), "6353.03");
  assert.equal(result.participantPoolUsdt.toFixed(2), "2223.56");
  assert.equal(result.companyProfitUsdt.toFixed(2), "4129.47");
});

test("automatic calculation with 30% share", () => {
  const result = resolveFinancials({
    directCostUsdt: 7000,
    grossRevenueUsdt: 10000,
    mode: DIVIDEND_CALCULATION_MODES.PROJECT_PROFIT,
    operatingExpenseUsdt: 500,
    participantSharePercent: 30
  });

  assert.equal(result.netProfitUsdt.toFixed(2), "2500.00");
  assert.equal(result.participantPoolUsdt.toFixed(2), "750.00");
  assert.equal(result.companyProfitUsdt.toFixed(2), "1750.00");
});

test("ready pool mode does not reapply participant percent", () => {
  const result = resolveFinancials({
    mode: DIVIDEND_CALCULATION_MODES.READY_POOL,
    participantSharePercent: 35,
    qidraParticipantPoolUsdt: 190.24
  });

  assert.equal(result.participantPoolUsdt.toFixed(2), "190.24");
  assert.equal(result.investorSharePercent.toFixed(2), "0.00");
});

test("inclusive days include the last day", () => {
  assert.equal(countInclusiveDays(new Date("2026-07-01"), new Date("2026-07-01")), 1);
  assert.equal(countInclusiveDays(new Date("2026-07-01"), new Date("2026-07-31")), 31);
});

test("participant entering after period end is excluded", () => {
  const preview = buildDividendPreview({
    investments: [makeInvestment({ enteredAt: "2026-10-01" })],
    mode: DIVIDEND_CALCULATION_MODES.READY_POOL,
    participantPoolUsdt: 100,
    periodEnd: new Date("2026-09-30"),
    periodStart: new Date("2026-07-01")
  });

  assert.equal(preview.rows[0].status, "excluded");
  assert.equal(preview.rows[0].eligibleDays, 0);
  assert.equal(preview.summary.includedParticipantsCount, 0);
  assert.ok(preview.errors.includes("zero_total_weight"));
});

test("participant entering on last day gets one eligible day", () => {
  const preview = buildDividendPreview({
    investments: [makeInvestment({ enteredAt: "2026-09-30" })],
    mode: DIVIDEND_CALCULATION_MODES.READY_POOL,
    participantPoolUsdt: 100,
    periodEnd: new Date("2026-09-30"),
    periodStart: new Date("2026-07-01")
  });

  assert.equal(preview.rows[0].status, "included");
  assert.equal(preview.rows[0].eligibleDays, 1);
  assert.equal(preview.summary.accrualTotalUsdt.toFixed(2), "100.00");
});

test("rounding difference is assigned to the largest weight", () => {
  const preview = buildDividendPreview({
    investments: [
      makeInvestment({ amountUsdt: 1000, id: "a", userId: "a" }),
      makeInvestment({ amountUsdt: 500, id: "b", userId: "b" }),
      makeInvestment({ amountUsdt: 500, id: "c", userId: "c" })
    ],
    mode: DIVIDEND_CALCULATION_MODES.READY_POOL,
    participantPoolUsdt: 100,
    periodEnd: new Date("2026-07-31"),
    periodStart: new Date("2026-07-01")
  });

  const total = preview.rows.reduce((sum, row) => sum + Number(row.accruedAmountUsdt.toString()), 0);
  assert.equal(total.toFixed(2), "100.00");
  assert.equal(preview.summary.roundingDifferenceUsdt.toFixed(2), "0.00");
});

test("negative profit zeroes participant pool in project profit mode", () => {
  const result = resolveFinancials({
    directCostUsdt: 1500,
    grossRevenueUsdt: 1000,
    mode: DIVIDEND_CALCULATION_MODES.PROJECT_PROFIT,
    operatingExpenseUsdt: 0,
    participantSharePercent: 30
  });

  assert.equal(result.participantPoolUsdt.toFixed(2), "0.00");
  assert.equal(result.companyProfitUsdt.toFixed(2), "-500.00");
});

test("empty investment list keeps zero totals", () => {
  const preview = buildDividendPreview({
    investments: [],
    mode: DIVIDEND_CALCULATION_MODES.READY_POOL,
    participantPoolUsdt: 0,
    periodEnd: new Date("2026-09-30"),
    periodStart: new Date("2026-07-01")
  });

  assert.equal(preview.summary.participantCount, 0);
  assert.equal(preview.summary.accrualTotalUsdt.toFixed(2), "0.00");
});
