# QIDRA / Marketplace - документация для передачи проекта

Дата подготовки: 2026-08-07  
Репозиторий: `git@github.com:Galgi06/qidra-platform.git`  
Локальный путь Codex: `/Users/md761/.codex/worktrees/207d/Qidra`  
Основной домен: `https://qidra.io`  

Документ подготовлен для передачи проекта другой команде разработчиков. Он описывает только QIDRA и встроенный Marketplace QIDRA. Не смешивать с Hydra Messenger, LifeEcho, AM AI и другими проектами.

Важно: в документе намеренно не указаны пароли, приватные ключи, токены, session cookies, полные строки `DATABASE_URL`, приватные SSH-ключи и значения GitHub/Cloudflare/Google/DigitalOcean secrets. Эти данные должны передаваться владельцем проекта отдельно через безопасный канал.

Дополнительный обязательный документ передачи:

```text
docs/qidra-former-team-questionnaire.md
docs/qidra-production-verification-runbook.md
docs/qidra-dividend-distribution-questionnaire.md
docs/qidra-design-system-brief.md
docs/qidra-support-bot-spec.md
docs/qidra-company-side-mockups-spec.md
```

Первый документ - опросник бывшей команде разработки. Его нужно отправить старой команде до первой production-правки новой командой. Второй документ - runbook независимой проверки production, который новая команда должна пройти самостоятельно. Третий документ - отдельный технический опросник по фактической реализации расчёта распределений и дивидендов. Дополнительные документы фиксируют дизайн-систему, ТЗ бота поддержки и недостающие макеты стороны компаний. Блоки про production truth, секреты, кошельки, финансовый контур, юридические договоры, путь инвестиции и аварийную остановку являются блокирующими.

## 1. Что такое QIDRA

QIDRA - веб-платформа для халяльных инвестиционных/партнёрских проектов. Платформа объединяет:

- публичный сайт;
- Marketplace / каталог проектов;
- кабинеты участников;
- кабинеты компаний-инициаторов;
- админ-панель операционного центра;
- систему KYC и анкет;
- систему создания и модерации листингов;
- документы проектов;
- инвестиционные заявки;
- кошелёк USDT TRC20;
- подтверждение платежей;
- поддержку пользователей;
- расчёт периодов и дивидендов;
- управление компанией, проектами, лидами и командой.

Основной пользовательский сценарий:

1. Инвестор регистрируется.
2. Заполняет профиль и KYC.
3. Изучает проекты в Marketplace.
4. Подаёт заявку на участие.
5. Пополняет баланс USDT TRC20.
6. Участвует в проекте.
7. Получает начисления/дивиденды после утверждения периода.

Основной сценарий компании:

1. Компания регистрируется как юридическое лицо.
2. Заполняет профиль компании.
3. Загружает документы.
4. Создаёт листинг проекта.
5. Отправляет листинг на проверку.
6. Админ проверяет и публикует проект.
7. Компания видит свои проекты и входящие заявки.
8. Компания рассчитывает периоды и дивиденды по своим проектам.
9. Админ или уполномоченный пользователь утверждает и проводит выплаты.

## 2. Что такое Marketplace в QIDRA

Marketplace - это не отдельный сервер и не отдельное приложение. Это модуль внутри QIDRA.

Marketplace состоит из:

- публичного каталога проектов: `/projects`;
- публичной страницы проекта: `/projects/[slug]`;
- формы участия в проекте: `/invest/[slug]`;
- документов проекта;
- карточек проектов;
- статусов проектов: активен, собран, закрыт, приостановлен;
- фильтрации по открытому/закрытому состоянию;
- блока публичной компании: `/companies/[slug]`;
- переходов из кабинета компании к витрине платформы.

Marketplace показывает краткое превью проектов, а вся полная информация должна находиться внутри детальной страницы проекта.

Важное архитектурное правило: карточка каталога и детальная страница проекта должны быть разделены по UI-логике. Нельзя повторно использовать детальный layout внутри каталога, потому что это уже ломало карточки: параметры накладывались, описание растягивало карточку, кнопки обрезались.

## 3. Технический стек

Проект написан на:

- TypeScript;
- Next.js App Router;
- React;
- Prisma ORM;
- PostgreSQL;
- NextAuth;
- Tailwind CSS;
- Zod;
- Node.js.

Версии из текущего `package.json`:

