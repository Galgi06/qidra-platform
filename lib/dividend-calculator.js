import { Prisma } from "@prisma/client";

const MONEY_SCALE = 6;
const DISPLAY_SCALE = 2;
export const DIVIDEND_ALGORITHM_VERSION = "dividend-v2";
export const DIVIDEND_CALCULATION_MODES = {
  PROJECT_PROFIT: "PROJECT_PROFIT",
  READY_POOL: "READY_POOL"
};

export function toDecimal(value, scale = MONEY_SCALE) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(scale);
}

export function parseDateInput(value) {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function countInclusiveDays(start, end) {
  const utcStart = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const utcEnd = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.floor((utcEnd - utcStart) / 86400000) + 1;
}

export function maxDate(...dates) {
  const validDates = dates.filter(Boolean);
  return validDates.reduce((latest, current) => (latest > current ? latest : current));
}

export function resolveFinancials({
  directCostUsdt = 0,
  grossRevenueUsdt = 0,
  mode,
  operatingExpenseUsdt = 0,
  participantSharePercent = 0,
  qidraParticipantPoolUsdt = 0
}) {
  if (mode === DIVIDEND_CALCULATION_MODES.READY_POOL) {
    const participantPoolUsdt = toDecimal(qidraParticipantPoolUsdt);
    return {
      companyProfitUsdt: new Prisma.Decimal(0),
      directCostUsdt: toDecimal(0),
      grossRevenueUsdt: toDecimal(0),
      investorSharePercent: new Prisma.Decimal(0),
      netProfitUsdt: participantPoolUsdt,
      operatingExpenseUsdt: toDecimal(0),
      participantPoolUsdt
    };
  }

  const revenue = toDecimal(grossRevenueUsdt);
  const directCosts = toDecimal(directCostUsdt);
  const operatingCosts = toDecimal(operatingExpenseUsdt);
  const share = new Prisma.Decimal(participantSharePercent).toDecimalPlaces(4);
  const netProfitUsdt = revenue.minus(directCosts).minus(operatingCosts).toDecimalPlaces(MONEY_SCALE);
  const participantPoolUsdt = netProfitUsdt.gt(0) ? netProfitUsdt.times(share).div(100).toDecimalPlaces(MONEY_SCALE) : new Prisma.Decimal(0);
  const companyProfitUsdt = netProfitUsdt.gt(0) ? netProfitUsdt.minus(participantPoolUsdt).toDecimalPlaces(MONEY_SCALE) : netProfitUsdt;

  return {
    companyProfitUsdt,
    directCostUsdt: directCosts,
    grossRevenueUsdt: revenue,
    investorSharePercent: share,
    netProfitUsdt,
    operatingExpenseUsdt: operatingCosts,
    participantPoolUsdt
  };
}

function serializeReason(code) {
  const map = {
    ENTERED_AFTER_PERIOD: "entered_after_period",
    EXCLUDED_MANUALLY: "excluded_manually",
    INACTIVE: "inactive",
    NON_POSITIVE_DAYS: "non_positive_days"
  };

  return map[code] ?? "technical_error";
}

export function buildDividendPreview({
  investments,
  mode,
  participantPoolUsdt,
  periodEnd,
  periodStart,
  profitAccrualStartDate
}) {
  const normalizedPool = toDecimal(participantPoolUsdt);
  const activeInvestmentsAmount = investments.reduce((total, investment) => {
    return investment.isActive ? total.plus(toDecimal(investment.amountUsdt)) : total;
  }, new Prisma.Decimal(0));

  const rows = investments.map((investment) => {
    const investmentAmount = toDecimal(investment.amountUsdt);
    const participantInvestmentDate = parseDateInput(investment.enteredAt);
    const eligibleStartDate = participantInvestmentDate ? maxDate(participantInvestmentDate, periodStart, profitAccrualStartDate ?? null) : null;
    const entersAfterPeriod = !participantInvestmentDate || participantInvestmentDate > periodEnd;
    const excludedManually = Boolean(investment.excludeFromDividend);
    const inactive = !investment.isActive;
    const eligibleDays = eligibleStartDate && !entersAfterPeriod ? Math.max(0, countInclusiveDays(eligibleStartDate, periodEnd)) : 0;
    const weight = eligibleDays > 0 && !inactive && !excludedManually ? investmentAmount.times(eligibleDays).toDecimalPlaces(MONEY_SCALE) : new Prisma.Decimal(0);

    let exclusionReason = null;
    if (inactive) exclusionReason = serializeReason("INACTIVE");
    else if (excludedManually) exclusionReason = serializeReason("EXCLUDED_MANUALLY");
    else if (entersAfterPeriod) exclusionReason = serializeReason("ENTERED_AFTER_PERIOD");
    else if (eligibleDays <= 0) exclusionReason = serializeReason("NON_POSITIVE_DAYS");

    return {
      eligibleDays,
      eligibleStartDate,
      exclusionReason,
      id: investment.id,
      investmentAmountUsdt: investmentAmount,
      participantId: investment.userId,
      participantInvestmentDate,
      participantName: investment.participantName,
      platformSource: investment.platformSource ?? "QIDRA",
      status: exclusionReason ? "excluded" : "included",
      weight
    };
  });

  const includedRows = rows.filter((row) => row.status === "included");
  const totalWeight = includedRows.reduce((total, row) => total.plus(row.weight), new Prisma.Decimal(0));
  const errors = [];

  if (normalizedPool.lt(0)) {
    errors.push("negative_participant_pool");
  }

  if (normalizedPool.gt(0) && totalWeight.lte(0)) {
    errors.push("zero_total_weight");
  }

  const rowsWithAccruals = rows.map((row) => ({
    ...row,
    accruedAmountUsdt: new Prisma.Decimal(0),
    rawAmountUsdt: new Prisma.Decimal(0),
    sharePercent: new Prisma.Decimal(0)
  }));

  if (includedRows.length && totalWeight.gt(0) && normalizedPool.gte(0)) {
    let roundedTotal = new Prisma.Decimal(0);
    let maxWeightRowIndex = -1;
    let maxWeight = new Prisma.Decimal(-1);

    for (const row of rowsWithAccruals) {
      if (row.status !== "included") continue;
      const rawAmountUsdt = normalizedPool.times(row.weight).div(totalWeight).toDecimalPlaces(MONEY_SCALE);
      const accruedAmountUsdt = rawAmountUsdt.toDecimalPlaces(DISPLAY_SCALE);
      const sharePercent = row.weight.times(100).div(totalWeight).toDecimalPlaces(MONEY_SCALE);

      row.rawAmountUsdt = rawAmountUsdt;
      row.accruedAmountUsdt = accruedAmountUsdt;
      row.sharePercent = sharePercent;
      roundedTotal = roundedTotal.plus(accruedAmountUsdt);

      if (row.weight.gt(maxWeight)) {
        maxWeight = row.weight;
        maxWeightRowIndex = rowsWithAccruals.indexOf(row);
      }
    }

    const roundingDifference = normalizedPool.minus(roundedTotal).toDecimalPlaces(DISPLAY_SCALE);

    if (!roundingDifference.eq(0) && maxWeightRowIndex >= 0) {
      rowsWithAccruals[maxWeightRowIndex].accruedAmountUsdt = rowsWithAccruals[maxWeightRowIndex].accruedAmountUsdt.plus(roundingDifference).toDecimalPlaces(DISPLAY_SCALE);
    }
  }

  const finalIncludedRows = rowsWithAccruals.filter((row) => row.status === "included");
  const accrualTotal = finalIncludedRows.reduce((total, row) => total.plus(row.accruedAmountUsdt), new Prisma.Decimal(0)).toDecimalPlaces(DISPLAY_SCALE);
  const roundingDifferenceUsdt = normalizedPool.minus(accrualTotal).toDecimalPlaces(DISPLAY_SCALE);

  if (finalIncludedRows.some((row) => row.accruedAmountUsdt.lt(0))) {
    errors.push("negative_accrual");
  }

  const summary = {
    accrualTotalUsdt: accrualTotal,
    activeInvestmentTotalUsdt: activeInvestmentsAmount.toDecimalPlaces(MONEY_SCALE),
    algorithmVersion: DIVIDEND_ALGORITHM_VERSION,
    companyMode: mode,
    includedParticipantsCount: finalIncludedRows.length,
    participantCount: rowsWithAccruals.length,
    participantPoolUsdt: normalizedPool,
    roundingDifferenceUsdt,
    totalWeight: totalWeight.toDecimalPlaces(MONEY_SCALE)
  };

  if (roundingDifferenceUsdt.abs().gt(new Prisma.Decimal("0.01"))) {
    errors.push("rounding_difference_too_large");
  }

  return {
    errors,
    rows: rowsWithAccruals,
    summary
  };
}
