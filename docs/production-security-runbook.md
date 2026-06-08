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

## 4. Ежедневные резервные копии базы

База должна копироваться ежедневно во внешнее приватное S3/R2-хранилище. Локальная копия на сервере допустима только как временный буфер и не считается полноценным backup.

Переменные:

- `DATABASE_BACKUP_REQUIRE_S3=true`
- `DATABASE_BACKUP_RETENTION_DAYS=14`
- `DATABASE_BACKUP_LOCAL_DIR=.backups/database`
- `DATABASE_BACKUP_S3_BUCKET`
- `DATABASE_BACKUP_S3_REGION`
- `DATABASE_BACKUP_S3_ENDPOINT`
- `DATABASE_BACKUP_S3_ACCESS_KEY_ID`
- `DATABASE_BACKUP_S3_SECRET_ACCESS_KEY`
- `DATABASE_BACKUP_S3_FORCE_PATH_STYLE=true`
- `DATABASE_BACKUP_S3_PREFIX=qidra/database`

Команда ручной проверки:

```bash
npm run backup:database
```

Пример ежедневного cron на production-сервере:

```bash
15 2 * * * cd /var/www/qidra-platform && NODE_ENV=production npm run backup:database >> /var/log/qidra-db-backup.log 2>&1
```

Восстановление из архива:

```bash
gunzip -c qidra-db-YYYY-MM-DD.sql.gz | psql "$DATABASE_URL"
```

Перед запуском с реальными деньгами нужно сделать тест: создать backup, скачать его из bucket, поднять восстановленную базу на отдельном окружении и проверить клиентов, платежи, заявки, контракты, чаты, KYC и журнал действий.

## 5. OAuth callbacks

Google OAuth:

- Authorized JavaScript origins: `https://qidra.io`
- Authorized redirect URI: `https://qidra.io/api/auth/callback/google`

Telegram:

- Bot domain должен соответствовать production-домену.
- `TELEGRAM_BOT_TOKEN` хранить только в secrets.
- `TELEGRAM_BOT_USERNAME` указывать без `@`.

## 6. SMTP

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

## 7. TronGrid и USDT TRC20

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

## 8. Админ-безопасность

Обязательно:

- минимум два супер-админа;
- 2FA для супер-админов и сотрудников;
- роли выдаются только через форму с причиной и `CONFIRM`;
- блокировка пользователей только через форму с причиной и журналом;
- корректировки баланса только через журналируемую форму;
- сотрудники не должны знать пароли клиентов;
- восстановление доступа клиента только через одноразовую ссылку после сверки KYC.

## 9. Защита приложения

В коде включены:

- security headers через Next config;
- CSP с запретом iframe-встраивания и object/embed-контента;
- production CSP не включает `unsafe-eval`;
- HSTS для HTTPS production-домена;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `X-Content-Type-Options: nosniff`;
- `Permissions-Policy` без камеры, микрофона, геолокации и payment API;
- middleware-защита mutating `/api/*` от чужого browser Origin/Referer;
- server-side JWT session max age 8 часов;
- базовый rate limit для регистрации, восстановления пароля, KYC, project submissions, депозитов, выводов, заявок участия и сообщений поддержки.
- усиленная password policy для новых паролей: минимум 10 символов, верхний и нижний регистр, цифра и специальный символ.
- лимиты документов project submission: до 20 файлов и до 100 МБ суммарно за одну отправку.

Перед production обязательно добавить внешний rate limit/WAF на инфраструктурном уровне. Встроенный rate limit является дополнительным защитным слоем и не заменяет Cloudflare/Vercel/nginx rules.

## 10. Перед деплоем

Команды проверки:

```bash
DATABASE_URL="postgresql://..." npx prisma validate
npm run lint
npm run build
npm audit --omit=dev
npm run check:production
npm run backup:database
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
- проверить создание backup и восстановление на отдельной базе

## 11. Dependency audit

`npm audit --omit=dev` должен запускаться перед каждым production-релизом.

Текущий аудит показывает уязвимости в транзитивных зависимостях `tronweb`, `next-auth`/`@auth/core`, `nodemailer` и связанных пакетах. `npm audit fix --force` применять нельзя без отдельного тестового плана: он предлагает ломающее обновление `tronweb` и некорректные major/downgrade-изменения для части пакетов.

План закрытия:

- отдельно протестировать обновление `tronweb` и платежную сверку TRC20;
- отслеживать исправления `next-auth`/`@auth/core`;
- держать SMTP-операции серверными, не раскрывать ответы SMTP клиенту;
- не деплоить production, если появляются критические remote-code-execution или auth-bypass advisories без mitigation.
