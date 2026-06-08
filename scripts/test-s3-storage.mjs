import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const bucket = process.env.FILE_STORAGE_S3_BUCKET;
const region = process.env.FILE_STORAGE_S3_REGION || "auto";
const endpoint = process.env.FILE_STORAGE_S3_ENDPOINT || undefined;
const accessKeyId = process.env.FILE_STORAGE_S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.FILE_STORAGE_S3_SECRET_ACCESS_KEY;
const forcePathStyle = process.env.FILE_STORAGE_S3_FORCE_PATH_STYLE !== "false";

if (!bucket || !accessKeyId || !secretAccessKey) {
  console.error("S3/R2 storage test failed: FILE_STORAGE_S3_BUCKET, FILE_STORAGE_S3_ACCESS_KEY_ID and FILE_STORAGE_S3_SECRET_ACCESS_KEY are required.");
  process.exit(1);
}

const client = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  endpoint,
  forcePathStyle,
  region
});

const key = `qidra-smoke-tests/storage-${Date.now()}.txt`;
const body = `Qidra storage smoke test ${new Date().toISOString()}`;

try {
  await client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: bucket,
      ContentType: "text/plain",
      Key: key,
      ServerSideEncryption: "AES256"
    })
  );

  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const storedBody = await response.Body?.transformToString();

  if (storedBody !== body) {
    throw new Error("Stored object content mismatch.");
  }

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log(`S3/R2 storage smoke test passed for bucket ${bucket}.`);
} catch (error) {
  console.error("S3/R2 storage test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
