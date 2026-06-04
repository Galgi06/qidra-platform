import { readFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessAdmin } from "@/lib/auth";
import { isKycDocumentKind, readKycDocuments } from "@/lib/kyc-documents";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SessionUser = {
  user?: {
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ applicationId: string; documentKind: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Документы KYC доступны только администратору." : "KYC documents are only available to an administrator."
      },
      { status: 403 }
    );
  }

  const { applicationId, documentKind } = await params;

  if (!isKycDocumentKind(documentKind)) {
    return NextResponse.json(
      {
        title: localeRu ? "Документ не найден" : "Document not found",
        message: localeRu ? "Выберите документ из карточки анкеты." : "Choose a document from the profile card."
      },
      { status: 404 }
    );
  }

  const application = await prisma.kycApplication.findUnique({
    where: { id: applicationId },
    select: { documents: true }
  });
  const document = readKycDocuments(application?.documents)[documentKind];

  if (!document?.storagePath) {
    return NextResponse.json(
      {
        title: localeRu ? "Файл недоступен" : "File unavailable",
        message: localeRu ? "Этот документ нужно загрузить повторно, потому что он был отправлен до включения хранения." : "This document must be uploaded again because it was submitted before storage was enabled."
      },
      { status: 404 }
    );
  }

  const uploadRoot = path.join(process.cwd(), "storage", "kyc");
  const normalizedStoragePath = document.storagePath.split(/[\\/]+/).join(path.sep);
  const storagePrefix = `storage${path.sep}kyc${path.sep}`;

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
        message: localeRu ? "Файл отсутствует в локальном хранилище. Попросите участника загрузить документ повторно." : "The file is missing from local storage. Ask the participant to upload the document again."
      },
      { status: 404 }
    );
  }
}
