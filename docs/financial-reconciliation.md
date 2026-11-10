# Qidra financial reconciliation

## Purpose

The daily reconciliation is read-only for financial balances. It detects inconsistencies, records an audit event and alerts administrators, but never changes balances automatically.

## Schedule

- Daily at `02:45 UTC`, after the `02:15 UTC` database and private-file backup.
- Manual run: GitHub Actions workflow `Qidra backups and restore drill`, operation `reconciliation`.
- A critical finding fails the workflow so the incident remains visible until reviewed.

## Checks

- negative available, pending or reserved wallet balances;
- pending wallet balance against pending deposit and withdrawal transactions;
- reserved wallet balance against pending investment reservations;
- paid dividends against confirmed `RETURN` transactions and wallet owner;
- paid dividend periods containing incomplete payment rows;
- completed reinvestments against their confirmed reinvestment applications;
- overfunded projects that are still marked active;
- non-positive wallet transactions;
- payment confirmation status against wallet transaction status;
- pending transactions older than `FINANCIAL_RECONCILIATION_STALE_HOURS` (default: 72 hours).

## Alerts and response

- Successful runs create an audit event only. No routine user-facing message is sent.
- Findings create one in-app alert per administrator per UTC day and an email to administrators plus `FINANCIAL_ALERT_EMAILS` when configured.
- The audit event contains finding codes and entity IDs, but no passwords, private keys, KYC files or payment-address secrets.
- An operator must investigate the referenced records and use the approved adjustment workflow. Direct database edits and automatic balance repair are prohibited.
