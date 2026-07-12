# Dividend Calculation

## Scope

This document describes the production dividend-calculation model used for company-owned projects in Qidra.

## Ownership Gate

Dividend operations are available only when:

- the acting user is signed in;
- the acting user has an `OrganizationMember` record;
- the membership role is `OWNER` or `ADMIN`;
- the target `Project.organizationId` matches the membership organization.

## Period States

The current production model uses:

- `DRAFT` for a calculated period that is pending approval;
- `APPROVED` for an approved period pending payout;
- `PAID` for a completed payout period;
- `CANCELLED` for a cancelled period.

## Capital-Days Model

For each confirmed investment:

1. Determine the eligible start date:
   - `max(contractAcceptedAt || createdAt, periodStart)`
2. Determine the eligible end date:
   - `periodEnd`
3. If eligible start is after period end, the investment contributes `0` days.
4. Calculate:
   - `participationDays = inclusive days between eligible start and eligible end`
   - `capitalDays = amountUsdt * participationDays`

The total participant weight is:

- `totalCapitalDays = sum(capitalDays)`

## Financial Inputs

The period form captures:

- `grossRevenueUsdt`
- `directCostUsdt`
- `operatingExpenseUsdt`
- `investorSharePercent`
- `periodStart`
- `periodEnd`
- `periodLabel`

The current model does not yet include a separate persisted `otherApprovedExpenses` field.

## Derived Values

- `netProfit = grossRevenueUsdt - directCostUsdt - operatingExpenseUsdt`
- `participantProfitPool = max(netProfit, 0) * investorSharePercent / 100`

If `netProfit <= 0`, the period is saved for reporting and no participant accruals are created.

## Allocation

When `participantProfitPool > 0`:

- each investor accrual is proportional to `capitalDays / totalCapitalDays`;
- amounts are calculated with Prisma `Decimal`;
- the final row receives the deterministic remainder so the total matches the participant pool.

## Safety Rules

- overlapping active periods are rejected;
- an already approved or paid period cannot be silently recalculated;
- quarterly projects must use a calendar quarter;
- annual projects must use a calendar year;
- only confirmed investments are included;
- payout can happen only after approval.

## Reporting Files

The company can attach:

- PDF
- XLS
- XLSX
- CSV

Rules:

- max size: 25 MB per file;
- files remain draft until approval;
- after approval they become visible to project participants;
- participants can download only reports of their own project.
