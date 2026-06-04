# Wallet Deposit Sync

Qidra credits USDT TRC20 deposits by scanning each participant's personal TRC20 deposit address.

## Flow

1. Each participant receives a personal `Wallet.trc20Address`.
2. The sync job calls the payment verification provider for confirmed incoming USDT TRC20 transfers to that address.
3. A transfer is credited only when its `transaction_id` has not already been used for a confirmed deposit.
4. The wallet `availableUsdt` balance is incremented inside the same database transaction that creates the `WalletTransaction`.
5. Re-running the sync is idempotent: already credited transaction hashes are skipped.

## Manual Admin Sync

Admins can run the same sync from:

`/admin/payments`

Button:

`Sync incoming transfers`

## Scheduled Sync

`vercel.json` schedules:

```json
{
  "path": "/api/cron/wallet-deposits?limitPerWallet=100",
  "schedule": "*/5 * * * *"
}
```

The cron endpoint accepts `GET` and `POST`, but always requires:

```http
Authorization: Bearer <secret>
```

Environment variables:

```env
CRON_SECRET="replace-with-secure-cron-secret"
TRONGRID_API_KEY="replace-with-trongrid-api-key"
TRONGRID_API_BASE_URL="https://api.trongrid.io"
QIDRA_USDT_TRC20_CONTRACT="TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
```

`QIDRA_WALLET_SYNC_SECRET` is also accepted as a fallback for external schedulers.
