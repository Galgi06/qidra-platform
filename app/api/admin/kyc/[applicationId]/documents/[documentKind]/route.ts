import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessSupportDesk } from "@/lib/auth";
import { readStoredFile } from "@/lib/file-storage";
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

  if (!canAccessSupportDesk(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Документы KYC доступны только авторизованной команде Qidra." : "KYC documents are only available to the authorized Qidra team."
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

  try {
    const file = await readStoredFile(document.storagePath, "kyc");

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        "Content-Type": document.type
      }
    });
  } catch (error) {
    const invalidPath = error instanceof Error && error.message === "invalid_storage_path";

    return NextResponse.json(
      {
        title: invalidPath ? (localeRu ? "Файл недоступен" : "File unavailable") : localeRu ? "Файл не найден" : "File not found",
        message: invalidPath
          ? localeRu
            ? "Путь к документу не прошёл проверку безопасности."
            : "The document path failed the security check."
          : localeRu
            ? "Файл отсутствует в хранилище. Попросите участника загрузить документ повторно."
            : "The file is missing from storage. Ask the participant to upload the document again."
      },
      { status: 404 }
    );
  }
}
