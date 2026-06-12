# Qidra self-hosted production launch runbook

Цель: поднять Qidra на серверах и аккаунтах владельца без передачи production-секретов в чат или сторонним исполнителям.

## 0. Что можно сделать без владельца, а что нельзя

Можно подготовить код, Docker/systemd/nginx шаблоны, backup/restore-скрипты, production healthcheck и инструкции.

Нельзя безопасно сделать без доступа владельца:

- купить или изменить DNS домен;
- создать production secrets в хостинге;
- открыть аккаунты Cloudflare/S3/SMTP/TronGrid;
- проверить реальные письма и OAuth consent screen;
- провести реальный USDT dry-run;
- подтвердить юридические документы и тексты доходности.

Секреты не передаются в чат. Они вводятся только на сервере, в secret manager хостинга или в `.env.production`, который не коммитится.

## 1. Минимальная целевая схема

- Домен: `https://qidra.io` через Cloudflare или DNS провайдера владельца.
- Reverse proxy: nginx или managed ingress.
- App: Next.js standalone container на `127.0.0.1:8091`.
- Database: production PostgreSQL с SSL, ежедневными backup и проверенным restore.
- Files: S3-compatible private bucket для KYC и документов проектов.
- Email: доменный SMTP с SPF/DKIM/DMARC.
- Payments: TronGrid + Qidra TRC20 wallet address + cron sync каждые 5 минут.
- Security perimeter: WAF/rate limit на `/api/auth/*`, `/api/wallet/*`, `/api/investments`, `/api/support/*`.
- Monitoring: app healthcheck, backup logs, cron logs, error logs, business audit в админке.

## 2. Подготовка сервера

Установить Docker, Docker Compose, nginx, certbot, PostgreSQL client tools для backup/restore и curl:

```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx postgresql-client curl
sudo systemctl enable --now docker nginx
```

Скопировать репозиторий на сервер и создать production env:

```bash
git clone <repo-url> /opt/qidra-platform
cd /opt/qidra-platform
cp .env.example .env.production
chmod 600 .env.production
```

Заполнить `.env.production` реальными значениями. Минимально проверить файл перед запуском:

```bash
set -a
. ./.env.production
set +a
npm run check:production
```

## 3. Secrets

Сгенерировать новые значения только на сервере:

```bash
openssl rand -base64 48 # NEXTAUTH_SECRET
openssl rand -base64 48 # QIDRA_WALLET_KEY_ENCRYPTION_SECRET
openssl rand -base64 48 # CRON_SECRET
openssl rand -base64 48 # QIDRA_WALLET_SYNC_SECRET
```

Обязательные правила:

- `NEXTAUTH_URL` равен production origin, например `https://qidra.io`.
- `FILE_STORAGE_DRIVER=s3`.
- `DATABASE_URL` указывает на production PostgreSQL.
- Локальные аккаунты `*.local` не используются в production.
- Минимум два `SUPER_ADMIN` аккаунта создаются после запуска.

## 4. Запуск приложения

Если используется Docker Compose из репозитория, container перед стартом выполняет `scripts/check-production-config.mjs` и не запустится с placeholder/missing secrets:

```bash
cd /opt/qidra-platform
export POSTGRES_PASSWORD='<strong-postgres-password>'
docker compose -f docker-compose.prod.yml up -d --build
```

Если database управляемая внешняя, можно удалить сервис `postgres` из локальной копии compose и оставить только `app` с внешним `DATABASE_URL`.

Применить Prisma migrations до открытия сайта:

```bash
docker compose -f docker-compose.prod.yml run --rm app npx prisma migrate deploy
```

Если приложение запускается не через compose, выполнить `npm run prisma:deploy` с production `DATABASE_URL`.

## 5. HTTPS и nginx

Получить сертификат:

```bash
sudo certbot --nginx -d qidra.io -d www.qidra.io
```

Затем адаптировать `ops/nginx/qidra.conf` под фактический домен и установить:

