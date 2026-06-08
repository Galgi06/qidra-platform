import { PayoutFrequency, Prisma, ProjectStatus, type Project as DbProject, type ProjectDocument } from "@prisma/client";
import type { BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { projects as baseProjects, type Project as ContentProject } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export type CatalogProject = {
  documents: { title: Record<Locale, string>; href: string; kind: string }[];
  expectedReturn: Record<Locale, string>;
  expectedYield: Record<Locale, string>;
  fundedUsdt: number;
  id: string;
  lifecycle: {
    currentProgress: Record<Locale, string>;
    fundraisingEndAt: string | null;
    fundraisingStartAt: string | null;
    participationTerm: Record<Locale, string>;
    plannedDividendAt: string | null;
    plannedLaunchAt: string | null;
    payoutFrequency: Record<Locale, string>;
    raisePlan: Record<Locale, string>;
    stage: Record<Locale, string>;
  };
  location: string;
  riskLevel: string;
  slug: string;
  status: BadgeStatus;
  structure: string;
  summary: Record<Locale, string>;
  targetUsdt: number;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  initiator: {
    city: string | null;
    country: string | null;
    id: string;
    name: string | null;
  } | null;
};

export function projectStatusToDb(status: ContentProject["status"]) {
  if (status === "active") return ProjectStatus.ACTIVE;
  if (status === "funded") return ProjectStatus.FUNDED;
  return ProjectStatus.REVIEW;
}

export function dbStatusToBadge(status: ProjectStatus): BadgeStatus {
  if (status === ProjectStatus.ACTIVE) return "active";
  if (status === ProjectStatus.FUNDED) return "funded";
  if (status === ProjectStatus.PAUSED) return "paused";
  if (status === ProjectStatus.CLOSED) return "closed";
  if (status === ProjectStatus.DRAFT) return "draft";
  return "review";
}

export function contentProjectPayload(project: ContentProject) {
  return {
    titleRu: project.title.ru,
    titleEn: project.title.en,
    summaryRu: project.summary.ru,
    summaryEn: project.summary.en,
    descriptionRu: project.description.ru,
    descriptionEn: project.description.en,
    expectedReturnRu: defaultExpectedReturn("ru"),
    expectedReturnEn: defaultExpectedReturn("en"),
    expectedYieldRu: defaultExpectedYield("ru"),
    expectedYieldEn: defaultExpectedYield("en"),
    status: projectStatusToDb(project.status),
    targetUsdt: project.targetUsdt,
    fundedUsdt: project.fundedUsdt,
    location: project.location,
    structure: project.structure,
    riskLevel: project.riskLevel
  };
}

export async function ensureBaseProjects() {
  for (const project of baseProjects) {
    const existing = await prisma.project.findUnique({
      where: { slug: project.slug },
      include: { documents: true }
    });

    if (!existing) {
      const created = await prisma.project.create({
        data: {
          slug: project.slug,
          ...contentProjectPayload(project)
        }
      });

      await createBaseDocuments(created.id, project);
      continue;
    }

    await prisma.project.update({
      where: { id: existing.id },
      data: {
        summaryRu: project.summary.ru,
        summaryEn: project.summary.en,
        descriptionRu: project.description.ru,
        descriptionEn: project.description.en
      }
    });

    if (!existing.documents.length) {
      await createBaseDocuments(existing.id, project);
    }
  }
}

async function createBaseDocuments(projectId: string, project: ContentProject) {
  if (!project.documents.length) return;

  await prisma.projectDocument.createMany({
    data: project.documents.map((document) => ({
      projectId,
      titleRu: document.title.ru,
      titleEn: document.title.en,
      kind: document.kind.toUpperCase() === "COMPLIANCE" ? "COMPLIANCE" : "PROJECT",
      fileUrl: document.href
    }))
  });
}

type ProjectWithPublicRelations = DbProject & {
  documents?: ProjectDocument[];
  projectSubmissions?: {
    status?: string;
    user?: {
      id: string;
      name: string | null;
      investorProfile?: {
        city: string | null;
        country: string | null;
      } | null;
    } | null;
  }[];
};

export function mapProject(project: ProjectWithPublicRelations): CatalogProject {
  const fundedUsdt = Number(project.fundedUsdt.toString());
  const targetUsdt = Number(project.targetUsdt.toString());
  const effectiveStatus = project.status === ProjectStatus.ACTIVE && fundedUsdt >= targetUsdt ? ProjectStatus.FUNDED : project.status;
  const initiatorSubmission = project.projectSubmissions?.find((submission) => submission.status === "APPROVED" && submission.user);
  const initiator = initiatorSubmission?.user
    ? {
        id: initiatorSubmission.user.id,
        name: initiatorSubmission.user.name,
        country: initiatorSubmission.user.investorProfile?.country ?? null,
        city: initiatorSubmission.user.investorProfile?.city ?? null
      }
    : null;

  return {
    id: project.id,
    slug: project.slug,
    title: { ru: project.titleRu, en: project.titleEn },
    summary: { ru: project.summaryRu, en: project.summaryEn },
    description: { ru: project.descriptionRu, en: project.descriptionEn },
    expectedReturn: {
      ru: project.expectedReturnRu || defaultExpectedReturn("ru"),
      en: project.expectedReturnEn || defaultExpectedReturn("en")
    },
    expectedYield: {
      ru: project.expectedYieldRu || defaultExpectedYield("ru"),
      en: project.expectedYieldEn || defaultExpectedYield("en")
    },
    lifecycle: {
      stage: {
        ru: project.stageRu || defaultStage("ru"),
        en: project.stageEn || defaultStage("en")
      },
      currentProgress: {
        ru: project.currentProgressRu || defaultCurrentProgress("ru"),
        en: project.currentProgressEn || defaultCurrentProgress("en")
      },
      fundraisingStartAt: project.fundraisingStartAt ? project.fundraisingStartAt.toISOString() : null,
      fundraisingEndAt: project.fundraisingEndAt ? project.fundraisingEndAt.toISOString() : null,
      plannedLaunchAt: project.plannedLaunchAt ? project.plannedLaunchAt.toISOString() : null,
      plannedDividendAt: project.plannedDividendAt ? project.plannedDividendAt.toISOString() : null,
      payoutFrequency: payoutFrequencyLabel(project.payoutFrequency),
      participationTerm: {
        ru: project.participationTermRu || defaultParticipationTerm("ru"),
        en: project.participationTermEn || defaultParticipationTerm("en")
      },
      raisePlan: {
        ru: project.raisePlanRu || defaultRaisePlan("ru"),
        en: project.raisePlanEn || defaultRaisePlan("en")
      }
    },
    status: dbStatusToBadge(effectiveStatus),
    targetUsdt,
    fundedUsdt,
    location: project.location ?? "UAE",
    structure: project.structure,
    riskLevel: project.riskLevel ?? "Moderate",
    initiator,
    documents:
      project.documents?.map((document) => ({
        title: { ru: document.titleRu, en: document.titleEn },
        href: document.fileUrl,
        kind: document.kind.toLowerCase()
      })) ?? []
  };
}

export function acceptsApplications(project: CatalogProject) {
  return project.status === "active" && project.fundedUsdt < project.targetUsdt;
}

function mapContentProject(project: ContentProject): CatalogProject {
  return {
    id: project.slug,
    slug: project.slug,
    title: project.title,
    summary: project.summary,
    description: project.description,
    expectedReturn: {
      ru: defaultExpectedReturn("ru"),
      en: defaultExpectedReturn("en")
    },
    expectedYield: {
      ru: defaultExpectedYield("ru"),
      en: defaultExpectedYield("en")
    },
    lifecycle: {
      stage: {
        ru: defaultStage("ru"),
        en: defaultStage("en")
      },
      currentProgress: {
        ru: defaultCurrentProgress("ru"),
        en: defaultCurrentProgress("en")
      },
      fundraisingStartAt: null,
      fundraisingEndAt: null,
      plannedLaunchAt: null,
      plannedDividendAt: null,
      payoutFrequency: payoutFrequencyLabel(PayoutFrequency.CUSTOM),
      participationTerm: {
        ru: defaultParticipationTerm("ru"),
        en: defaultParticipationTerm("en")
      },
      raisePlan: {
        ru: defaultRaisePlan("ru"),
        en: defaultRaisePlan("en")
      }
    },
    status: project.status,
    targetUsdt: project.targetUsdt,
    fundedUsdt: project.fundedUsdt,
    location: project.location,
    structure: project.structure,
    riskLevel: project.riskLevel,
    documents: project.documents,
    initiator: null
  };
}

function defaultExpectedReturn(locale: Locale) {
  return locale === "ru" ? "Зависит от фактических итогов проекта" : "Depends on actual project results";
}

function defaultExpectedYield(locale: Locale) {
  return locale === "ru" ? "Ориентир не указан; фиксированная доходность не обещается" : "Not specified; fixed returns are not promised";
}

function defaultStage(locale: Locale) {
  return locale === "ru" ? "Стадия уточняется после проверки проекта" : "Stage will be clarified after project review";
}

function defaultCurrentProgress(locale: Locale) {
  return locale === "ru" ? "Текущий прогресс раскрывается в документах проекта и обновлениях команды." : "Current progress is disclosed in project documents and team updates.";
}

function defaultParticipationTerm(locale: Locale) {
  return locale === "ru" ? "По условиям проекта" : "Per project terms";
}

function defaultRaisePlan(locale: Locale) {
  return locale === "ru" ? "Сбор открыт в пределах цели проекта; при достижении цели новые заявки автоматически закрываются." : "The raise is open within the project target; once the target is reached, new applications close automatically.";
}

export function payoutFrequencyLabel(frequency?: PayoutFrequency | string | null): Record<Locale, string> {
  if (frequency === PayoutFrequency.MONTHLY || frequency === "MONTHLY") {
    return { ru: "Ежемесячно", en: "Monthly" };
  }

  if (frequency === PayoutFrequency.QUARTERLY || frequency === "QUARTERLY") {
    return { ru: "Ежеквартально", en: "Quarterly" };
  }

  if (frequency === PayoutFrequency.ANNUAL || frequency === "ANNUAL") {
    return { ru: "Ежегодно", en: "Annual" };
  }

  return { ru: "Индивидуальный график по условиям проекта", en: "Custom schedule under project terms" };
}

function fallbackProjectBySlug(slug: string) {
  const project = baseProjects.find((item) => item.slug === slug);
  return project ? mapContentProject(project) : null;
}

function isDatabaseUnavailable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1001")
  );
}

