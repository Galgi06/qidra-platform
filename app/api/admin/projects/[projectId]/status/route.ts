import { ProjectStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const statusSchema = z.object({
  status: z.nativeEnum(ProjectStatus)
});

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Статус проекта может менять только администратор." : "Only an administrator can change a project status."
      },
      { status: 403 }
    );
  }

  const { projectId } = await params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте статус" : "Check status",
        message: localeRu ? "Выберите корректный статус проекта." : "Choose a valid project status."
      },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return NextResponse.json(
      {
        title: localeRu ? "Проект не найден" : "Project not found",
        message: localeRu ? "Обновите страницу и выберите проект из списка." : "Refresh the page and choose a project from the list."
      },
      { status: 404 }
    );
  }

  await prisma.$transaction([
    prisma.project.update({
      where: { id: project.id },
      data: { status: parsed.data.status }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "project.status.update",
        entityType: "Project",
        entityId: project.id,
        payload: {
          from: project.status,
          to: parsed.data.status,
          slug: project.slug
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Статус проекта обновлён" : "Project status updated",
    message:
      localeRu
        ? "Изменение сохранено. Публичный каталог обновится после перезагрузки страницы."
        : "The change was saved. The public catalog will update after the page refreshes."
  });
}
