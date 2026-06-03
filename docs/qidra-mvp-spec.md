# Qidra MVP Specification

This document freezes the first build scope for Qidra so the product can be rebuilt without depending on the previous developer.

## Product Scope

The MVP includes:

- Public website: home, project catalog, project page, project documents, FAQ, Terms, Privacy Policy, AML/KYC Policy, Risk Disclaimer, Sharia Compliance Statement.
- Auth: registration, login, email verification, password recovery, and 2FA-ready structure disabled on launch.
- Participant cabinet: profile, KYC questionnaire, wallet operations, transaction history, project participation, project reports.
- Participation flow: project selection, amount entry, terms confirmation, Mudaraba/Musharaka contract consent, application creation, statuses `pending`, `confirmed`, `rejected`.
- Admin panel: users, KYC, projects, participation applications, payment reconciliation, documents, reports, project statuses.

Excluded from the first stage:

- Internal messenger.
- Comments.
- Subscriptions.
- Public user profiles.
- Social feed.
- Complex notifications.

## Legal And Trust Rules

- The product must not promise fixed income, guaranteed yield, or risk-free results.
- Project copy must present expected scenarios as informational, non-guaranteed projections only.
- Every participation flow must include risk, terms, and Mudaraba/Musharaka agreement consent.
- Payment operations must remain traceable and auditable before balances or application statuses are updated.
- Legal pages and project documents must be visible from public pages and participant flows.

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
