import { randomUUID } from "node:crypto";
import path from "node:path";
import { PayoutFrequency } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { saveUploadedFile } from "@/lib/file-storage";
import { isDetailedText, isMeaningfulText, zodFieldErrors } from "@/lib/form-validation";
import { getPrimaryOrganizationForUser } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { incomeSourceOptions, propertyStatusOptions, propertyTypeOptions, type RealEstateDocumentAsset } from "@/lib/real-estate";

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
  summary: detailedText(120, 5000, 70, 25),
  propertyObjectName: optionalText,
  propertyComplexName: optionalText,
  propertyDeveloper: optionalText,
  propertyCountry: optionalText,
  propertyCity: optionalText,
  propertyDistrict: optionalText,
  propertyAddress: z.string().trim().max(240).optional(),
  propertyType: z.enum(propertyTypeOptions).optional(),
  propertyStatus: z.enum(propertyStatusOptions).optional(),
  propertyShortDescription: z.string().trim().max(300).optional(),
  propertyFullDescription: z.string().trim().max(6000).optional(),
  propertyVehicleName: optionalText,
  propertyManagerName: optionalText,
  propertyTotalAssetValue: moneyField(),
  propertyCurrency: optionalText,
  propertyMinimumParticipation: moneyField(),
  propertyTargetRaise: moneyField(),
  propertyGatheredAmount: moneyField(),
  propertyRemainingAmount: moneyField(),
  propertyTermMonths: integerField(),
  propertyPlannedStartDate: optionalDateSchema(),
  propertyCompletionDate: optionalDateSchema(),
  propertyInvestorSharePercent: percentField(),
  propertyManagerSharePercent: percentField(),
  propertyManagerFeePercent: percentField(),
  propertyFundraisingCurrency: optionalText,
  propertyIncomeSources: z.array(z.enum(incomeSourceOptions)).optional().default([])
}).superRefine((data, context) => {
  const fundraisingDays = Math.ceil((data.fundraisingEndAt.getTime() - data.fundraisingStartAt.getTime()) / 86_400_000);

  if (fundraisingDays < 1 || fundraisingDays > 93) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "fundraising_period",
      path: ["fundraisingEndAt"]
    });
  }

  if (data.sector === "real-estate") {
    const requiredRealEstateFields = [
      "propertyObjectName",
      "propertyComplexName",
      "propertyDeveloper",
      "propertyCountry",
      "propertyCity",
      "propertyAddress",
      "propertyType",
      "propertyStatus",
      "propertyShortDescription",
      "propertyFullDescription",
      "propertyTotalAssetValue",
      "propertyCurrency",
      "propertyMinimumParticipation",
      "propertyTargetRaise",
      "propertyTermMonths",
      "propertyPlannedStartDate",
      "propertyCompletionDate",
      "propertyInvestorSharePercent",
      "propertyManagerSharePercent",
      "propertyManagerFeePercent",
      "propertyFundraisingCurrency"
    ] as const;

    for (const field of requiredRealEstateFields) {
      if (!data[field]) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "required_real_estate_field", path: [field] });
      }
    }

    if (!data.propertyIncomeSources?.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "required_real_estate_field", path: ["propertyIncomeSources"] });
    }
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
  "application/zip",
  "application/msword",
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp"
]);
const allowedExtensions = new Set([".doc", ".docx", ".pdf", ".jpg", ".jpeg", ".png", ".ppt", ".pptx", ".xls", ".xlsx", ".zip", ".webp"]);

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
    propertyAddress: localeRu ? "Укажите адрес объекта." : "Enter the property address.",
    propertyCity: localeRu ? "Укажите город объекта." : "Enter the property city.",
    propertyComplexName: localeRu ? "Укажите название комплекса." : "Enter the complex name.",
    propertyCompletionDate: localeRu ? "Укажите планируемую дату завершения." : "Enter planned completion date.",
    propertyCountry: localeRu ? "Укажите страну объекта." : "Enter the property country.",
    propertyCurrency: localeRu ? "Укажите валюту объекта." : "Enter the property currency.",
    propertyDeveloper: localeRu ? "Укажите девелопера." : "Enter the developer.",
    propertyFloorPlans: localeRu ? "Добавьте хотя бы один файл объекта: план, брошюру или изображение." : "Add at least one property asset such as a floor plan, brochure or image.",
    propertyFullDescription: localeRu ? "Добавьте развёрнутое описание объекта." : "Add a full property description.",
    propertyFundraisingCurrency: localeRu ? "Укажите валюту участия." : "Enter the participation currency.",
    propertyIncomeSources: localeRu ? "Выберите хотя бы один источник дохода." : "Select at least one income source.",
    propertyInvestorSharePercent: localeRu ? "Укажите долю инвесторов." : "Enter investor share.",
    propertyManagerFeePercent: localeRu ? "Укажите комиссию управляющего." : "Enter manager fee.",
    propertyManagerSharePercent: localeRu ? "Укажите долю управляющего." : "Enter manager share.",
    propertyMinimumParticipation: localeRu ? "Укажите минимальный вход." : "Enter minimum participation.",
    propertyObjectName: localeRu ? "Укажите название объекта." : "Enter the property name.",
    propertyPlannedStartDate: localeRu ? "Укажите дату начала проекта." : "Enter the project start date.",
    propertyShortDescription: localeRu ? "Добавьте краткое описание объекта." : "Add a short property summary.",
    propertyStatus: localeRu ? "Выберите статус объекта." : "Select property status.",
    propertyTargetRaise: localeRu ? "Укажите целевой объём привлечения." : "Enter target raise.",
    propertyTermMonths: localeRu ? "Укажите срок проекта в месяцах." : "Enter project term in months.",
    propertyTotalAssetValue: localeRu ? "Укажите полную стоимость объекта." : "Enter total asset value.",
    propertyType: localeRu ? "Выберите тип недвижимости." : "Select property type.",
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

