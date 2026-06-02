# QIDRA Platform MVP

Owner-controlled rebuild of the QIDRA investment platform.

## Scope

- Public website with projects, FAQ and legal pages.
- Auth screens and NextAuth route scaffold.
- Investor cabinet for profile, KYC, wallet, manual deposits and investments.
- Investment application flow with manual approval statuses.
- Admin panel for users, KYC, projects, applications and USDT confirmations.
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

## Security Notes

- Do not commit production secrets.
- Keep payments manual until wallet monitoring is audited.
- Do not publish fixed-return claims.
- Keep KYC, contracts and risk disclosures visible in the investment flow.

Production infrastructure notes are stored in `docs/qidra-infrastructure-inventory.md`.
