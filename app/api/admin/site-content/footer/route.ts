import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { SITE_CONTENT_KEY, defaultSiteContentSnapshot } from "@/lib/site-content";

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function textRecord(payload: Record<string, unknown>, prefix: string, fallback: { en: string; ru: string }) {
  return {
    ru: readText(payload, `${prefix}Ru`, fallback.ru, 500),
    en: readText(payload, `${prefix}En`, fallback.en, 500)
  };
}

function readText(payload: Record<string, unknown>, key: string, fallback: string, max: number) {
  const value = payload[key];
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Контакты и документы может менять только администратор." : "Only an administrator can update contacts and documents."
      },
      { status: 403 }
    );
  }

  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;

  if (!payload) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет данных" : "Missing data",
        message: localeRu ? "Форма не была отправлена корректно." : "The form was not submitted correctly."
      },
      { status: 400 }
    );
  }

  const defaults = defaultSiteContentSnapshot();
  const footerContent = {
    socialLinks: {
      telegram: readText(payload, "socialTelegram", defaults.footer.socialLinks.telegram, 500),
      instagram: readText(payload, "socialInstagram", defaults.footer.socialLinks.instagram, 500),
      whatsapp: readText(payload, "socialWhatsapp", defaults.footer.socialLinks.whatsapp, 500)
    },
    companyText: readText(payload, "companyText", defaults.footer.companyText, 1000),
    cooperationLabel: textRecord(payload, "cooperationLabel", defaults.footer.cooperationLabel),
    cooperationEmail: readText(payload, "cooperationEmail", defaults.footer.cooperationEmail, 240),
    privacySlug: readText(payload, "privacySlug", defaults.footer.privacySlug, 120),
    projectLinks: defaults.footer.projectLinks.map((item, index) => ({
      href: readText(payload, `projectLink${index}Href`, item.href, 240),
      label: textRecord(payload, `projectLink${index}Label`, item.label)
    })),
    aboutLinks: defaults.footer.aboutLinks.map((item, index) => ({
      href: readText(payload, `aboutLink${index}Href`, item.href, 240),
      label: textRecord(payload, `aboutLink${index}Label`, item.label)
    }))
  };

  await prisma.siteContent.upsert({
    where: { key: SITE_CONTENT_KEY },
    update: { footerContent },
    create: { key: SITE_CONTENT_KEY, footerContent }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "site-content.footer.update",
      entityType: "SiteContent",
      entityId: SITE_CONTENT_KEY
    }
  });

  return NextResponse.json({
    title: localeRu ? "Контакты обновлены" : "Footer updated",
    message: localeRu ? "Футер, ссылки и контактные данные сохранены." : "Footer links and contact details were saved."
  });
}
