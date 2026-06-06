const placeholderPatterns = [/replace-with/i, /example\.com/i, /localhost/i, /^changeme$/i, /^secret$/i];

const required = [
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
  "QIDRA_TRON_WALLET_ADDRESS",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "FILE_STORAGE_DRIVER",
  "FILE_STORAGE_S3_BUCKET",
  "FILE_STORAGE_S3_REGION",
  "FILE_STORAGE_S3_ACCESS_KEY_ID",
  "FILE_STORAGE_S3_SECRET_ACCESS_KEY"
];

const failures = [];

for (const key of required) {
  const value = process.env[key]?.trim();

  if (!value) {
    failures.push(`${key}: missing`);
    continue;
  }

  if (placeholderPatterns.some((pattern) => pattern.test(value))) {
    failures.push(`${key}: placeholder value`);
  }
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

if (process.env.FILE_STORAGE_DRIVER !== "s3") {
  failures.push("FILE_STORAGE_DRIVER: production must use s3");
}

if (process.env.SMTP_FROM && !/^[^<]*<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(process.env.SMTP_FROM)) {
  failures.push("SMTP_FROM: expected format like Qidra <no-reply@qidra.io>");
}

if (failures.length) {
  console.error("Production config check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Production config check passed.");
