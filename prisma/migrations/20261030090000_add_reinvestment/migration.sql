CREATE TYPE "InvestmentOrigin" AS ENUM ('DIRECT', 'REINVESTMENT');
CREATE TYPE "ReinvestmentMode" AS ENUM ('ONE_TIME', 'AUTOMATIC');
CREATE TYPE "ReinvestmentStatus" AS ENUM ('COMPLETED', 'FALLBACK');

ALTER TYPE "TransactionType" ADD VALUE 'REINVESTMENT';

ALTER TABLE "InvestmentApplication"
ADD COLUMN "origin" "InvestmentOrigin" NOT NULL DEFAULT 'DIRECT';

CREATE TABLE "AutoReinvestmentPreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "targetProjectId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "allocationPercent" DECIMAL(5,2) NOT NULL DEFAULT 100,
  "acceptedAt" TIMESTAMP(3) NOT NULL,
  "termsVersion" TEXT NOT NULL DEFAULT 'reinvestment-v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutoReinvestmentPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReinvestmentOrder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "sourceDividendPaymentId" TEXT NOT NULL,
  "targetProjectId" TEXT NOT NULL,
  "investmentApplicationId" TEXT,
  "mode" "ReinvestmentMode" NOT NULL,
  "status" "ReinvestmentStatus" NOT NULL,
  "grossAmountUsdt" DECIMAL(18,6) NOT NULL,
  "investedAmountUsdt" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "feeUsdt" DECIMAL(18,6) NOT NULL DEFAULT 0,
  "fallbackReason" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReinvestmentOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutoReinvestmentPreference_userId_key" ON "AutoReinvestmentPreference"("userId");
CREATE INDEX "AutoReinvestmentPreference_enabled_targetProjectId_idx" ON "AutoReinvestmentPreference"("enabled", "targetProjectId");
CREATE INDEX "ReinvestmentOrder_sourceDividendPaymentId_status_idx" ON "ReinvestmentOrder"("sourceDividendPaymentId", "status");
CREATE UNIQUE INDEX "ReinvestmentOrder_one_completed_per_payment_key" ON "ReinvestmentOrder"("sourceDividendPaymentId") WHERE "status" = 'COMPLETED';
CREATE UNIQUE INDEX "ReinvestmentOrder_investmentApplicationId_key" ON "ReinvestmentOrder"("investmentApplicationId");
CREATE INDEX "ReinvestmentOrder_userId_createdAt_idx" ON "ReinvestmentOrder"("userId", "createdAt");
CREATE INDEX "ReinvestmentOrder_targetProjectId_status_idx" ON "ReinvestmentOrder"("targetProjectId", "status");

ALTER TABLE "AutoReinvestmentPreference" ADD CONSTRAINT "AutoReinvestmentPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutoReinvestmentPreference" ADD CONSTRAINT "AutoReinvestmentPreference_targetProjectId_fkey" FOREIGN KEY ("targetProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReinvestmentOrder" ADD CONSTRAINT "ReinvestmentOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReinvestmentOrder" ADD CONSTRAINT "ReinvestmentOrder_sourceDividendPaymentId_fkey" FOREIGN KEY ("sourceDividendPaymentId") REFERENCES "DividendPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReinvestmentOrder" ADD CONSTRAINT "ReinvestmentOrder_targetProjectId_fkey" FOREIGN KEY ("targetProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReinvestmentOrder" ADD CONSTRAINT "ReinvestmentOrder_investmentApplicationId_fkey" FOREIGN KEY ("investmentApplicationId") REFERENCES "InvestmentApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
