# QIDRA Developer Handover

Дата подготовки: 2026-08-01

Документ предназначен для передачи проекта QIDRA следующему разработчику. Он описывает кодовую базу, инфраструктуру, сервисы, бизнес-модули, деплой, БД, проверки и операционные риски.

Важно: в документе намеренно не указаны пароли, токены, приватные ключи, session cookies, полный `DATABASE_URL` и значения secrets. Для доступа к production использовать только утверждённые аккаунты владельца и Secret Manager / `.env.production`.

## 1. Краткое описание проекта

QIDRA - инвестиционная платформа на Next.js для:

- регистрации инвесторов и компаний;
- KYC/анкеты участника;
- публикации проектов и листингов компаний;
- подачи заявок на участие;
- управления кошельком USDT TRC20;
- подтверждения платежей;
- работы с документами проектов;
- поддержки пользователей;
- администрирования пользователей, KYC, заявок, платежей и проектов;
- расчёта периодов и дивидендов по проектам компании.

Основной production-домен: `https://qidra.io`.

## 2. Репозиторий и текущая ветка

Локальный workspace в Codex:

```text
/Users/md761/.codex/worktrees/207d/Qidra
```

Текущая рабочая ветка на момент подготовки:

```text
codex/qidra-rescue-20260705
```

Последний известный commit:

```text
7b2c543 fix: relax admin submission approval payload validation
```

Удалённая ветка:

```text
origin/codex/qidra-rescue-20260705
```

Перед любой новой работой выполнить:

```bash
pwd
git status --short
git branch -vv
git log --oneline --decorate -n 10
```

## 3. Технологический стек

Основной стек:

- Next.js `16.2.7`
- React `19.2.3`
- TypeScript `5.9.3`
- Prisma `6.19.3`
- PostgreSQL
- NextAuth `4.24.14`
- Zod `4.1.13`
- Tailwind CSS `4.3`
- Node.js `20` в CI

Ключевые runtime-библиотеки:

- `@prisma/client` - ORM.
- `@auth/prisma-adapter` - интеграция NextAuth с Prisma.
- `bcryptjs` - хеширование паролей.
- `nodemailer` - SMTP email fallback.
- `@aws-sdk/client-s3` - S3-compatible file storage.
- `tronweb` - TRON/TRC20 интеграция.
- `qrcode` - QR для кошельков.
- `@fontsource/golos-text` - основной шрифт.

## 4. Команды разработки

Основные команды из `package.json`:

```bash
npm run dev                 # Next dev server, порт 8091
npm run build               # production build
npm run start               # production start, порт 8091
npm run lint                # ESLint
npm run prisma:generate     # prisma generate
npm run prisma:migrate      # prisma migrate dev
npm run prisma:deploy       # prisma migrate deploy
npm run test:dividends      # тесты dividend calculator
npm run check:env           # статус env без вывода секретов
npm run check:production    # production config validation
npm run healthcheck:production
npm run changes:last-day    # отчёт изменений за последние сутки
npm run test:smtp
npm run test:storage
npm run backup:database
npm run backup:status
npm run restore:database
```

Локальный dev server по умолчанию:

```text
http://localhost:8091
```

## 5. Структура проекта

Ключевые директории:

```text
app/                         Next.js App Router pages and API routes
components/                  React components
components/admin/            Админские формы
components/auth/             Auth UI
components/company/          Company workspace UI
components/support/          Support chat UI
components/ui/               Базовые UI элементы
lib/                         Бизнес-логика, доступы, интеграции
prisma/                      Prisma schema и migrations
scripts/                     Backup, deploy, import, healthcheck, diagnostics
ops/                         nginx, systemd, Cloudflare rules
docs/                        Runbooks, checklists, handover docs
.github/workflows/           CI/CD GitHub Actions
```

Главные страницы:

