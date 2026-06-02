# Qidra MVP Specification

This document freezes the first build scope for Qidra so the product can be rebuilt without depending on the previous developer.

## Product Scope

The MVP includes:

- Public website: home, investment project catalog, project page, project documents, FAQ, Terms, Privacy Policy, AML/KYC Policy, Risk Disclaimer, Sharia Compliance Statement.
- Auth: registration, login, email verification, password recovery, and 2FA-ready structure disabled on launch.
- Investor cabinet: profile, KYC questionnaire, USDT TRC20 wallet, manual deposit, transaction history, investments, project reports.
- Investment flow: project selection, amount entry, terms confirmation, Mudaraba/Musharaka contract consent, investment application creation, statuses `pending`, `confirmed`, `rejected`.
- Admin panel: users, KYC, projects, investment applications, manual USDT payment confirmation, documents, reports, project statuses.

Excluded from the first stage:

- Internal messenger.
- Comments.
- Subscriptions.
- Public user profiles.
- Social feed.
- Complex notifications.

## Legal And Trust Rules

- The product must not promise fixed income, guaranteed yield, or risk-free results.
- Investment copy must present expected scenarios as informational, non-guaranteed projections only.
- Every investment flow must include risk, terms, and Mudaraba/Musharaka agreement consent.
- Admin confirmation is required before manual USDT deposits affect investable balance.
- Legal pages and project documents must be visible from public pages and investor flows.

## Design Rules

- The Figma UI kit is the source of truth for layout, typography, spacing, colors, components, and assets.
- Primary font: Golos. Do not replace with Inter, Arial, or system fonts without approval.
- Required responsive widths: 375, 576, 768, 992, 1920.
- Use Qidra brand assets from `public/assets/brand`.
- Use placeholders only when a Figma asset is missing, and mark it in code comments.
- Avoid unapproved gradients, unnecessary animations, decorative excess, emojis in UI, and dark theme variants not present in the design.

## Implementation Stack

- Next.js.
- TypeScript.
- Tailwind CSS.
- PostgreSQL.
- Prisma.
- NextAuth-compatible auth structure.
- Roles: `guest`, `investor`, `admin`, `super_admin`.
