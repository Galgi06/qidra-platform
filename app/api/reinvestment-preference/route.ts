import { KycStatus, ProjectStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { REINVESTMENT_TERMS_VERSION } from "@/lib/reinvestment";

const preferenceSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("disable") }),
  z.object({
    action: z.literal("enable"),
    allocationPercent: z.coerce.number().int().min(1).max(100),
    targetProjectId: z.string().trim().min(1),
    termsAccepted: z.literal("on")
  })
]);

type SessionUser = { user?: { id?: string } };

export async function POST(request: NextRequest) {
  const localeRu = request.nextUrl.searchParams.get("lang") !== "en";
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ title: localeRu ? "Нужен вход" : "Sign in required", message: localeRu ? "Войдите в аккаунт." : "Sign in to your account." }, { status: 401 });
  }

  const rateLimit = checkRateLimit({ key: `reinvestment:preference:${userId}`, limit: 20, request, windowMs: 60 * 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);

  const parsed = preferenceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте настройку" : "Check the setting",
        message: localeRu ? "Выберите проект, процент от 1 до 100 и подтвердите условия." : "Choose a project, a percentage from 1 to 100, and accept the terms."
      },
      { status: 400 }
    );
  }

  if (parsed.data.action === "disable") {
    await prisma.$transaction([
      prisma.autoReinvestmentPreference.updateMany({ where: { userId }, data: { enabled: false } }),
      prisma.adminAuditLog.create({
        data: { actorId: userId, action: "reinvestment.preference.disable", entityType: "User", entityId: userId }
      })
    ]);

    return NextResponse.json({
      title: localeRu ? "Автореинвест отключён" : "Auto-reinvestment disabled",
      message: localeRu ? "Будущие дивиденды будут поступать на доступный баланс." : "Future dividends will be credited to your available balance."
    });
  }

  const enabledPreference = parsed.data;

  const [targetProject, approvedKyc] = await Promise.all([
    prisma.project.findUnique({
      where: { id: enabledPreference.targetProjectId },
      select: { fundedUsdt: true, id: true, status: true, targetUsdt: true }
    }),
    prisma.kycApplication.findFirst({ where: { userId, status: KycStatus.APPROVED }, select: { id: true } })
  ]);

  if (!targetProject || targetProject.status !== ProjectStatus.ACTIVE || targetProject.fundedUsdt.gte(targetProject.targetUsdt)) {
    return NextResponse.json(
      { title: localeRu ? "Проект недоступен" : "Project unavailable", message: localeRu ? "Выберите активный проект со свободным объёмом." : "Choose an active project with available capacity." },
      { status: 409 }
    );
  }
  if (!approvedKyc) {
    return NextResponse.json(
      { title: localeRu ? "Профиль не одобрен" : "Profile not approved", message: localeRu ? "Автореинвест доступен после одобрения KYC." : "Auto-reinvestment is available after KYC approval." },
      { status: 403 }
    );
  }

  const acceptedAt = new Date();
  const preference = await prisma.$transaction(async (tx) => {
    const saved = await tx.autoReinvestmentPreference.upsert({
      where: { userId },
      create: {
        acceptedAt,
        allocationPercent: enabledPreference.allocationPercent,
        enabled: true,
        targetProjectId: targetProject.id,
        termsVersion: REINVESTMENT_TERMS_VERSION,
        userId
      },
      update: {
        acceptedAt,
        allocationPercent: enabledPreference.allocationPercent,
        enabled: true,
        targetProjectId: targetProject.id,
        termsVersion: REINVESTMENT_TERMS_VERSION
      }
    });
    await tx.adminAuditLog.create({
      data: {
        actorId: userId,
        action: "reinvestment.preference.enable",
        entityId: saved.id,
        entityType: "AutoReinvestmentPreference",
        payload: { allocationPercent: enabledPreference.allocationPercent, targetProjectId: targetProject.id, termsVersion: REINVESTMENT_TERMS_VERSION }
      }
    });
    return saved;
  });

  return NextResponse.json({
    title: localeRu ? "Автореинвест включён" : "Auto-reinvestment enabled",
    message: localeRu
      ? `${preference.allocationPercent.toString()}% будущих дивидендов будет направляться в выбранный проект. Если реинвест невозможен, деньги останутся на балансе.`
      : `${preference.allocationPercent.toString()}% of future dividends will be directed to the selected project. If reinvestment is unavailable, the funds will remain in your wallet.`
  });
}
