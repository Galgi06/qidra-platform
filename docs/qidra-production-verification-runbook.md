# QIDRA - runbook независимой проверки production

Дата: 2026-08-07  
Связанные документы:

- `docs/qidra-project-transfer-dossier.md`
- `docs/qidra-former-team-questionnaire.md`

Назначение: установить фактическое состояние production своими руками, не дожидаясь ответов бывшей команды. Проверка должна подтвердить или опровергнуть ответы опросника и данные handover-документации.

Runbook рассчитан на один рабочий день при наличии доступов. Порядок проверок важен: каждая следующая опирается на результат предыдущей.

## 1. Правила проведения

1. Режим только чтение. Никаких deploy, migrations, DNS-изменений, правок в админке и изменений production DB.
2. Единственное допустимое действие записи - восстановление backup в отдельную изолированную test DB.
3. Все команды и выводы сохранять в файл проверки с датой и временем.
4. Не ротировать секреты во время проверки. Ротация - отдельный этап после инвентаризации.
5. Работать минимум вдвоём: один выполняет, второй фиксирует и подтверждает.
6. Если проверка что-то ломает - остановиться, не чинить на ходу.

Файл результата вести в формате:

```text
Проверка | Что ожидали | Что фактически | Расхождение | Действие
```

## 2. Что нужно иметь до старта

Минимальный набор доступов:

- доступ к регистратору домена;
- доступ к Cloudflare;
- доступ к DigitalOcean;
- доступ к Google Cloud project `qidra-476219`;
- доступ к GitHub repository;
- SSH на production;
- учётная запись `SUPER_ADMIN` в QIDRA;
- доступ к хранилищу backup;
- обычный тестовый аккаунт участника;
- тестовая компания или возможность создать тестовую компанию.

Если какого-то доступа нет - это отдельная finding, которую нужно зафиксировать.

## 3. Проверка 1: внешний контур без доступов

Выполнить с любого компьютера:

```bash
dig qidra.io +short
dig www.qidra.io +short
dig qidra.io NS +short
dig qidra.io MX +short
dig qidra.io TXT +short
curl -sI https://qidra.io
curl -sI https://www.qidra.io
```

Что смотреть:

1. Отвечают ли IP-адреса диапазонам Cloudflare. Если да - Cloudflare proxy включён и origin скрыт.
2. Если виден прямой IP origin - это security finding.
3. Есть ли headers:
   - `strict-transport-security`;
   - `content-security-policy`;
   - `x-frame-options`;
   - `x-content-type-options`;
   - `referrer-policy`;
   - `permissions-policy`.
4. Есть ли SPF и DMARC в TXT.
5. Раскрывает ли сервер версии в headers.

Дополнительно:

```bash
curl -s https://qidra.io/robots.txt
curl -s https://qidra.io/sitemap.xml | head -50
```

Проверить служебные пути:

```text
/admin
/api/health
/.env
/.git/config
```

Ожидаемо: `/admin` требует вход/права, `.env` и `.git/config` не отдают содержимое.

Красный флаг: любой служебный путь отдаёт содержимое вместо 404/403/redirect.

## 4. Проверка 2: Cloudflare

В Cloudflare зафиксировать:

1. Все DNS records, включая забытые поддомены.
2. По каждой A/AAAA записи: proxied или DNS-only.
3. Origin IP для `qidra.io` и `www.qidra.io`.
4. WAF rules и соответствие `ops/cloudflare/qidra-waf-rules.md`.
5. Список пользователей Cloudflare и роли.
6. Активные API tokens, кем созданы и какие scopes имеют.
7. SSL/TLS mode: желательно `Full (strict)`.
8. Always Use HTTPS.
9. Page rules / redirect rules / transform rules.

Ключевой результат: фактический IP origin. С ним переходить к проверке сервера.

## 5. Проверка 3: сервер и runtime

Подключаться по SSH к IP, который указан в Cloudflare origin, а не к предполагаемому IP из документации.

```bash
hostname
uptime
cd /opt/qidra-platform
cat .deploy-revision
docker compose ps
docker compose logs --tail=200
```

Проверить порты и доступы:

```bash
sudo ss -tlnp
cat ~/.ssh/authorized_keys
sudo cat /etc/sudoers.d/* 2>/dev/null
lastlog
last -20
```

Список env-переменных без значений:

```bash
cut -d= -f1 /opt/qidra-platform/.env.production | sort
```

Проверить соседние проекты на машине:

```bash
docker ps -a
ls -la /opt
ls -la /srv 2>/dev/null
ls -la /home
```

Проверить wallet sync:

```bash
systemctl status qidra-wallet-sync.timer
systemctl status qidra-wallet-sync.service
```

Что смотреть:

1. Совпадает ли `.deploy-revision` с GitHub.
2. Есть ли расхождение между production code и repository.
3. Слушает ли внешний интерфейс что-то кроме 80/443. Особенно опасен открытый `5432`.
4. Кто находится в `authorized_keys`.
5. Когда были последние входы.
6. Есть ли на сервере Hydra Messenger, LifeEcho, AM AI или другие проекты.
7. Работают ли timers/cron.

