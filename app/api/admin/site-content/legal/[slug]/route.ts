import { randomUUID } from "node:crypto";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/file-storage";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { SITE_CONTENT_KEY, defaultSiteContentSnapshot, getSiteContent, type LegalPageContent } from "@/lib/site-content";

export const runtime = "nodejs";

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

const allowedMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function readText(formData: FormData, key: string, fallback: string, max: number) {
  const value = formData.get(key);
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : fallback;
}

function readFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
  const extension = parsed.ext.toLowerCase();
  return `${base}${extension}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Юридические документы может обновлять только администратор." : "Only an administrator can update legal documents."
      },
      { status: 403 }
    );
  }

  const { slug } = await params;
  const siteContent = await getSiteContent();
  const page = siteContent.legalPages.find((item) => item.slug === slug);

  if (!page) {
    return NextResponse.json(
      {
        title: localeRu ? "Раздел не найден" : "Section not found",
        message: localeRu ? "Обновите страницу и попробуйте снова." : "Refresh the page and try again."
      },
      { status: 404 }
    );
  }

  const formData = await request.formData();
  const defaults = defaultSiteContentSnapshot();
  const fallback = defaults.legalPages.find((item) => item.slug === slug) ?? page;
  const fileRu = readFile(formData, "fileRu");
  const fileEn = readFile(formData, "fileEn");
  const assets: NonNullable<LegalPageContent["assets"]> = {
    ru: page.assets?.ru ?? fallback.assets?.ru,
    en: page.assets?.en ?? fallback.assets?.en
  };

  for (const [localeKey, file] of [
    ["ru", fileRu],
    ["en", fileEn]
  ] as const) {
    if (!file) continue;

    const extension = path.extname(file.name).toLowerCase();
    const allowedExtension = extension === ".pdf" || extension === ".doc" || extension === ".docx";
    const allowedType = file.type ? allowedMimeTypes.has(file.type) : false;

    if (!allowedExtension && !allowedType) {
      return NextResponse.json(
        {
          title: localeRu ? "Неверный файл" : "Invalid file",
          message: localeRu ? "Загрузите PDF, DOC или DOCX." : "Upload a PDF, DOC or DOCX file."
        },
        { status: 400 }
      );
    }

    const storedName = `${Date.now()}-${randomUUID()}-${sanitizeFileName(file.name)}`;
    const storagePath = await saveUploadedFile({
      contentType: file.type || "application/octet-stream",
      directory: "site-content/legal",
      file,
      storedName
    });

    assets[localeKey] = {
      type: "stored",
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      storagePath
    };
  }

  const nextPage: LegalPageContent = {
    slug,
    title: {
      ru: readText(formData, "titleRu", page.title.ru, 240),
      en: readText(formData, "titleEn", page.title.en, 240)
    },
    body: {
      ru: readText(formData, "bodyRu", page.body.ru, 5000),
      en: readText(formData, "bodyEn", page.body.en, 5000)
    },
    ...(assets ? { assets } : {})
  };

  const legalContent = siteContent.legalPages.map((item) => (item.slug === slug ? nextPage : item));

  await prisma.siteContent.upsert({
    where: { key: SITE_CONTENT_KEY },
    update: { legalContent },
    create: { key: SITE_CONTENT_KEY, legalContent }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "site-content.legal.update",
      entityType: "SiteContent",
      entityId: SITE_CONTENT_KEY,
      payload: {
        slug,
        hasFileEn: Boolean(fileEn),
        hasFileRu: Boolean(fileRu)
      }
    }
  });

  return NextResponse.json({
    title: localeRu ? "Документ обновлён" : "Document updated",
    message: localeRu ? "Юридический раздел и файл сохранены." : "The legal page and file were saved."
  });
}