export async function getAdminProjects() {
  await ensureBaseProjects();

  const projects = await prisma.project.findMany({
    include: { documents: true, projectSubmissions: publicInitiatorInclude() },
    orderBy: { createdAt: "desc" }
  });

  return projects.map(mapProject);
}

export async function getPublicProjects() {
  try {
    await ensureBaseProjects();

    const projects = await prisma.project.findMany({
      where: {
        status: { in: [ProjectStatus.ACTIVE, ProjectStatus.FUNDED] },
        documents: { some: {} }
      },
      include: { documents: true, projectSubmissions: publicInitiatorInclude() },
      orderBy: { createdAt: "desc" }
    });

    return projects.map(mapProject);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return baseProjects.map(mapContentProject);
    }

    throw error;
  }
}

export async function getProjectBySlug(slug: string) {
  try {
    await ensureBaseProjects();

    const project = await prisma.project.findUnique({
      where: { slug },
      include: { documents: true, projectSubmissions: publicInitiatorInclude() }
    });

    return project ? mapProject(project) : fallbackProjectBySlug(slug);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return fallbackProjectBySlug(slug);
    }

    throw error;
  }
}

function publicInitiatorInclude() {
  return {
    where: { status: "APPROVED" as const },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          investorProfile: {
            select: {
              city: true,
              country: true
            }
          }
        }
      }
    },
    take: 1
  };
}
