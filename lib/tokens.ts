import { createHash, randomBytes } from "node:crypto";

export function createRawToken() {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function expiresIn(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}
