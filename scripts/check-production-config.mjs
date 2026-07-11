import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const placeholderPatterns = [/replace-with/i, /example\.com/i, /localhost/i, /^changeme$/i, /^secret$/i];

const coreRequired = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "TELEGRAM_BOT_USERNAME",
  "TELEGRAM_BOT_TOKEN",
  "QIDRA_WALLET_KEY_ENCRYPTION_SECRET",
  "CRON_SECRET",
  "QIDRA_WALLET_SYNC_SECRET",
  "TRONGRID_API_KEY",
  "TRONGRID_API_BASE_URL",
  "QIDRA_USDT_TRC20_CONTRACT",
  "EMAIL_PROVIDER",
  "SMTP_FROM",
  "FILE_STORAGE_DRIVER",
  "DATABASE_BACKUP_RETENTION_DAYS"
];

const failures = [];

for (const key of coreRequired) {
  const value = process.env[key]?.trim();

  if (!value) {
    failures.push(`${key}: missing`);
    continue;
  }

  if (placeholderPatterns.some((pattern) => pattern.test(value))) {
    failures.push(`${key}: placeholder value`);
  }
}

const tronWalletAddress = process.env.QIDRA_TRON_WALLET_ADDRESS?.trim() || process.env.QIDRA_TREASURY_TRON_WALLET_ADDRESS?.trim() || "";
if (!tronWalletAddress) {
  failures.push("QIDRA_TRON_WALLET_ADDRESS or QIDRA_TREASURY_TRON_WALLET_ADDRESS: missing");
}

if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith("https://")) {
  failures.push("NEXTAUTH_URL: must use https:// production domain");
}

if ((process.env.NEXTAUTH_SECRET || "").trim().length < 32) {
  failures.push("NEXTAUTH_SECRET: must be at least 32 characters");
}

if ((process.env.QIDRA_WALLET_KEY_ENCRYPTION_SECRET || "").trim().length < 32) {
  failures.push("QIDRA_WALLET_KEY_ENCRYPTION_SECRET: must be at least 32 characters");
}

const retentionDays = Number.parseInt(process.env.DATABASE_BACKUP_RETENTION_DAYS || "", 10);
if (!Number.isFinite(retentionDays) || retentionDays < 7) {
  failures.push("DATABASE_BACKUP_RETENTION_DAYS: use at least 7 days");
}

if (process.env.SMTP_FROM && !/^[^<]*<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(process.env.SMTP_FROM)) {
  failures.push("SMTP_FROM: expected format like Qidra <no-reply@qidra.io>");
}

const emailProvider = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();

if (!["smtp", "resend"].includes(emailProvider)) {
  failures.push("EMAIL_PROVIDER: expected smtp or resend");
}

if (emailProvider === "smtp") {
  for (const key of ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD"]) {
    const value = process.env[key]?.trim();

    if (!value) {
      failures.push(`${key}: missing`);
      continue;
    }

    if (placeholderPatterns.some((pattern) => pattern.test(value))) {
      failures.push(`${key}: placeholder value`);
    }
  }

  const smtpPort = Number.parseInt(process.env.SMTP_PORT || "", 10);
  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    failures.push("SMTP_PORT: expected numeric port");
  }

  if (process.env.SMTP_SECURE && !["true", "false"].includes(process.env.SMTP_SECURE)) {
    failures.push("SMTP_SECURE: expected true or false");
  }
}

if (emailProvider === "resend") {
  const resendApiKey = process.env.RESEND_API_KEY?.trim();

  if (!resendApiKey) {
    failures.push("RESEND_API_KEY: missing");
  } else if (placeholderPatterns.some((pattern) => pattern.test(resendApiKey))) {
    failures.push("RESEND_API_KEY: placeholder value");
  }
}

const fileStorageDriver = (process.env.FILE_STORAGE_DRIVER || "").trim().toLowerCase();

if (!["s3", "gcs"].includes(fileStorageDriver)) {
  failures.push("FILE_STORAGE_DRIVER: production must use s3 or gcs");
} else if (fileStorageDriver === "s3") {
  for (const key of [
    "FILE_STORAGE_S3_BUCKET",
    "FILE_STORAGE_S3_REGION",
    "FILE_STORAGE_S3_ENDPOINT",
    "FILE_STORAGE_S3_FORCE_PATH_STYLE",
    "FILE_STORAGE_S3_ACCESS_KEY_ID",
    "FILE_STORAGE_S3_SECRET_ACCESS_KEY"
  ]) {
    const value = process.env[key]?.trim();

    if (!value) {
      failures.push(`${key}: missing`);
      continue;
    }

    if (placeholderPatterns.some((pattern) => pattern.test(value))) {
      failures.push(`${key}: placeholder value`);
    }
  }

  if (process.env.FILE_STORAGE_S3_FORCE_PATH_STYLE !== "true") {
    failures.push("FILE_STORAGE_S3_FORCE_PATH_STYLE: Cloudflare R2 requires true");
  }
} else {
  for (const key of ["GCS_BUCKET_NAME"]) {
    const value = process.env[key]?.trim();

    if (!value) {
      failures.push(`${key}: missing`);
      continue;
    }

    if (placeholderPatterns.some((pattern) => pattern.test(value))) {
      failures.push(`${key}: placeholder value`);
    }
  }
}

const backupDriver = (process.env.DATABASE_BACKUP_DRIVER || (process.env.DATABASE_BACKUP_REQUIRE_S3 === "true" ? "s3" : "")).trim().toLowerCase();

if (!["s3", "gcs"].includes(backupDriver)) {
  failures.push("DATABASE_BACKUP_DRIVER: production must use s3 or gcs");
} else if (backupDriver === "s3") {
  for (const key of [
    "DATABASE_BACKUP_S3_BUCKET",
    "DATABASE_BACKUP_S3_REGION",
    "DATABASE_BACKUP_S3_ENDPOINT",
    "DATABASE_BACKUP_S3_FORCE_PATH_STYLE",
    "DATABASE_BACKUP_S3_PREFIX",
    "DATABASE_BACKUP_S3_ACCESS_KEY_ID",
    "DATABASE_BACKUP_S3_SECRET_ACCESS_KEY"
  ]) {
    const value = process.env[key]?.trim();

    if (!value) {
      failures.push(`${key}: missing`);
      continue;
    }

    if (placeholderPatterns.some((pattern) => pattern.test(value))) {
      failures.push(`${key}: placeholder value`);
    }
  }

  if (process.env.DATABASE_BACKUP_S3_FORCE_PATH_STYLE !== "true") {
    failures.push("DATABASE_BACKUP_S3_FORCE_PATH_STYLE: Cloudflare R2 requires true");
  }
} else {
  const gcsBucketName = process.env.GCS_BUCKET_NAME?.trim();
  const gcsPrefix = process.env.DATABASE_BACKUP_GCS_PREFIX?.trim();

  if (!gcsBucketName) {
    failures.push("GCS_BUCKET_NAME: missing");
  } else if (placeholderPatterns.some((pattern) => pattern.test(gcsBucketName))) {
    failures.push("GCS_BUCKET_NAME: placeholder value");
  }

  if (gcsPrefix && placeholderPatterns.some((pattern) => pattern.test(gcsPrefix))) {
    failures.push("DATABASE_BACKUP_GCS_PREFIX: placeholder value");
  }
}

if (failures.length) {
  console.error("Production config check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production config check passed.");