- `next`: `16.2.12`
- `react`: `19.2.3`
- `react-dom`: `19.2.3`
- `typescript`: `^5.9.3`
- `prisma`: `^6.19.3`
- `@prisma/client`: `^6.19.3`
- `next-auth`: `^4.24.15`
- `zod`: `^4.1.13`
- `@aws-sdk/client-s3`: `^3.1063.0`
- `tronweb`: `^6.4.0`
- `nodemailer`: `^9.0.3`
- `bcryptjs`: `^3.0.3`

Основные команды:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:deploy
npm run healthcheck:production
npm run changes:last-day
npm run test:dividends
```

Dev server:

```text
http://localhost:8091
```

## 4. Репозиторий и контроль изменений

GitHub:

```text
git@github.com:Galgi06/qidra-platform.git
```

Текущая рабочая ветка в Codex на момент подготовки:

```text
codex/qidra-rescue-20260705
```

Последний видимый commit:

```text
7b2c543 fix: relax admin submission approval payload validation
```

Файлы контроля изменений:

- `CHANGELOG.md`
- `docs/change-control.md`
- `scripts/report-last-day-changes.mjs`

Правило проекта: каждое существенное изменение должно иметь отдельный commit и запись в changelog. Перед миграциями и структурными изменениями обязателен backup.

Перед началом любой работы новая команда должна выполнить:

```bash
pwd
git status --short
git branch -vv
git log --oneline --decorate -n 20
npm run build
```

## 5. Структура кода

Главные директории:

```text
app/                         Next.js App Router pages and API routes
components/                  React UI components
components/admin/            Admin forms and controls
components/auth/             Sign-in/sign-up/reset-password UI
components/company/          Company cabinet and dividend UI
components/support/          Support chat UI
components/ui/               Shared UI primitives
lib/                         Business logic, auth, access, integrations
prisma/                      Prisma schema and migrations
scripts/                     Deploy, backup, diagnostics, import, healthcheck
ops/                         nginx, Cloudflare, systemd configs
docs/                        Runbooks and documentation
.github/workflows/           CI/CD
public/                      Static assets
```

Основные страницы:

```text
app/page.tsx                         Главная
app/projects/page.tsx                Marketplace / каталог проектов
app/projects/[slug]/page.tsx         Детальная страница проекта
app/invest/[slug]/page.tsx           Подача заявки на участие
app/companies/[slug]/page.tsx        Публичная страница компании
app/investor/page.tsx                Кабинет участника
app/company/page.tsx                 Кабинет компании
app/admin/page.tsx                   Операционный центр / админка
```

Auth:

```text
app/auth/sign-in/page.tsx
app/auth/sign-up/page.tsx
app/auth/forgot-password/page.tsx
app/auth/reset-password/page.tsx
app/auth/verify-email/page.tsx
app/auth/telegram/page.tsx
```

Investor workspace:

```text
app/investor/page.tsx
app/investor/kyc/page.tsx
app/investor/wallet/page.tsx
app/investor/investments/page.tsx
app/investor/support/page.tsx
```

Company workspace:

```text
app/company/page.tsx
app/company/profile/page.tsx
app/company/projects/page.tsx
app/company/documents/page.tsx
app/company/leads/page.tsx
app/company/team/page.tsx
app/company/analytics/page.tsx
```

Admin:

```text
app/admin/page.tsx
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

Ключевые библиотеки:

```text
lib/auth.ts                         Auth helpers
lib/next-auth.ts                    NextAuth config
lib/access.ts                       Role/access checks
lib/user-access.ts                  User-level access logic
lib/project-catalog.ts              Marketplace/project mapping
lib/real-estate.ts                  Real estate project data mapping
lib/form-validation.ts              Shared validation
lib/file-storage.ts                 S3-compatible storage
lib/email.ts                        Email sending
lib/rate-limit.ts                   Rate limiting
lib/organizations.ts                Company/organization logic
lib/company-workspace.ts            Company workspace data
lib/dividend-actions.ts             Dividend actions
lib/dividend-calculator.js          Dividend calculation engine
lib/wallet-deposit-sync.ts          Wallet deposit sync
lib/trongrid.ts                     TronGrid integration
lib/support-attachments.ts          Support attachments
```

## 6. Основные роли и доступы

Роли из Prisma:

```text
INVESTOR
TECH_SUPPORT
SALES_MANAGER
ADMIN
SUPER_ADMIN
```

Роли внутри компании:

```text
OWNER
ADMIN
EDITOR
ANALYST
```

Важно: пользовательская роль `INVESTOR` и членство в компании `OrganizationMember` - разные уровни доступа. Пользователь может быть обычным участником по глобальной роли, но одновременно быть `OWNER` компании через `OrganizationMember`.

Логика доступа к кабинетам:

