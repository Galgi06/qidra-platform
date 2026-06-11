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
    ru: readText(payload, `${prefix}Ru`, fallback.ru, 5000),
    en: readText(payload, `${prefix}En`, fallback.en, 5000)
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
        message: localeRu ? "FAQ может обновлять только администратор." : "Only an administrator can update FAQ."
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
  const faqContent = defaults.faqItems.map((item, index) => ({
    question: textRecord(payload, `faq${index}Question`, item.question),
    answer: textRecord(payload, `faq${index}Answer`, item.answer)
  }));

  await prisma.siteContent.upsert({
    where: { key: SITE_CONTENT_KEY },
    update: { faqContent },
    create: { key: SITE_CONTENT_KEY, faqContent }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "site-content.faq.update",
      entityType: "SiteContent",
      entityId: SITE_CONTENT_KEY
    }
  });

  return NextResponse.json({
    title: localeRu ? "FAQ обновлён" : "FAQ updated",
    message: localeRu ? "Вопросы и ответы на публичной странице сохранены." : "Public FAQ questions and answers were saved."
  });
}
