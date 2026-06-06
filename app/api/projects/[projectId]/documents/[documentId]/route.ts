import { NextResponse, type NextRequest } from "next/server";
import { ProjectStatus } from "@prisma/client";
import { readStoredFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SubmissionDocument = {
  name: string;
  size: number;
  storagePath: string;
  type: string;
};

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ documentId: string; projectId: string }> }) {
  const { documentId, projectId } = await params;
  const sourceIndex = Number(request.nextUrl.searchParams.get("source"));

  if (!Number.isInteger(sourceIndex) || sourceIndex < 0) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      status: { in: [ProjectStatus.ACTIVE, ProjectStatus.FUNDED, ProjectStatus.REVIEW] }
    },
    include: {
      documents: {
        where: { id: documentId },
        take: 1
      },
      projectSubmissions: {
        orderBy: { updatedAt: "desc" },
        select: { documents: true },
        take: 1,
        where: { status: "APPROVED" }
      }
    }
  });

  if (!project?.documents.length || !project.projectSubmissions.length) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  const document = readSubmissionDocuments(project.projectSubmissions[0]?.documents)[sourceIndex];

  if (!document?.storagePath) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(document.storagePath, "project-submissions");

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.name)}`,
        "Content-Type": document.type
      }
    });
  } catch {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }
}
