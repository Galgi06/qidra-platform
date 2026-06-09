import { randomUUID } from "node:crypto";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { countryCodes, dialCodes } from "@/lib/countries";
import { saveUploadedFile } from "@/lib/file-storage";
import { isPlausibleAddress, isPlausibleCity, isPlausibleOccupation, isPlausiblePhone, zodFieldErrors } from "@/lib/form-validation";
import { readKycDocuments, type KycDocumentKind, type KycDocuments, type KycFileMeta } from "@/lib/kyc-documents";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs";

const kycSchema = z.object({
  phone: z.string().trim().min(1).max(32).refine(isPlausiblePhone),
  phoneDialCode: z.string().trim().refine((value) => dialCodes.has(value)).optional(),
  country: z.string().trim().refine((value) => countryCodes.has(value)),
  city: z.string().trim().min(2).max(120).refine(isPlausibleCity),
  citizenship: z.string().trim().refine((value) => countryCodes.has(value)),
  dateOfBirth: z.string().trim().min(1).refine(isValidAdultBirthDate),
  address: z.string().trim().min(12).max(240).refine(isPlausibleAddress),
  sourceOfFunds: z.enum(["salary", "business", "savings", "family", "other"]),
  occupation: z.string().trim().min(3).max(160).refine(isPlausibleOccupation)
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

const maxKycFileSize = 10 * 1024 * 1024;
const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png"]);

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readUploadedFile(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return value;
}

function validateKycFile(file: File) {
  if (file.size > maxKycFileSize) return "size";

  const extension = path.extname(file.name).toLowerCase();
  const acceptedByType = file.type ? allowedMimeTypes.has(file.type) : false;
  const acceptedByExtension = allowedExtensions.has(extension);

  if (!acceptedByType && !acceptedByExtension) return "type";

  return null;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isValidAdultBirthDate(value: string) {
  const date = parseDate(value);
  if (!date) return false;

  const today = new Date();
  const minimumBirthDate = new Date(Date.UTC(today.getUTCFullYear() - 18, today.getUTCMonth(), today.getUTCDate()));
  const oldestBirthDate = new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()));

  return date <= minimumBirthDate && date >= oldestBirthDate;
}

function kycFieldLabels(localeRu: boolean) {
  return {
    address: localeRu ? "Укажите полный адрес проживания: город, район/улица, дом или ориентир." : "Enter a full residential address: city, area/street and building or landmark.",
    addressProof: localeRu ? "Прикрепите подтверждение адреса в PDF, JPG или PNG." : "Attach proof of address as PDF, JPG or PNG.",
    citizenship: localeRu ? "Выберите гражданство из списка." : "Select citizenship from the list.",
    city: localeRu ? "Укажите реальный город буквами, без набора символов или цифр." : "Enter a real city name with letters, not random symbols or numbers.",
    country: localeRu ? "Выберите страну проживания из списка." : "Select country of residence from the list.",
    dateOfBirth: localeRu ? "Укажите корректную дату рождения. Участнику должно быть не меньше 18 лет." : "Enter a valid date of birth. The participant must be at least 18.",
    identityDocument: localeRu ? "Прикрепите документ личности в PDF, JPG или PNG." : "Attach an identity document as PDF, JPG or PNG.",
    occupation: localeRu ? "Укажите профессию словами, без набора букв или цифр." : "Enter an occupation in words, not random letters or numbers.",
    phone: localeRu ? "Укажите корректный номер телефона." : "Enter a valid phone number.",
    phoneDialCode: localeRu ? "Выберите телефонный код страны." : "Select a country phone code.",
    sourceOfFunds: localeRu ? "Выберите источник средств." : "Select source of funds."
  };
}

async function saveKycFile(file: File, userId: string, kind: KycDocumentKind): Promise<KycFileMeta> {
  const safeName = sanitizeFileName(file.name);
  const storedName = `${Date.now()}-${randomUUID()}-${kind}-${safeName}`;
  const type = file.type || contentTypeFromName(file.name);
  const storagePath = await saveUploadedFile({
    contentType: type,
    directory: `kyc/${userId}`,
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
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
  const extension = parsed.ext.toLowerCase();

  return `${base}${extension}`;
}

function contentTypeFromName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  if (extension === ".pdf") return "application/pdf";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";

  return "application/octet-stream";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы отправить профиль на проверку." : "Sign in to submit your profile for review."
      },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    key: `kyc:submit:${userId}`,
    limit: 8,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const formData = await request.formData();
  const parsed = kycSchema.safeParse({
    phone: readText(formData, "phone"),
    phoneDialCode: readText(formData, "phoneDialCode") || undefined,
    country: readText(formData, "country"),
    city: readText(formData, "city"),
    citizenship: readText(formData, "citizenship"),
    dateOfBirth: readText(formData, "dateOfBirth"),
    address: readText(formData, "address"),
    sourceOfFunds: readText(formData, "sourceOfFunds"),
    occupation: readText(formData, "occupation")
  });
  const identityUpload = readUploadedFile(formData, "identityDocument");
  const addressUpload = readUploadedFile(formData, "addressProof");

  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error, kycFieldLabels(localeRu));

    return NextResponse.json(
      {
        title: localeRu ? "Проверьте анкету" : "Check the profile",
        message:
          localeRu
            ? "Исправьте поля, выделенные красным, и отправьте анкету ещё раз."
            : "Fix the fields highlighted in red and submit the profile again.",
        fieldErrors
      },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const birthDate = parseDate(data.dateOfBirth);
  const latestApplication = await prisma.kycApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
  const previousDocuments = readKycDocuments(latestApplication?.documents);

  for (const file of [identityUpload, addressUpload]) {
    if (!file) continue;

    const error = validateKycFile(file);

    if (error) {
      const fileField = file === identityUpload ? "identityDocument" : "addressProof";

      return NextResponse.json(
        {
          title: localeRu ? "Проверьте документы" : "Check documents",
          message:
            error === "size"
              ? localeRu
                ? "Каждый файл должен быть не больше 10 МБ."
                : "Each file must be no larger than 10 MB."
              : localeRu
                ? "Загрузите документы в формате PDF, JPG или PNG."
                : "Upload documents as PDF, JPG or PNG.",
          fieldErrors: {
            [fileField]: kycFieldLabels(localeRu)[fileField]
          }
        },
        { status: 400 }
      );
    }
  }

  if ((!identityUpload && !previousDocuments.identityDocument) || (!addressUpload && !previousDocuments.addressProof)) {
    const fieldErrors = {
      ...(!identityUpload && !previousDocuments.identityDocument ? { identityDocument: kycFieldLabels(localeRu).identityDocument } : {}),
      ...(!addressUpload && !previousDocuments.addressProof ? { addressProof: kycFieldLabels(localeRu).addressProof } : {})
    };

    return NextResponse.json(
      {
        title: localeRu ? "Прикрепите документы" : "Attach documents",
        message:
          localeRu
            ? "Для первой отправки нужны документ личности и подтверждение адреса."
            : "The first submission requires an identity document and proof of address.",
        fieldErrors
      },
      { status: 400 }
    );
  }

  const nextIdentityDocument = identityUpload ? await saveKycFile(identityUpload, userId, "identityDocument") : previousDocuments.identityDocument;
  const nextAddressProof = addressUpload ? await saveKycFile(addressUpload, userId, "addressProof") : previousDocuments.addressProof;

  const documents: KycDocuments = {
    identityDocument: nextIdentityDocument!,
    addressProof: nextAddressProof!,
    submittedAt: new Date().toISOString()
  };

  await prisma.$transaction(async (tx) => {
    await tx.investorProfile.upsert({
      where: { userId },
      update: {
        phone: data.phone,
        phoneDialCode: data.phoneDialCode,
        country: data.country,
        city: data.city,
        citizenship: data.citizenship,
        address: data.address,
        dateOfBirth: birthDate,
        riskAcceptedAt: new Date()
      },
      create: {
        userId,
        phone: data.phone,
        phoneDialCode: data.phoneDialCode,
        country: data.country,
        city: data.city,
        citizenship: data.citizenship,
        address: data.address,
        dateOfBirth: birthDate,
        riskAcceptedAt: new Date()
      }
    });

    const activeApplication = await tx.kycApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    if (activeApplication) {
      await tx.kycApplication.update({
        where: { id: activeApplication.id },
        data: {
          status: "SUBMITTED",
          sourceOfFunds: data.sourceOfFunds,
          occupation: data.occupation,
          documents
        }
      });
      return;
    }

    await tx.kycApplication.create({
      data: {
        userId,
        status: "SUBMITTED",
        sourceOfFunds: data.sourceOfFunds,
        occupation: data.occupation,
        documents
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Анкета отправлена" : "Profile submitted",
    message:
      localeRu
        ? "Профиль и документы отправлены команде Qidra. Статус появится в профиле участника после проверки."
        : "Your profile and documents were sent to the Qidra team. The status will appear in your participant profile after review."
  });
}
