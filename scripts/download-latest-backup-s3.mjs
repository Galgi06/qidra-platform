import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";

const outputDir = process.argv[2];
if (!outputDir) fail("Usage: node scripts/download-latest-backup-s3.mjs /restore");

const config = readConfig();
const client = new S3Client(config.client);
const objects = [];
let continuationToken;

do {
  const page = await client.send(new ListObjectsV2Command({ Bucket: config.bucket, Prefix: `${config.prefix}/`, ContinuationToken: continuationToken }));
  objects.push(...(page.Contents || []));
  continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (continuationToken);

const latest = objects
  .filter((item) => item.Key && /qidra-postgres-\d{8}T\d{6}Z\.dump\.gz$/.test(item.Key))
  .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0];

if (!latest?.Key) fail("No off-site PostgreSQL backup was found.");
await mkdir(outputDir, { recursive: true });

for (const key of [latest.Key, `${latest.Key}.sha256`]) {
  const response = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
  if (!response.Body) fail(`Backup object is empty: ${key}`);
  await pipeline(response.Body, createWriteStream(join(outputDir, basename(key)), { mode: 0o600 }));
}

console.log(join(outputDir, basename(latest.Key)));

function readConfig() {
  const bucket = process.env.DATABASE_BACKUP_S3_BUCKET;
  const accessKeyId = process.env.DATABASE_BACKUP_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DATABASE_BACKUP_S3_SECRET_ACCESS_KEY;
  if (!bucket || !accessKeyId || !secretAccessKey) fail("DATABASE_BACKUP_S3_* credentials are required.");
  return {
    bucket,
    prefix: (process.env.DATABASE_BACKUP_S3_PREFIX || "qidra/database").replace(/^\/+|\/+$/g, ""),
    client: {
      credentials: { accessKeyId, secretAccessKey },
      endpoint: process.env.DATABASE_BACKUP_S3_ENDPOINT || undefined,
      forcePathStyle: process.env.DATABASE_BACKUP_S3_FORCE_PATH_STYLE !== "false",
      region: process.env.DATABASE_BACKUP_S3_REGION || "auto"
    }
  };
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
