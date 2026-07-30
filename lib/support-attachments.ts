import { randomUUID } from "node:crypto";
import path from "node:path";
import { saveUploadedFile } from "@/lib/file-storage";

export type SupportAttachmentMeta = {
  name: string;
  size: number;
  storagePath: string;
  type: string;
};

const maxSupportAttachmentSize = 12 * 1024 * 1024;
const maxSupportAttachmentCount = 5;
const allowedSupportMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain"
]);
const allowedSupportExtensions = new Set([".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".webp", ".txt"]);

export function readSupportAttachments(value: unknown): SupportAttachmentMeta[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const storagePath = typeof record.storagePath === "string" ? record.storagePath.trim() : "";
    const type = typeof record.type === "string" ? record.type.trim() : "";
    const size = typeof record.size === "number" && Number.isFinite(record.size) ? record.size : null;

    if (!name || !storagePath || !type || size === null) return [];

    return [{ name, size, storagePath, type }];
  });
}

export function supportAttachmentConstraints() {
  return {
    maxCount: maxSupportAttachmentCount,
    maxSize: maxSupportAttachmentSize
  };
}

export function validateSupportAttachment(file: File) {
  if (file.size > maxSupportAttachmentSize) return "size";

  const extension = path.extname(file.name).toLowerCase();
  const acceptedByType = file.type ? allowedSupportMimeTypes.has(file.type) : false;
  const acceptedByExtension = allowedSupportExtensions.has(extension);

  if (!acceptedByType && !acceptedByExtension) return "type";

  return null;
}

export async function saveSupportAttachment(file: File, directoryId: string): Promise<SupportAttachmentMeta> {
  const safeName = sanitizeFileName(file.name);
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const type = file.type || contentTypeFromName(file.name);
  const storagePath = await saveUploadedFile({
    contentType: type,
    directory: `support/${directoryId}`,
    file,
    storedName
  });

  return {
    name: file.name,
    size: file.size,
    storagePath,
    type
  };
}

function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "attachment";
  const extension = parsed.ext.toLowerCase();

  return `${base}${extension}`;
}

function contentTypeFromName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".pdf") return "application/pdf";
  if (extension === ".doc") return "application/msword";
  if (extension === ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".txt") return "text/plain";

  return "application/octet-stream";
}