```text
app/page.tsx                         Главная
app/projects/page.tsx                Каталог проектов
app/projects/[slug]/page.tsx         Детальная страница проекта
app/invest/[slug]/page.tsx           Подача заявки инвестором
app/companies/[slug]/page.tsx        Публичная страница компании
app/investor/page.tsx                Кабинет участника
app/company/page.tsx                 Кабинет компании
app/admin/page.tsx                   Операционный центр / админка
```

Auth pages:

```text
app/auth/sign-in/page.tsx
app/auth/sign-up/page.tsx
app/auth/forgot-password/page.tsx
app/auth/reset-password/page.tsx
app/auth/verify-email/page.tsx
app/auth/telegram/page.tsx
```

Admin pages:

```text
app/admin/users/page.tsx
app/admin/kyc/page.tsx
app/admin/project-submissions/page.tsx
app/admin/projects/page.tsx
app/admin/investments/page.tsx
app/admin/payments/page.tsx
app/admin/organizations/page.tsx
app/admin/support/page.tsx
app/admin/security/page.tsx
app/admin/content/page.tsx
app/admin/analytics/page.tsx
app/admin/audit/page.tsx
```

Company workspace pages:

```text
app/company/page.tsx
app/company/profile/page.tsx
app/company/projects/page.tsx
app/company/documents/page.tsx
app/company/leads/page.tsx
app/company/team/page.tsx
app/company/analytics/page.tsx
```

Investor workspace pages:

```text
app/investor/page.tsx
app/investor/kyc/page.tsx
app/investor/wallet/page.tsx
app/investor/investments/page.tsx
app/investor/support/page.tsx
```

## 6. API route map

Auth:

```text
app/api/auth/[...nextauth]/route.ts
app/api/auth/register/route.ts
app/api/auth/forgot-password/route.ts
app/api/auth/reset-password/route.ts
```

Investor:

```text
app/api/investor/kyc/route.ts
app/api/investor/project-submissions/route.ts
app/api/investments/route.ts
app/api/investments/[applicationId]/route.ts
app/api/wallet/deposits/route.ts
app/api/wallet/withdrawals/route.ts
app/api/notifications/route.ts
```

Company:

```text
app/api/company/profile/route.ts
app/api/company/documents/route.ts
app/api/company/documents/[documentId]/route.ts
app/api/company/leads/route.ts
app/api/company/team/route.ts
app/api/company/dividends/route.ts
```

Admin:

```text
app/api/admin/users/route.ts
app/api/admin/kyc/[applicationId]/route.ts
app/api/admin/project-submissions/[submissionId]/route.ts
app/api/admin/projects/route.ts
app/api/admin/investments/[applicationId]/route.ts
app/api/admin/payments/[transactionId]/route.ts
app/api/admin/payments/sync-trc20/route.ts
app/api/admin/organizations/[organizationId]/route.ts
app/api/admin/dividends/route.ts
app/api/admin/notifications/route.ts
app/api/admin/site-content/home/route.ts
app/api/admin/site-content/faq/route.ts
app/api/admin/site-content/footer/route.ts
```

Support:

```text
app/api/support/messages/route.ts
app/api/support/guest/route.ts
```

Cron:

```text
app/api/cron/wallet-deposits/route.ts
```

Legal/content:

```text
app/api/site-content/legal/[slug]/route.ts
```

## 7. Основные backend-модули

Критичные файлы в `lib/`:

```text
lib/auth.ts                       Auth/session helpers
lib/next-auth.ts                  NextAuth config
lib/access.ts                     Проверки ролей и доступа
lib/user-access.ts                User-level access helpers
lib/password-policy.ts            Политика паролей
lib/passwords.ts                  Хеширование/проверка паролей
lib/tokens.ts                     Email/reset tokens
lib/email.ts                      Email delivery
lib/rate-limit.ts                 Встроенный rate limiting
lib/prisma.ts                     Prisma singleton
lib/file-storage.ts               S3/local storage abstraction
lib/project-catalog.ts            Каталог/публичная форма проектов
lib/real-estate.ts                Real estate metadata helpers
lib/form-validation.ts            Validation helpers
lib/company-workspace.ts          Company dashboard data
lib/organizations.ts              Organization/member logic
lib/dividend-calculator.js        Расчёт дивидендов
lib/dividend-actions.ts           Dividend actions
lib/wallet-addresses.ts           Wallet address logic
lib/wallet-deposit-sync.ts        Deposit sync logic
lib/trongrid.ts                   TronGrid integration
lib/support-attachments.ts        Support attachment handling
lib/support-alerts.ts             Support notifications
lib/site-content.ts               FAQ/footer/legal content
lib/notifications.ts              Notifications
```

