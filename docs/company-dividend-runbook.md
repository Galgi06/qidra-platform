# Company Dividend Runbook

## Purpose

This runbook describes how a company owner or company admin operates quarterly or annual reporting periods in Qidra.

## Preconditions

- the company account must have an `OrganizationMember` role of `OWNER` or `ADMIN`;
- the project must belong to the same `organizationId`;
- the project must already be published in the company workspace;
- participant investments must be confirmed before a payout period can allocate accruals.

## Navigation

Use:

- `/company/projects`

The dividend panel appears in the company projects workspace.

## Create a Period

Fill in:

- project;
- period label;
- period start;
- period end;
- gross revenue;
- direct costs;
- operating expenses;
- participant share percent;
- optional company note;
- optional PDF/XLS/XLSX/CSV reporting files;
- `CONFIRM`.

Result:

- a `ProjectDividendPeriod` is created or updated in `DRAFT`;
- draft report files are linked to the same project and period label;
- participant accrual rows are created when the participant pool is positive.

## Approve a Period

Approval:

- locks the calculated period for payout;
- changes period status to `APPROVED`;
- changes payment rows to `APPROVED`;
- publishes attached reporting files for participants.

## Pay a Period

Payout:

- credits each participant wallet;
- creates wallet transactions;
- marks dividend payments as `PAID`;
- marks the period as `PAID`;
- creates investor notifications.

## Cancel a Period

Cancellation:

- is allowed only before payout;
- marks the period and its payment rows as `CANCELLED`.

## Reporting Files

Allowed formats:

- PDF
- XLS
- XLSX
- CSV

Rules:

- max 25 MB per file;
- draft reports are not visible to investors;
- published reports are visible only after approval;
- downloads are allowed only to:
  - the owning company membership,
  - project participants,
  - platform staff.

## Operational Checks

After approval or payout, verify:

- the period appears in `/company/projects`;
- participants can see published reports in their investment dossier;
- no other project reports are exposed;
- participant totals match the participant pool;
- Cloud Run `app-prod` logs do not show errors for `/api/company/dividends` or `/api/projects/[projectId]/reports/[reportId]`.
