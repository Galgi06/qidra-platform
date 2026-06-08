export type DiagnosticStatus = "blocked" | "ready" | "warning";

export type DiagnosticCheck = {
  description: {
    en: string;
    ru: string;
  };
  key: string;
  label: string;
  status: DiagnosticStatus;
};

export type DiagnosticGroup = {
  checks: DiagnosticCheck[];
  description: {
    en: string;
    ru: string;
  };
  key: string;
  title: {
    en: string;
    ru: string;
  };
};

const placeholderPatterns = [/replace-with/i, /example\.com/i, /localhost/i, /^changeme$/i, /^secret$/i];

export function productionDiagnostics(): DiagnosticGroup[] {
  return [
    {
      key: "core",
      title: { en: "Core runtime", ru: "Основная среда" },
      description: {
        en: "Domain, database and server secrets required before production launch.",
        ru: "Домен, база данных и серверные секреты, обязательные перед запуском."
      },
      checks: [
        envCheck("NEXTAUTH_URL", "NEXTAUTH_URL", {
          en: "Must be the HTTPS production domain.",
          ru: "Должен быть HTTPS production-домен."
        }, (value) => value.startsWith("https://")),
        envCheck("DATABASE_URL", "DATABASE_URL", {
          en: "Production PostgreSQL connection with SSL and backups.",
          ru: "Production PostgreSQL с SSL и резервными копиями."
        }),
        envCheck("NEXTAUTH_SECRET", "NEXTAUTH_SECRET", {
          en: "Random secret with at least 32 characters.",
          ru: "Случайный секрет минимум 32 символа."
        }, (value) => value.length >= 32),
        envCheck("CRON_SECRET", "CRON_SECRET", {
          en: "Bearer secret for cron operations.",
          ru: "Bearer-секрет для cron-операций."
        }),
        envCheck("QIDRA_WALLET_SYNC_SECRET", "QIDRA_WALLET_SYNC_SECRET", {
          en: "Fallback secret for manual wallet sync.",
          ru: "Резервный секрет для ручной синхронизации кошельков."
        })
      ]
    },
    {
      key: "storage",
      title: { en: "Private file storage", ru: "Приватное хранение файлов" },
      description: {
        en: "KYC and project files must be stored in a private S3-compatible bucket.",
        ru: "KYC и документы проектов должны храниться в приватном S3-compatible bucket."
      },
      checks: [
        fixedCheck("FILE_STORAGE_DRIVER", process.env.FILE_STORAGE_DRIVER === "s3", {
          en: "Production must use FILE_STORAGE_DRIVER=s3.",
          ru: "Production должен использовать FILE_STORAGE_DRIVER=s3."
        }),
        envCheck("FILE_STORAGE_S3_BUCKET", "FILE_STORAGE_S3_BUCKET", {
          en: "Private bucket name.",
          ru: "Название приватного bucket."
        }),
        envCheck("FILE_STORAGE_S3_REGION", "FILE_STORAGE_S3_REGION", {
          en: "Bucket region.",
          ru: "Регион bucket."
        }),
        envCheck("FILE_STORAGE_S3_ACCESS_KEY_ID", "FILE_STORAGE_S3_ACCESS_KEY_ID", {
          en: "Storage access key ID.",
          ru: "Access key ID для хранилища."
        }),
        envCheck("FILE_STORAGE_S3_SECRET_ACCESS_KEY", "FILE_STORAGE_S3_SECRET_ACCESS_KEY", {
          en: "Storage secret access key.",
          ru: "Secret access key для хранилища."
        })
      ]
    },
    {
      key: "auth",
      title: { en: "Authentication", ru: "Аутентификация" },
      description: {
        en: "OAuth and Telegram credentials must match the production domain.",
        ru: "OAuth и Telegram-ключи должны соответствовать production-домену."
      },
      checks: [
        envCheck("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID", {
          en: "Google OAuth client ID.",
          ru: "Google OAuth client ID."
        }),
        envCheck("GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET", {
          en: "Google OAuth client secret.",
          ru: "Google OAuth client secret."
        }),
        envCheck("TELEGRAM_BOT_USERNAME", "TELEGRAM_BOT_USERNAME", {
          en: "Telegram bot username without @.",
          ru: "Username Telegram-бота без @."
        }),
        envCheck("TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_TOKEN", {
          en: "Telegram bot token stored only in secrets.",
          ru: "Токен Telegram-бота хранится только в secrets."
        })
      ]
    },
    {
      key: "email",
      title: { en: "SMTP and domain mail", ru: "SMTP и доменная почта" },
      description: {
        en: "Email verification and access recovery require production SMTP.",
        ru: "Подтверждение email и восстановление доступа требуют production SMTP."
      },
      checks: [
        envCheck("SMTP_HOST", "SMTP_HOST", {
          en: "SMTP host.",
          ru: "SMTP host."
        }),
        envCheck("SMTP_PORT", "SMTP_PORT", {
          en: "SMTP port.",
          ru: "SMTP port."
        }),
        envCheck("SMTP_USER", "SMTP_USER", {
          en: "SMTP username.",
          ru: "SMTP username."
        }),
        envCheck("SMTP_PASSWORD", "SMTP_PASSWORD", {
          en: "SMTP password.",
          ru: "SMTP password."
        }),
        envCheck("SMTP_FROM", "SMTP_FROM", {
          en: "Sender address, for example Qidra <no-reply@qidra.io>.",
          ru: "Адрес отправителя, например Qidra <no-reply@qidra.io>."
        }, (value) => /^[^<]*<[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(value))
      ]
    },
    {
      key: "wallet",
      title: { en: "USDT TRC20", ru: "USDT TRC20" },
      description: {
        en: "TronGrid and wallet secrets required for real deposit verification.",
        ru: "TronGrid и wallet secrets для реальной сверки депозитов."
      },
      checks: [
        envCheck("TRONGRID_API_KEY", "TRONGRID_API_KEY", {
          en: "TronGrid API key.",
          ru: "TronGrid API key."
        }),
        envCheck("TRONGRID_API_BASE_URL", "TRONGRID_API_BASE_URL", {
          en: "Usually https://api.trongrid.io.",
          ru: "Обычно https://api.trongrid.io."
        }, (value) => value.startsWith("https://")),
        envCheck("QIDRA_USDT_TRC20_CONTRACT", "QIDRA_USDT_TRC20_CONTRACT", {
          en: "USDT TRC20 contract address.",
          ru: "Адрес USDT TRC20 contract."
        }),
        envCheck("QIDRA_TRON_WALLET_ADDRESS", "QIDRA_TRON_WALLET_ADDRESS", {
          en: "Main outgoing TRON wallet address.",
          ru: "Основной исходящий TRON-кошелек."
        }),
        envCheck("QIDRA_WALLET_KEY_ENCRYPTION_SECRET", "QIDRA_WALLET_KEY_ENCRYPTION_SECRET", {
          en: "Separate encryption secret for generated wallet private keys.",
          ru: "Отдельный секрет шифрования приватных ключей кошельков."
        }, (value) => value.length >= 32)
      ]
    },
    {
      key: "backups",
      title: { en: "Database backups", ru: "Резервные копии базы" },
      description: {
        en: "Daily off-server database backups are required before handling real clients and payments.",
        ru: "Ежедневные внешние резервные копии базы обязательны перед работой с реальными клиентами и платежами."
      },
      checks: [
        fixedCheck("DATABASE_BACKUP_REQUIRE_S3", process.env.DATABASE_BACKUP_REQUIRE_S3 === "true", {
          en: "Production backups must require upload to private S3/R2 storage.",
          ru: "Production-бэкапы должны обязательно выгружаться в приватное S3/R2-хранилище."
        }),
        envCheck("DATABASE_BACKUP_RETENTION_DAYS", "DATABASE_BACKUP_RETENTION_DAYS", {
          en: "Keep backups for at least 7 days.",
          ru: "Хранить резервные копии минимум 7 дней."
        }, (value) => Number.parseInt(value, 10) >= 7),
        envCheck("DATABASE_BACKUP_S3_BUCKET", "DATABASE_BACKUP_S3_BUCKET", {
          en: "Private backup bucket.",
          ru: "Приватный bucket для бэкапов."
        }),
        envCheck("DATABASE_BACKUP_S3_REGION", "DATABASE_BACKUP_S3_REGION", {
          en: "Backup bucket region.",
          ru: "Регион backup bucket."
        }),
        envCheck("DATABASE_BACKUP_S3_ACCESS_KEY_ID", "DATABASE_BACKUP_S3_ACCESS_KEY_ID", {
          en: "Backup storage access key ID.",
          ru: "Access key ID для backup-хранилища."
        }),
        envCheck("DATABASE_BACKUP_S3_SECRET_ACCESS_KEY", "DATABASE_BACKUP_S3_SECRET_ACCESS_KEY", {
          en: "Backup storage secret access key.",
          ru: "Secret access key для backup-хранилища."
        })
      ]
    }
  ];
}

export function diagnosticsSummary(groups: DiagnosticGroup[]) {
  const checks = groups.flatMap((group) => group.checks);
  const blocked = checks.filter((check) => check.status === "blocked").length;
  const warning = checks.filter((check) => check.status === "warning").length;
  const ready = checks.filter((check) => check.status === "ready").length;

  return {
    blocked,
    ready,
    total: checks.length,
    warning
  };
}

function envCheck(
  key: string,
  label: string,
  description: DiagnosticCheck["description"],
  predicate?: (value: string) => boolean
): DiagnosticCheck {
  const value = process.env[key]?.trim();

  if (!value) {
    return { description, key, label, status: "blocked" };
  }

  if (placeholderPatterns.some((pattern) => pattern.test(value))) {
    return { description, key, label, status: "blocked" };
  }

  if (predicate && !predicate(value)) {
    return { description, key, label, status: "warning" };
  }

  return { description, key, label, status: "ready" };
}

function fixedCheck(label: string, passed: boolean, description: DiagnosticCheck["description"]): DiagnosticCheck {
  return {
    description,
    key: label,
    label,
    status: passed ? "ready" : "blocked"
  };
}
