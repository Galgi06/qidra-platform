import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createSign } from "node:crypto";
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
  storage: "gcs" | "local" | "s3";
};

type S3Config = {
  accessKeyId: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  region: string;
  secretAccessKey: string;
};

type GcsConfig = {
  bucket: string;
};

type GcpServiceAccount = {
  client_email: string;
  private_key: string;
  token_uri?: string;
};

let s3Client: S3Client | null = null;
let gcsTokenCache: { accessToken: string; expiresAt: number } | null = null;

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

  if (fileStorageDriver() === "gcs") {
    const config = readGcsConfig();
    const key = storageKey(directory, storedName);
    await uploadToGcs({ body, bucket: config.bucket, contentType, key });
    return `gcs://${config.bucket}/${key}`;
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

  if (isGcsStoragePath(storagePath)) {
    const config = readGcsConfig();
    const parsed = parseGcsStoragePath(storagePath);

    if (parsed.bucket !== config.bucket || !isAllowedS3Key(parsed.key, allowedDirectory)) {
      throw new Error("invalid_storage_path");
    }

    return {
      body: await downloadFromGcs(parsed.bucket, parsed.key),
      storage: "gcs"
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
  const configured = (process.env.FILE_STORAGE_DRIVER || "").trim().toLowerCase();
  const driver = configured === "s3" ? "s3" : configured === "gcs" ? "gcs" : "local";

  if (process.env.NODE_ENV === "production" && !["s3", "gcs"].includes(driver)) {
    throw new Error("production_file_storage_must_use_remote_storage");
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

function readGcsConfig(): GcsConfig {
  const bucket = process.env.GCS_BUCKET_NAME?.trim();

  if (!bucket) {
    throw new Error("gcs_storage_not_configured");
  }

  return { bucket };
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

function isGcsStoragePath(storagePath: string) {
  return storagePath.startsWith("gcs://") || storagePath.startsWith("gs://") || storagePath.startsWith("https://storage.googleapis.com/") || storagePath.startsWith("https://storage.cloud.google.com/");
}

function parseGcsStoragePath(storagePath: string) {
  if (storagePath.startsWith("gcs://") || storagePath.startsWith("gs://")) {
    const url = new URL(storagePath.replace(/^gs:\/\//, "gcs://"));
    const bucket = url.hostname;
    const key = url.pathname.replace(/^\/+/, "");

    if (!bucket || !key) {
      throw new Error("invalid_storage_path");
    }

    return { bucket, key };
  }

  const url = new URL(storagePath);
  const pathname = url.pathname.replace(/^\/+/, "");
  const parts = pathname.split("/");
  const bucket = parts.shift() || "";
  const key = parts.join("/");

  if (!bucket || !key) {
    throw new Error("invalid_storage_path");
  }

  return { bucket, key };
}

async function uploadToGcs({ body, bucket, contentType, key }: { body: Buffer; bucket: string; contentType: string; key: string }) {
  const accessToken = await getGcsAccessToken();
  const response = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType
    },
    body: new Uint8Array(body)
  });

  if (!response.ok) {
    throw new Error(`gcs_upload_failed_${response.status}`);
  }
}

async function downloadFromGcs(bucket: string, key: string) {
  const accessToken = await getGcsAccessToken();
  const response = await fetch(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(key)}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`gcs_download_failed_${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function getGcsAccessToken() {
  if (gcsTokenCache && gcsTokenCache.expiresAt > Date.now() + 60_000) {
    return gcsTokenCache.accessToken;
  }

  const serviceAccount = parseServiceAccountFromEnv();
  const token = serviceAccount ? await fetchServiceAccountToken(serviceAccount) : await fetchMetadataServerToken();

  gcsTokenCache = token;
  return token.accessToken;
}

function parseServiceAccountFromEnv() {
  const rawValue = process.env.GCP_SERVICE_ACCOUNT_KEY?.trim();

  if (!rawValue) {
    return null;
  }

  const candidates = [rawValue];

  try {
    candidates.push(Buffer.from(rawValue, "base64").toString("utf8"));
  } catch {}

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as Partial<GcpServiceAccount>;

      if (parsed.client_email && parsed.private_key) {
        return {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
          token_uri: parsed.token_uri || "https://oauth2.googleapis.com/token"
        } satisfies GcpServiceAccount;
      }
    } catch {}
  }

  throw new Error("invalid_gcp_service_account_key");
}

async function fetchServiceAccountToken(serviceAccount: GcpServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJwtSegment({ alg: "RS256", typ: "JWT" });
  const claim = encodeJwtSegment({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/devstorage.read_write",
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  });
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(serviceAccount.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer"
    })
  });

  if (!response.ok) {
    throw new Error(`gcs_oauth_failed_${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!payload.access_token) {
    throw new Error("gcs_oauth_missing_access_token");
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000
  };
}

async function fetchMetadataServerToken() {
  const response = await fetch("http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token", {
    headers: {
      "Metadata-Flavor": "Google"
    }
  });

  if (!response.ok) {
    throw new Error(`gcs_metadata_token_failed_${response.status}`);
  }

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };

  if (!payload.access_token) {
    throw new Error("gcs_metadata_missing_access_token");
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in || 3600) * 1000
  };
}

function encodeJwtSegment(payload: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
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
