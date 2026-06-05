import { InvestmentStatus, KycStatus, Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { ensureBaseProjects } from "@/lib/project-catalog";
import { prisma } from "@/lib/prisma";

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
  contractAccepted: z.literal("on")
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
    await prisma.$transaction(async (tx) => {
      const reserveDeltaUsdt = requestedUsdt.minus(activeReservedUsdt);

      if (reserveDeltaUsdt.gt(0)) {
        const reserved = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            availableUsdt: { gte: reserveDeltaUsdt }
          },
          data: {
            availableUsdt: { decrement: reserveDeltaUsdt },
            reservedUsdt: { increment: reserveDeltaUsdt }
          }
        });

        if (reserved.count !== 1) {
          throw new Error("insufficient_available_balance");
        }
      }

      if (reserveDeltaUsdt.lt(0)) {
        const releaseUsdt = reserveDeltaUsdt.abs();
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            availableUsdt: { increment: releaseUsdt },
            reservedUsdt: { decrement: releaseUsdt }
          }
        });
      }

      const applicationData = {
        amountUsdt: requestedUsdt,
        reservedUsdt: requestedUsdt,
        termsAcceptedAt: new Date(),
        contractAcceptedAt: new Date()
      };

      if (activeApplication) {
        await tx.investmentApplication.update({
          where: { id: activeApplication.id },
          data: applicationData
        });
        await tx.adminAuditLog.create({
          data: {
            actorId: userId,
            action: "investment.request.update",
            entityType: "InvestmentApplication",
            entityId: activeApplication.id,
            payload: {
              amountUsdt: requestedUsdt.toString(),
              projectId: project.id,
              reservedDeltaUsdt: reserveDeltaUsdt.toString()
            }
          }
        });
        return;
      }

      const application = await tx.investmentApplication.create({
        data: {
          userId,
          projectId: project.id,
          status: InvestmentStatus.PENDING,
          ...applicationData
        }
      });
      await tx.adminAuditLog.create({
        data: {
          actorId: userId,
          action: "investment.request.create",
          entityType: "InvestmentApplication",
          entityId: application.id,
          payload: {
            amountUsdt: requestedUsdt.toString(),
            projectId: project.id
          }
        }
      });
    });
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

    throw error;
  }

  return NextResponse.json({
    title: localeRu ? "Заявка создана" : "Application created",
    message:
      localeRu
        ? "Мы приняли заявку на участие. Статус появится в профиле участника после проверки профиля и условий."
        : "We received your participation application. The status will appear in your participant profile after profile and terms review."
  });
}