- инвестор видит `/investor`;
- компания видит `/company`, если есть `OrganizationMember`;
- админ видит `/admin`, если роль `ADMIN` или `SUPER_ADMIN`;
- выплаты компании доступны только владельцу/админу компании по проектам своей организации;
- доступ к выплатам не должен давать права на чужие проекты и не заменяет глобальную админ-панель.

## 7. Личный кабинет участника

В кабинете участника есть:

- профиль пользователя;
- статус профиля;
- свободный баланс;
- заявки на проверке;
- кнопка заполнения профиля;
- KYC;
- кошелёк;
- список инвестиций;
- поддержка;
- переход к проектам;
- подача заявок на участие.

Ключевые пользовательские страницы:

- `/investor`
- `/investor/kyc`
- `/investor/wallet`
- `/investor/investments`
- `/investor/support`

Критичные UX-правила:

- поля города, профессии и адреса должны принимать свободный текст;
- нельзя ограничивать реальные города/профессии словарями;
- скрытые file inputs не должны блокировать отправку анкеты;
- ошибки должны быть видимыми и понятными;
- кнопка отправки не должна выглядеть неактивной, если форма фактически готова.

## 8. Кабинет компании

Кабинет компании включает:

- обзор компании;
- профиль компании;
- документы компании;
- проекты компании;
- статусы листингов;
- новый листинг;
- лиды;
- команду;
- аналитику;
- периоды и дивиденды.

Основной компонент навигации:

```text
components/CompanyTabs.tsx
```

Разделы компании:

- `Компания`;
- `Onboarding`;
- `Листинги`;
- `Рынок / Marketplace`.

Страницы:

```text
/company
/company/profile
/company/projects
/company/documents
/company/leads
/company/team
/company/analytics
/investor/projects/new
```

Публичная страница компании:

```text
/companies/[slug]
```

Важное правило: компания должна видеть только свои проекты и свои заявки. Для этого должны быть корректны связи:

- `Organization`;
- `OrganizationMember`;
- `Project.organizationId`;
- `ProjectSubmission.organizationId`.

## 9. Marketplace и проекты

Главные модели:

- `Project`;
- `ProjectDocument`;
- `ProjectReport`;
- `ProjectSubmission`;
- `InvestmentApplication`;
- `Organization`;
- `OrganizationMember`;

Статусы проекта:

```text
DRAFT
REVIEW
ACTIVE
FUNDED
PAUSED
CLOSED
```

Статусы заявки на листинг:

```text
SUBMITTED
REVIEW
APPROVED
REJECTED
```

Типовой lifecycle:

1. Компания создаёт листинг.
2. Форма сохраняет черновик локально.
3. Пользователь прикрепляет документы, фото, видео.
4. Заявка отправляется в `ProjectSubmission`.
5. Админ видит заявку в `/admin/project-submissions`.
6. Админ проверяет документы и текст.
7. Админ нажимает approve.
8. На основе заявки создаётся или обновляется `Project`.
9. Проект появляется в Marketplace.

Важные UI-правила:

- каталог `/projects` показывает только короткую карточку;
- детальная страница `/projects/[slug]` показывает полную информацию;
- карточка каталога не должна выводить все поля проекта;
- длинные тексты должны обрезаться через `line-clamp`;
- фотографии проекта должны работать как галерея/лайтбокс;
- документы проекта должны быть сгруппированы и названы понятно.

## 10. Недвижимость

Для недвижимости используется расширенный JSON `propertyData`.

Доработанные требования по недвижимости:

- длинные описания до 100 000 символов;
- свободное заполнение текстовых блоков;
- поддержка главного изображения;
- поддержка галереи;
- поддержка документов;
- поддержка PDF/Excel/изображений/видео;
- возможность удалить или заменить файл до отправки;
- черновик должен сохраняться, чтобы пользователь не терял заполненную форму;
- закрытый проект недвижимости в статусе `FUNDED`/`CLOSED` должен отображать собранную сумму как целевой объём, если сбор закрыт вне платформы.

Ключевые файлы:

```text
components/ProjectSectorFields.tsx
components/FileUpload.tsx
lib/real-estate.ts
lib/project-catalog.ts
app/investor/project-submissions/route.ts
app/api/admin/project-submissions/[submissionId]/route.ts
```

## 11. Al Amana Gold / товарные контракты

В проекте есть контракты Al Amana Gold:

- квартальный контракт;
- годовой контракт.

Они должны отображаться как проекты компании, если корректно настроены:

- `Project.organizationId`;
- `OrganizationMember`;
- `ProjectSubmission.organizationId`, если есть связанные заявки.

