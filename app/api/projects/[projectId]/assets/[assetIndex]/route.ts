import { NextResponse, type NextRequest } from "next/server";
import { ProjectStatus } from "@prisma/client";
import { readStoredFile } from "@/lib/file-storage";
import { parseRealEstateData } from "@/lib/real-estate";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ assetIndex: string; projectId: string }> }) {
  const { assetIndex, projectId } = await params;
  const index = Number(assetIndex);

  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      status: { in: [ProjectStatus.ACTIVE, ProjectStatus.FUNDED, ProjectStatus.REVIEW] }
    },
    select: {
      propertyData: true
    }
  });

  const realEstate = parseRealEstateData(project?.propertyData);
  const asset = realEstate?.documents?.[index];

  if (!asset?.href) {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }

  try {
    const file = await readStoredFile(asset.href, "project-submissions");

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(asset.name)}`,
        "Content-Type": asset.type || guessContentType(asset.name)
      }
    });
  } catch {
    return NextResponse.json({ message: "Asset not found" }, { status: 404 });
  }
}

function guessContentType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}
