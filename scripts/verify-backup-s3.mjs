import { GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { basename } from "node:path";

const backupFile = process.argv[2];
if (!backupFile || !existsSync(backupFile)) fail("Usage: node scripts/verify-backup-s3.mjs /path/to/qidra-postgres-*.dump.gz");

const config = readConfig();
const client = new S3Client(config.client);
const fileName = basename(backupFile);
const backupKey = `${config.prefix}/${fileName}`;
const checksumKey = `${backupKey}.sha256`;

const [backupHead, checksumHead, checksumObject, localHash] = await Promise.all([
  client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: backupKey })),
  client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: checksumKey })),
  client.send(new GetObjectCommand({ Bucket: config.bucket, Key: checksumKey })),
  sha256(backupFile)
]);

const remoteChecksum = (await checksumObject.Body?.transformToString())?.trim().split(/\s+/)[0];
if (!remoteChecksum || remoteChecksum !== localHash) fail("Off-site backup checksum does not match the local verified archive.");
if (!backupHead.ContentLength || !checksumHead.ContentLength) fail("Off-site backup or checksum object is empty.");

console.log(`Off-site database backup verified: s3://${config.bucket}/${backupKey}`);

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

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(filePath).on("data", (chunk) => hash.update(chunk)).on("error", reject).on("end", () => resolve(hash.digest("hex")));
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
