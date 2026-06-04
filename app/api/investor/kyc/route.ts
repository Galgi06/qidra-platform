import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { readKycDocuments, type KycDocumentKind, type KycDocuments, type KycFileMeta } from "@/lib/kyc-documents";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().max(180).optional());

const kycSchema = z.object({
  phone: optionalText,
  country: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  citizenship: z.string().trim().min(2).max(120),
  dateOfBirth: optionalText,
  address: z.string().trim().min(5).max(240),
  sourceOfFunds: z.enum(["salary", "business", "savings", "family", "other"]),
  occupation: z.string().trim().min(2).max(160)
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

async function saveKycFile(file: File, userId: string, kind: KycDocumentKind): Promise<KycFileMeta> {
  const userUploadDir = path.join(process.cwd(), "storage", "kyc", userId);
  await mkdir(userUploadDir, { recursive: true });

  const safeName = sanitizeFileName(file.name);
  const storedName = `${Date.now()}-${randomUUID()}-${kind}-${safeName}`;
  const absolutePath = path.join(userUploadDir, storedName);

  await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

  return {
    name: file.name,
    size: file.size,
    storagePath: path.relative(process.cwd(), absolutePath),
    type: file.type || contentTypeFromName(file.name)
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

  const formData = await request.formData();
  const parsed = kycSchema.safeParse({
    phone: readText(formData, "phone"),
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
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте анкету" : "Check the profile",
        message:
          localeRu
            ? "Заполните обязательные поля и прикрепите документ личности вместе с подтверждением адреса."
            : "Complete the required fields and attach an identity document plus proof of address."
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
                : "Upload documents as PDF, JPG or PNG."
        },
        { status: 400 }
      );
    }
  }

  if ((!identityUpload && !previousDocuments.identityDocument) || (!addressUpload && !previousDocuments.addressProof)) {
    return NextResponse.json(
      {
        title: localeRu ? "Прикрепите документы" : "Attach documents",
        message:
          localeRu
            ? "Для первой отправки нужны документ личности и подтверждение адреса."
            : "The first submission requires an identity document and proof of address."
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
