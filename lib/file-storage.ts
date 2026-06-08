import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

type SaveUploadedFileOptions = {
  contentType: string;
  directory: string;
  file: File;
  storedName: string;
};

type ReadStoredFileResult = {
  body: Buffer;
  storage: "local" | "s3";
};

type S3Config = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
};

let s3Client: S3Client | null = null;

export async function saveUploadedFile({ contentType, directory, file, storedName }: SaveUploadedFileOptions) {
  const body = Buffer.from(await file.arrayBuffer());

  if (fileStorageDriver() === "s3") {
    const config = readS3Config();
    const key = storageKey(directory, storedName);
    const client = getS3Client(config);

    await client.send(
      new PutObjectCommand({
        Body: body,
        Bucket: config.bucket,
        ContentType: contentType,
        Key: key,
        ServerSideEncryption: "AES256"
      })
    );

    return `s3://${config.bucket}/${key}`;
  }

  const uploadDir = path.join(process.cwd(), "storage", directory);
  await mkdir(uploadDir, { recursive: true });

  const absolutePath = path.join(uploadDir, storedName);
  await writeFile(absolutePath, body);

  return path.relative(process.cwd(), absolutePath);
}

export async function readStoredFile(storagePath: string, allowedDirectory: string): Promise<ReadStoredFileResult> {
  if (storagePath.startsWith("s3://")) {
    const config = readS3Config();
    const parsed = parseS3StoragePath(storagePath);

    if (parsed.bucket !== config.bucket || !isAllowedS3Key(parsed.key, allowedDirectory)) {
      throw new Error("invalid_storage_path");
    }

    const response = await getS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: parsed.key
      })
    );

    if (!response.Body) {
      throw new Error("file_not_found");
    }

    return {
      body: await streamToBuffer(response.Body),
      storage: "s3"
    };
  }

  const uploadRoot = path.join(process.cwd(), "storage", allowedDirectory);
  const normalizedStoragePath = storagePath.split(/[\\/]+/).join(path.sep);
  const storagePrefix = `storage${path.sep}${allowedDirectory}${path.sep}`;

  if (!normalizedStoragePath.startsWith(storagePrefix)) {
    throw new Error("invalid_storage_path");
  }

  const relativeFilePath = normalizedStoragePath.slice(storagePrefix.length);
  const filePath = path.resolve(uploadRoot, relativeFilePath);

  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    throw new Error("invalid_storage_path");
  }

  return {
    body: await readFile(filePath),
    storage: "local"
  };
}

export function fileStorageDriver() {
  const driver = process.env.FILE_STORAGE_DRIVER === "s3" ? "s3" : "local";

  if (process.env.NODE_ENV === "production" && driver !== "s3") {
    throw new Error("production_file_storage_must_use_s3");
  }

  return driver;
}

function storageKey(directory: string, storedName: string) {
  const safeDirectory = directory
    .split("/")
    .map((segment) => sanitizeKeySegment(segment))
    .filter(Boolean)
    .join("/");

  return `${safeDirectory}/${storedName}`;
}

function isAllowedS3Key(key: string, allowedDirectory: string) {
  const normalizedAllowedDirectory = allowedDirectory
    .split("/")
    .map((segment) => sanitizeKeySegment(segment))
    .filter(Boolean)
    .join("/");

  return key.startsWith(`${normalizedAllowedDirectory}/`);
}

function sanitizeKeySegment(segment: string) {
  return segment.replace(/[^a-zA-Z0-9._=-]+/g, "-").replace(/^-+|-+$/g, "");
}

function readS3Config(): S3Config {
  const bucket = process.env.FILE_STORAGE_S3_BUCKET;
  const accessKeyId = process.env.FILE_STORAGE_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.FILE_STORAGE_S3_SECRET_ACCESS_KEY;
  const region = process.env.FILE_STORAGE_S3_REGION || "auto";

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("s3_storage_not_configured");
  }

  return {
    accessKeyId,
    bucket,
    endpoint: process.env.FILE_STORAGE_S3_ENDPOINT || undefined,
    forcePathStyle: process.env.FILE_STORAGE_S3_FORCE_PATH_STYLE !== "false",
    region,
    secretAccessKey
  };
}

function getS3Client(config: S3Config) {
  if (!s3Client) {
    s3Client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey
      },
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      region: config.region
    });
  }

  return s3Client;
}

function parseS3StoragePath(storagePath: string) {
  const url = new URL(storagePath);
  const bucket = url.hostname;
  const key = url.pathname.replace(/^\/+/, "");

  if (!bucket || !key) {
    throw new Error("invalid_storage_path");
  }

  return { bucket, key };
}

async function streamToBuffer(body: unknown) {
  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  if (body instanceof Readable) {
    const chunks: Buffer[] = [];

    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  if (body instanceof ReadableStream) {
    const reader = body.getReader();
    const chunks: Buffer[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }

    return Buffer.concat(chunks);
  }

  throw new Error("unsupported_storage_body");
}
