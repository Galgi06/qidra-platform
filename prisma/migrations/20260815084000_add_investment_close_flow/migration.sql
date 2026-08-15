-- Add a non-destructive contract close state for confirmed investor participation.
ALTER TYPE "InvestmentStatus" ADD VALUE IF NOT EXISTS 'CLOSED';

ALTER TABLE "InvestmentApplication"
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closeReason" TEXT;