function readTexts(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
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

function moneyField() {
  return z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }, z.number().positive().max(1000000000).optional());
}

function percentField() {
  return z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : value;
  }, z.number().min(0).max(100).optional());
}

function integerField() {
  return z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const normalized = Number.parseInt(value, 10);
    return Number.isFinite(normalized) ? normalized : value;
  }, z.number().int().positive().max(600).optional());
}

function optionalDateSchema() {
  return z.preprocess((value) => {
    if (typeof value !== "string" || !value.trim()) return undefined;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? value : date;
  }, z.date().optional());
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
  const organization = await getPrimaryOrganizationForUser(userId);

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
    summary: readText(formData, "summary"),
    propertyObjectName: readText(formData, "propertyObjectName"),
    propertyComplexName: readText(formData, "propertyComplexName"),
    propertyDeveloper: readText(formData, "propertyDeveloper"),
    propertyCountry: readText(formData, "propertyCountry"),
    propertyCity: readText(formData, "propertyCity"),
    propertyDistrict: readText(formData, "propertyDistrict"),
    propertyAddress: readText(formData, "propertyAddress"),
    propertyType: readText(formData, "propertyType"),
    propertyStatus: readText(formData, "propertyStatus"),
    propertyShortDescription: readText(formData, "propertyShortDescription"),
    propertyFullDescription: readText(formData, "propertyFullDescription"),
    propertyVehicleName: readText(formData, "propertyVehicleName"),
    propertyManagerName: readText(formData, "propertyManagerName"),
    propertyTotalAssetValue: readText(formData, "propertyTotalAssetValue"),
    propertyCurrency: readText(formData, "propertyCurrency"),
    propertyMinimumParticipation: readText(formData, "propertyMinimumParticipation"),
    propertyTargetRaise: readText(formData, "propertyTargetRaise"),
    propertyGatheredAmount: readText(formData, "propertyGatheredAmount"),
    propertyRemainingAmount: readText(formData, "propertyRemainingAmount"),
    propertyTermMonths: readText(formData, "propertyTermMonths"),
    propertyPlannedStartDate: readText(formData, "propertyPlannedStartDate"),
    propertyCompletionDate: readText(formData, "propertyCompletionDate"),
    propertyInvestorSharePercent: readText(formData, "propertyInvestorSharePercent"),
    propertyManagerSharePercent: readText(formData, "propertyManagerSharePercent"),
    propertyManagerFeePercent: readText(formData, "propertyManagerFeePercent"),
    propertyFundraisingCurrency: readText(formData, "propertyFundraisingCurrency"),
    propertyIncomeSources: readTexts(formData, "propertyIncomeSources")
  });
  const documents = readFiles(formData, "documents");
  const propertyAssetFiles = {
    brochures: readFiles(formData, "propertyBrochures"),
    coverImage: readFiles(formData, "propertyCoverImage"),
    floorPlans: readFiles(formData, "propertyFloorPlans"),
    gallery: readFiles(formData, "propertyGalleryImages"),
    visuals: readFiles(formData, "propertyVisuals")
  };
  const extraFiles = Object.values(propertyAssetFiles).flat();

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

  if (!documents.length && !(parsed.success && parsed.data.sector === "real-estate" && extraFiles.length)) {
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

  if (documents.length + extraFiles.length > maxProjectFiles) {
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

  const totalUploadSize = [...documents, ...extraFiles].reduce((sum, file) => sum + file.size, 0);

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

  for (const file of [...documents, ...extraFiles]) {
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

  const data = parsed.data;
  const sector = resolveSector(data.sector, data.sectorOther);
  const submissionFolder = randomUUID();
  const savedDocuments = await Promise.all(documents.map((file) => saveProjectFile(file, userId, submissionFolder)));
  const savedPropertyAssets = await Promise.all([
    saveAssetGroup(propertyAssetFiles.coverImage, "gallery", userId, submissionFolder),
    saveAssetGroup(propertyAssetFiles.gallery, "gallery", userId, submissionFolder),
    saveAssetGroup(propertyAssetFiles.floorPlans, "floor-plan", userId, submissionFolder),
    saveAssetGroup(propertyAssetFiles.brochures, "brochure", userId, submissionFolder),
    saveAssetGroup(propertyAssetFiles.visuals, "render", userId, submissionFolder)
  ]).then((groups) => groups.flat());

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
        organizationId: organization?.id,
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
        propertyData:
          data.sector === "real-estate"
            ? {
                address: data.propertyAddress,
                city: data.propertyCity,
                completionDate: data.propertyCompletionDate?.toISOString(),
                country: data.propertyCountry,
                coverImage: savedPropertyAssets.find((asset) => asset.category === "gallery")?.href,
                currency: data.propertyCurrency,
                descriptionFull: data.propertyFullDescription,
                descriptionShort: data.propertyShortDescription,
                developer: data.propertyDeveloper,
                district: data.propertyDistrict,
                documents: savedPropertyAssets,
                fundraisingCurrency: data.propertyFundraisingCurrency,
                gallery: savedPropertyAssets.filter((asset) => asset.category === "gallery").map((asset) => asset.href),
                gatheredAmount: data.propertyGatheredAmount,
                incomeSources: data.propertyIncomeSources,
                managerFeePercent: data.propertyManagerFeePercent,
                managerName: data.propertyManagerName,
                managerSharePercent: data.propertyManagerSharePercent,
                minimumParticipation: data.propertyMinimumParticipation,
                objectName: data.propertyObjectName,
                objectStatus: data.propertyStatus,
                partnerName: data.propertyDeveloper,
                plannedStartDate: data.propertyPlannedStartDate?.toISOString(),
                projectTermMonths: data.propertyTermMonths,
                propertyType: data.propertyType,
                remainingAmount: data.propertyRemainingAmount,
                targetRaise: data.propertyTargetRaise,
                titleComplex: data.propertyComplexName,
                totalAssetValue: data.propertyTotalAssetValue,
                vehicleName: data.propertyVehicleName,
                visuals: savedPropertyAssets.filter((asset) => asset.category === "render").map((asset) => asset.href)
              }
            : undefined,
        documents: {
          files: savedDocuments,
          propertyAssets: savedPropertyAssets,
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
            organizationId: organization?.id ?? null,
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
            documents: savedDocuments.map((document) => document.name),
            propertyObjectName: data.propertyObjectName,
            propertyType: data.propertyType,
            propertyStatus: data.propertyStatus
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

async function saveAssetGroup(files: File[], category: RealEstateDocumentAsset["category"], userId: string, submissionFolder: string) {
  return Promise.all(
    files.map(async (file) => {
      const saved = await saveProjectFile(file, userId, submissionFolder);
      return {
        category,
        href: saved.storagePath,
        name: saved.name,
        size: saved.size,
        type: saved.type
      } satisfies RealEstateDocumentAsset;
    })
  );
}