## 8. База данных

ORM: Prisma.

Datasource:

```prisma
provider = "postgresql"
url      = env("DATABASE_URL")
```

Основные enum:

```text
Role
KycStatus
ProjectStatus
InvestmentStatus
PaymentStatus
DividendPeriodStatus
DividendPaymentStatus
ProjectSubmissionStatus
TransactionType
SupportThreadStatus
SupportQueue
OrganizationMemberRole
OrganizationStatus
OrganizationLeadStatus
OrganizationAnalyticsEventType
DocumentKind
PayoutFrequency
```

Ключевые модели:

```text
User
InvestorProfile
KycApplication
Wallet
WalletTransaction
Project
ProjectDocument
ProjectReport
ProjectSubmission
InvestmentApplication
PaymentConfirmation
Organization
OrganizationMember
OrganizationDocument
OrganizationInvite
OrganizationLead
OrganizationAnalyticsEvent
ProjectDividendPeriod
DividendPayment
SupportThread
SupportMessage
GuestSupportThread
```

Ключевые связи:

- `User` имеет `InvestorProfile`, `KycApplication`, `Wallet`, `InvestmentApplication`, `ProjectSubmission`, `OrganizationMember`.
- `Organization` имеет `OrganizationMember`, `Project`, `ProjectSubmission`, documents, leads, analytics.
- `Project` может принадлежать `Organization` через `organizationId`.
- `ProjectSubmission` может быть создана от пользователя и/или организации.
- `ProjectDividendPeriod` принадлежит `Project`.
- `DividendPayment` принадлежит `ProjectDividendPeriod` и `InvestmentApplication`.
- `WalletTransaction` привязана к `Wallet`; уникальность `txHash`.

Миграции:

```text
20260609123000_initial_schema
20260611074000_add_site_content
20260612100000_add_guest_support_chat
20260612120000_add_guest_support_attachments
20260612162000_add_real_estate_metadata
20260612183000_add_organizations
20260612193000_expand_company_lead_funnel
20260612202000_add_company_workspace_ops
20260618003000_add_support_message_attachments
20260712103000_expand_dividend_period_engine
```

Правило: перед любыми production-миграциями делать backup, затем `prisma migrate deploy`, затем smoke-test.

## 9. Бизнес-модули

### 9.1 Auth and roles

Роли:

```text
INVESTOR
TECH_SUPPORT
SALES_MANAGER
ADMIN
SUPER_ADMIN
```

Auth реализован через NextAuth и Prisma adapter. Поддерживаются email/password, Google OAuth и Telegram flow.

Критичные сценарии:

- регистрация инвестора;
- регистрация компании;
- вход;
- выход;
- подтверждение email;
- восстановление пароля;
- разные default routes для инвестора, компании и админки.

Важные файлы:

```text
lib/next-auth.ts
lib/auth.ts
lib/password-policy.ts
lib/tokens.ts
lib/email.ts
app/api/auth/*
components/auth/*
```

### 9.2 Investor profile / KYC

Сценарий:

1. Участник регистрируется.
2. Заполняет профиль и KYC.
3. Загружает документы.
4. Отправляет на проверку.
5. Админ проверяет в `app/admin/kyc/page.tsx`.

Важные файлы:

```text
app/investor/kyc/page.tsx
app/api/investor/kyc/route.ts
app/admin/kyc/page.tsx
app/api/admin/kyc/[applicationId]/route.ts
lib/kyc-documents.ts
```

Валидация текстовых полей должна оставаться свободной для международных городов, профессий и адресов, с защитой от HTML/JS injection.

