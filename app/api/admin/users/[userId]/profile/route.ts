import { KycStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canEditParticipantCards } from "@/lib/auth";
import { countryCodes, dialCodes } from "@/lib/countries";
import { isPlausibleAddress, isPlausibleCity, isPlausibleOccupation, isPlausiblePhone, zodFieldErrors } from "@/lib/form-validation";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const sourceOfFundsValues = ["salary", "business", "savings", "family", "other"] as const;

const profileUpdateSchema = z.object({
  address: z.string().trim().max(240).refine((value) => !value || isPlausibleAddress(value)),
  citizenship: z.string().trim().refine((value) => !value || countryCodes.has(value)),
  city: z.string().trim().max(120).refine((value) => !value || isPlausibleCity(value)),
  confirmation: z.string().trim(),
  country: z.string().trim().refine((value) => !value || countryCodes.has(value)),
  dateOfBirth: z.string().trim().refine((value) => !value || isValidAdultBirthDate(value)),
  email: z.string().trim().email().max(180).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(120).refine((value) => isPlausibleName(value)),
  occupation: z.string().trim().max(160).refine((value) => !value || isPlausibleOccupation(value)),
  phone: z.string().trim().max(32).refine((value) => !value || isPlausiblePhone(value)),
  phoneDialCode: z.string().trim().refine((value) => !value || dialCodes.has(value)),
  reason: z.string().trim().min(12).max(800),
  sourceOfFunds: z.string().trim().refine((value) => !value || sourceOfFundsValues.includes(value as (typeof sourceOfFundsValues)[number]))
});

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canEditParticipantCards(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "guest" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu
          ? "Полную карточку участника могут корректировать только главный администратор, администратор и менеджер техподдержки."
          : "Only super administrators, administrators and technical support managers can update the full participant card."
      },
      { status: 403 }
    );
  }

  const { userId } = await params;
  const parsed = profileUpdateSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте карточку" : "Check the participant card",
        message:
          localeRu
            ? "Исправьте поля, выделенные красным, и сохраните карточку ещё раз."
            : "Fix the fields highlighted in red and save the card again.",
        fieldErrors: zodFieldErrors(parsed.error, profileFieldLabels(localeRu))
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы сохранить административную правку карточки." : "Enter CONFIRM to save the administrative card update.",
        fieldErrors: {
          confirmation: localeRu ? "Введите CONFIRM." : "Enter CONFIRM."
        }
      },
      { status: 400 }
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      investorProfile: true,
      kycApplications: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    }
  });

  if (!targetUser) {
    return NextResponse.json(
      {
        title: localeRu ? "Клиент не найден" : "Client not found",
        message: localeRu ? "Обновите страницу и выберите клиента из списка." : "Refresh the page and choose the client from the list."
      },
      { status: 404 }
    );
  }

  const data = parsed.data;
  const emailChanged = targetUser.email.toLowerCase() !== data.email;

  if (targetUser.role !== Role.INVESTOR) {
    return NextResponse.json(
      {
        title: localeRu ? "Это не участник" : "Not a participant",
        message: localeRu ? "Эта форма предназначена для корректировки карточек участников." : "This form is intended for participant card updates."
      },
      { status: 400 }
    );
  }

  if (emailChanged) {
    const existingEmailUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true }
    });

    if (existingEmailUser && existingEmailUser.id !== userId) {
      return NextResponse.json(
        {
          title: localeRu ? "Email уже занят" : "Email already used",
          message: localeRu ? "Этот email уже привязан к другой карточке. Проверьте клиента или используйте другой адрес." : "This email is already linked to another card. Check the client or use another address.",
          fieldErrors: {
            email: localeRu ? "Email уже используется другой карточкой." : "Email is already used by another card."
          }
        },
        { status: 409 }
      );
    }
  }

  const birthDate = parseDate(data.dateOfBirth);
  const latestKyc = targetUser.kycApplications[0];
  const before = {
    address: targetUser.investorProfile?.address ?? "",
    citizenship: targetUser.investorProfile?.citizenship ?? "",
    city: targetUser.investorProfile?.city ?? "",
    country: targetUser.investorProfile?.country ?? "",
    dateOfBirth: targetUser.investorProfile?.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    email: targetUser.email,
    name: targetUser.name ?? "",
    occupation: latestKyc?.occupation ?? "",
    phone: targetUser.investorProfile?.phone ?? "",
    phoneDialCode: targetUser.investorProfile?.phoneDialCode ?? "",
    sourceOfFunds: latestKyc?.sourceOfFunds ?? ""
  };
  const after = {
    address: data.address,
    citizenship: data.citizenship,
    city: data.city,
    country: data.country,
    dateOfBirth: data.dateOfBirth,
    email: data.email,
    name: data.name,
    occupation: data.occupation,
    phone: data.phone,
    phoneDialCode: data.phoneDialCode,
    sourceOfFunds: data.sourceOfFunds
  };
  const changedFields = Object.entries(after)
    .filter(([key, value]) => before[key as keyof typeof before] !== value)
    .map(([key]) => key);

  if (!changedFields.length) {
    return NextResponse.json(
      {
        title: localeRu ? "Изменений нет" : "No changes",
        message: localeRu ? "Карточка уже содержит эти данные." : "The participant card already contains these details."
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email: data.email,
        emailVerified: emailChanged ? new Date() : targetUser.emailVerified,
        name: data.name
      }
    });

    await tx.investorProfile.upsert({
      where: { userId },
      update: {
        address: data.address || null,
        citizenship: data.citizenship || null,
        city: data.city || null,
        country: data.country || null,
        dateOfBirth: birthDate ?? null,
        phone: data.phone || null,
        phoneDialCode: data.phoneDialCode || null
      },
      create: {
        address: data.address || null,
        citizenship: data.citizenship || null,
        city: data.city || null,
        country: data.country || null,
        dateOfBirth: birthDate ?? null,
        phone: data.phone || null,
        phoneDialCode: data.phoneDialCode || null,
        userId
      }
    });

    if (latestKyc) {
      await tx.kycApplication.update({
        where: { id: latestKyc.id },
        data: {
          occupation: data.occupation || null,
          reviewerNote: data.reason,
          sourceOfFunds: data.sourceOfFunds || null
        }
      });
    } else if (data.occupation || data.sourceOfFunds) {
      await tx.kycApplication.create({
        data: {
          occupation: data.occupation || null,
          reviewerNote: data.reason,
          sourceOfFunds: data.sourceOfFunds || null,
          status: KycStatus.DRAFT,
          userId
        }
      });
    }

    await tx.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "user.profile.update",
        entityId: userId,
        entityType: "User",
        payload: {
          after,
          before,
          changedFields,
          reason: data.reason
        }
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Карточка обновлена" : "Participant card updated",
    message: localeRu ? "Данные сохранены, а правка записана в журнал действий." : "The details were saved and the update was written to the audit log.",
    tone: "success"
  });
}