Повторить минимум read-only осмотр для всех известных QIDRA-related droplets, если доступ есть.

## 6. Проверка 4: production DB

Определить `DATABASE_URL` активного runtime и подключиться только read-only.

Базовая инвентаризация:

```sql
SELECT count(*) FROM "User";
SELECT role, count(*) FROM "User" GROUP BY role ORDER BY role;
SELECT status, count(*) FROM "KycApplication" GROUP BY status ORDER BY status;
SELECT status, count(*) FROM "InvestmentApplication" GROUP BY status ORDER BY status;
SELECT count(*) FROM "Organization";
SELECT count(*) FROM "Project";
SELECT status, count(*) FROM "Project" GROUP BY status ORDER BY status;
SELECT max("createdAt") FROM "User";
SELECT max("createdAt") FROM "WalletTransaction";
```

Проверить, что база действительно production:

1. Создать тестовый аккаунт на сайте.
2. Найти его в этой БД через read-only query.
3. Если его нет - это не production DB.

Проверить миграции:

```bash
npx prisma migrate status
```

Если есть `drift detected` - schema менялась мимо миграций.

Отдельно проверить Google Cloud:

1. Открыть project `qidra-476219`.
2. Проверить Cloud Run `frontend-prod` и `api-prod`.
3. Проверить трафик за последние 30 дней.
4. Проверить Cloud SQL `qidra-prod`.
5. Если DB работает - выполнить те же счётчики.
6. Сравнить с активной production DB.
7. Проверить billing.

Расхождение счётчиков означает, что есть параллельная база с пользовательскими данными.

## 7. Проверка 5: сверка кошельков

Цель: убедиться, что средств on-chain не меньше, чем система обещает участникам.

Сначала уточнить фактические поля wallet schema в production. В текущей Prisma schema используются:

```text
Wallet.availableUsdt
Wallet.pendingUsdt
Wallet.reservedUsdt
Wallet.trc20Address
```

Базовая выгрузка:

```sql
SELECT count(*) FROM "Wallet";
SELECT
  sum("availableUsdt") AS available,
  sum("pendingUsdt") AS pending,
  sum("reservedUsdt") AS reserved
FROM "Wallet";

SELECT
  "trc20Address",
  "availableUsdt",
  "pendingUsdt",
  "reservedUsdt"
FROM "Wallet"
ORDER BY "availableUsdt" DESC;
```

По каждому `trc20Address` проверить фактический USDT TRC20 баланс через Tron explorer или публичный API. Приватные ключи для этого не нужны.

Свести:

```text
A. Свободные + pending + reserved балансы участников в базе.
B. Фактический USDT на персональных адресах.
C. Баланс общего/операционного кошелька, если средства сметаются.
D. Начисленные, но не выплаченные дивиденды.
E. Подтверждённые инвестиционные обязательства.
```

Queries по обязательствам:

```sql
SELECT status, sum("amountUsdt") FROM "DividendPayment" GROUP BY status ORDER BY status;
SELECT status, sum("amountUsdt") FROM "InvestmentApplication" GROUP BY status ORDER BY status;
SELECT status, sum("amountUsdt") FROM "WalletTransaction" GROUP BY status ORDER BY status;
```

Что должно сойтись:

```text
Свободные балансы + начисленные невыплаченные дивиденды <= фактически доступные средства on-chain.
```

Если обязательства больше фактических средств - это финансовый дефицит, не UI-баг.

Отдельно зафиксировать:

- где хранится `QIDRA_WALLET_KEY_ENCRYPTION_SECRET`;
- есть ли его резервная копия вне сервера;
- что произойдёт при потере сервера;
- не извлекать приватные ключи в ходе проверки.

## 8. Проверка 6: backup и restore

Запись допустима только в отдельную test DB.

1. Найти все backup-файлы.
2. Зафиксировать самый свежий backup: путь, дата, размер.
3. Сравнить размер backup с размером production DB.
4. Проверить, есть ли backup вне основной инфраструктуры.
5. Создать новую пустую test DB.
6. Восстановить последний backup в test DB.
7. Выполнить на восстановленной базе счётчики из проверки 4.
8. Замерить время восстановления.
9. Зафиксировать фактические RTO/RPO.

Красные флаги:

- restore не запускается;
- restore падает с ошибкой;
- восстановленная база меньше production;
- backup лежит только на той же машине/в той же инфраструктуре.

## 9. Проверка 7: права доступа внутри платформы

В production DB:

```sql
SELECT id, email, role, "createdAt", "updatedAt"
FROM "User"
WHERE role IN ('ADMIN','SUPER_ADMIN','SALES_MANAGER','TECH_SUPPORT')
ORDER BY role, email;
```

По каждой строке определить:

- кто это;
- работает ли человек сейчас;
- нужен ли доступ;
- личный это аккаунт или общий.

Проверить руками:

1. Под `SALES_MANAGER`: видны ли KYC, суммы, персональные данные.
2. Под `TECH_SUPPORT`: видны ли вложения чужих чатов и документы.
3. Под `ADMIN`: какие финансовые операции доступны.
4. Под `SUPER_ADMIN`: есть ли экспорт всей базы.

Проверить audit log:

```sql
SELECT action, count(*) FROM "AdminAuditLog" GROUP BY action ORDER BY count DESC;
SELECT * FROM "AdminAuditLog" ORDER BY "createdAt" DESC LIMIT 50;
```

Если действия админа не логируются - audit trail фактически отсутствует.

## 10. Проверка 8: приватные документы

Проверить:

1. KYC document.
2. Support attachment.
3. Company document.
4. Dividend report file.
5. Project private/pre-publication document.

Процедура:

1. Под тестовым аккаунтом загрузить документ.
2. Скопировать ссылку.
3. Открыть в incognito без авторизации.
4. Проверить через `curl` без cookies:

```bash
curl -sI "<private-document-url>"
```

Ожидаемый результат: `401`, `403` или redirect на вход.

Красный флаг: `200 OK` на приватный документ без авторизации.

Также проверить anonymous bucket listing. Корень bucket не должен отдавать список файлов.

## 11. Проверка 9: разграничение между пользователями

Проверять только на собственных тестовых аккаунтах.

1. Создать тестовых участников A и B.
2. Под A создать заявку/инвестицию/support thread.
3. Скопировать URL или ID.
4. Войти под B.
5. Попробовать открыть тот же URL.
6. Повторить для заявки, инвестиции, support thread, документов.
7. Создать компании A и B.
8. Проверить, видит ли компания A заявки/проекты компании B.

Ожидаемый результат: отказ доступа.

Любой успешный просмотр чужих данных - критический defect.

## 12. Проверка 10: GitHub и supply chain

Проверить:

1. Collaborators repository и права.
2. Branch protection для `main`.
3. Можно ли push напрямую в `main`.
4. GitHub Actions secrets: список имён, даты обновления.
5. Deploy history: кто и когда деплоил последние 20 раз.
6. Есть ли self-hosted runners.
7. Совпадает ли `main` с `.deploy-revision`.
8. Смержена ли `codex/qidra-rescue-20260705`.

Поиск утечек:

```bash
git log --all -p -S "PRIVATE KEY" | head -50
git log --all -p -S "postgres://" | head -50
git log --all --oneline -- .env .env.production
```

Любое совпадение по секретам означает обязательную ротацию.

## 13. Проверка 11: третьи стороны на фронтенде

В браузере открыть DevTools -> Network и пройти:

```text
главная -> каталог -> страница проекта -> вход -> кабинет -> KYC -> кошелёк
```

Зафиксировать сторонние домены:

- analytics;
- pixels;
- chat widgets;
- maps;
- fonts;
- CDN;
- social widgets.

Красный флаг:

- сторонняя аналитика/пиксели/чат-виджеты на KYC или wallet pages;
- передача user IDs или personal identifiers в URL/query params.

## 14. Проверка 12: почта

1. Запросить восстановление пароля на тестовом аккаунте.
2. Проверить доставку на Gmail.
3. Проверить доставку на Outlook.
4. Проверить доставку на Mail.ru.
5. Проверить доставку на Яндекс.
6. Проверить spam folder.
7. В headers письма найти SPF/DKIM/DMARC.
8. Определить фактического email provider.
9. Проверить, что reset link работает.
10. Проверить, что reset link не истекает мгновенно.
11. Проверить, что использованная ссылка не работает повторно.

## 15. Сведение результатов

Итоговые findings разделить на три категории.

### Немедленно, в тот же день

- дефицит средств при сверке кошельков;
- приватные документы доступны без авторизации;
- Postgres открыт наружу;
- доступ к чужим данным между пользователями;
- активные ключи или аккаунты уволившихся людей;
- production runtime не совпадает с известным Git commit;
- неизвестная production DB.

### В течение недели

- backup не восстанавливается или неполон;
- нет backup вне основной инфраструктуры;
- нет резервной копии wallet encryption secret;
- отсутствует журнал финансовых операций;
- живая параллельная инфраструктура с данными участников;
- secrets найдены в Git history;
- нет 2FA на критичных аккаунтах.

### В план стабилизации

- отсутствующие security headers;
- SPF/DKIM/DMARC;
- слабый rate limit;
- мониторинг и alerts;
- сторонние scripts на приватных страницах;
- неполная документация;
- отсутствие e2e-тестов.

## 16. После проверки

1. Сначала закрыть все findings из категории `Немедленно`.
2. До этого не вести продуктовую разработку.
3. Затем провести ротацию секретов одним планом по блоку 15 опросника.
4. Отдельно решить судьбу Google Cloud.
5. Если в Google Cloud есть живые данные - перенести или официально вывести из эксплуатации с архивом.
6. Результаты проверки положить рядом с ответами старой команды.
7. Каждое расхождение между ответами и production считать finding.
8. Только после этого возвращаться к продуктовым задачам.