### 9.3 Wallet and USDT TRC20

Сценарий:

1. Участнику создаётся кошелёк.
2. Показывается TRC20 address/QR.
3. Cron синхронизирует входящие USDT TRC20 через TronGrid.
4. Депозиты подтверждаются по transaction hash.
5. Выводы проходят через админскую проверку.

Важные файлы:

```text
app/investor/wallet/page.tsx
app/api/wallet/deposits/route.ts
app/api/wallet/withdrawals/route.ts
app/api/cron/wallet-deposits/route.ts
app/api/admin/payments/sync-trc20/route.ts
lib/wallet-addresses.ts
lib/wallet-deposit-sync.ts
lib/trongrid.ts
components/WalletDepositAddress.tsx
```

Production env:

```text
TRONGRID_API_KEY
TRONGRID_API_BASE_URL
QIDRA_USDT_TRC20_CONTRACT
QIDRA_TRON_WALLET_ADDRESS
CRON_SECRET
QIDRA_WALLET_SYNC_SECRET
QIDRA_WALLET_KEY_ENCRYPTION_SECRET
```

Запрещено менять `QIDRA_WALLET_KEY_ENCRYPTION_SECRET` без полного понимания текущего шифрования кошельков.

### 9.4 Project submissions and listing

Сценарий:

1. Компания или участник создаёт листинг.
2. Заполняет поля проекта.
3. Загружает документы/медиа.
4. Отправляет на проверку.
5. Админ проверяет submission.
6. Админ разрешает листинг и создаёт публичный `Project`.

Важные файлы:

```text
app/investor/project-submissions/...
app/api/investor/project-submissions/route.ts
app/admin/project-submissions/page.tsx
app/api/admin/project-submissions/[submissionId]/route.ts
components/FileUpload.tsx
components/ProjectSectorFields.tsx
lib/project-submission-status.ts
lib/form-validation.ts
```

Недавние исправления были связаны с ложной валидацией trade/non-real-estate листингов и payload админского approval.

### 9.5 Public project catalog and detail pages

Публичный каталог:

```text
app/projects/page.tsx
components/ProjectCard.tsx
lib/project-catalog.ts
```

Детальная страница:

```text
app/projects/[slug]/page.tsx
components/ProjectGallery.tsx
```

Документы проекта:

```text
app/projects/[slug]/documents/page.tsx
```

Важно:

- каталог должен показывать компактные карточки;
- детальную страницу не смешивать с карточкой каталога;
- для закрытых/funded real-estate проектов сумма собранного может отображаться как целевой объём, если проект закрыт как собранный.

### 9.6 Company workspace / organizations

Компания хранится как `Organization`.

Важные файлы:

```text
app/company/page.tsx
app/company/profile/page.tsx
app/company/projects/page.tsx
app/company/documents/page.tsx
app/company/leads/page.tsx
app/company/team/page.tsx
app/company/analytics/page.tsx
app/api/company/*
components/CompanyTabs.tsx
lib/company-workspace.ts
lib/organizations.ts
```

Ключевые модели:

```text
Organization
OrganizationMember
OrganizationDocument
OrganizationInvite
OrganizationLead
OrganizationAnalyticsEvent
```

Права компании проверять через `OrganizationMember`. Роль пользователя `INVESTOR` и membership в компании - разные уровни доступа.

### 9.7 Investment applications

Сценарий:

1. Участник открывает проект.
2. Подаёт заявку на участие.
3. Заявка попадает в админку.
4. Админ подтверждает/отклоняет.
5. Баланс/платёжные записи меняются только через контролируемые flows.

Важные файлы:

```text
app/invest/[slug]/page.tsx
components/InvestmentApplicationForm.tsx
app/investor/investments/page.tsx
app/api/investments/route.ts
app/api/investments/[applicationId]/route.ts
app/admin/investments/page.tsx
app/api/admin/investments/[applicationId]/route.ts
```

### 9.8 Dividends / periods

Модуль расчёта периодов и дивидендов компании:

