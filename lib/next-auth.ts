import bcrypt from "bcryptjs";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { User as PrismaUser } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { isSocialProviderConfigured } from "@/lib/social-auth";
import { isUserBlocked } from "@/lib/user-access";

const googleEnabled = isSocialProviderConfigured(process.env.GOOGLE_CLIENT_ID) && isSocialProviderConfigured(process.env.GOOGLE_CLIENT_SECRET);
const telegramToken = isSocialProviderConfigured(process.env.TELEGRAM_BOT_TOKEN) ? process.env.TELEGRAM_BOT_TOKEN : undefined;
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

function requireAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const placeholder = !secret || secret.toLowerCase().includes("replace-with") || secret.length < 32;

  if (process.env.NODE_ENV === "production" && !isProductionBuild && placeholder) {
    throw new Error("Set NEXTAUTH_SECRET to a secure random value with at least 32 characters before production launch.");
  }

  return secret;
}

function toAdapterUser(user: PrismaUser): AdapterUser {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
    image: null
  };
}

async function ensureUserRelations(userId: string) {
  await prisma.$transaction([
    prisma.investorProfile.upsert({
      where: { userId },
      update: {},
      create: { userId }
    }),
    prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId }
    })
  ]);
}

function createQidraAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma) as Adapter;

  return {
    ...baseAdapter,
    async createUser(user: Omit<AdapterUser, "id">) {
      if (!user.email) {
        throw new Error("Social registration requires an email address.");
      }

      const createdUser = await prisma.user.create({
        data: {
          email: user.email.toLowerCase(),
          name: user.name,
          emailVerified: user.emailVerified,
          investorProfile: { create: {} },
          wallet: { create: {} }
        }
      });

      return toAdapterUser(createdUser);
    },
    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          email: user.email?.toLowerCase(),
          name: user.name,
          emailVerified: user.emailVerified
        }
      });

      return toAdapterUser(updatedUser);
    },
    async getUser(id: string) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByEmail(email: string) {
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      return user ? toAdapterUser(user) : null;
    },
    async getUserByAccount(providerAccountId: Pick<AdapterAccount, "provider" | "providerAccountId">) {
      const account = await prisma.account.findUnique({
        where: { provider_providerAccountId: providerAccountId },
        include: { user: true }
      });

      return account?.user ? toAdapterUser(account.user) : null;
    }
  };
}

function isValidTelegramPayload(credentials?: Record<string, unknown>) {
  if (!credentials || !telegramToken) {
    return null;
  }

  const hash = String(credentials.hash ?? "");
  const id = String(credentials.id ?? "");
  const authDate = String(credentials.auth_date ?? "");

  if (!hash || !id || !authDate || !/^[a-f0-9]{64}$/i.test(hash)) {
    return null;
  }

  const allowedKeys = ["auth_date", "first_name", "id", "last_name", "photo_url", "username"];
  const dataCheckString = allowedKeys
    .filter((key) => credentials[key] !== undefined && credentials[key] !== null && String(credentials[key]) !== "")
    .sort()
    .map((key) => `${key}=${String(credentials[key])}`)
    .join("\n");

  const secretKey = createHash("sha256").update(telegramToken).digest();
  const calculatedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const expected = Buffer.from(calculatedHash, "hex");
  const received = Buffer.from(hash, "hex");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  const authTimestamp = Number(authDate);
  const maxAgeSeconds = 60 * 60 * 24;

  if (!Number.isFinite(authTimestamp) || Date.now() / 1000 - authTimestamp > maxAgeSeconds) {
    return null;
  }

  const firstName = String(credentials.first_name ?? "").trim();
  const lastName = String(credentials.last_name ?? "").trim();
  const username = String(credentials.username ?? "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ") || username || `Telegram ${id}`;

  return { id, name };
}

async function authorizeTelegram(credentials?: Record<string, unknown>) {
  const telegramProfile = isValidTelegramPayload(credentials);

  if (!telegramProfile) {
    return null;
  }

  const provider = "telegram";
  const providerAccountId = telegramProfile.id;
  const existingAccount = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId
      }
    },
    include: { user: true }
  });

  if (existingAccount?.user) {
    if (isUserBlocked(existingAccount.user)) {
      return null;
    }

    await ensureUserRelations(existingAccount.user.id);
    return {
      id: existingAccount.user.id,
      email: existingAccount.user.email,
      name: existingAccount.user.name,
      role: existingAccount.user.role
    };
  }

  const email = `telegram-${providerAccountId}@telegram.qidra.local`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: telegramProfile.name,
      emailVerified: new Date()
    },
    create: {
      email,
      name: telegramProfile.name,
      emailVerified: new Date(),
      investorProfile: { create: {} },
      wallet: { create: {} }
    }
  });

  if (isUserBlocked(user)) {
    return null;
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId
      }
    },
    update: { userId: user.id },
    create: {
      userId: user.id,
      type: "oauth",
      provider,
      providerAccountId
    }
  });
  await ensureUserRelations(user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

export const authOptions: NextAuthOptions = {
  adapter: createQidraAdapter(),
  secret: requireAuthSecret(),
  providers: [
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true
          })
        ]
      : []),
    CredentialsProvider({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash || !user.emailVerified || isUserBlocked(user)) {
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    }),
    CredentialsProvider({
      id: "telegram",
      name: "Telegram",
      credentials: {
        auth_date: { label: "auth_date", type: "text" },
        first_name: { label: "first_name", type: "text" },
        hash: { label: "hash", type: "text" },
        id: { label: "id", type: "text" },
        last_name: { label: "last_name", type: "text" },
        photo_url: { label: "photo_url", type: "text" },
        username: { label: "username", type: "text" }
      },
      async authorize(credentials) {
        return authorizeTelegram(credentials);
      }
    })
  ],
  pages: {
    signIn: "/auth/sign-in"
  },
  session: {
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google" && profile && "email_verified" in profile && profile.email_verified === false) {
        return false;
      }

      if (account?.provider === "google" && profile && "email" in profile && typeof profile.email === "string") {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email.toLowerCase() },
          select: {
            blockedAt: true,
            blockedUntil: true
          }
        });

        if (isUserBlocked(existingUser)) {
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user }) {
      const tokenUserId = (user?.id ?? token.id) as string | undefined;

      if (user) {
        token.id = user.id;
      }

      if (tokenUserId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenUserId },
          select: {
            blockReason: true,
            blockedAt: true,
            blockedUntil: true,
            role: true
          }
        });

        token.id = tokenUserId;
        token.role = (user as { role?: string } | undefined)?.role ?? dbUser?.role ?? "INVESTOR";
        token.blocked = !dbUser || isUserBlocked(dbUser);
        token.blockReason = dbUser?.blockReason ?? null;
        token.blockedUntil = dbUser?.blockedUntil?.toISOString() ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as {
          blockReason?: string | null;
          blocked?: boolean;
          blockedUntil?: string | null;
          id?: string;
          role?: string;
        };

        sessionUser.role = token.role as string;
        sessionUser.blocked = Boolean(token.blocked);
        sessionUser.blockReason = (token.blockReason as string | null | undefined) ?? null;
        sessionUser.blockedUntil = (token.blockedUntil as string | null | undefined) ?? null;

        if (token.blocked) {
          delete sessionUser.id;
          return session;
        }

        sessionUser.id = token.id as string;
      }
      return session;
    }
  },
  events: {
    async signIn({ user }) {
      if (user.id) {
        await ensureUserRelations(user.id);
      }
    }
  }
};
