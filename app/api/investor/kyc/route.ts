import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

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

type FileMeta = {
  name: string;
  size: number;
  type: string;
};

type KycDocuments = {
  addressProof?: FileMeta;
  identityDocument?: FileMeta;
  submittedAt?: string;
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readFileMeta(formData: FormData, key: string) {
  const value = formData.get(key);

  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  return {
    name: value.name,
    size: value.size,
    type: value.type || "application/octet-stream"
  };
}

function readExistingDocuments(value: unknown): KycDocuments {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const documents = value as Record<string, unknown>;
  return {
    identityDocument: readStoredFileMeta(documents.identityDocument),
    addressProof: readStoredFileMeta(documents.addressProof)
  };
}

function readStoredFileMeta(value: unknown): FileMeta | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;

  const file = value as Record<string, unknown>;
  if (typeof file.name !== "string" || typeof file.size !== "number" || typeof file.type !== "string") {
    return undefined;
  }

  return {
    name: file.name,
    size: file.size,
    type: file.type
  };
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
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
  const identityDocument = readFileMeta(formData, "identityDocument");
  const addressProof = readFileMeta(formData, "addressProof");

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
  const previousDocuments = readExistingDocuments(latestApplication?.documents);
  const nextIdentityDocument = identityDocument ?? previousDocuments.identityDocument;
  const nextAddressProof = addressProof ?? previousDocuments.addressProof;

  if (!nextIdentityDocument || !nextAddressProof) {
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

  const documents: KycDocuments = {
    identityDocument: nextIdentityDocument,
    addressProof: nextAddressProof,
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
        ? "Профиль и документы отправлены команде Qidra. Статус появится в кабинете после проверки."
        : "Your profile and documents were sent to the Qidra team. The status will appear in your cabinet after review."
  });
}