Важно: Golden Fleece и Al Amana Gold - это данные/проекты внутри QIDRA, а не отдельный проект разработки. Не смешивать с отдельными репозиториями или серверами.

Для товарных контрактов важны:

- период расчёта;
- фактическая прибыль;
- доля участников;
- доля компании;
- отчётные PDF/Excel файлы;
- утверждение периода;
- выплата начислений.

## 12. Дивиденды и периоды выплат

Модуль дивидендов находится в:

```text
components/company/DividendCalculationForm.tsx
lib/dividend-actions.ts
lib/dividend-calculator.js
lib/dividend-calculator.d.ts
app/api/company/dividends/route.ts
app/api/admin/dividends/route.ts
tests/dividend-calculator.test.mjs
prisma/migrations/20260712103000_expand_dividend_period_engine/migration.sql
```

Модели:

- `ProjectDividendPeriod`;
- `DividendPayment`;
- `InvestmentApplication`;
- `WalletTransaction`;

Статусы периода:

```text
DRAFT
APPROVED
PAID
CANCELLED
```

Статусы выплаты:

```text
CALCULATED
APPROVED
PAID
CANCELLED
```

Поля периода:

- период;
- дата начала;
- дата окончания;
- валовая выручка;
- прямые расходы;
- операционные расходы;
- чистая прибыль;
- процент участникам;
- пул инвесторов;
- прибыль компании;
- округление;
- snapshot расчёта;
- файлы отчётности;
- комментарий компании;
- версия алгоритма.

Базовая логика:

1. Компания выбирает свой проект.
2. Указывает период.
3. Указывает доходы и расходы.
4. Указывает долю участникам.
5. Прикрепляет PDF/Excel/CSV отчётность.
6. Система рассчитывает начисления участникам.
7. Период сохраняется как draft/calculated.
8. Админ или уполномоченный пользователь утверждает.
9. После утверждения начисления можно провести к выплате.

Правило безопасности: компания не должна рассчитывать дивиденды по чужим проектам.

## 13. Кошелёк и платежи

Платёжный слой:

- `Wallet`;
- `WalletTransaction`;
- `PaymentConfirmation`;
- `InvestmentApplication`;

Интеграция:

- USDT TRC20;
- TronGrid;
- персональный TRC20 адрес участника;
- QR-код адреса;
- проверка tx hash;
- sync deposits cron.

Ключевые файлы:

```text
lib/wallet-addresses.ts
lib/wallet-deposit-sync.ts
lib/trongrid.ts
components/WalletDepositAddress.tsx
components/WalletOperationItem.tsx
app/api/wallet/deposits/route.ts
app/api/admin/payments/sync-trc20/route.ts
app/api/cron/wallet-deposits/route.ts
scripts/qidra-wallet-sync.sh
ops/systemd/qidra-wallet-sync.service
ops/systemd/qidra-wallet-sync.timer
```

Важные env:

- `TRONGRID_API_KEY`;
- `QIDRA_WALLET_KEY_ENCRYPTION_SECRET`;
- `CRON_SECRET`.

Секреты не хранить в Git.

## 14. KYC и анкеты

KYC использует:

- `InvestorProfile`;
- `KycApplication`;
- документы KYC;
- статус профиля.

Ключевые файлы:

```text
app/investor/kyc/page.tsx
app/api/investor/kyc/route.ts
app/admin/kyc/page.tsx
app/api/admin/kyc/[applicationId]/route.ts
lib/kyc-documents.ts
lib/form-validation.ts
```

Требование по валидации:

- город, адрес, профессия, должность, место проживания - свободный текст;
- разрешить русский, английский, международные названия, цифры, пробелы, запятые, точки, дефисы, апострофы;
- оставить обязательность, min/max длину и защиту от HTML/JS;
- не использовать бизнес-словари для профессий/городов.

## 15. Поддержка пользователей

Модуль поддержки:

- support chat для авторизованных пользователей;
- guest support chat;
- attachments;
- quick replies;
- admin support queue.

Ключевые файлы:

```text
app/admin/support/page.tsx
app/investor/support/page.tsx
app/api/support/messages/route.ts
app/api/support/guest/route.ts
app/api/admin/support/[threadId]/messages/route.ts
components/support/GuestSupportChatWidget.tsx
components/support/QuickReplyTemplates.tsx
components/support/SupportAutoRefresh.tsx
lib/support-attachments.ts
lib/support-alerts.ts
```

Важное правило: вложения поддержки не должны становиться публичными без проверки авторизации. Download routes должны проверять доступ к thread/message.

