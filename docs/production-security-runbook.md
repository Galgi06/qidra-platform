# Qidra production security runbook

Дата: 2026-06-06.

Этот документ фиксирует обязательные настройки перед запуском Qidra для реальных клиентов и USDT.

## 1. Тестовые доступы для локальной проверки

Только для локальной разработки:

- Супер-админ: `admin@qidra.local`
- Участник: `participant@qidra.local`

Пароли для этих аккаунтов нельзя переносить в production. Перед запуском нужно создать новых production-админов, включить 2FA и удалить или заблокировать все локальные аккаунты.

## 2. Secrets и окружение

Production должен запускаться только с настоящими secrets:

- `NEXTAUTH_SECRET`: случайная строка минимум 32 символа. Генерировать через `openssl rand -base64 48`.
- `NEXTAUTH_URL`: полный HTTPS-домен production, например `https://qidra.io`.
- `DATABASE_URL`: production PostgreSQL с SSL, backup и ограниченным доступом.
- `QIDRA_WALLET_KEY_ENCRYPTION_SECRET`: отдельный секрет для шифрования приватных ключей TRC20-адресов.
- `CRON_SECRET`: секрет для cron-синхронизации.
- `QIDRA_WALLET_SYNC_SECRET`: секрет для ручного запуска синхронизации кошельков.

В production приложение теперь не должно стартовать без валидного `NEXTAUTH_SECRET`.

## 3. Постоянное хранение файлов

KYC и документы проектов не должны храниться в локальной папке `storage` на production-сервере.

Поддерживается S3-compatible private bucket: AWS S3, Cloudflare R2, MinIO или совместимый сервис.

Переменные:

- `FILE_STORAGE_DRIVER=s3`
- `FILE_STORAGE_S3_BUCKET`
- `FILE_STORAGE_S3_REGION`
- `FILE_STORAGE_S3_ENDPOINT`
- `FILE_STORAGE_S3_ACCESS_KEY_ID`
- `FILE_STORAGE_S3_SECRET_ACCESS_KEY`
- `FILE_STORAGE_S3_FORCE_PATH_STYLE=true`

Файлы сохраняются приватно. Доступ к KYC-документам идёт только через серверные API Qidra с проверкой роли.

Права bucket:

- public access: off
- object listing: off для публичного доступа
- encryption at rest: on
- lifecycle policy: настроить отдельно по юридическим требованиям
- audit/logging: on, если провайдер поддерживает

## 4. OAuth callbacks

Google OAuth:

- Authorized JavaScript origins: `https://qidra.io`
- Authorized redirect URI: `https://qidra.io/api/auth/callback/google`

Telegram:

- Bot domain должен соответствовать production-домену.
- `TELEGRAM_BOT_TOKEN` хранить только в secrets.
- `TELEGRAM_BOT_USERNAME` указывать без `@`.

## 5. SMTP

Нужно подключить доменную почту Qidra:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM`

DNS:

- SPF
- DKIM
- DMARC

Проверить реальные письма:

- регистрация
- подтверждение email
- восстановление пароля
- восстановление доступа через поддержку

## 6. TronGrid и USDT TRC20

Переменные:

- `TRONGRID_API_KEY`
- `TRONGRID_API_BASE_URL=https://api.trongrid.io`
- `QIDRA_USDT_TRC20_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`
- `QIDRA_TRON_WALLET_ADDRESS`

Правила:

- входящие депозиты подтверждаются только по персональному TRC20-адресу участника;
- ручное подтверждение депозитов запрещено;
- один transaction hash нельзя использовать повторно;
- вывод подтверждается только после сверки outgoing hash, суммы, получателя и адреса отправителя Qidra;
- перед production нужен dry-run маленькой суммой.

## 7. Админ-безопасность

Обязательно:

- минимум два супер-админа;
- 2FA для супер-админов и сотрудников;
- роли выдаются только через форму с причиной и `CONFIRM`;
- блокировка пользователей только через форму с причиной и журналом;
- корректировки баланса только через журналируемую форму;
- сотрудники не должны знать пароли клиентов;
- восстановление доступа клиента только через одноразовую ссылку после сверки KYC.

## 8. Защита приложения

В коде включены:

- security headers через Next config;
- CSP с запретом iframe-встраивания и object/embed-контента;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `X-Content-Type-Options: nosniff`;
- `Permissions-Policy` без камеры, микрофона, геолокации и payment API;
- базовый rate limit для регистрации, восстановления пароля, KYC, project submissions, депозитов, выводов, заявок участия и сообщений поддержки.

Перед production обязательно добавить внешний rate limit/WAF на инфраструктурном уровне. Встроенный rate limit является дополнительным защитным слоем и не заменяет Cloudflare/Vercel/nginx rules.

## 9. Перед деплоем

Команды проверки:

```bash
DATABASE_URL="postgresql://..." npx prisma validate
npm run lint
npm run build
npm audit --omit=dev
npm run check:production
```

После деплоя:

- проверить `/auth/sign-up`
- проверить `/auth/sign-in`
- проверить Google callback
- проверить Telegram callback
- проверить SMTP
- проверить KYC upload/download
- проверить project submission upload/download
- проверить персональный TRC20-адрес и QR
- проверить депозит маленькой суммой
- проверить участие в проекте из подтвержденного баланса
- проверить вывод маленькой суммой
- проверить журнал действий

## 10. Dependency audit

`npm audit --omit=dev` должен запускаться перед каждым production-релизом.

Текущий аудит показывает уязвимости в транзитивных зависимостях `tronweb`, `next-auth`/`@auth/core`, `nodemailer` и связанных пакетах. `npm audit fix --force` применять нельзя без отдельного тестового плана: он предлагает ломающее обновление `tronweb` и некорректные major/downgrade-изменения для части пакетов.

План закрытия:

- отдельно протестировать обновление `tronweb` и платежную сверку TRC20;
- отслеживать исправления `next-auth`/`@auth/core`;
- держать SMTP-операции серверными, не раскрывать ответы SMTP клиенту;
- не деплоить production, если появляются критические remote-code-execution или auth-bypass advisories без mitigation.
