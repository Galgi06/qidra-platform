import { Prisma } from "@prisma/client";

export const DIVIDEND_ALGORITHM_VERSION: string;
export const DIVIDEND_CALCULATION_MODES: {
  PROJECT_PROFIT: "PROJECT_PROFIT";
  READY_POOL: "READY_POOL";
};

export type DividendCalculationMode = keyof typeof DIVIDEND_CALCULATION_MODES extends never ? string : (typeof DIVIDEND_CALCULATION_MODES)[keyof typeof DIVIDEND_CALCULATION_MODES];

export type DividendInvestmentInput = {
  id: string;
  userId: string;
  participantName: string;
  amountUsdt: Prisma.Decimal | string | number;
  enteredAt: Date | string | null;
  isActive: boolean;
  excludeFromDividend?: boolean;
  platformSource?: string | null;
};

export type DividendPreviewRow = {
  id: string;
  participantId: string;
  participantName: string;
  platformSource: string;
  investmentAmountUsdt: Prisma.Decimal;
  participantInvestmentDate: Date | null;
  eligibleStartDate: Date | null;
  eligibleDays: number;
  weight: Prisma.Decimal;
  sharePercent: Prisma.Decimal;
  rawAmountUsdt: Prisma.Decimal;
  accruedAmountUsdt: Prisma.Decimal;
  status: "included" | "excluded";
  exclusionReason: string | null;
};

export type DividendPreviewSummary = {
  participantPoolUsdt: Prisma.Decimal;
  activeInvestmentTotalUsdt: Prisma.Decimal;
  totalWeight: Prisma.Decimal;
  accrualTotalUsdt: Prisma.Decimal;
  roundingDifferenceUsdt: Prisma.Decimal;
  participantCount: number;
  includedParticipantsCount: number;
  algorithmVersion: string;
  companyMode: string;
};

export function toDecimal(value: Prisma.Decimal | string | number | null | undefined, scale?: number): Prisma.Decimal;
export function parseDateInput(value: Date | string | null | undefined): Date | null;
export function countInclusiveDays(start: Date, end: Date): number;
export function maxDate(...dates: Array<Date | null | undefined>): Date;
export function resolveFinancials(input: {
  mode: string;
  grossRevenueUsdt?: number | string;
  directCostUsdt?: number | string;
  operatingExpenseUsdt?: number | string;
  participantSharePercent?: number | string;
  qidraParticipantPoolUsdt?: number | string;
}): {
  grossRevenueUsdt: Prisma.Decimal;
  directCostUsdt: Prisma.Decimal;
  operatingExpenseUsdt: Prisma.Decimal;
  netProfitUsdt: Prisma.Decimal;
  participantPoolUsdt: Prisma.Decimal;
  companyProfitUsdt: Prisma.Decimal;
  investorSharePercent: Prisma.Decimal;
};
export function buildDividendPreview(input: {
  investments: DividendInvestmentInput[];
  participantPoolUsdt: Prisma.Decimal | string | number;
  periodStart: Date;
  periodEnd: Date;
  mode: string;
  profitAccrualStartDate?: Date | null;
}): {
  rows: DividendPreviewRow[];
  summary: DividendPreviewSummary;
  errors: string[];
};