## 16. Auth и восстановление пароля

Auth построен на NextAuth + Prisma Adapter.

Файлы:

```text
lib/next-auth.ts
lib/auth.ts
lib/passwords.ts
lib/password-policy.ts
lib/tokens.ts
lib/email.ts
app/auth/sign-in/page.tsx
app/auth/sign-up/page.tsx
app/auth/forgot-password/page.tsx
app/auth/reset-password/page.tsx
app/api/auth/register/route.ts
app/api/auth/forgot-password/route.ts
app/api/auth/reset-password/route.ts
components/ui/PasswordInput.tsx
```

Правила:

- регистрация должна разделять участника и компанию;
- password и repeat password должны совпадать;
- reset password должен иметь password и repeat password;
- письмо восстановления должно быть понятным и содержать ссылку на QIDRA;
- если email не существует, пользователь должен получить понятное сообщение;
- не раскрывать лишние данные о пользователях публично.

## 17. Email

Используется:

- `nodemailer` как SMTP fallback;
- возможно HTTPS email API, если SMTP на DigitalOcean недоступен.

Файлы:

```text
lib/email.ts
scripts/test-smtp.mjs
docs/production-security-runbook.md
```

Важно: на DigitalOcean SMTP-порты часто блокируются, поэтому production email лучше отправлять через API email-провайдера, а SMTP оставить fallback.

Новой команде нужно проверить:

- какой email provider фактически используется;
- SPF/DKIM/DMARC домена;
- доставляемость reset password;
- логи ошибок email.

## 18. Файлы и storage

Файлы проекта, компании, поддержки, отчётности и документов хранятся через S3-compatible storage.

Файлы:

```text
lib/file-storage.ts
components/FileUpload.tsx
scripts/test-s3-storage.mjs
scripts/upload-backup-s3.mjs
```

Типы файлов, которые должны поддерживаться:

- PDF;
- DOCX;
- XLSX;
- PPTX;
- JPG;
- PNG;
- WEBP;
- MP4;
- MOV;
- WEBM;
- CSV для отчётов дивидендов.

Критичные правила:

- проверять MIME/type и размер;
- не доверять имени файла;
- исключить path traversal;
- приватные документы отдавать только через авторизованные routes;
- публичные документы проекта можно показывать только после публикации проекта;
- перед отправкой листинга пользователь должен иметь возможность удалить/заменить файл.

## 19. База данных

ORM: Prisma.  
DB: PostgreSQL.

Главный schema:

```text
prisma/schema.prisma
```

Миграции:

```text
prisma/migrations/
```

Ключевые модели:

- `User`;
- `InvestorProfile`;
- `KycApplication`;
- `Wallet`;
- `WalletTransaction`;
- `Project`;
- `ProjectDocument`;
- `ProjectReport`;
- `ProjectSubmission`;
- `Organization`;
- `OrganizationMember`;
- `OrganizationDocument`;
- `OrganizationInvite`;
- `OrganizationLead`;
- `OrganizationAnalyticsEvent`;
- `InvestmentApplication`;
- `ProjectDividendPeriod`;
- `DividendPayment`;
- `SupportThread`;
- `SupportMessage`;
- `GuestSupportThread`;
- `Notification`;
- `AdminAuditLog`;
- `SiteContent`.

Правила DB-работ:

- production DB менять только после backup;
- миграции на production запускать только через `prisma migrate deploy`;
- не использовать локальную БД как источник production-данных;
- перед изменением owner/project связей делать before snapshot;
- операции по привязке проектов делать одной transaction;
- не менять балансы, транзакции, инвестиции и выплаты без отдельного подтверждения.

## 20. Production-инфраструктура

Из документации проекта известно две линии infrastructure:

### 20.1 Текущий self-hosted deploy

GitHub Actions использует secrets:

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

Файлы:

```text
.github/workflows/deploy.yml
scripts/deploy-remote.sh
docker-compose.prod.yml
Dockerfile
ops/nginx/qidra.conf
ops/nginx/qidra-proxy.conf
```

Remote path по умолчанию:

```text
/opt/qidra-platform
```

Приложение слушает:

```text
127.0.0.1:8091
```

Nginx проксирует:

```text
qidra.io
www.qidra.io
```

### 20.2 DigitalOcean

По текущему контексту QIDRA использовал DigitalOcean droplets. Не смешивать с другими проектами. Серверы с именами LifeEcho/Hydra/прочими названиями не считать частью QIDRA без отдельной проверки.

Из QIDRA-контекста фигурировали:

