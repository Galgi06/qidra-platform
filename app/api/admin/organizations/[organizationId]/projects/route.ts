import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  projectIds: z.array(z.string().min(1)).min(1).max(20)
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) {
  const localeRu = isRu(request);
  await requireAdmin(localeRu ? "ru" : "en", "/admin/organizations");
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте список проектов" : "Check the project list",
        message: localeRu ? "Нужно передать хотя бы один корректный ID проекта." : "At least one valid project ID is required."
      },
      { status: 400 }
    );
  }

  const { organizationId } = await params;
  const projectIds = [...new Set(parsed.data.projectIds)];

  const [organization, projects, conflictingSubmissions] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, displayName: true, contactEmail: true }
    }),
    prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        slug: true,
        titleRu: true,
        titleEn: true,
        organizationId: true
      }
    }),
    prisma.projectSubmission.findMany({
      where: {
        projectId: { in: projectIds },
        organizationId: { not: null }
      },
      select: {
        id: true,
        projectId: true,
        organizationId: true
      }
    })
  ]);

  if (!organization) {
    return NextResponse.json(
      {
        title: localeRu ? "Компания не найдена" : "Organization not found",
        message: localeRu ? "Обновите страницу и попробуйте ещё раз." : "Refresh the page and try again."
      },
      { status: 404 }
    );
  }

  if (projects.length !== projectIds.length) {
    return NextResponse.json(
      {
        title: localeRu ? "Проекты не найдены" : "Projects not found",
        message: localeRu ? "Часть проектов уже недоступна. Обновите страницу." : "Some projects are no longer available. Refresh the page."
      },
      { status: 404 }
    );
  }

  const conflictingProjects = projects.filter((project) => project.organizationId && project.organizationId !== organizationId);
  const conflictingSubmissionRecords = conflictingSubmissions.filter((submission) => submission.organizationId !== organizationId);

  if (conflictingProjects.length || conflictingSubmissionRecords.length) {
    return NextResponse.json(
      {
        title: localeRu ? "Привязка остановлена" : "Binding stopped",
        message: localeRu
          ? "Часть проектов или связанных листингов уже принадлежит другой компании. Изменение остановлено для защиты данных."
          : "Some projects or linked submissions already belong to another organization. The update was stopped to protect data."
      },
      { status: 409 }
    );
  }

  const updatedSubmissionsWhere = {
    projectId: { in: projectIds },
    OR: [{ organizationId: null }, { organizationId }]
  };

  const projectSnapshots = projects.map((project) => ({
    id: project.id,
    slug: project.slug,
    titleRu: project.titleRu,
    titleEn: project.titleEn,
    fromOrganizationId: project.organizationId,
    toOrganizationId: organizationId
  }));

  const [updatedProjects, updatedSubmissions] = await prisma.$transaction([
    prisma.project.updateMany({
      where: {
        id: { in: projectIds },
        OR: [{ organizationId: null }, { organizationId }]
      },
      data: { organizationId }
    }),
    prisma.projectSubmission.updateMany({
      where: updatedSubmissionsWhere,
      data: { organizationId }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "organization.projects.rebind",
        entityType: "Organization",
        entityId: organizationId,
        payload: {
          organizationDisplayName: organization.displayName,
          organizationContactEmail: organization.contactEmail,
          projects: projectSnapshots
        }
      }
    })
  ]).then(([projectResult, submissionResult]) => [projectResult.count, submissionResult.count] as const);

  return NextResponse.json({
    title: localeRu ? "Проекты привязаны" : "Projects linked",
    message: localeRu
      ? `К компании привязано ${updatedProjects} проектов, синхронизировано ${updatedSubmissions} связанных листингов.`
      : `${updatedProjects} projects linked to the organization, ${updatedSubmissions} linked submissions synchronized.`,
    tone: "success",
    organizationId,
    updatedProjects,
    updatedSubmissions
  });
}
