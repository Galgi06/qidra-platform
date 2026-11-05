# Dependency security review - 2026-11-05

## Result

The dependency audit was reduced from 24 findings (3 critical, 13 high, 8 moderate) to 7 findings (2 critical, 5 high, 0 moderate) without forced or unsupported major upgrades.

Resolved runtime findings include Next.js, Zod, Axios, Sharp, Browserslist, `source-map-js`, `js-yaml`, `brace-expansion`, and the Nodemailer version used by Qidra SMTP delivery. The application build, lint, dividend tests, reinvestment tests, and SMTP module import pass with the updated tree.

## Residual findings

### Auth.js / NextAuth

`next-auth@4.24.15` is the current stable v4 release but requires `@auth/core@0.34.3`. npm reports advisories fixed only in `@auth/core@0.41.3`. The v5 line that uses the fixed core is still published under the `beta` tag, so it is not introduced into the production authentication path in this release.

Qidra does not configure the NextAuth EmailProvider and does not call `getToken()`. Application SMTP delivery imports `nodemailer-secure`, an npm alias pinned to patched `nodemailer@10.3.1`. The older Nodemailer packages reported by npm are optional peer dependencies installed below Auth.js and are not used by Qidra mail delivery.

The remaining OAuth provider-cookie advisory can only be fully removed by a tested NextAuth v5 migration. That migration must include sign-in, sign-up, Google callback, Telegram, blocked-user, session invalidation, and password-reset regression tests before release.

### Prisma CLI

`prisma@6.19.3` pulls `@prisma/config` and `deepmerge-ts`, which npm flags for stack exhaustion while processing recursive configuration objects. This is a development/deployment CLI path; the production `@prisma/client` runtime is not the affected package.

The supported fix is Prisma 7.10.1, a major migration that changes configuration and runtime requirements. It must be validated separately against schema generation, all 12 migrations, transaction behavior, Docker images, backup/restore, and the staging database drill.

## Release gate

Do not use `npm audit fix --force` for either residual group. Upgrade Auth.js and Prisma only through separate pull requests with their full migration guides and staging validation.