- `adam-ai-server-01` - был использован как origin для `qidra.io` после DNS-восстановления;
- `qidra`;
- `qidra-app-02`.

Важно: окончательно активный production host нужно подтверждать не по названию droplet, а по:

```bash
dig qidra.io
curl -I https://qidra.io
ssh <host>
cd /opt/qidra-platform
cat .deploy-revision
docker compose ps
```

### 20.3 Google Cloud legacy/parallel stack

В документации также есть Google Cloud:

```text
project: qidra-476219
Cloud Run: frontend-prod, api-prod
Cloud SQL: qidra-prod
DB: qidra
Cloud Storage: qidra-storage
```

Это может быть legacy или параллельная инфраструктура. Перед любыми изменениями новой команде нужно определить фактический production runtime:

- что реально отвечает за `https://qidra.io`;
- куда указывает Cloudflare origin;
- какой `DATABASE_URL` использует активный runtime;
- какой commit запущен.

## 21. DNS и Cloudflare

Cloudflare используется для DNS/WAF/proxy.

Файлы:

```text
ops/cloudflare/qidra-waf-rules.md
```

NS из прошлых проверок:

```text
lee.ns.cloudflare.com
fay.ns.cloudflare.com
```

Правила:

- не менять DNS без проверки фактического origin;
- не доверять только имени сервера;
- проверять `curl -I https://qidra.io`;
- проверять Cloudflare proxied status;
- старые IP в docs могут быть неактуальны.

## 22. CI/CD

CI:

```text
.github/workflows/ci.yml
```

Deploy:

```text
.github/workflows/deploy.yml
```

Обычный production deploy:

1. Commit в Git.
2. Push в GitHub.
3. GitHub Actions checkout.
4. Создание `.deploy-revision`.
5. SSH/rsync на server.
6. `scripts/deploy-remote.sh`.
7. `docker compose up --build`.
8. Optional `prisma migrate deploy`.
9. Healthcheck.

Перед deploy:

```bash
npm run build
npm run lint
npm run test:dividends
npm run check:production
```

После deploy:

```bash
QIDRA_HEALTHCHECK_URL=https://qidra.io npm run healthcheck:production
```

## 23. Что было сделано в рамках доработок

Ниже перечислены ключевые работы, которые были выполнены/прорабатывались в рамках Codex-сессий и отражены в коде, changelog или текущем состоянии проекта.

### 23.1 Marketplace и карточки проектов

- Исправлялась карточка проекта в каталоге `/projects`.
- Каталог отделялся от детальной страницы проекта.
- Для карточки закреплялись компактные поля: изображение, статус, структура, название, краткое описание, 4-6 параметров, прогресс, кнопки.
- Для закрытых проектов недвижимости дорабатывалось отображение собранной суммы как целевого объёма.
- Исправлялись проблемы с наложением параметров, растянутым изображением и обрезанными кнопками.

### 23.2 Детальная страница проекта

- Дорабатывалась галерея фотографий.
- Дорабатывались документы проекта.
- Добавлялись информационные блоки по условиям выплат и выхода.
- Проверялись изображения, документы, карты и визуальная типографика.

### 23.3 Листинг проектов

- Увеличивался лимит подробного описания.
- Убирались избыточные ограничения текстовых полей.
- Добавлялась поддержка больших текстов.
- Добавлялся autosave черновика.
- Добавлялось удаление/замена загруженных документов.
- Добавлялась поддержка video attachments.
- Исправлялись ошибки “Добавьте файл”, “Выберите тип недвижимости”, “Выберите статус объекта” для нерелевантных категорий.
- Исправлялся rate limit / “слишком много попыток” вокруг отправки листинга.

### 23.4 Кабинет компании

- Добавлялась логика отображения проектов компании.
- Исправлялись связи `Organization` / `OrganizationMember` / `Project.organizationId`.
- Добавлялся переход между кабинетом участника и кабинетом компании.
- Разделялась логика входа физлица и компании.
- Добавлялся блок проектов и выплат компании.

### 23.5 Al Amana Gold

- Производилась production-привязка двух контрактов Al Amana Gold к компании.
- Проверялась видимость квартального и годового контрактов в кабинете компании.
- Обсуждалась и дорабатывалась логика квартальных и годовых дивидендов.

### 23.6 Дивиденды

- Добавлялся модуль периодов и дивидендов компании.
- Добавлялась формула расчёта.
- Добавлялась поддержка отчётных файлов PDF/Excel/CSV.
- Добавлялась миграция `20260712103000_expand_dividend_period_engine`.
- Добавлялись тесты `npm run test:dividends`.

