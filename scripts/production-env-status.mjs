import { loadLocalEnv, redactEnvValue } from "./load-local-env.mjs";

loadLocalEnv();

const groups = [
  {
    keys: ["DATABASE_URL", "NEXTAUTH_URL", "NEXTAUTH_SECRET", "CRON_SECRET", "QIDRA_WALLET_SYNC_SECRET"],
    title: "Core"
  },
  {
    keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TELEGRAM_BOT_USERNAME", "TELEGRAM_BOT_TOKEN"],
    title: "Social auth"
  },
  {
    keys: ["TRONGRID_API_KEY", "TRONGRID_API_BASE_URL", "QIDRA_USDT_TRC20_CONTRACT", "QIDRA_TRON_WALLET_ADDRESS", "QIDRA_WALLET_KEY_ENCRYPTION_SECRET"],
    title: "TRON payments"
  },
  {
    keys: ["SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"],
    title: "SMTP"
  },
  {
    keys: ["FILE_STORAGE_DRIVER", "FILE_STORAGE_S3_BUCKET", "FILE_STORAGE_S3_REGION", "FILE_STORAGE_S3_ENDPOINT", "FILE_STORAGE_S3_ACCESS_KEY_ID", "FILE_STORAGE_S3_SECRET_ACCESS_KEY", "FILE_STORAGE_S3_FORCE_PATH_STYLE"],
    title: "File storage"
  },
  {
    keys: ["DATABASE_BACKUP_REQUIRE_S3", "DATABASE_BACKUP_RETENTION_DAYS", "DATABASE_BACKUP_S3_BUCKET", "DATABASE_BACKUP_S3_REGION", "DATABASE_BACKUP_S3_ENDPOINT", "DATABASE_BACKUP_S3_ACCESS_KEY_ID", "DATABASE_BACKUP_S3_SECRET_ACCESS_KEY", "DATABASE_BACKUP_S3_FORCE_PATH_STYLE", "DATABASE_BACKUP_S3_PREFIX"],
    title: "Database backups"
  }
];

for (const group of groups) {
  console.log(`\n${group.title}`);

  for (const key of group.keys) {
    console.log(`- ${key}: ${redactEnvValue(process.env[key])}`);
  }
}

console.log("\nNo secret values were printed.");
