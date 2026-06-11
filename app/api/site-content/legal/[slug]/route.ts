import path from "node:path";
import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content";
import { readStoredFile } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = new URL(request.url).searchParams.get("lang") === "en" ? "en" : "ru";
  const content = await getSiteContent();
  const page = content.legalPages.find((item) => item.slug === slug);
  const asset = page?.assets?.[locale] ?? page?.assets?.ru ?? page?.assets?.en;

  if (!asset || asset.type !== "stored") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const file = await readStoredFile(asset.storagePath, "site-content/legal");
  const extension = path.extname(asset.fileName).toLowerCase();

  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Cache-Control": "private, max-age=0, must-revalidate",
      "Content-Disposition": `inline; filename="${asset.fileName.replace(/"/g, "")}"`,
      "Content-Type": asset.contentType || mimeTypeFromExtension(extension)
    }
  });
}

function mimeTypeFromExtension(extension: string) {
  if (extension === ".pdf") return "application/pdf";
  if (extension === ".doc") return "application/msword";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}
