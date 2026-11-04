# Qidra staging database validation

## Purpose

This workflow validates PostgreSQL migrations, concurrent financial transitions, backup integrity, and restore readiness without connecting to production.

## Safety boundaries

- The local database is named `qidra_staging` and listens only on `127.0.0.1:55432`.
- Docker resources use the isolated `qidra-staging` project, network, and volume.
- Integration tests refuse database names that do not contain `test` or `staging`.
- The drill stops its PostgreSQL container on exit but preserves the volume for later runs.
- The workflow must never receive a production `DATABASE_URL` or `TEST_DATABASE_URL`.

## Full local drill

Check shared Mac load first:

```bash
uptime
```

Run only when the first load-average value is below 30:

```bash
npm run staging:verify
```

The drill performs these steps:

1. Starts the isolated PostgreSQL 16 service.
2. Applies all Prisma migrations.
3. Runs financial concurrency integration tests.
4. Creates a custom-format PostgreSQL backup in `.backups/staging/`.
5. Creates and verifies a SHA-256 checksum.
6. Restores into the temporary `qidra_restore_test` database.
7. Verifies restored tables and completed migrations.
8. Deletes the temporary restore database and stops the staging container.

## Full application journey

Run the HTTP-level user journey separately:

```bash
npm run staging:e2e
```

This command starts the isolated PostgreSQL service, Mailpit and a Next.js server on `127.0.0.1:8092`. It verifies:

1. Investor registration and delivery of a real verification email to Mailpit.
2. Email verification and NextAuth credentials sessions for investor and administrator.
3. KYC submission with documents and administrator approval.
4. Investment from a confirmed wallet balance.
5. Dividend calculation, approval and payout through administrator HTTP APIs.
6. One-time reinvestment and automatic reinvestment.
7. Withdrawal request and safe administrator rejection.
8. Final wallet, investment, reinvestment and transaction invariants.

The confirmed deposit is a direct staging fixture because the real source is the external TRON network. The withdrawal is rejected instead of confirmed because confirmation requires a real verified TRC20 transfer. No real money movement occurs.

## Expected financial scenarios

- Two confirmations of one investment: exactly one succeeds.
- Investment confirmation versus cancellation: exactly one succeeds.
- Two confirmations of one wallet payment: exactly one credits the wallet.
- Two completed reinvestments from one dividend payment: the database accepts exactly one.
- Two payouts of one dividend period: exactly one credits the wallet and creates one return transaction.

## Useful commands

```bash
docker compose -f docker-compose.staging.yml ps
```

```bash
TEST_DATABASE_URL='postgresql://qidra:qidra_staging_only@127.0.0.1:55432/qidra_staging?schema=public' npm run test:integration
```

Do not use `docker system prune`, remove shared volumes, or stop Docker Desktop.
