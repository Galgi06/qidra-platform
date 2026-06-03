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

## Security Notes

- Do not commit production secrets.
- Do not publish fixed-return claims.
- Keep KYC, contracts and risk disclosures visible in project flows.

Production infrastructure notes are stored in `docs/qidra-infrastructure-inventory.md`.
