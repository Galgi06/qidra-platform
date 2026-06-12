import { InvestmentStatus, KycStatus, PaymentStatus, Prisma, ProjectStatus, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createOrganizationLead } from "@/lib/company-workspace";
import { authOptions } from "@/lib/next-auth";
import { ensureBaseProjects } from "@/lib/project-catalog";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { parseRealEstateData } from "@/lib/real-estate";

const amountSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(",", ".").replace(/\s/g, ""))
  .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "invalid")
  .refine((value) => new Prisma.Decimal(value).gte(100), "minimum");

const applicationSchema = z.object({
  projectSlug: z.string().trim().min(2).max(120),
  amount: amountSchema,
  termsAccepted: z.literal("on"),
  contractAccepted: z.literal("on"),
  comment: z.string().trim().max(1200).optional(),
  contactCountry: z.string().trim().max(120).optional(),
  email: z.string().trim().email().optional(),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  phone: z.string().trim().max(120).optional(),
  qidraDisclaimerAccepted: z.literal("on").optional(),
  riskAccepted: z.literal("on").optional(),
  transferAccepted: z.literal("on").optional(),
  whatsapp: z.string().trim().max(120).optional()
});

type SessionUser = {
  user?: {
    id?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

function formatUsdt(value: Prisma.Decimal) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value.toNumber())} USDT`;
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в аккаунт, чтобы подать заявку на участие." : "Sign in to submit a participation application."
      },
      { status: 401 }
    );
  }

  const rateLimit = checkRateLimit({
    key: `investment:application:${userId}`,
    limit: 20,
    request,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(localeRu, rateLimit.retryAfterSeconds);
  }

  const parsed = applicationSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте заявку" : "Check the application",
        message:
          localeRu
            ? "Укажите сумму от 100 USDT и подтвердите, что изучили условия проекта."
            : "Enter an amount from 100 USDT and confirm that you reviewed the project terms."
      },
      { status: 400 }
    );
  }

  await ensureBaseProjects();
  const project = await prisma.project.findUnique({
    where: { slug: parsed.data.projectSlug }
  });

  if (!project) {
    return NextResponse.json(
      {
        title: localeRu ? "Проект не найден" : "Project not found",
        message: localeRu ? "Выберите проект из каталога Qidra." : "Choose a project from the Qidra catalog."
      },
      { status: 404 }
    );
  }

  if (project.status !== ProjectStatus.ACTIVE) {
    return NextResponse.json(
      {
        title: localeRu ? "Проект недоступен" : "Project is not available",
        message:
          localeRu
            ? "Заявки на участие принимаются только по опубликованным проектам с открытым сбором."
            : "Participation applications are accepted only for published projects with an open raise."
      },
      { status: 409 }
    );
  }

  const realEstate = parseRealEstateData(project.propertyData);
  if (realEstate) {
    const missingLeadFields = ["firstName", "lastName", "email", "phone", "contactCountry"].filter((field) => {
      const value = parsed.data[field as keyof typeof parsed.data];
      return typeof value !== "string" || !value.trim();
    });

    if (missingLeadFields.length || !parsed.data.riskAccepted || !parsed.data.qidraDisclaimerAccepted || !parsed.data.transferAccepted) {
      return NextResponse.json(
        {
          title: localeRu ? "Проверьте форму" : "Check the form",
          message:
            localeRu
              ? "Для заявки по недвижимости заполните контактные данные и подтвердите предупреждения о рисках и роли Qidra."
              : "For a real estate application, complete the contact details and confirm the risk and Qidra role disclosures."
        },
        { status: 400 }
      );
    }
  }

  const reviewApplication = await prisma.kycApplication.findFirst({
    where: {
      userId,
      status: KycStatus.APPROVED
    },
    orderBy: { createdAt: "desc" }
  });

  if (!reviewApplication) {
    return NextResponse.json(
      {
        title: localeRu ? "Заполните профиль" : "Complete your profile",
        message:
          localeRu
            ? "Перед заявкой на участие дождитесь одобрения профиля и документов."
            : "Wait until your profile and documents are approved before applying for participation."
      },
      { status: 403 }
    );
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { id: true, availableUsdt: true }
  });
  const activeApplication = await prisma.investmentApplication.findFirst({
    where: {
      userId,
      projectId: project.id,
      status: InvestmentStatus.PENDING
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, reservedUsdt: true }
  });
  const zeroUsdt = new Prisma.Decimal(0);
  const availableUsdt = wallet?.availableUsdt ?? zeroUsdt;
  const activeReservedUsdt = activeApplication?.reservedUsdt ?? zeroUsdt;
  const requestedUsdt = new Prisma.Decimal(parsed.data.amount);
  const remainingTargetUsdt = project.targetUsdt.minus(project.fundedUsdt);

  if (remainingTargetUsdt.lte(0) || requestedUsdt.gt(remainingTargetUsdt)) {
    return NextResponse.json(
      {
        title: localeRu ? "Сумма превышает доступный объём" : "Amount exceeds available capacity",
        message:
          localeRu
            ? `По проекту доступно для участия ${formatUsdt(remainingTargetUsdt.gt(0) ? remainingTargetUsdt : zeroUsdt)}. Укажите сумму в пределах оставшегося объёма.`
            : `${formatUsdt(remainingTargetUsdt.gt(0) ? remainingTargetUsdt : zeroUsdt)} is available for this project. Enter an amount within the remaining capacity.`
      },
      { status: 409 }
    );
  }

  const rawFreeUsdt = availableUsdt.plus(activeReservedUsdt);
  const freeUsdt = rawFreeUsdt.gt(0) ? rawFreeUsdt : zeroUsdt;
  if (!wallet || freeUsdt.lt(requestedUsdt)) {
    const shortfallUsdt = requestedUsdt.minus(freeUsdt);

    return NextResponse.json(
      {
        title: localeRu ? "Недостаточно доступного баланса" : "Insufficient available balance",
        message:
          localeRu
            ? `На доступном балансе ${formatUsdt(freeUsdt)}. Для этой заявки нужно пополнить ещё ${formatUsdt(shortfallUsdt)}.`
            : `Your available balance is ${formatUsdt(freeUsdt)}. Top up another ${formatUsdt(shortfallUsdt)} for this application.`,
        availableUsdt: freeUsdt.toString(),
        shortfallUsdt: shortfallUsdt.toString()
      },
      { status: 409 }
    );
  }

  try {
    let committedApplicationId = activeApplication?.id;

    await prisma.$transaction(async (tx) => {
      const amountFromAvailableUsdt = requestedUsdt.minus(activeReservedUsdt);
      const availableDebitUsdt = amountFromAvailableUsdt.gt(0) ? amountFromAvailableUsdt : zeroUsdt;
      const availableCreditUsdt = amountFromAvailableUsdt.lt(0) ? amountFromAvailableUsdt.abs() : zeroUsdt;

      const walletUpdate = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          availableUsdt: { gte: availableDebitUsdt },
          reservedUsdt: { gte: activeReservedUsdt }
        },
        data: {
          ...(availableDebitUsdt.gt(0) ? { availableUsdt: { decrement: availableDebitUsdt } } : {}),
          ...(availableCreditUsdt.gt(0) ? { availableUsdt: { increment: availableCreditUsdt } } : {}),
          ...(activeReservedUsdt.gt(0) ? { reservedUsdt: { decrement: activeReservedUsdt } } : {})
        }
      });

      if (walletUpdate.count !== 1) {
        throw new Error("insufficient_available_balance");
      }

      const applicationData = {
        amountUsdt: requestedUsdt,
        reservedUsdt: zeroUsdt,
        status: InvestmentStatus.CONFIRMED,
        termsAcceptedAt: new Date(),
        contractAcceptedAt: new Date(),
        contactDetails: realEstate
          ? {
              comment: parsed.data.comment || undefined,
              contactCountry: parsed.data.contactCountry || undefined,
              firstName: parsed.data.firstName || undefined,
              lastName: parsed.data.lastName || undefined,
              phone: parsed.data.phone || undefined,
              qidraDisclaimerAccepted: parsed.data.qidraDisclaimerAccepted === "on",
              riskAccepted: parsed.data.riskAccepted === "on",
              transferAccepted: parsed.data.transferAccepted === "on",
              whatsapp: parsed.data.whatsapp || undefined
            }
          : undefined
      };
      let applicationId = activeApplication?.id;

      if (activeApplication) {
        await tx.investmentApplication.update({
          where: { id: activeApplication.id },
          data: applicationData
        });
      } else {
        const application = await tx.investmentApplication.create({
          data: {
            userId,
            projectId: project.id,
            ...applicationData
          }
        });
        applicationId = application.id;
      }

      committedApplicationId = applicationId;

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.INVESTMENT,
          status: PaymentStatus.CONFIRMED,
          amountUsdt: requestedUsdt,
          note: `${project.titleEn} · ${applicationId}`
        }
      });

      const projectCapacityUpdate = await tx.project.updateMany({
        where: {
          id: project.id,
          status: ProjectStatus.ACTIVE,
          fundedUsdt: { lte: project.targetUsdt.minus(requestedUsdt) }
        },
        data: {
          fundedUsdt: { increment: requestedUsdt }
        }
      });

      if (projectCapacityUpdate.count !== 1) {
        throw new Error("project_capacity_exceeded");
      }

      const updatedProject = await tx.project.findUnique({
        where: { id: project.id },
        select: { fundedUsdt: true, targetUsdt: true }
      });

      if (updatedProject && updatedProject.fundedUsdt.gte(updatedProject.targetUsdt)) {
        await tx.project.update({
          where: { id: project.id },
          data: { status: ProjectStatus.FUNDED }
        });
      }

      await tx.adminAuditLog.create({
        data: {
          actorId: userId,
          action: activeApplication ? "investment.activate.from_pending" : "investment.activate",
          entityType: "InvestmentApplication",
          entityId: applicationId,
          payload: {
            amountUsdt: requestedUsdt.toString(),
            projectFundedUsdt: updatedProject?.fundedUsdt.toString() ?? null,
            projectId: project.id,
            source: "verified_wallet_balance"
          }
        }
      });
    });

    if (project.organizationId && committedApplicationId) {
      const fullName = [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(" ").trim();

      await createOrganizationLead({
        applicationId: committedApplicationId,
        investorUserId: userId,
        leadCountry: parsed.data.contactCountry || undefined,
        leadEmail: parsed.data.email || undefined,
        leadName: fullName || undefined,
        leadPhone: parsed.data.phone || undefined,
        leadWhatsapp: parsed.data.whatsapp || undefined,
        metadata: {
          projectSlug: project.slug,
          realEstateLead: Boolean(realEstate)
        },
        note: parsed.data.comment || undefined,
        organizationId: project.organizationId,
        projectId: project.id,
        requestedAmountUsdt: requestedUsdt.toString()
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "insufficient_available_balance") {
      return NextResponse.json(
        {
          title: localeRu ? "Недостаточно доступного баланса" : "Insufficient available balance",
          message:
            localeRu
              ? "Баланс изменился во время отправки заявки. Обновите страницу и проверьте доступную сумму."
              : "The balance changed while submitting the application. Refresh the page and check the available amount."
        },
        { status: 409 }
      );
    }

    if (error instanceof Error && error.message === "project_capacity_exceeded") {
      return NextResponse.json(
        {
          title: localeRu ? "Свободный объём проекта изменился" : "Project capacity changed",
          message:
            localeRu
              ? "Пока вы отправляли заявку, доступный объём проекта изменился. Обновите страницу и укажите сумму в пределах остатка."
              : "The project's available capacity changed while submitting. Refresh the page and enter an amount within the remaining capacity."
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    title: localeRu ? "Партнёрский контракт активирован" : "Partnership contract activated",
    message:
      localeRu
        ? `Участие в проекте «${project.titleRu}» на сумму ${formatUsdt(requestedUsdt)} активировано из проверенного баланса. Контракт отображается в разделе «Моё участие».`
        : `Participation in “${project.titleEn}” for ${formatUsdt(requestedUsdt)} was activated from verified balance. The contract is shown in My participation.`
  });
}
