import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { readStoredFile } from "@/lib/file-storage";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SessionUser = { user?: { id?: string } };

export async function GET(_request: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const { documentId } = await params;
  const membership = await prisma.organizationMember.findFirst({ where: { userId } });

  if (!membership) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  const document = await prisma.organizationDocument.findFirst({
    where: {
      id: documentId,
      organizationId: membership.organizationId
    }
  });

  if (!document) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(document.fileUrl, "organizations");

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.title)}`,
        "Content-Type": "application/octet-stream"
      }
    });
  } catch {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }
}
