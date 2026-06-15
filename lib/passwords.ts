import bcrypt from "bcryptjs";
import { createHash } from "crypto";

function passwordDigest(password: string) {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(passwordDigest(password), 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  if (await bcrypt.compare(passwordDigest(password), passwordHash)) {
    return true;
  }

  return bcrypt.compare(password, passwordHash);
}
