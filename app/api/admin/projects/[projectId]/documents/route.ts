import { DocumentKind } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const documentSchema = z.object({
  titleRu: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  kind: z.nativeEnum(DocumentKind).default(DocumentKind.PROJECT),
  fileUrl: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((value) => value.startsWith("/") || /^https?:\/\//.test(value), "url")
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
        message: localeRu ? "Документы проекта может добавлять только администратор." : "Only an administrator can add project documents."
      },
      { status: 403 }
    );
  }

  const { projectId } = await params;
  const parsed = documentSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте документ" : "Check document",
        message:
          localeRu
            ? "Заполните названия и ссылку на файл. Ссылка должна начинаться с /, http:// или https://."
            : "Fill in titles and a file link. The link must start with /, http:// or https://."
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

  const document = await prisma.projectDocument.create({
    data: {
      projectId: project.id,
      titleRu: parsed.data.titleRu,
      titleEn: parsed.data.titleEn,
      kind: parsed.data.kind,
      fileUrl: parsed.data.fileUrl
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "project.document.create",
      entityType: "ProjectDocument",
      entityId: document.id,
      payload: {
        projectId: project.id,
        slug: project.slug,
        kind: document.kind,
        fileUrl: document.fileUrl
      }
    }
  });

  return NextResponse.json({
    title: localeRu ? "Документ добавлен" : "Document added",
    message: localeRu ? "Документ сохранён и будет виден на странице проекта." : "The document was saved and will be visible on the project page."
  });
}
