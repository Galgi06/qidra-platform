import { GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

if ((process.env.FILE_STORAGE_DRIVER || "").toLowerCase() !== "s3") {
  throw new Error("FILE_STORAGE_DRIVER must be s3 for the production private-file backup workflow.");
}

const source = readConfig("FILE_STORAGE_S3", "FILE_STORAGE_S3_BUCKET");
const target = readConfig("DATABASE_BACKUP_S3", "DATABASE_BACKUP_S3_BUCKET");
const sourceClient = new S3Client(source.client);
const targetClient = new S3Client(target.client);
const prefix = (process.env.FILE_BACKUP_S3_PREFIX || "qidra/files").replace(/^\/+|\/+$/g, "");
const objects = [];
let continuationToken;

do {
  const page = await sourceClient.send(new ListObjectsV2Command({ Bucket: source.bucket, ContinuationToken: continuationToken }));
  objects.push(...(page.Contents || []));
  continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
} while (continuationToken);

let copied = 0;
let skipped = 0;
const manifest = [];

for (const item of objects) {
  if (!item.Key || item.Size == null) continue;
  const targetKey = `${prefix}/objects/${item.Key}`;
  manifest.push({ etag: item.ETag, key: item.Key, lastModified: item.LastModified?.toISOString(), size: item.Size });

  try {
    const existing = await targetClient.send(new HeadObjectCommand({ Bucket: target.bucket, Key: targetKey }));
    if (existing.ContentLength === item.Size && existing.Metadata?.sourceetag === cleanEtag(item.ETag)) {
      skipped += 1;
      continue;
    }
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== "NotFound") throw error;
  }

  const sourceObject = await sourceClient.send(new GetObjectCommand({ Bucket: source.bucket, Key: item.Key }));
  if (!sourceObject.Body) throw new Error(`Source object is empty: ${item.Key}`);
  await targetClient.send(
    new PutObjectCommand({
      Body: sourceObject.Body,
      Bucket: target.bucket,
      ContentLength: item.Size,
      ContentType: sourceObject.ContentType || "application/octet-stream",
      Key: targetKey,
      Metadata: { sourcebucket: source.bucket, sourceetag: cleanEtag(item.ETag) },
      ServerSideEncryption: "AES256"
    })
  );
  copied += 1;
}

const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
await targetClient.send(
  new PutObjectCommand({
    Body: JSON.stringify({ copied, createdAt: new Date().toISOString(), objects: manifest, skipped, sourceBucket: source.bucket }),
    Bucket: target.bucket,
    ContentType: "application/json",
    Key: `${prefix}/manifests/qidra-files-${timestamp}.json`,
    ServerSideEncryption: "AES256"
  })
);

console.log(`Private file backup verified: ${objects.length} source objects, ${copied} copied, ${skipped} unchanged.`);

function readConfig(prefixName, bucketName) {
  const bucket = process.env[bucketName];
  const accessKeyId = process.env[`${prefixName}_ACCESS_KEY_ID`];
  const secretAccessKey = process.env[`${prefixName}_SECRET_ACCESS_KEY`];
  if (!bucket || !accessKeyId || !secretAccessKey) throw new Error(`${prefixName}_* credentials are required.`);
  return {
    bucket,
    client: {
      credentials: { accessKeyId, secretAccessKey },
      endpoint: process.env[`${prefixName}_ENDPOINT`] || undefined,
      forcePathStyle: process.env[`${prefixName}_FORCE_PATH_STYLE`] !== "false",
      region: process.env[`${prefixName}_REGION`] || "auto"
    }
  };
}

function cleanEtag(value = "") {
  return value.replaceAll('"', "");
}