```text
app/api/company/dividends/route.ts
app/api/admin/dividends/route.ts
components/company/DividendCalculationForm.tsx
lib/dividend-calculator.js
lib/dividend-actions.ts
tests/dividend-calculator.test.mjs
```

Ключевые модели:

```text
ProjectDividendPeriod
DividendPayment
DividendPeriodStatus
DividendPaymentStatus
```

Назначение:

- компания-владелец проекта рассчитывает период;
- прикрепляет PDF/Excel/CSV отчётность;
- система рассчитывает долю выплат участникам;
- админ/владелец утверждает период;
- дальше выплаты получают статус и могут проводиться.

Правило доступа: владелец или администратор компании может рассчитывать и проводить выплаты только по проектам своей организации. Это не даёт прав на чужие проекты и не заменяет глобальную админку.

Ручные проверки:

- квартальный проект;
- годовой проект;
- проект недвижимости;
- участники с разными датами входа;
- округление сумм;
- итоговая сумма выплат равна расчётному pool;
- документы отчётности доступны участникам после утверждения.

### 9.9 Support

Поддержка включает авторизованные и guest threads.

Важные файлы:

```text
app/admin/support/page.tsx
app/investor/support/page.tsx
app/api/support/messages/route.ts
app/api/support/guest/route.ts
components/support/GuestSupportChatWidget.tsx
components/support/QuickReplyTemplates.tsx
components/support/SupportAutoRefresh.tsx
lib/support-attachments.ts
lib/support-alerts.ts
```

Ключевые модели:

```text
SupportThread
SupportMessage
GuestSupportThread
```

Support attachments требуют контроля доступа. Приватные файлы нельзя отдавать напрямую из публичного bucket.

### 9.10 Site content and legal docs

Контент:

```text
app/admin/content/page.tsx
app/api/admin/site-content/*
app/legal/[slug]/page.tsx
app/api/site-content/legal/[slug]/route.ts
lib/site-content.ts
lib/content.ts
components/Footer.tsx
```

Социальные ссылки в футере:

- Telegram: `https://t.me/qidra`
- Instagram: `https://www.instagram.com/qidra.io?igsh=M3J1eTZsNmR2cmFr`

## 10. Production infrastructure

По inventory на 2026-05-30:

Google Cloud project:

```text
project id: qidra-476219
owner account: qidra.hub@gmail.com
```

Cloud Run:

```text
api-prod
frontend-prod
region: europe-west1
```

Cloud SQL:

```text
instance: qidra-prod
database: qidra
engine: PostgreSQL
host/IP: 34.78.65.223
port: 5432
region/zone: europe-west1-d
automated backups: enabled
PITR: enabled
deletion protection: enabled
```

Cloud Storage:

```text
bucket: qidra-storage
observed folders:
- chat-files/
- project-documents/
- project-media/
```

Artifact Registry:

```text
repository: qidra-backend
region: europe-west1
images:
- backend
- frontend
```

Secret Manager:

```text
observed secrets count: 43
```

Important production secrets names:

```text
DATABASE_URL_PROD
EMAIL_HOST_PROD
EMAIL_PORT_PROD
EMAIL_USER_PROD
EMAIL_PASSWORD_PROD
FRONTEND_URL_PROD
API_URL_PROD
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_CALLBACK_URL_PROD
REDIS_HOST_PROD
REDIS_PORT_PROD
REDIS_PASSWORD_PROD
TELEGRAM_BOT_TOKEN_PROD
TRON_API_KEY_PROD
TRON_FULL_HOST_PROD
TRON_USDT_CONTRACT_ADDRESS_PROD
WALLET_ENCRYPTION_KEY_PROD
GCS_BUCKET_NAME
GCP_PROJECT_ID
GCP_SERVICE_ACCOUNT_KEY
IPGEOLOCATION_API_KEY_PROD
```

Security warning from inventory:

- Cloud SQL public IP connectivity enabled.
- Authorized networks included `0.0.0.0/0` at time of inventory.
- Do not change blindly; first confirm actual app connection path and prepare fallback.

