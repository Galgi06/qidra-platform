import { createHash } from "crypto";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { User as PrismaUser } from "@prisma/client";
import type { NextAuthOptions } from "next-auth";
import type { Adapter, AdapterAccount, AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { isSocialProviderConfigured } from "@/lib/social-auth";
import { isUserBlocked } from "@/lib/user-access";
import { normalizeAuthEmail } from "@/lib/auth-email.js";

const googleEnabled = isSocialProviderConfigured(process.env.GOOGLE_CLIENT_ID) && isSocialProviderConfigured(process.env.GOOGLE_CLIENT_SECRET);
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

function requireAuthSecret() {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const placeholder = !secret || secret.toLowerCase().includes("replace-with") || secret.length < 32;

  if (process.env.NODE_ENV === "production" && !isProductionBuild && placeholder) {
    throw new Error("Set NEXTAUTH_SECRET to a secure random value with at least 32 characters before production launch.");
  }

  return secret;
}

function passwordHashFingerprint(passwordHash?: string | null) {
  if (!passwordHash) {
    return null;
  }

  return createHash("sha256").update(passwordHash).digest("hex");
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
          email: normalizeAuthEmail(user.email),
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
          email: user.email ? normalizeAuthEmail(user.email) : undefined,
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
      const normalizedEmail = normalizeAuthEmail(email);
      if (!normalizedEmail) return null;
      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
        const email = credentials?.email ? normalizeAuthEmail(credentials.email) : "";
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.passwordHash || !user.emailVerified || isUserBlocked(user)) {
          return null;
        }

        const passwordValid = await verifyPassword(password, user.passwordHash);

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
          where: { email: normalizeAuthEmail(profile.email) },
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
      let tokenUserId = (user?.id ?? token.id) as string | undefined;
      const fallbackEmailValue = typeof user?.email === "string" ? user.email : typeof token.email === "string" ? token.email : undefined;
      const fallbackEmail = fallbackEmailValue ? normalizeAuthEmail(fallbackEmailValue) : undefined;

      if (user) {
        token.id = user.id;
      }

      if (tokenUserId) {
        let dbUser = await prisma.user.findUnique({
          where: { id: tokenUserId },
          select: {
            id: true,
            blockReason: true,
            blockedAt: true,
            blockedUntil: true,
            passwordHash: true,
            role: true
          }
        });

        if (!dbUser && fallbackEmail) {
          dbUser = await prisma.user.findUnique({
            where: { email: fallbackEmail },
            select: {
              id: true,
              blockReason: true,
              blockedAt: true,
              blockedUntil: true,
              passwordHash: true,
              role: true
            }
          });

          if (dbUser) {
            tokenUserId = dbUser.id;
          }
        }

        const currentPasswordFingerprint = passwordHashFingerprint(dbUser?.passwordHash);
        const previousPasswordFingerprint = typeof token.passwordHashFingerprint === "string" ? token.passwordHashFingerprint : null;
        const passwordChanged =
          previousPasswordFingerprint !== null && previousPasswordFingerprint !== currentPasswordFingerprint;

        token.id = tokenUserId;
        token.role = (user as { role?: string } | undefined)?.role ?? dbUser?.role ?? "INVESTOR";
        token.blocked = !dbUser || isUserBlocked(dbUser);
        token.blockReason = dbUser?.blockReason ?? null;
        token.blockedUntil = dbUser?.blockedUntil?.toISOString() ?? null;
        token.invalidated = Boolean(passwordChanged);
        token.passwordHashFingerprint = currentPasswordFingerprint;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.invalidated) {
        const invalidatedSession = session as typeof session & { user?: undefined };
        invalidatedSession.user = undefined;
        invalidatedSession.expires = new Date(0).toISOString();
        return invalidatedSession;
      }

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
