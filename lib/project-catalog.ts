import { Prisma, ProjectStatus, type Project as DbProject, type ProjectDocument } from "@prisma/client";
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
  location: string;
  riskLevel: string;
  slug: string;
  status: BadgeStatus;
  structure: string;
  summary: Record<Locale, string>;
  targetUsdt: number;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
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

export function mapProject(project: DbProject & { documents?: ProjectDocument[] }): CatalogProject {
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
    status: dbStatusToBadge(project.status),
    targetUsdt: Number(project.targetUsdt.toString()),
    fundedUsdt: Number(project.fundedUsdt.toString()),
    location: project.location ?? "UAE",
    structure: project.structure,
    riskLevel: project.riskLevel ?? "Moderate",
    documents:
      project.documents?.map((document) => ({
        title: { ru: document.titleRu, en: document.titleEn },
        href: document.fileUrl,
        kind: document.kind.toLowerCase()
      })) ?? []
  };
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
    status: project.status,
    targetUsdt: project.targetUsdt,
    fundedUsdt: project.fundedUsdt,
    location: project.location,
    structure: project.structure,
    riskLevel: project.riskLevel,
    documents: project.documents
  };
}

function defaultExpectedReturn(locale: Locale) {
  return locale === "ru" ? "Зависит от фактических итогов проекта" : "Depends on actual project results";
}

function defaultExpectedYield(locale: Locale) {
  return locale === "ru" ? "Ориентир не указан; фиксированная доходность не обещается" : "Not specified; fixed returns are not promised";
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
    include: { documents: true },
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
      include: { documents: true },
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
      include: { documents: true }
    });

    return project ? mapProject(project) : fallbackProjectBySlug(slug);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return fallbackProjectBySlug(slug);
    }

    throw error;
  }
}
