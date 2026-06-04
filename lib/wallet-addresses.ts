import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { Prisma } from "@prisma/client";
import { TronWeb } from "tronweb";
import { prisma } from "@/lib/prisma";

const encryptionVersion = "v1";

type TronAccount = {
  address: {
    base58: string;
  };
  privateKey: string;
};

export async function ensureUserDepositWallet(userId: string) {
  const existingWallet = await prisma.wallet.findUnique({ where: { userId } });

  if (existingWallet?.trc20Address) {
    return existingWallet;
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const account = (await TronWeb.createAccount()) as TronAccount;
    const encryptedPrivateKey = encryptWalletPrivateKey(account.privateKey);

    try {
      if (existingWallet) {
        return await prisma.wallet.update({
          where: { id: existingWallet.id },
          data: {
            trc20Address: account.address.base58,
            trc20AddressIssuedAt: new Date(),
            trc20PrivateKeyEncrypted: encryptedPrivateKey
          }
        });
      }

      return await prisma.wallet.create({
        data: {
          userId,
          trc20Address: account.address.base58,
          trc20AddressIssuedAt: new Date(),
          trc20PrivateKeyEncrypted: encryptedPrivateKey
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Could not issue a unique TRC20 deposit address.");
}

export function encryptWalletPrivateKey(privateKey: string) {
  const secret = getWalletEncryptionSecret();
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(secret, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [encryptionVersion, salt.toString("base64url"), iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptWalletPrivateKey(encryptedPrivateKey: string) {
  const [version, saltValue, ivValue, tagValue, encryptedValue] = encryptedPrivateKey.split(":");

  if (version !== encryptionVersion || !saltValue || !ivValue || !tagValue || !encryptedValue) {
    throw new Error("Unsupported wallet private key format.");
  }

  const secret = getWalletEncryptionSecret();
  const salt = Buffer.from(saltValue, "base64url");
  const iv = Buffer.from(ivValue, "base64url");
  const tag = Buffer.from(tagValue, "base64url");
  const encrypted = Buffer.from(encryptedValue, "base64url");
  const key = scryptSync(secret, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function getWalletEncryptionSecret() {
  const secret = process.env.QIDRA_WALLET_KEY_ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error("Set QIDRA_WALLET_KEY_ENCRYPTION_SECRET or NEXTAUTH_SECRET with at least 24 characters.");
  }

  return secret;
}
