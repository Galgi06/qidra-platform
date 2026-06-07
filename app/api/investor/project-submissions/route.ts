import { randomUUID } from "node:crypto";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { saveUploadedFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().max(180).optional());

const projectSubmissionSchema = z.object({
  title: z.string().trim().min(3).max(180),
  sector: optionalText,
  sectorOther: optionalText,
  location: optionalText,
  targetUsdt: z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }, z.number().positive().max(100000000).optional()),
  structure: optionalText,
  expectedReturn: z.string().trim().min(5).max(180),
  expectedYield: z.string().trim().min(2).max(180),
  summary: z.string().trim().min(120).max(5000)
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

const maxProjectFileSize = 20 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png"
]);
const allowedExtensions = new Set([".doc", ".docx", ".pdf", ".jpg", ".jpeg", ".png", ".ppt", ".pptx", ".xls", ".xlsx"]);

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readFiles(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
}

function validateProjectFile(file: File) {
  if (file.size > maxProjectFileSize) return "size";

  const extension = path.extname(file.name).toLowerCase();
  const acceptedByType = file.type ? allowedMimeTypes.has(file.type) : false;
  const acceptedByExtension = allowedExtensions.has(extension);

  if (!acceptedByType && !acceptedByExtension) return "type";

  return null;
}

function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
  const extension = parsed.ext.toLowerCase();

  return `${base}${extension}`;
}

function resolveSector(sector?: string, sectorOther?: string) {
  if (sector !== "other") return sector;
  return sectorOther;
}

async function saveProjectFile(file: File, userId: string, submissionFolder: string) {
  const safeName = sanitizeFileName(file.name);
  const storedName = `${Date.now()}-${randomUUID()}-${safeName}`;
  const type = file.type || "application/octet-stream";
  const storagePath = await saveUploadedFile({
    contentType: type,
    directory: `project-submissions/${userId}/${submissionFolder}`,
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

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы подать проект на проверку." : "Sign in to submit a project for review."
      },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    key: `project-submission:create:${userId}`,
    limit: 6,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const latestKyc = await prisma.kycApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { status: true }
  });

  if (latestKyc?.status !== "APPROVED") {
    return NextResponse.json(
      {
        title: localeRu ? "Сначала завершите проверку" : "Complete review first",
        message:
          localeRu
            ? "Подать собственный проект можно после одобрения профиля и документов участника."
            : "You can submit your own project after the participant profile and documents are approved."
      },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const parsed = projectSubmissionSchema.safeParse({
    title: readText(formData, "title"),
    sector: readText(formData, "sector"),
    sectorOther: readText(formData, "sectorOther"),
    location: readText(formData, "location"),
    targetUsdt: readText(formData, "targetUsdt"),
    structure: readText(formData, "structure"),
    expectedReturn: readText(formData, "expectedReturn"),
    expectedYield: readText(formData, "expectedYield"),
    summary: readText(formData, "summary")
  });
  const documents = readFiles(formData, "documents");

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте заявку" : "Check application",
        message:
          localeRu
            ? "Заполните название, описание проекта и основные параметры. Описание должно быть достаточно подробным."
            : "Complete the title, project description and core parameters. The description must be detailed enough."
      },
      { status: 400 }
    );
  }

  if (!documents.length) {
    return NextResponse.json(
      {
        title: localeRu ? "Прикрепите документы" : "Attach documents",
        message:
          localeRu
            ? "Для первичной проверки нужен минимум один файл: презентация, регистрационный документ или финансовая модель."
            : "Initial review requires at least one file: presentation, registration document or financial model."
      },
      { status: 400 }
    );
  }

  for (const file of documents) {
    const error = validateProjectFile(file);

    if (error) {
      return NextResponse.json(
        {
          title: localeRu ? "Проверьте файлы" : "Check files",
          message:
            error === "size"
              ? localeRu
                ? "Каждый файл должен быть не больше 20 МБ."
                : "Each file must be no larger than 20 MB."
              : localeRu
                ? "Можно загрузить PDF, DOCX, XLSX, PPTX, JPG или PNG."
                : "Upload PDF, DOCX, XLSX, PPTX, JPG or PNG files."
        },
        { status: 400 }
      );
    }
  }

  const submissionFolder = randomUUID();
  const savedDocuments = await Promise.all(documents.map((file) => saveProjectFile(file, userId, submissionFolder)));
  const data = parsed.data;
  const sector = resolveSector(data.sector, data.sectorOther);

  if (data.sector === "other" && !sector) {
    return NextResponse.json(
      {
        title: localeRu ? "Укажите отрасль" : "Specify sector",
        message: localeRu ? "Если выбрано «Другое», напишите название отрасли проекта." : "If you choose Other, enter the project's sector."
      },
      { status: 400 }
    );
  }

  const submission = await prisma.$transaction(async (tx) => {
    const created = await tx.projectSubmission.create({
      data: {
        userId,
        title: data.title,
        sector,
        location: data.location,
        targetUsdt: data.targetUsdt,
        structure: data.structure,
        expectedReturn: data.expectedReturn,
        expectedYield: data.expectedYield,
        summary: data.summary,
        documents: {
          files: savedDocuments,
          submittedAt: new Date().toISOString()
        }
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId: userId,
        action: "project.submission.create",
        entityType: "ProjectSubmission",
        entityId: created.id,
        payload: {
          sector,
          title: data.title,
          expectedReturn: data.expectedReturn,
          expectedYield: data.expectedYield,
          documents: savedDocuments.map((document) => document.name)
        }
      }
    });

    return created;
  });

  return NextResponse.json({
    title: localeRu ? "Проект отправлен" : "Project submitted",
    message:
      localeRu
        ? "Заявка на размещение проекта отправлена команде Qidra. После первичной проверки статус появится в профиле."
        : "Your project listing application was sent to the Qidra team. Its status will appear in your profile after initial review.",
    submissionId: submission.id
  });
}
