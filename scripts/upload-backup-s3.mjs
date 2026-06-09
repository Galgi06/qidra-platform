import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";

import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const backupFile = process.argv[2];
const requireS3 = process.env.DATABASE_BACKUP_REQUIRE_S3 === "true";

if (!backupFile) {
  fail("Usage: node scripts/upload-backup-s3.mjs /path/to/qidra-postgres-*.dump.gz");
}

if (!existsSync(backupFile)) {
  fail(`Backup file does not exist: ${backupFile}`);
}

const bucket = process.env.DATABASE_BACKUP_S3_BUCKET;
const accessKeyId = process.env.DATABASE_BACKUP_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.DATABASE_BACKUP_S3_SECRET_ACCESS_KEY;
const region = process.env.DATABASE_BACKUP_S3_REGION || "auto";
const endpoint = process.env.DATABASE_BACKUP_S3_ENDPOINT || undefined;
const prefix = (process.env.DATABASE_BACKUP_S3_PREFIX || "qidra/postgres").replace(/^\/+|\/+$/g, "");

if (!bucket || !accessKeyId || !secretAccessKey) {
  if (requireS3) {
    fail("S3 backup upload is required, but DATABASE_BACKUP_S3_* variables are incomplete.");
  }

  console.warn("S3 backup upload skipped: DATABASE_BACKUP_S3_* variables are incomplete.");
  process.exit(0);
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

await uploadFile(backupFile, "application/gzip");

const checksumFile = `${backupFile}.sha256`;
if (existsSync(checksumFile)) {
  await uploadFile(checksumFile, "text/plain");
}

async function uploadFile(filePath, contentType) {
  const key = `${prefix}/${basename(filePath)}`;

  await client.send(
    new PutObjectCommand({
      Body: createReadStream(filePath),
      Bucket: bucket,
      ContentType: contentType,
      Key: key,
      ServerSideEncryption: "AES256"
    })
  );

  console.log(`Backup uploaded: s3://${bucket}/${key}`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
