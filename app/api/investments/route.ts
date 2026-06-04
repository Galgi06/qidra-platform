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
    select: { availableUsdt: true }
  });
  const activeApplication = await prisma.investmentApplication.findFirst({
    where: {
      userId,
      projectId: project.id,
      status: InvestmentStatus.PENDING
    },
    orderBy: { createdAt: "desc" }
  });
  const reservedApplications = await prisma.investmentApplication.aggregate({
    _sum: { amountUsdt: true },
    where: {
      userId,
      status: InvestmentStatus.PENDING,
      NOT: activeApplication ? { id: activeApplication.id } : undefined
    }
  });
  const availableUsdt = wallet?.availableUsdt ?? new Prisma.Decimal(0);
  const reservedUsdt = reservedApplications._sum.amountUsdt ?? new Prisma.Decimal(0);
  const requestedUsdt = new Prisma.Decimal(parsed.data.amount);
  const rawFreeUsdt = availableUsdt.minus(reservedUsdt);
  const freeUsdt = rawFreeUsdt.gt(0) ? rawFreeUsdt : new Prisma.Decimal(0);

  if (freeUsdt.lt(requestedUsdt)) {
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

  await prisma.$transaction(async (tx) => {
    const applicationData = {
      amountUsdt: parsed.data.amount,
      termsAcceptedAt: new Date(),
      contractAcceptedAt: new Date()
    };

    if (activeApplication) {
      await tx.investmentApplication.update({
        where: { id: activeApplication.id },
        data: applicationData
      });
      return;
    }

    await tx.investmentApplication.create({
      data: {
        userId,
        projectId: project.id,
        status: InvestmentStatus.PENDING,
        ...applicationData
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Заявка создана" : "Application created",
    message:
      localeRu
        ? "Мы приняли заявку на участие. Статус появится в кабинете после проверки профиля и условий."
        : "We received your participation application. The status will appear in your cabinet after profile and terms review."
  });
}