```bash
sudo cp ops/nginx/qidra.conf /etc/nginx/sites-available/qidra.conf
sudo ln -sf /etc/nginx/sites-available/qidra.conf /etc/nginx/sites-enabled/qidra.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Backup и restore PostgreSQL

Ежедневный backup:

```bash
mkdir -p /var/backups/qidra/postgres
chmod 700 /var/backups/qidra/postgres
DATABASE_URL='<production-database-url>' BACKUP_DIR=/var/backups/qidra/postgres RETENTION_DAYS=14 scripts/backup-postgres.sh
```

Если PostgreSQL запущен через `docker-compose.prod.yml`, запускайте backup через postgres-контейнер:

```bash
set -a && . ./.env.production && set +a
BACKUP_POSTGRES_COMPOSE=true BACKUP_UPLOAD_S3=true BACKUP_DIR=/var/backups/qidra/postgres RETENTION_DAYS=14 scripts/backup-postgres.sh
```

Cron пример:

```cron
15 2 * * * cd /opt/qidra-platform && DATABASE_URL='postgresql://...' BACKUP_DIR=/var/backups/qidra/postgres RETENTION_DAYS=14 scripts/backup-postgres.sh >> /var/log/qidra-backup.log 2>&1
```

Cron пример для compose PostgreSQL:

```cron
15 2 * * * cd /opt/qidra-platform && set -a && . ./.env.production && set +a && BACKUP_POSTGRES_COMPOSE=true BACKUP_UPLOAD_S3=true BACKUP_DIR=/var/backups/qidra/postgres RETENTION_DAYS=14 scripts/backup-postgres.sh >> /var/log/qidra-backup.log 2>&1
```

Проверка restore на отдельной базе обязательна перед официальным запуском:

```bash
DATABASE_URL='<restore-test-database-url>' scripts/restore-postgres.sh /var/backups/qidra/postgres/qidra-postgres-YYYYMMDDTHHMMSSZ.dump.gz
```

## 7. Wallet sync cron

Установить wrapper:

```bash
sudo cp scripts/qidra-wallet-sync.sh /usr/local/bin/qidra-wallet-sync.sh
sudo chmod 700 /usr/local/bin/qidra-wallet-sync.sh
sudo mkdir -p /etc/qidra
sudo install -m 600 /dev/null /etc/qidra/qidra.env
```

`/etc/qidra/qidra.env`:

```env
QIDRA_BASE_URL=https://qidra.io
CRON_SECRET=<same-as-production-cron-secret>
LIMIT_PER_WALLET=100
```

Systemd timer:

```bash
sudo cp ops/systemd/qidra-wallet-sync.service /etc/systemd/system/qidra-wallet-sync.service
sudo cp ops/systemd/qidra-wallet-sync.timer /etc/systemd/system/qidra-wallet-sync.timer
sudo systemctl daemon-reload
sudo systemctl enable --now qidra-wallet-sync.timer
systemctl list-timers qidra-wallet-sync.timer
```

## 8. Production healthcheck

После деплоя:

```bash
QIDRA_HEALTHCHECK_URL=https://qidra.io npm run healthcheck:production
```

Расширенная проверка cron route запускает реальную синхронизацию депозитов, поэтому включать её только после настройки TronGrid:

```bash
QIDRA_HEALTHCHECK_URL=https://qidra.io QIDRA_HEALTHCHECK_RUN_CRON=true CRON_SECRET='<secret>' npm run healthcheck:production
```

## 9. GitHub Actions deploy workflow

В репозитории есть workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml), который:

- автоматически деплоит `main` в `staging` после успешного `CI`;
- умеет ручной `workflow_dispatch` для `staging` и `production`;
- отправляет код на сервер по `ssh`/`rsync`;
- запускает [`scripts/deploy-remote.sh`](../scripts/deploy-remote.sh), который делает `docker compose up`, `prisma migrate deploy` и локальный healthcheck;
- после выката проверяет публичный `HEALTHCHECK_URL`.

Настройте GitHub Environments `staging` и `production` с одинаковыми именами secrets:

- `DEPLOY_HOST`: hostname или IP сервера.
- `DEPLOY_USER`: SSH user, обычно `root` или отдельный deploy user.
- `DEPLOY_SSH_KEY`: приватный SSH key для сервера.
- `DEPLOY_PATH`: путь на сервере, например `/opt/qidra-platform`.
- `HEALTHCHECK_URL`: например `https://staging.qidra.io` или `https://qidra.io`.

Опционально:

- `DEPLOY_PORT`: если SSH не на `22`.
- `DEPLOY_KNOWN_HOSTS`: заранее зафиксированный host key. Если не задан, workflow использует `ssh-keyscan`.
- `DEPLOY_COMPOSE_FILE`: если нужен не `docker-compose.prod.yml`.
- `HEALTHCHECK_STATUS`: если ожидается не `200`.

Точная ручная команда на сервере для того же rollout:

```bash
cd /opt/qidra-platform
bash scripts/deploy-remote.sh /opt/qidra-platform
```

С миграциями по умолчанию. Без миграций:

```bash
cd /opt/qidra-platform
QIDRA_DEPLOY_RUN_MIGRATIONS=false bash scripts/deploy-remote.sh /opt/qidra-platform
```

## 10. Security smoke-test перед открытием пользователей

- `npm run lint`
- `npm run build`
- `DATABASE_URL='postgresql://...' npx prisma validate`
- `npm audit --omit=dev` и ручной разбор критичных advisories.
- `npm run check:production` на реальных production env.
- `npm run healthcheck:production` на production domain.
- Проверка foreign Origin guard на mutating API через healthcheck.
- Проверка HTTPS/HSTS/CSP/X-Frame-Options/X-Content-Type-Options/Referrer-Policy.
- Проверка, что S3 bucket private: public object URL не открывается.
- Проверка, что KYC/document download доступен только авторизованным ролям.
- Проверка, что blocked user не получает рабочую сессию.
- Проверка, что последний `SUPER_ADMIN` не может быть понижен/заблокирован.

## 11. Business smoke-test перед официальным запуском

- регистрация;
- email verification;
- sign-in/sign-out;
- Google OAuth callback;
- Telegram callback;
- password reset;
- KYC upload/download/review;
- project submission с несколькими документами;
- публикация проекта;
- персональный TRC20 address + QR;
- маленький реальный USDT TRC20 deposit;
- автоматическая сверка deposit;
- участие в проекте из verified balance;
- withdrawal маленькой суммой;
- audit log для всех админских действий;
- backup и restore на отдельную базу.

## 12. Go / no-go

Официальный запуск разрешён только если:

- production config check passed;
- healthcheck passed;
- backup создан и restore проверен;
- S3 private bucket проверен;
- SMTP/OAuth работают на домене;
- TronGrid dry-run завершён успешно;
- WAF/rate limit включён;
- rollback-план понятен дежурному администратору;
- нет критичных dependency advisories без mitigation.