### 23.7 KYC и анкеты

- Убирались чрезмерные ограничения на город, профессию и адрес.
- Исправлялась ситуация, когда заполненная анкета не отправлялась.
- Добавлялась корректная обработка file fields.

### 23.8 Auth и password reset

- Проверялись письма восстановления пароля.
- Дорабатывался текст email восстановления.
- Добавлялось подтверждение пароля.
- Добавлялся показ/скрытие пароля через password input.
- Проверялась логика существования аккаунта перед отправкой reset-link.

### 23.9 Support

- Дорабатывались вложения в чате поддержки.
- Дорабатывались guest/user support flows.
- Проверялись права доступа к вложениям.

### 23.10 Production/DNS/Deploy

- Выполнялись production deploy с миграциями.
- Исправлялся DNS на Cloudflare после падения сайта.
- Проверялся DigitalOcean origin.
- Подготавливались runbooks по production, backup, restore, security.

## 24. Текущее ТЗ и дорожная карта

### 24.1 Ближайшие критичные задачи

1. Финально проверить production runtime.
2. Зафиксировать один источник production truth: активный сервер, активная DB, активный deploy path.
3. Убедиться, что Marketplace card layout стабилен в Safari/Chrome/mobile.
4. Проверить отправку листинга по всем категориям: недвижимость, товарный проект, общий проект.
5. Проверить, что валидация не требует полей недвижимости для категории “Торговля”.
6. Проверить admin approval flow.
7. Проверить KYC submission на Safari iPhone и Android Chrome.
8. Проверить password reset end-to-end.
9. Проверить отправку email через фактического provider.
10. Проверить расчёт дивидендов по квартальному и годовому контракту.

### 24.2 Среднесрочные задачи

1. Полностью формализовать payout/dividend workflow.
2. Добавить журнал действий компании по выплатам.
3. Добавить отчётность участника по начислениям.
4. Добавить безопасный export по инвестициям/дивидендам.
5. Добавить monitoring ошибок API.
6. Добавить production observability: logs, uptime checks, alerts.
7. Усилить file access control.
8. Провести полноценный security audit.
9. Убрать устаревшие инфраструктурные записи из docs после финальной сверки.

### 24.3 Долгосрочная архитектура

1. Отделить public marketplace UI от admin/company workflows.
2. Вынести domain services для проектов, выплат, документов и KYC.
3. Добавить typed DTO для всех API.
4. Добавить полноценные e2e-тесты Playwright.
5. Добавить audit trail для финансовых операций.
6. Добавить двухфакторную авторизацию для админов.
7. Добавить отдельный secure download service для приватных документов.

## 25. Известные риски

### 25.1 Инфраструктура

- В документации есть следы нескольких production-линий: DigitalOcean self-hosted и Google Cloud.
- Необходимо подтвердить фактический runtime перед любой production DB операцией.
- Старые IP в документах могут быть неактуальны.

### 25.2 Безопасность

- Проверить, что приватные документы не доступны публично.
- Проверить download routes на авторизацию.
- Проверить rate limit по auth/reset/listing endpoints.
- Проверить session/cookie settings.
- Проверить CSP и security headers.
- Проверить, нет ли открытого Postgres наружу.

### 25.3 Финансы

- Любые изменения `Wallet`, `WalletTransaction`, `InvestmentApplication`, `DividendPayment` требуют backup и ручного подтверждения.
- Нельзя менять суммы, балансы и выплаты вместе с UI-правками.
- Расчёты дивидендов должны хранить snapshot алгоритма.

### 25.4 Данные

- Не использовать local DB как production truth.
- Перед owner changes делать backup.
- Изменение `Project.organizationId` влияет на видимость проекта в кабинете компании.
- Изменение `OrganizationMember` влияет на права доступа.

## 26. Доступы, которые нужно передать новой команде

Передавать отдельно и безопасно:

- GitHub repository access;
- GitHub Actions environments and secrets;
- DigitalOcean account/team;
- Cloudflare account;
- Google Cloud project, если он ещё используется;
- production SSH access;
- production `.env.production`;
- production database credentials;
- S3/storage bucket credentials;
- email provider credentials;
- TronGrid credentials;
- domain registrar access;
- backup storage access;
- admin аккаунт QIDRA;
- тестовые аккаунты инвестора и компании.

Не передавать в обычном чате:

- приватные SSH keys;
- database passwords;
- OAuth secrets;
- session tokens;
- wallet private keys;
- encryption secrets.

## 27. Проверка перед передачей проекта

Новая команда должна выполнить:

