import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const backupDir = path.resolve(process.env.DATABASE_BACKUP_LOCAL_DIR || ".backups/database");
const retentionDays = Number.parseInt(process.env.DATABASE_BACKUP_RETENTION_DAYS || "14", 10);
const requireS3 = process.env.DATABASE_BACKUP_REQUIRE_S3 === "true";

if (!databaseUrl) {
  fail("DATABASE_URL is required.");
}

if (!Number.isFinite(retentionDays) || retentionDays < 1) {
  fail("DATABASE_BACKUP_RETENTION_DAYS must be a positive number.");
}

await mkdir(backupDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const fileName = `qidra-db-${timestamp}.sql.gz`;
const filePath = path.join(backupDir, fileName);

await dumpDatabase(filePath);
await uploadBackup(filePath, fileName);
await pruneOldBackups();

console.log(`Database backup created: ${filePath}`);

async function dumpDatabase(outputPath) {
  const pgDumpBin = process.env.PG_DUMP_BIN || "pg_dump";
  const pgDump = spawn(
    pgDumpBin,
    [`--dbname=${databaseUrl}`, "--format=plain", "--no-owner", "--no-privileges"],
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
  );

  let stderr = "";
  pgDump.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCodePromise = new Promise((resolve, reject) => {
    pgDump.on("error", reject);
    pgDump.on("close", resolve);
  });

  try {
    await pipeline(pgDump.stdout, createGzip({ level: 9 }), createWriteStream(outputPath));
  } catch (error) {
    const exitCode = await exitCodePromise.catch(() => "spawn_error");
    fail(
      `pg_dump pipeline failed with exit code ${exitCode}.${stderr ? `\n${stderr}` : ""}\n${formatError(error)}`
    );
  }

  const exitCode = await exitCodePromise;

  if (exitCode !== 0) {
    fail(`pg_dump failed with exit code ${exitCode}.${stderr ? `\n${stderr}` : ""}`);
  }
}

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) {
    return rawUrl;
  }

  const url = new URL(rawUrl);
  url.searchParams.delete("schema");
  return url.toString();
}

async function uploadBackup(filePathToUpload, fileNameToUpload) {
  const bucket = process.env.DATABASE_BACKUP_S3_BUCKET;
  const accessKeyId = process.env.DATABASE_BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DATABASE_BACKUP_S3_SECRET_ACCESS_KEY;
  const region = process.env.DATABASE_BACKUP_S3_REGION || "auto";
  const endpoint = process.env.DATABASE_BACKUP_S3_ENDPOINT || undefined;
  const prefix = (process.env.DATABASE_BACKUP_S3_PREFIX || "qidra/database").replace(/^\/+|\/+$/g, "");

  if (!bucket || !accessKeyId || !secretAccessKey) {
    if (requireS3) {
      fail("S3 backup upload is required, but DATABASE_BACKUP_S3_* variables are incomplete.");
    }

    console.warn("S3 backup upload skipped: DATABASE_BACKUP_S3_* variables are incomplete.");
    return;
  }

  const client = new S3Client({
    credentials: {
      accessKeyId,
      secretAccessKey
    },
    endpoint,
    forcePathStyle: process.env.DATABASE_BACKUP_S3_FORCE_PATH_STYLE !== "false",
    region
  });

  await client.send(
    new PutObjectCommand({
      Body: createReadStream(filePathToUpload),
      Bucket: bucket,
      ContentType: "application/gzip",
      Key: `${prefix}/${fileNameToUpload}`,
      ServerSideEncryption: "AES256"
    })
  );

  console.log(`Database backup uploaded: s3://${bucket}/${prefix}/${fileNameToUpload}`);
}

async function pruneOldBackups() {
  const files = await readdir(backupDir);
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;

  await Promise.all(
    files
      .filter((file) => file.startsWith("qidra-db-") && file.endsWith(".sql.gz"))
      .map(async (file) => {
        const fullPath = path.join(backupDir, file);
        const info = await stat(fullPath);

        if (info.mtimeMs < cutoff) {
          await unlink(fullPath);
          console.log(`Old local backup removed: ${fullPath}`);
        }
      })
  );
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
