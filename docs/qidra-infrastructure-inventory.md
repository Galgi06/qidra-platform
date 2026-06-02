# QIDRA Infrastructure Inventory

Date: 2026-05-30

This document records the current production infrastructure discovered from Google Cloud Console.

## Ownership

- Domain: controlled by QIDRA owner.
- Google Cloud project: `Qidra`
- Google Cloud project ID: `qidra-476219`
- Billing account ID: `01F48A-7AA20E-A7CB71`
- Owner account confirmed: `qidra.hub@gmail.com`
- Former developer account still present: `lintdxcode@gmail.com` with `Owner`

Do not remove existing developer or GitLab service account access until a replacement deployment path is tested.

## Cloud Run

Region: `europe-west1`

### Production API

- Service: `api-prod`
- Image: `europe-west1-docker.pkg.dev/qidra-476219/qidra-backend/backend:5703b43`
- Public URL: `https://api-prod-446727791668.europe-west1.run.app`
- Additional URL: `https://api-prod-nubyn3mb6q-ew.a.run.app`
- Container port: `8080`
- Min instances: `1`
- Max instances: `5`
- Cloud SQL connection: `qidra-476219:europe-west1:qidra-prod`
- Service account: `446727791668-compute@developer.gserviceaccount.com`

Important environment/secret references:

- `DATABASE_URL` -> `DATABASE_URL_PROD`
- `JWT_ACCESS_SECRET` -> `JWT_ACCESS_SECRET_PROD`
- `JWT_REFRESH_SECRET` -> `JWT_REFRESH_SECRET_PROD`
- `FRONTEND_URL` -> `FRONTEND_URL_PROD`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` -> `GOOGLE_CALLBACK_URL_PROD`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`
- `IPGEOLOCATION_API_KEY`
- `WALLET_ENCRYPTION_KEY` -> `WALLET_ENCRYPTION_KEY_PROD`
- `TELEGRAM_BOT_TOKEN` -> `TELEGRAM_BOT_TOKEN_PROD`
- `TRON_API_KEY`, `TRON_FULL_HOST`, `TRON_USDT_CONTRACT_ADDRESS`
- `GCS_BUCKET_NAME`, `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_KEY`

### Production Frontend

- Service: `frontend-prod`
- Image: `europe-west1-docker.pkg.dev/qidra-476219/qidra-backend/frontend:1481fe9`
- Public URL: `https://frontend-prod-446727791668.europe-west1.run.app`
- Additional URL: `https://frontend-prod-nubyn3mb6q-ew.a.run.app`
- Container port: `8080`
- Min instances: `1`
- Max instances: `2`
- Service account: `446727791668-compute@developer.gserviceaccount.com`

Environment/secret references:

- `NODE_ENV=production`
- `API_URL` -> `API_URL_PROD`
- `NEXT_PUBLIC_API_URL` -> `API_URL_PROD`
- `JWT_ACCESS_SECRET` -> `JWT_ACCESS_SECRET_PROD`
- `JWT_REFRESH_SECRET` -> `JWT_REFRESH_SECRET_PROD`

### Staging Services

- `api-staging`
- `frontend-staging`

## Cloud SQL

### Production Database

- Instance: `qidra-prod`
- Database engine: PostgreSQL 18
- Public IP: `34.78.65.223`
- Region/zone: `europe-west1-d`
- CPU: `1 vCPU`
- Memory: `1.7 GB`
- SSD storage: `10 GB`
- Public IP connectivity: enabled
- Private IP connectivity: disabled
- Default TCP port: `5432`
- Automated backups: enabled
- Point-in-time recovery: enabled
- Instance deletion protection: enabled
- Backup retention after deletion: enabled

Security warning:

- Instance allows access from any IP address (`0.0.0.0/0`). Do not change immediately until the active application connection method is fully confirmed and a safe access plan is prepared.

Manual export completed:

- Export path: `gs://qidra-storage/qidra-prod-qidra-2026-05-30.sql`
- Export source database: `qidra`
- Export status: succeeded
- Export time: 2026-05-30 17:10 local console time

### Staging Database

- Instance: `qidra-staging`
- Database engine: PostgreSQL 18
- Public IP: `35.233.119.87`

## Cloud Storage

Main bucket observed:

- `qidra-storage`

Observed folders:

- `chat-files/`
- `project-documents/`
- `project-media/`

Database export saved in root of `qidra-storage`:

- `qidra-prod-qidra-2026-05-30.sql`

## Artifact Registry

Repository:

- Name: `qidra-backend`
- Format: Docker
- Region: `europe-west1`

Images:

- `backend`
  - Tag: `5703b43`
  - Tags also shown: `latest`, `main`
  - Digest prefix: `sha256:9e478771809a...`
  - Virtual size: `296.7 MB`
  - Built: 2026-05-09
- `frontend`
  - Tag: `1481fe9`
  - Tags also shown: `latest`, `main`
  - Digest prefix: `sha256:e9ddda060eeb...`
  - Virtual size: `110.2 MB`
  - Built: 2026-05-09

## Secret Manager

Total observed secrets: `43`

Important production secrets:

- `API_URL_PROD`
- `DATABASE_URL_PROD`
- `EMAIL_HOST_PROD`
- `EMAIL_PORT_PROD`
- `EMAIL_USER_PROD`
- `EMAIL_PASSWORD_PROD`
- `FRONTEND_URL_PROD`
- `GOOGLE_CALLBACK_URL_PROD`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `IPGEOLOCATION_API_KEY_PROD`
- `JWT_ACCESS_SECRET_PROD`
- `JWT_REFRESH_SECRET_PROD`
- `REDIS_HOST_PROD`
- `REDIS_PASSWORD_PROD`
- `REDIS_PORT_PROD`
- `TELEGRAM_BOT_TOKEN_PROD`
- `TRON_API_KEY_PROD`
- `TRON_FULL_HOST_PROD`
- `TRON_USDT_CONTRACT_ADDRESS_PROD`
- `WALLET_ENCRYPTION_KEY_PROD`
- `GCP_PROJECT_ID`
- `GCP_SERVICE_ACCOUNT_KEY`
- `GCS_BUCKET_NAME`

Important warning:

- Do not rotate `WALLET_ENCRYPTION_KEY_PROD` until the wallet encryption implementation is understood. Changing it may make existing encrypted wallet data unreadable.

## Unknown Or Missing

- Original GitLab repository access.
- Original CI/CD pipeline configuration.
- Telegram BotFather ownership.
- Redis provider details and dashboard access.
- Email provider dashboard access.
- Exact production domain mappings for `qidra.io` / `www.qidra.io`.
- Full database schema and application source code.

## Immediate Safety Plan

1. Keep production running unchanged.
2. Preserve Google Cloud Owner access for `qidra.hub@gmail.com`.
3. Keep the database export in `qidra-storage`.
4. Create a new source-code repository controlled by QIDRA.
5. Rebuild the application in the new repository.
6. Deploy first to staging.
7. Only after staging is verified, switch production to the new deployment path.
8. Rotate secrets gradually, avoiding wallet encryption changes until reviewed.
9. Remove old developer access only after replacement deployment and backups are verified.
