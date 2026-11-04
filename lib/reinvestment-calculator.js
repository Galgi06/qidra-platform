import { Prisma } from "@prisma/client";

export function calculateAutomaticReinvestmentGross(paymentAmountUsdt, allocationPercent) {
  const payment = new Prisma.Decimal(paymentAmountUsdt);
  const percent = new Prisma.Decimal(allocationPercent);

  if (payment.lt(0) || percent.lt(1) || percent.gt(100)) {
    throw new Error("invalid_reinvestment_allocation");
  }

  return payment.times(percent).div(100).toDecimalPlaces(6, Prisma.Decimal.ROUND_DOWN);
}

export function calculateReinvestmentAmounts(grossAmountUsdt, managerFeePercent = 0) {
  const gross = new Prisma.Decimal(grossAmountUsdt).toDecimalPlaces(6);
  const feePercent = new Prisma.Decimal(managerFeePercent);

  if (gross.lte(0) || feePercent.lt(0) || feePercent.gt(100)) {
    throw new Error("invalid_reinvestment_amount");
  }

  const multiplier = new Prisma.Decimal(1).plus(feePercent.div(100));
  const invested = feePercent.gt(0) ? gross.div(multiplier).toDecimalPlaces(6, Prisma.Decimal.ROUND_DOWN) : gross;

  return {
    feeUsdt: gross.minus(invested),
    grossAmountUsdt: gross,
    investedAmountUsdt: invested
  };
}
