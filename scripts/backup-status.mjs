import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const backupDir = path.resolve(process.env.DATABASE_BACKUP_LOCAL_DIR || ".backups/database");
const requireS3 = process.env.DATABASE_BACKUP_REQUIRE_S3 === "true";
const retentionDays = Number.parseInt(process.env.DATABASE_BACKUP_RETENTION_DAYS || "14", 10);
const s3ForcePathStyle = process.env.DATABASE_BACKUP_S3_FORCE_PATH_STYLE === "true";
const s3Complete = Boolean(
  process.env.DATABASE_BACKUP_S3_BUCKET &&
    process.env.DATABASE_BACKUP_S3_REGION &&
    process.env.DATABASE_BACKUP_S3_ENDPOINT &&
    process.env.DATABASE_BACKUP_S3_ACCESS_KEY_ID &&
    process.env.DATABASE_BACKUP_S3_SECRET_ACCESS_KEY &&
    s3ForcePathStyle
);

const backups = await listBackups(backupDir);
const newest = backups[0];

console.log("Qidra backup status");
console.log(`- local dir: ${backupDir}`);
console.log(`- local backups: ${backups.length}`);

if (newest) {
  console.log(`- newest local backup: ${newest.name}`);
  console.log(`- newest modified: ${newest.modifiedAt.toISOString()}`);
  console.log(`- newest size: ${formatMb(newest.size)}`);
} else {
  console.log("- newest local backup: none");
}

console.log(`- retention days: ${Number.isFinite(retentionDays) ? retentionDays : "invalid"}`);
console.log(`- off-server S3/R2 configured: ${s3Complete ? "yes" : "no"}`);
console.log(`- off-server S3/R2 required: ${requireS3 ? "yes" : "no"}`);

if (requireS3 && !s3Complete) {
  console.error("Backup status failed: S3/R2 backup is required but not fully configured.");
  process.exit(1);
}

async function listBackups(dir) {
  try {
    const entries = await readdir(dir);
    const rows = await Promise.all(
      entries
        .filter((entry) => /^qidra-db-.*\.sql(\.gz)?$/.test(entry))
        .map(async (entry) => {
          const filePath = path.join(dir, entry);
          const info = await stat(filePath);
          return { name: entry, size: info.size, modifiedAt: info.mtime };
        })
    );

    return rows.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
