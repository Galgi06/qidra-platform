import { DocumentKind, OrganizationMemberRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { saveOrganizationFile } from "@/lib/company-workspace";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  kind: z.nativeEnum(DocumentKind),
  note: z.string().trim().max(1000).optional(),
  title: z.string().trim().min(2).max(180)
});

type SessionUser = { user?: { id?: string } };

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function canUpload(role: OrganizationMemberRole) {
  return role === OrganizationMemberRole.OWNER || role === OrganizationMemberRole.ADMIN || role === OrganizationMemberRole.EDITOR;
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ title: localeRu ? "Нужен вход" : "Sign in required", message: localeRu ? "Войдите в кабинет компании." : "Sign in to the company workspace." }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true }
  });

  if (!membership || !canUpload(membership.role)) {
    return NextResponse.json({ title: localeRu ? "Нет доступа" : "Access denied", message: localeRu ? "Недостаточно прав для загрузки документов компании." : "You do not have permission to upload company documents." }, { status: 403 });
  }

  const formData = await request.formData();
  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    note: formData.get("note"),
    title: formData.get("title")
  });
  const file = formData.get("file");

  if (!parsed.success || !(file instanceof File) || !file.size) {
    return NextResponse.json({ title: localeRu ? "Проверьте форму" : "Check the form", message: localeRu ? "Укажите название, тип и файл документа." : "Provide the document title, type, and file." }, { status: 400 });
  }

  const stored = await saveOrganizationFile(file, membership.organizationId);

  await prisma.organizationDocument.create({
    data: {
      fileUrl: stored.storagePath,
      kind: parsed.data.kind,
      note: parsed.data.note?.trim() || null,
      organizationId: membership.organizationId,
      title: parsed.data.title
    }
  });

  return NextResponse.json({
    title: localeRu ? "Документ загружен" : "Document uploaded",
    message: localeRu ? "Файл сохранён в кабинете компании." : "The file was saved in the company workspace."
  });
}
