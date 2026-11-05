import { chmod, copyFile, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const envPath = path.resolve(process.argv[2] || ".env.production");
const clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";

if (!/^\d+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(clientId)) {
  throw new Error("GOOGLE_CLIENT_ID is missing or invalid");
}

if (!/^GOCSPX-[A-Za-z0-9_-]{20,}$/.test(clientSecret)) {
  throw new Error("GOOGLE_CLIENT_SECRET is missing or invalid");
}

const source = await readFile(envPath, "utf8");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = `${envPath}.before-google-oauth-${timestamp}`;
const temporaryPath = `${envPath}.tmp-google-oauth-${process.pid}`;
const updates = new Map([
  ["GOOGLE_CLIENT_ID", clientId],
  ["GOOGLE_CLIENT_SECRET", clientSecret]
]);
const seen = new Set();
const lines = source.split(/\r?\n/).map((line) => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=/);
  if (!match || !updates.has(match[1])) return line;

  seen.add(match[1]);
  return `${match[1]}=${JSON.stringify(updates.get(match[1]))}`;
});

for (const [key, value] of updates) {
  if (!seen.has(key)) lines.push(`${key}=${JSON.stringify(value)}`);
}

const currentMode = (await stat(envPath)).mode & 0o777;
await copyFile(envPath, backupPath);
await chmod(backupPath, 0o600);
await writeFile(temporaryPath, `${lines.join("\n").replace(/\n+$/, "")}\n`, { mode: 0o600 });
await rename(temporaryPath, envPath);
await chmod(envPath, currentMode || 0o600);

console.log(`Google OAuth configuration updated. Previous environment: ${backupPath}`);
