import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { readStoredFile } from "@/lib/file-storage";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type SessionUser = {
  user?: {
    id?: string;
    role?: Role;
  };
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ projectId: string; reportId: string }> }) {
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId) {
    return NextResponse.json({ message: "Sign in required" }, { status: 401 });
  }

  const { projectId, reportId } = await params;
  const report = await prisma.projectReport.findFirst({
    where: {
      id: reportId,
      projectId
    },
    include: {
      project: {
        select: {
          organizationId: true
        }
      }
    }
  });

  if (!report) {
    return NextResponse.json({ message: "Report not found" }, { status: 404 });
  }

  const isStaff = role === Role.ADMIN || role === Role.SUPER_ADMIN || role === Role.TECH_SUPPORT || role === Role.SALES_MANAGER;
  const [membership, application] = await Promise.all([
    isStaff
      ? Promise.resolve(true)
      : prisma.organizationMember.findFirst({
          where: {
            userId,
            organizationId: report.project.organizationId ?? "__missing__"
          },
          select: { id: true }
        }),
    isStaff
      ? Promise.resolve(true)
      : prisma.investmentApplication.findFirst({
          where: {
            projectId,
            userId
          },
          select: { id: true }
        })
  ]);

  if (!isStaff && !membership && !application) {
    return NextResponse.json({ message: "Report not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(report.fileUrl, "project-reports");

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(report.titleEn)}`,
        "Content-Type": "application/octet-stream"
      }
    });
  } catch {
    return NextResponse.json({ message: "Report not found" }, { status: 404 });
  }
}