function parseDate(value: string) {
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

function isPlausibleName(value: string) {
  return /^[\p{L}\p{M} .'-]{2,120}$/u.test(value) && /[\p{L}]{2,}/u.test(value);
}

function profileFieldLabels(localeRu: boolean) {
  return {
    address: localeRu ? "Укажите полный адрес проживания: город, район/улица, дом или ориентир." : "Enter a full residential address: city, area/street and building or landmark.",
    citizenship: localeRu ? "Выберите гражданство из списка." : "Select citizenship from the list.",
    city: localeRu ? "Укажите реальный город буквами, без набора символов или цифр." : "Enter a real city name with letters, not random symbols or numbers.",
    confirmation: localeRu ? "Введите CONFIRM." : "Enter CONFIRM.",
    country: localeRu ? "Выберите страну проживания из списка." : "Select country of residence from the list.",
    dateOfBirth: localeRu ? "Укажите корректную дату рождения. Участнику должно быть не меньше 18 лет." : "Enter a valid date of birth. The participant must be at least 18.",
    email: localeRu ? "Укажите корректный email участника." : "Enter a valid participant email.",
    name: localeRu ? "Укажите имя участника буквами." : "Enter the participant name with letters.",
    occupation: localeRu ? "Укажите профессию словами, без набора букв или цифр." : "Enter an occupation in words, not random letters or numbers.",
    phone: localeRu ? "Укажите корректный номер телефона." : "Enter a valid phone number.",
    phoneDialCode: localeRu ? "Выберите телефонный код страны." : "Select a country phone code.",
    reason: localeRu ? "Укажите причину правки минимум 12 символов." : "Enter an update reason of at least 12 characters.",
    sourceOfFunds: localeRu ? "Выберите источник средств." : "Select source of funds."
  };
}
