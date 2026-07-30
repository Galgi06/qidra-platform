import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessSupportDesk } from "@/lib/auth";
import { readStoredFile } from "@/lib/file-storage";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { readSupportAttachments } from "@/lib/support-attachments";

type SessionUser = {
  user?: {
    role?: string;
  };
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ index: string; messageId: string }> }) {
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const canModerate = canAccessSupportDesk(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined);
  const token = request.nextUrl.searchParams.get("token")?.trim();
  const { index, messageId } = await params;
  const attachmentIndex = Number(index);

  if (!canModerate && !token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!Number.isInteger(attachmentIndex) || attachmentIndex < 0) {
    return NextResponse.json({ message: "Attachment not found" }, { status: 404 });
  }

  const message = await prisma.guestSupportMessage.findUnique({
    where: { id: messageId },
    include: {
      thread: {
        select: {
          publicToken: true
        }
      }
    }
  });

  if (!message) {
    return NextResponse.json({ message: "Message not found" }, { status: 404 });
  }

  if (!canModerate && message.thread.publicToken !== token) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const attachment = readSupportAttachments(message.attachments)[attachmentIndex];

  if (!attachment) {
    return NextResponse.json({ message: "Attachment not found" }, { status: 404 });
  }

  const file = await readStoredFile(attachment.storagePath, "support");

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Disposition": `inline; filename="${encodeURIComponent(path.basename(attachment.name))}"`,
      "Content-Length": String(file.body.byteLength),
      "Content-Type": attachment.type || "application/octet-stream"
    }
  });
}
