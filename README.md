# QIDRA Platform

Owner-controlled build of the QIDRA international halal partnership platform.

## Scope

- Public website with projects, FAQ and legal pages.
- Auth screens and NextAuth route scaffold.
- Participant cabinet for profile, KYC, wallet operations and project participation.
- Project participation flow with application statuses.
- Admin panel for users, KYC, projects, applications and payment reconciliation.
- PostgreSQL schema in Prisma.
- RU/EN interface structure.
- Qidra brand assets and compliance documents under `public/assets`.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:8091
```

## Environment

Copy `.env.example` to `.env` and set production values before connecting a real database or OAuth providers.

For TRC20 deposits, set `TRONGRID_API_KEY` and `QIDRA_WALLET_KEY_ENCRYPTION_SECRET`. The app issues a personal USDT TRC20 address per participant, encrypts the private key, and uses TronGrid to verify that each submitted transaction hash belongs to an incoming transfer to that participant address before moving funds into an available balance.

## Security Notes

- Do not commit production secrets.
- Do not publish fixed-return claims.
- Keep KYC, contracts and risk disclosures visible in project flows.

Production infrastructure notes are stored in `docs/qidra-infrastructure-inventory.md`.
