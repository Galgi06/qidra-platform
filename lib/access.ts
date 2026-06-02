import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";

type SessionWithRole = Awaited<ReturnType<typeof getServerSession>> & {
  user?: {
    id?: string;
    role?: string;
    email?: string | null;
    name?: string | null;
  };
};

function signInUrl(locale: Locale, nextPath: string) {
  return `${withLocale("/auth/sign-in", locale)}&next=${encodeURIComponent(nextPath)}`;
}

export async function requireAuth(locale: Locale, nextPath: string) {
  const session = (await getServerSession(authOptions)) as SessionWithRole;

  if (!session?.user?.id) {
    redirect(signInUrl(locale, nextPath));
  }

  return session;
}

export async function requireAdmin(locale: Locale, nextPath: string) {
  const session = await requireAuth(locale, nextPath);

  if (!canAccessAdmin(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "guest" | undefined)) {
    redirect(withLocale("/investor", locale));
  }

  return session;
}
