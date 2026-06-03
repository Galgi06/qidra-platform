import { InvestmentStatus, Prisma } from "@prisma/client";
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
      status: { in: ["SUBMITTED", "APPROVED"] }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!reviewApplication) {
    return NextResponse.json(
      {
        title: localeRu ? "Заполните профиль" : "Complete your profile",
        message:
          localeRu
            ? "Перед заявкой на участие отправьте профиль и документы на проверку."
            : "Submit your profile and documents for review before applying for participation."
      },
      { status: 403 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const activeApplication = await tx.investmentApplication.findFirst({
      where: {
        userId,
        projectId: project.id,
        status: InvestmentStatus.PENDING
      },
      orderBy: { createdAt: "desc" }
    });
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
