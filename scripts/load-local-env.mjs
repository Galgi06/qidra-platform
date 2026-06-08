import { existsSync, readFileSync } from "node:fs";

export function loadLocalEnv(files = [".env.local", ".env"]) {
  for (const file of files) {
    if (!existsSync(file)) continue;

    const text = readFileSync(file, "utf8");

    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!match) continue;

      const [, key, rawValue] = match;

      if (process.env[key]) continue;

      process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
    }
  }
}

export function redactEnvValue(value) {
  if (!value) return "missing";

  if (/replace-with|example\.com/i.test(value)) {
    return "placeholder";
  }

  return `set:${value.length}`;
}
