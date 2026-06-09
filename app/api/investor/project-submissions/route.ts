import { randomUUID } from "node:crypto";
import path from "node:path";
import { PayoutFrequency } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { saveUploadedFile } from "@/lib/file-storage";
import { isDetailedText, isMeaningfulText, zodFieldErrors } from "@/lib/form-validation";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().max(180).optional());

const meaningfulText = (min = 2, max = 5000, minLetters = min) => z.string().trim().min(min).max(max).refine((value) => isMeaningfulText(value, { allowDigits: true, minLetters }));
const detailedText = (min = 20, max = 5000, minLetters = 12, minWords = 6) => z.string().trim().min(min).max(max).refine((value) => isDetailedText(value, { minLetters, minWords }));

const dateSchema = z.preprocess((value) => {
  if (typeof value !== "string" || !value.trim()) return value;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : date;
}, z.date());

const projectSubmissionSchema = z.object({
  title: meaningfulText(5, 180, 4),
  sector: z.enum(["real-estate", "trade", "production", "technology", "logistics", "other"]),
  sectorOther: optionalText.refine((value) => !value || isMeaningfulText(value, { minLetters: 3 })),
  location: optionalText.refine((value) => !value || isMeaningfulText(value, { allowDigits: true, minLetters: 3, minWords: 2 })),
  targetUsdt: z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }, z.number().positive().max(100000000).optional()),
  structure: optionalText,
  expectedReturn: meaningfulText(8, 180, 6),
  expectedYield: meaningfulText(5, 180, 3),
  stage: meaningfulText(5, 180, 4),
  currentProgress: detailedText(30, 2500, 18, 8),
  fundraisingStartAt: dateSchema,
  fundraisingEndAt: dateSchema,
  plannedLaunchAt: dateSchema,
  plannedDividendAt: dateSchema,
  payoutFrequency: z.nativeEnum(PayoutFrequency).default(PayoutFrequency.CUSTOM),
  participationTerm: meaningfulText(5, 180, 3),
  raisePlan: z.string().trim().max(2500).optional().refine((value) => !value || isDetailedText(value, { minLetters: 12, minWords: 5 })),
  summary: detailedText(120, 5000, 70, 25)
}).superRefine((data, context) => {
  const fundraisingDays = Math.ceil((data.fundraisingEndAt.getTime() - data.fundraisingStartAt.getTime()) / 86_400_000);

  if (fundraisingDays < 1 || fundraisingDays > 93) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "fundraising_period",
      path: ["fundraisingEndAt"]
    });
  }
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

const maxProjectFileSize = 20 * 1024 * 1024;
const maxProjectFiles = 20;
const maxProjectTotalSize = 100 * 1024 * 1024;
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