## 11. Paid / external services

Known or referenced services:

1. Google Cloud Platform
   - Cloud Run
   - Cloud SQL PostgreSQL
   - Cloud Storage
   - Artifact Registry
   - Secret Manager
   - Cloud Logging/Monitoring indirectly through Cloud Run

2. Domain/DNS
   - Domain: `qidra.io`
   - Inventory says domain controlled by owner.
   - Security docs mention Namecheap nameservers at one point.
   - Cloudflare WAF is recommended, but not active unless DNS is migrated to Cloudflare.

3. Email
   - SMTP variables exist.
   - Resend is recommended for production because some VPS providers block SMTP ports.
   - Need owner to confirm active provider dashboard.

4. Google OAuth
   - Uses `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
   - Production callback should be `https://qidra.io/api/auth/callback/google`.

5. Telegram
   - Telegram login/support bot uses `TELEGRAM_BOT_USERNAME`, `TELEGRAM_BOT_TOKEN`, optional support chat id.
   - BotFather ownership must be confirmed by owner.

6. TronGrid / TRON
   - USDT TRC20 deposit sync.
   - Uses TronGrid API key and QIDRA wallet address.

7. S3-compatible storage
   - Code supports AWS S3, Cloudflare R2, MinIO or compatible endpoint.
   - Current GCP inventory shows `qidra-storage`; confirm whether current production uses GCS directly or S3-compatible endpoint.

8. Redis
   - Redis secrets are present in inventory.
   - Exact Redis provider/dashboard unknown.

9. IP geolocation
   - `IPGEOLOCATION_API_KEY_PROD` exists in inventory.

10. GitHub
   - Git hosting and GitHub Actions CI/CD.

Not observed in current code/package:

- Stripe
- PayPal
- NowPayments
- Twilio
- OpenAI API
- Sentry/Datadog/PostHog

## 12. Environment variables

Local `.env.example` includes:

```text
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
TELEGRAM_BOT_USERNAME
TELEGRAM_BOT_TOKEN
SUPPORT_TELEGRAM_CHAT_ID
QIDRA_WALLET_KEY_ENCRYPTION_SECRET
CRON_SECRET
QIDRA_WALLET_SYNC_SECRET
TRONGRID_API_KEY
TRONGRID_API_BASE_URL
QIDRA_USDT_TRC20_CONTRACT
QIDRA_TRON_WALLET_ADDRESS
ENABLE_2FA
EMAIL_PROVIDER
SMTP_HOST
SMTP_PORT
SMTP_SECURE
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
SMTP_TEST_TO
SUPPORT_ALERT_EMAILS
RESEND_API_KEY
FILE_STORAGE_DRIVER
FILE_STORAGE_S3_BUCKET
FILE_STORAGE_S3_REGION
FILE_STORAGE_S3_ENDPOINT
FILE_STORAGE_S3_ACCESS_KEY_ID
FILE_STORAGE_S3_SECRET_ACCESS_KEY
FILE_STORAGE_S3_FORCE_PATH_STYLE
DATABASE_BACKUP_REQUIRE_S3
DATABASE_BACKUP_RETENTION_DAYS
DATABASE_BACKUP_LOCAL_DIR
DATABASE_BACKUP_S3_BUCKET
DATABASE_BACKUP_S3_REGION
DATABASE_BACKUP_S3_ENDPOINT
DATABASE_BACKUP_S3_ACCESS_KEY_ID
DATABASE_BACKUP_S3_SECRET_ACCESS_KEY
DATABASE_BACKUP_S3_FORCE_PATH_STYLE
DATABASE_BACKUP_S3_PREFIX
```

Production secrets must be stored in Secret Manager, GitHub environment secrets or `.env.production` on the production host. Do not commit `.env.production`.

## 13. CI/CD

CI workflow:

```text
.github/workflows/ci.yml
```

Runs on:

- push to `main`
- pull request to `main`

CI steps:

