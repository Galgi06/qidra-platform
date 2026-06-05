import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SessionUser = {
  user?: {
    role?: string;
  };
};

type SubmissionDocument = {
  name: string;
  size: number;
  storagePath: string;
  type: string;
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function readSubmissionDocuments(value: unknown): SubmissionDocument[] {
  if (!value || typeof value !== "object" || !("files" in value)) return [];
  const files = (value as { files?: unknown }).files;
  return Array.isArray(files) ? files.filter(isSubmissionDocument) : [];
}

function isSubmissionDocument(value: unknown): value is SubmissionDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<SubmissionDocument>;
  return typeof document.name === "string" && typeof document.storagePath === "string" && typeof document.size === "number" && typeof document.type === "string";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ submissionId: string; index: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Документы проекта доступны только администратору." : "Project documents are only available to an administrator."
      },
      { status: 403 }
    );
  }

  const { submissionId, index } = await params;
  const documentIndex = Number(index);

  if (!Number.isInteger(documentIndex) || documentIndex < 0) {
    return NextResponse.json(
      {
        title: localeRu ? "Документ не найден" : "Document not found",
        message: localeRu ? "Выберите документ из заявки проекта." : "Choose a document from the project submission."
      },
      { status: 404 }
    );
  }

  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    select: { documents: true }
  });
  const document = readSubmissionDocuments(submission?.documents)[documentIndex];

  if (!document?.storagePath) {
    return NextResponse.json(
      {
        title: localeRu ? "Файл недоступен" : "File unavailable",
        message: localeRu ? "Документ отсутствует в заявке." : "The document is missing from this submission."
      },
      { status: 404 }
    );
  }

  const uploadRoot = path.join(process.cwd(), "storage", "project-submissions");
  const normalizedStoragePath = document.storagePath.split(/[\\/]+/).join(path.sep);
  const storagePrefix = `storage${path.sep}project-submissions${path.sep}`;

  if (!normalizedStoragePath.startsWith(storagePrefix)) {
    return NextResponse.json(
      {
        title: localeRu ? "Файл недоступен" : "File unavailable",
        message: localeRu ? "Путь к документу не прошёл проверку безопасности." : "The document path failed the security check."
      },
      { status: 404 }
    );
  }

  const relativeFilePath = normalizedStoragePath.slice(storagePrefix.length);
  const filePath = path.resolve(uploadRoot, relativeFilePath);

  if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
    return NextResponse.json(
      {
        title: localeRu ? "Файл недоступен" : "File unavailable",
        message: localeRu ? "Путь к документу не прошёл проверку безопасности." : "The document path failed the security check."
      },
      { status: 404 }
    );
  }

  try {
    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        "Content-Type": document.type
      }
    });
  } catch {
    return NextResponse.json(
      {
        title: localeRu ? "Файл не найден" : "File not found",
        message: localeRu ? "Файл отсутствует в локальном хранилище." : "The file is missing from local storage."
      },
      { status: 404 }
    );
  }
}