```bash
npm install
npm run prisma:generate
npm run build
npm run lint
npm run test:dividends
```

Production verification:

```bash
curl -I https://qidra.io
QIDRA_HEALTHCHECK_URL=https://qidra.io npm run healthcheck:production
```

DB verification без секретов:

```bash
npm run check:env
npm run check:production
npm run backup:status
```

Manual QA:

- регистрация участника;
- регистрация компании;
- восстановление пароля;
- заполнение KYC;
- создание листинга;
- загрузка/удаление/замена документов;
- отправка проекта на проверку;
- approval в админке;
- отображение проекта в Marketplace;
- отображение проекта в кабинете компании;
- подача заявки инвестором;
- пополнение кошелька;
- подтверждение платежа;
- расчёт дивидендов;
- прикрепление PDF/Excel отчётности;
- утверждение периода;
- просмотр начислений участником;
- support chat с вложением.

## 27.1 Вопросы бывшей команде до старта работ

Перед первой правкой новая команда должна получить письменные ответы по документу:

```text
docs/qidra-former-team-questionnaire.md
```

Минимум, который нужно закрыть до production-работ:

1. Какой сервер и commit реально обслуживают `https://qidra.io`.
2. Какая production DB является источником правды.
3. Что делать с Google Cloud legacy/parallel stack.
4. Где хранится `QIDRA_WALLET_KEY_ENCRYPTION_SECRET`.
5. Как физически выводятся средства участникам.
6. Когда последний раз проверялся restore из backup.
7. Какие функции в интерфейсе работают частично.
8. Какие известные баги не заведены в tracker.
9. Какие аккаунты оформлены на личные почты.
10. Какие secrets нужно ротировать после передачи.
11. Какой документ юридически оформляет участие инвестора.
12. Как фиксируется акцепт договора и версия условий.
13. Как проходит путь инвестиции от заявки до признания средств вложенными.
14. Кто и как может остановить депозиты, выводы и сайт при инциденте.
15. Что делать при компрометации wallet encryption secret или admin account.

## 28. Backup и restore

Скрипты:

```text
scripts/backup-database.mjs
scripts/backup-postgres.sh
scripts/backup-status.mjs
scripts/restore-database.mjs
scripts/restore-postgres.sh
scripts/upload-backup-s3.mjs
```

Перед production migration:

```bash
npm run backup:database
npm run backup:status
npm run prisma:deploy
```

Restore plan должен быть проверен на отдельной test DB, а не впервые в production.

## 29. Как не сломать проект

Нельзя:

- менять production DB без backup;
- деплоить незакоммиченный код;
- смешивать UI fixes с financial/data migrations;
- менять owner проектов без transaction и before/after snapshot;
- менять `Project.organizationId` вслепую;
- менять `WalletTransaction` вручную без финансового отчёта;
- отключать validation полностью без XSS/HTML защиты;
- публиковать приватные документы через публичные URL;
- использовать Hydra/LifeEcho/AM AI папки как часть QIDRA.

Можно:

- делать маленькие commits;
- фиксировать changelog;
- тестировать локально;
- запускать build перед deploy;
- делать DB backup перед миграциями;
- выносить рискованные изменения в отдельный релиз.

## 30. Минимальный onboarding нового разработчика

1. Получить GitHub доступ.
2. Склонировать `qidra-platform`.
3. Получить `.env.example` и production-safe dev `.env`.
4. Поднять local PostgreSQL или подключить dev DB.
5. Выполнить `npm install`.
6. Выполнить `npm run prisma:generate`.
7. Выполнить `npm run dev`.
8. Открыть `http://localhost:8091`.
9. Пройти регистрацию участника.
10. Пройти регистрацию компании.
11. Создать тестовый проект.
12. Проверить admin approval flow.
13. Запустить `npm run build`.

## 31. Ключевой вывод для передачи

QIDRA Marketplace - это модуль внутри основного Next.js приложения QIDRA. Он не имеет отдельного сервера. Все кабинеты, проекты, компании, документы, инвестиции, кошельки, поддержка и дивиденды работают через один кодовый репозиторий `qidra-platform`, одну Prisma-схему и одну production-инфраструктуру, которую нужно финально сверить по Cloudflare/GitHub Actions/SSH/DB перед дальнейшими изменениями.

Новая команда должна начать не с переписывания, а с стабилизации:

1. подтвердить production origin;
2. подтвердить production DB;
3. проверить secrets;
4. проверить backup/restore;
5. закрепить changelog и git workflow;
6. закрыть критичные UX/validation баги;
7. отдельно спроектировать и протестировать финансовый контур выплат.
