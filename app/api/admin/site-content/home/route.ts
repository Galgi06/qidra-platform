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
        message: localeRu ? "Раздел сайта может обновлять только администратор." : "Only an administrator can update site sections."
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

  const homeContent = {
    hero: {
      ...defaults.home.hero,
      kicker: textRecord(payload, "heroKicker", defaults.home.hero.kicker),
      title: textRecord(payload, "heroTitle", defaults.home.hero.title),
      subtitle: textRecord(payload, "heroSubtitle", defaults.home.hero.subtitle),
      ctaLabel: textRecord(payload, "heroCtaLabel", defaults.home.hero.ctaLabel)
    },
    intro: {
      ...defaults.home.intro,
      title: textRecord(payload, "introTitle", defaults.home.intro.title),
      subtitle: textRecord(payload, "introSubtitle", defaults.home.intro.subtitle),
      process: {
        ...defaults.home.intro.process,
        kicker: textRecord(payload, "processKicker", defaults.home.intro.process.kicker),
        title: textRecord(payload, "processTitle", defaults.home.intro.process.title)
      },
      featurePanels: defaults.home.intro.featurePanels.map((item, index) => ({
        title: textRecord(payload, `introFeature${index}Title`, item.title),
        text: textRecord(payload, `introFeature${index}Text`, item.text)
      }))
    },
    safety: {
      ...defaults.home.safety,
      title: textRecord(payload, "safetyTitle", defaults.home.safety.title),
      subtitle: textRecord(payload, "safetySubtitle", defaults.home.safety.subtitle),
      panels: defaults.home.safety.panels.map((item, index) => ({
        title: textRecord(payload, `safetyPanel${index}Title`, item.title),
        text: textRecord(payload, `safetyPanel${index}Text`, item.text)
      })),
      principles: defaults.home.safety.principles.map((item, index) => ({
        title: textRecord(payload, `safetyPrinciple${index}Title`, item.title),
        text: textRecord(payload, `safetyPrinciple${index}Text`, item.text)
      }))
    },
    openProjects: {
      ...defaults.home.openProjects,
      title: textRecord(payload, "openProjectsTitle", defaults.home.openProjects.title),
      subtitle: textRecord(payload, "openProjectsSubtitle", defaults.home.openProjects.subtitle),
      buttonLabels: {
        catalog: textRecord(payload, "openProjectsCatalogLabel", defaults.home.openProjects.buttonLabels.catalog),
        listProject: textRecord(payload, "openProjectsListLabel", defaults.home.openProjects.buttonLabels.listProject)
      },
      sectors: defaults.home.openProjects.sectors.map((item, index) => ({
        href: readText(payload, `sector${index}Href`, item.href, 240),
        title: textRecord(payload, `sector${index}Title`, item.title),
        text: textRecord(payload, `sector${index}Text`, item.text)
      }))
    },
    business: {
      ...defaults.home.business,
      title: textRecord(payload, "businessTitle", defaults.home.business.title),
      steps: defaults.home.business.steps.map((step, index) => ({
        title: textRecord(payload, `businessStep${index}Title`, step.title),
        actionLabel: step.actionLabel ? textRecord(payload, `businessStep${index}Action`, step.actionLabel) : undefined,
        items: step.items.map((item, itemIndex) => textRecord(payload, `businessStep${index}Item${itemIndex}`, item))
      }))
    },
    finalCta: {
      title: textRecord(payload, "finalCtaTitle", defaults.home.finalCta.title),
      text: textRecord(payload, "finalCtaText", defaults.home.finalCta.text),
      buttonLabel: textRecord(payload, "finalCtaButtonLabel", defaults.home.finalCta.buttonLabel)
    }
  };

  await prisma.siteContent.upsert({
    where: { key: SITE_CONTENT_KEY },
    update: { homeContent },
    create: { key: SITE_CONTENT_KEY, homeContent }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "site-content.home.update",
      entityType: "SiteContent",
      entityId: SITE_CONTENT_KEY
    }
  });

  return NextResponse.json({
    title: localeRu ? "Главная страница обновлена" : "Home page updated",
    message: localeRu ? "Публичные блоки главной страницы сохранены." : "Public home-page sections were saved."
  });
}
