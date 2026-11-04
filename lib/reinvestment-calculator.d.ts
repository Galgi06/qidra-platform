import type { Prisma } from "@prisma/client";

export function calculateAutomaticReinvestmentGross(paymentAmountUsdt: Prisma.Decimal.Value, allocationPercent: Prisma.Decimal.Value): Prisma.Decimal;
export function calculateReinvestmentAmounts(grossAmountUsdt: Prisma.Decimal.Value, managerFeePercent?: Prisma.Decimal.Value): {
  feeUsdt: Prisma.Decimal;
  grossAmountUsdt: Prisma.Decimal;
  investedAmountUsdt: Prisma.Decimal;
};