function projectFieldLabels(localeRu: boolean) {
  return {
    currentProgress: localeRu ? "Опишите, что реально уже сделано: активы, договоры, команда, готовность к запуску." : "Describe what is already done: assets, contracts, team and launch readiness.",
    documents: localeRu ? "Прикрепите минимум один документ проекта." : "Attach at least one project document.",
    expectedReturn: localeRu ? "Опишите ожидаемый результат проекта словами, не набором символов." : "Describe the expected project result in words, not random characters.",
    expectedYield: localeRu ? "Укажите ориентир доходности понятным текстом, например период и что это не гарантия." : "Enter return guidance as clear text, including period and that it is not guaranteed.",
    fundraisingEndAt: localeRu ? "Срок сбора должен быть от 1 до 93 дней." : "Fundraising period must be from 1 to 93 days.",
    fundraisingStartAt: localeRu ? "Укажите корректную дату начала сбора." : "Enter a valid fundraising start date.",
    location: localeRu ? "Укажите страну и город реализации проекта." : "Enter the project country and city.",
    participationTerm: localeRu ? "Укажите срок участия понятным текстом." : "Enter the participation term as clear text.",
    payoutFrequency: localeRu ? "Выберите график выплат." : "Select distribution schedule.",
    plannedDividendAt: localeRu ? "Укажите дату планируемых первых выплат." : "Enter planned first distribution date.",
    plannedLaunchAt: localeRu ? "Укажите дату планируемого запуска." : "Enter planned launch date.",
    raisePlan: localeRu ? "Опишите этапы сбора понятным текстом или оставьте поле пустым." : "Describe raise phases clearly or leave this field empty.",
    sector: localeRu ? "Выберите отрасль проекта." : "Select project sector.",
    sectorOther: localeRu ? "Укажите отрасль словами." : "Enter the sector in words.",
    stage: localeRu ? "Укажите реальную стадию проекта словами." : "Enter the real project stage in words.",
    summary: localeRu ? "Добавьте подробное описание: бизнес-модель, активы, участники, сроки, риски и документы." : "Add a detailed description: business model, assets, parties, timeline, risks and documents.",
    targetUsdt: localeRu ? "Укажите корректную сумму цели в USDT." : "Enter a valid target amount in USDT.",
    title: localeRu ? "Укажите нормальное название проекта, не набор букв или цифр." : "Enter a real project title, not random letters or numbers."
  };
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
    stage: readText(formData, "stage"),
    currentProgress: readText(formData, "currentProgress"),
    fundraisingStartAt: readText(formData, "fundraisingStartAt"),
    fundraisingEndAt: readText(formData, "fundraisingEndAt"),
    plannedLaunchAt: readText(formData, "plannedLaunchAt"),
    plannedDividendAt: readText(formData, "plannedDividendAt"),
    payoutFrequency: readText(formData, "payoutFrequency"),
    participationTerm: readText(formData, "participationTerm"),
    raisePlan: readText(formData, "raisePlan"),
    summary: readText(formData, "summary")
  });
  const documents = readFiles(formData, "documents");

  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error, projectFieldLabels(localeRu));

    return NextResponse.json(
      {
        title: localeRu ? "Проверьте заявку" : "Check application",
        message:
          localeRu
            ? "Исправьте поля, выделенные красным. Описание должно быть осмысленным и достаточно подробным."
            : "Fix the fields highlighted in red. The description must be meaningful and detailed enough.",
        fieldErrors
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
            : "Initial review requires at least one file: presentation, registration document or financial model.",
        fieldErrors: {
          documents: projectFieldLabels(localeRu).documents
        }
      },
      { status: 400 }
    );
  }

  if (documents.length > maxProjectFiles) {
    return NextResponse.json(
      {
        title: localeRu ? "Слишком много файлов" : "Too many files",
        message: localeRu ? "За один раз можно загрузить до 20 файлов проекта." : "You can upload up to 20 project files at a time.",
        fieldErrors: {
          documents: projectFieldLabels(localeRu).documents
        }
      },
      { status: 400 }
    );
  }

  const totalUploadSize = documents.reduce((sum, file) => sum + file.size, 0);

  if (totalUploadSize > maxProjectTotalSize) {
    return NextResponse.json(
      {
        title: localeRu ? "Файлы слишком большие" : "Files are too large",
        message: localeRu ? "Общий размер документов проекта должен быть не больше 100 МБ." : "The total project document size must be no larger than 100 MB.",
        fieldErrors: {
          documents: projectFieldLabels(localeRu).documents
        }
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
                : "Upload PDF, DOCX, XLSX, PPTX, JPG or PNG files.",
          fieldErrors: {
            documents: projectFieldLabels(localeRu).documents
          }
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
        message: localeRu ? "Если выбрано «Другое», напишите название отрасли проекта." : "If you choose Other, enter the project's sector.",
        fieldErrors: {
          sectorOther: projectFieldLabels(localeRu).sectorOther
        }
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
        stage: data.stage,
        currentProgress: data.currentProgress,
        fundraisingStartAt: data.fundraisingStartAt,
        fundraisingEndAt: data.fundraisingEndAt,
        plannedLaunchAt: data.plannedLaunchAt,
        plannedDividendAt: data.plannedDividendAt,
        payoutFrequency: data.payoutFrequency,
        participationTerm: data.participationTerm,
        raisePlan: data.raisePlan,
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
          stage: data.stage,
          fundraisingStartAt: data.fundraisingStartAt.toISOString(),
          fundraisingEndAt: data.fundraisingEndAt.toISOString(),
          plannedLaunchAt: data.plannedLaunchAt.toISOString(),
          plannedDividendAt: data.plannedDividendAt.toISOString(),
          payoutFrequency: data.payoutFrequency,
          participationTerm: data.participationTerm,
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