```bash
npm ci
npm run lint
npx prisma validate
npm run build
```

Deploy workflow:

```text
.github/workflows/deploy.yml
```

Deploy triggers:

- automatic after successful CI on `main`;
- manual `workflow_dispatch`.

Manual inputs:

```text
environment: production | staging
ref: branch/tag/SHA
run_migrations: true | false
```

GitHub environment secrets required:

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_PORT
DEPLOY_PATH
DEPLOY_KNOWN_HOSTS
DEPLOY_COMPOSE_FILE
HEALTHCHECK_URL
HEALTHCHECK_STATUS
DEPLOY_SSH_KEY
```

Deployment mechanism:

1. Checkout code.
2. Create `.deploy-revision`.
3. SSH setup.
4. `rsync --delete` to server, excluding `.git`, `node_modules`, `.next`, `.env.production`.
5. Remote script `scripts/deploy-remote.sh`.
6. Optional `prisma migrate deploy`.
7. Docker Compose rebuild/start.
8. Healthcheck.

Remote deploy script:

```text
scripts/deploy-remote.sh
```

Defaults:

```text
APP_DIR=/opt/qidra-platform
COMPOSE_FILE=docker-compose.prod.yml
ENV_FILE=.env.production
LOCAL_HEALTHCHECK_URL=http://127.0.0.1:8091/
RUN_MIGRATIONS=true
```

## 14. Production deploy procedure

Before deploy:

```bash
git status --short
npm run lint
npm run build
npx prisma validate
npm run test:dividends
```

If migrations are included:

1. Create production DB backup.
2. Verify backup exists and is readable.
3. Deploy with `run_migrations=true`.
4. Verify migration status.
5. Run production smoke-test.

Manual GitHub deploy:

```text
GitHub Actions -> Deploy -> Run workflow
environment: production
ref: target branch/SHA
run_migrations: true/false
```

Production healthcheck:

```bash
QIDRA_HEALTHCHECK_URL=https://qidra.io npm run healthcheck:production
```

## 15. Backup and restore

Scripts:

```text
scripts/backup-postgres.sh
scripts/restore-postgres.sh
scripts/backup-database.mjs
scripts/backup-status.mjs
scripts/restore-database.mjs
scripts/upload-backup-s3.mjs
```

Manual backup example:

```bash
DATABASE_URL='<production-database-url>' BACKUP_DIR=/var/backups/qidra/postgres RETENTION_DAYS=14 scripts/backup-postgres.sh
```

Compose PostgreSQL backup example:

```bash
set -a
. ./.env.production
set +a
BACKUP_POSTGRES_COMPOSE=true BACKUP_UPLOAD_S3=true BACKUP_DIR=/var/backups/qidra/postgres RETENTION_DAYS=14 scripts/backup-postgres.sh
```

Restore test must be done into a separate test database, never over production without explicit approval.

## 16. Security and compliance rules

Mandatory rules:

- Never output secrets in chat.
- Never commit `.env.production`.
- Never rotate wallet encryption key casually.
- Never run destructive SQL without backup and explicit approval.
- Never change balances, transactions, payouts or investments without a transaction plan and rollback plan.
- Never use local DB as proof of production state.
- For production DB work, first confirm actual production DB, create backup, then operate.
- For ownership changes, use exact IDs and a single transaction.

Built-in protections:

- CSP/security headers in Next config.
- HSTS for production HTTPS.
- Origin/Referer guard for mutating `/api/*`.
- Session max age.
- Rate limits for auth, KYC, submissions, deposits, withdrawals, investments, support.
- Password policy.
- File upload limits.

Infrastructure protections still required:

- WAF/rate limit on `/api/auth/*`, `/api/wallet/*`, `/api/investments`, `/api/support/*`.
- Private bucket for KYC and project documents.
- Daily backup with restore test.
- At least two `SUPER_ADMIN` accounts.
- 2FA for admins and staff where enabled.

## 17. Known risks and unresolved inventory gaps

From current docs and operations history:

- Production GCP inventory may be older than the latest deploy path. Reconfirm current runtime before major production work.
- Cloud SQL public access was broad in inventory; must be reviewed safely.
- Redis provider details unknown.
- Email provider dashboard unknown.
- Telegram BotFather owner unknown.
- Exact active DNS/WAF path must be reconfirmed.
- S3/GCS/R2 actual production storage path must be reconfirmed.
- Some production data fixes were done directly for urgent owner/project linkage; future changes must be through logged migration/admin tools when possible.
- Keep project catalog component isolated from project detail pages; this area has had regressions.
- Keep listing validation sector-aware; do not apply real-estate-only validation to trade/gold projects.
- Admin approval validation should accept existing server-side submission data and not require the admin UI to resend every listing field.

## 18. Change control

Rules established for QIDRA:

- Every meaningful change must have a Git commit.
- Do not mix unrelated changes in one commit.
- Use `CHANGELOG.md` / docs where relevant.
- Use `npm run changes:last-day` for last-day report.
- Before migrations: commit current safe state and create backup.
- After successful migration/deploy: commit code and document result.

Recommended commit style:

```text
fix: relax admin submission approval payload validation
fix: stabilize project catalog card layout
feat: add company dividend period engine
chore: add change control baseline and last-day report
```

## 19. First-day checklist for the next developer

1. Get repository access.
2. Get read-only production console access first.
3. Confirm current production branch/SHA.
4. Confirm current Cloud Run/host deployment path.
5. Confirm production DB host and backup status.
6. Run local setup:

```bash
npm ci
npm run prisma:generate
npm run build
```

7. Read these docs:

```text
docs/qidra-developer-handover.md
docs/qidra-infrastructure-inventory.md
docs/production-launch-runbook.md
docs/production-security-runbook.md
docs/change-control.md
```

8. Review Prisma schema before any data work.
9. Review recent commits:

```bash
git log --oneline --decorate -n 30
```

10. Do not deploy until local build and owner-approved scope are clear.

## 20. Accesses the owner should provide separately

Do not put credentials into this repository. The owner should provide access through official systems:

- GitHub repository access.
- Google Cloud project `qidra-476219`.
- Secret Manager access with least privilege.
- Cloud SQL read-only access for diagnostics.
- GitHub Actions environments/secrets access.
- Domain registrar / DNS access.
- Email provider dashboard.
- Telegram BotFather or bot admin access.
- TronGrid account access.
- Storage bucket admin access.
- Production server SSH access, if current deploy uses SSH/rsync path.

## 21. What not to change without explicit approval

- Production DB data.
- Prisma migrations.
- Wallet encryption secret.
- User balances.
- Investment applications.
- Dividend payments.
- Project ownership.
- Project statuses.
- KYC documents.
- Support attachments.
- Legal text and investment risk wording.
- Auth/session logic.
- Payment/deposit sync logic.

## 22. Minimum smoke-test after any deploy

Run/check:

- `https://qidra.io`
- `/projects?lang=ru`
- one active project detail page
- one closed/funded project detail page
- sign in / sign out
- forgot password email
- investor profile page
- company cabinet
- company projects page
- company dividends page
- admin project submissions page
- admin users page
- support chat
- document download access
- production healthcheck

If the change touches listing flow:

- create draft listing;
- upload several files;
- remove one uploaded file;
- submit for review;
- approve in admin;
- verify public project page.

If the change touches dividends:

- calculate a quarterly period;
- attach PDF/Excel report;
- check participant rows;
- confirm total distribution amount;
- verify participant-visible report after approval.

## 23. Current operational notes

Recent urgent areas fixed or worked on:

- Project catalog card layout regressions.
- False real-estate validation on non-real-estate/trade listings.
- Project submission upload handling.
- Admin submission approval fallback and payload validation.
- Company project ownership for Al Amana Gold contracts.
- Company dividend period calculation and reporting attachments.
- Password reset wording and password visibility UI.
- Free-form text validation for user profile/KYC fields.

Before touching these areas again, reproduce the exact user scenario and keep the patch minimal.
