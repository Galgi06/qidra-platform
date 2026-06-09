# Qidra security audit checklist

Дата: 2026-06-09.

## Scope

- Public website and investor portal.
- Admin portal and role-based access.
- Auth flows: email/password, Google, Telegram, password reset, support-assisted recovery.
- KYC upload/download and project document upload/download.
- Wallet deposit sync, withdrawal review and TRC20 transaction handling.
- PostgreSQL, S3/R2 file storage, S3/R2 database backups.
- VPS, Docker, nginx, systemd timers and firewall.

## Required audit checks

- Verify all admin routes require authenticated admin roles.
- Verify KYC documents are not publicly reachable and require authorized team access.
- Verify S3/R2 buckets reject unauthenticated object listing and public file access.
- Verify password reset tokens are single-use, expire correctly and are not logged.
- Verify support-assisted recovery requires approved KYC and audit reason.
- Verify mutating API rejects foreign browser Origin/Referer.
- Verify rate limits trigger on auth, wallet, investment and support endpoints.
- Verify account blocking prevents login and sensitive actions.
- Verify role changes, balance adjustments and KYC decisions are audit logged.
- Verify one transaction hash cannot be reused for multiple deposits.
- Verify wallet sync cannot be called without the cron bearer secret.
- Verify uploaded files reject unsupported MIME types and oversized payloads.
- Verify database backup is created daily, uploaded off-server and restorable.
- Verify TLS, HSTS and security headers on production domain.
- Run dependency audit and review high/critical advisories before each release.

## Evidence to collect

- Screenshot/export of Cloudflare WAF and rate limit rules after DNS migration.
- Screenshot/export of bucket public access, encryption and lifecycle settings.
- Output of restore test counts from a separate database.
- Output of `ufw status verbose`.
- Output of `fail2ban-client status sshd`.
- Output of `systemctl list-timers qidra-wallet-sync.timer qidra-monitor.timer`.
- Latest successful backup log and S3/R2 object metadata.

## Cadence

- Lightweight internal review: every release.
- Dependency audit: every release.
- Restore drill: monthly.
- Full external penetration test: before onboarding real client funds, then at least annually.
