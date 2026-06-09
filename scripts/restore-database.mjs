import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const backupPath = process.argv[2];
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);

if (!backupPath) {
  fail("Usage: npm run restore:database -- /path/to/qidra-db-YYYY-MM-DD.sql.gz");
}

if (process.env.QIDRA_RESTORE_CONFIRM !== "RESTORE_QIDRA_DATABASE") {
  fail("Refusing to restore database. Set QIDRA_RESTORE_CONFIRM=RESTORE_QIDRA_DATABASE.");
}

if (!databaseUrl) {
  fail("DATABASE_URL is required.");
}

if (!existsSync(backupPath)) {
  fail(`Backup file not found: ${backupPath}`);
}

const backupInfo = await stat(backupPath);

if (!backupInfo.isFile()) {
  fail(`Backup path is not a file: ${backupPath}`);
}

await restoreDatabase(backupPath);
console.log(`Database restore completed from: ${backupPath}`);

async function restoreDatabase(filePath) {
  const psqlBin = resolvePsqlBin();
  const psql = spawn(psqlBin, ["--set", "ON_ERROR_STOP=1", databaseUrl], {
    stdio: ["pipe", "inherit", "pipe"]
  });

  let stderr = "";

  psql.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  const exitCodePromise = new Promise((resolve, reject) => {
    psql.on("error", reject);
    psql.on("close", resolve);
  });

  try {
    const source = createReadStream(filePath);
    const stream = filePath.endsWith(".gz") ? source.pipe(createGunzip()) : source;
    await pipeline(stream, psql.stdin);
  } catch (error) {
    const exitCode = await exitCodePromise.catch(() => "spawn_error");
    fail(
      `psql restore pipeline failed with exit code ${exitCode}.${stderr ? `\n${stderr}` : ""}\n${formatError(error)}`
    );
  }

  const exitCode = await exitCodePromise;

  if (exitCode !== 0) {
    fail(`psql restore failed with exit code ${exitCode}.${stderr ? `\n${stderr}` : ""}`);
  }
}

function resolvePsqlBin() {
  if (process.env.PSQL_BIN) {
    return process.env.PSQL_BIN;
  }

  const candidates = ["/usr/local/opt/postgresql@16/bin/psql", "/opt/homebrew/opt/postgresql@16/bin/psql"];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return "psql";
}

function normalizeDatabaseUrl(value) {
  if (!value) {
    return "";
  }

  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("schema");
    return parsed.toString();
  } catch {
    return value;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}
