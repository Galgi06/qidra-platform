import { OrganizationStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  city: z.string().trim().max(120).optional(),
  contactEmail: z.string().trim().email().max(255).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  displayName: z.string().trim().min(2).max(180),
  heroImageUrl: z.string().trim().max(500).optional(),
  legalName: z.string().trim().min(2).max(180),
  logoUrl: z.string().trim().max(500).optional(),
  overview: z.string().trim().max(4000).optional(),
  productSummary: z.string().trim().max(4000).optional(),
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  representativeName: z.string().trim().max(120).optional(),
  representativeRole: z.string().trim().max(120).optional(),
  submitForReview: z.string().optional(),
  targetAudience: z.string().trim().max(4000).optional(),
  typeLabel: z.string().trim().max(120).optional(),
  valueProposition: z.string().trim().max(4000).optional(),
  website: z.string().trim().max(255).optional()
});

type SessionUser = { user?: { id?: string } };

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт компании." : "Sign in to your company account."
      },
      { status: 401 }
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте профиль" : "Check the profile",
        message: localeRu ? "Заполните публичное название, slug и базовые данные компании." : "Fill in the public name, slug, and basic company details."
      },
      { status: 400 }
    );
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    include: { organization: true }
  });

  if (!membership) {
    return NextResponse.json(
      {
        title: localeRu ? "Компания не найдена" : "Company not found",
        message: localeRu ? "Сначала создайте кабинет компании." : "Create a company workspace first."
      },
      { status: 404 }
    );
  }

  const duplicate = await prisma.organization.findFirst({
    where: {
      publicSlug: parsed.data.publicSlug,
      id: { not: membership.organizationId }
    },
    select: { id: true }
  });

  if (duplicate) {
    return NextResponse.json(
      {
        title: localeRu ? "Slug уже занят" : "Slug already taken",
        message: localeRu ? "Выберите другой публичный адрес компании." : "Choose another public company slug."
      },
      { status: 409 }
    );
  }

  await prisma.organization.update({
    where: { id: membership.organizationId },
    data: {
      city: emptyToNull(parsed.data.city),
      contactEmail: emptyToNull(parsed.data.contactEmail),
      contactPhone: emptyToNull(parsed.data.contactPhone),
      country: emptyToNull(parsed.data.country),
      displayName: parsed.data.displayName,
      heroImageUrl: emptyToNull(parsed.data.heroImageUrl),
      legalName: parsed.data.legalName,
      logoUrl: emptyToNull(parsed.data.logoUrl),
      overview: emptyToNull(parsed.data.overview),
      productSummary: emptyToNull(parsed.data.productSummary),
      publicSlug: parsed.data.publicSlug,
      representativeName: emptyToNull(parsed.data.representativeName),
      representativeRole: emptyToNull(parsed.data.representativeRole),
      status: parsed.data.submitForReview === "on" ? OrganizationStatus.REVIEW : membership.organization.status,
      targetAudience: emptyToNull(parsed.data.targetAudience),
      typeLabel: emptyToNull(parsed.data.typeLabel),
      valueProposition: emptyToNull(parsed.data.valueProposition),
      website: emptyToNull(parsed.data.website)
    }
  });

  return NextResponse.json({
    title: localeRu ? "Профиль компании обновлён" : "Company profile updated",
    message:
      parsed.data.submitForReview === "on"
        ? localeRu
          ? "Профиль компании сохранён и отправлен на проверку."
          : "The company profile was saved and moved into review."
        : localeRu
          ? "Изменения сохранены."
          : "Changes were saved."
  });
}

function emptyToNull(value: string | undefined) {
  return value && value.trim() ? value.trim() : null;
}
