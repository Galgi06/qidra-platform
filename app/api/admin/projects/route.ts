import { Prisma, ProjectStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const amountSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(",", ".").replace(/\s/g, ""))
  .refine((value) => /^\d+(\.\d{1,6})?$/.test(value), "invalid")
  .refine((value) => new Prisma.Decimal(value).gt(0), "positive");

const optionalText = z.preprocess((value) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}, z.string().max(5000).optional());

const optionalDate = z.preprocess((value) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? value : date;
}, z.date().optional());

const projectSchema = z.object({
  titleRu: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  targetUsdt: amountSchema,
  structure: z.enum(["Mudaraba", "Musharaka"]).default("Mudaraba"),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.DRAFT),
  location: z.string().trim().max(120).optional(),
  riskLevel: z.string().trim().max(80).optional(),
  summaryRu: z.string().trim().min(5).max(260),
  summaryEn: z.string().trim().min(5).max(260),
  expectedReturnRu: z.string().trim().min(5).max(180),
  expectedReturnEn: z.string().trim().min(5).max(180),
  expectedYieldRu: z.string().trim().min(2).max(180),
  expectedYieldEn: z.string().trim().min(2).max(180),
  stageRu: optionalText,
  stageEn: optionalText,
  currentProgressRu: optionalText,
  currentProgressEn: optionalText,
  fundraisingStartAt: optionalDate,
  fundraisingEndAt: optionalDate,
  plannedLaunchAt: optionalDate,
  plannedDividendAt: optionalDate,
  participationTermRu: optionalText,
  participationTermEn: optionalText,
  raisePlanRu: optionalText,
  raisePlanEn: optionalText
}).superRefine((data, context) => {
  if (data.fundraisingStartAt && data.fundraisingEndAt) {
    const days = Math.ceil((data.fundraisingEndAt.getTime() - data.fundraisingStartAt.getTime()) / 86_400_000);

    if (days < 1 || days > 93) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "fundraising_period",
        path: ["fundraisingEndAt"]
      });
    }
  }
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

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Создавать проекты может только администратор." : "Only an administrator can create projects."
      },
      { status: 403 }
    );
  }

  const parsed = projectSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте проект" : "Check the project",
        message:
          localeRu
            ? "Заполните название, адрес проекта, сумму цели и краткое описание. Адрес проекта пишется латиницей через дефис, например qidra-new-project."
            : "Fill in the title, project URL address, target amount and summary. The project address must use latin letters with hyphens, for example qidra-new-project."
      },
      { status: 400 }
    );
  }

  const existing = await prisma.project.findUnique({ where: { slug: parsed.data.slug } });

  if (existing) {
    return NextResponse.json(
      {
        title: localeRu ? "Адрес проекта уже занят" : "Project address already exists",
        message: localeRu ? "Выберите другой адрес проекта латиницей." : "Choose another latin project address."
      },
      { status: 409 }
    );
  }

  if (parsed.data.status === ProjectStatus.ACTIVE || parsed.data.status === ProjectStatus.FUNDED) {
    return NextResponse.json(
      {
        title: localeRu ? "Сначала добавьте документы" : "Add documents first",
        message:
          localeRu
            ? "Новый проект создаётся как черновик или подготовка. Открыть сбор можно после добавления публичных документов."
            : "A new project is created as a draft or preparation. The raise can be opened after public documents are added."
      },
      { status: 409 }
    );
  }

  const project = await prisma.project.create({
    data: {
      slug: parsed.data.slug,
      titleRu: parsed.data.titleRu,
      titleEn: parsed.data.titleEn,
      summaryRu: parsed.data.summaryRu,
      summaryEn: parsed.data.summaryEn,
      descriptionRu: parsed.data.summaryRu,
      descriptionEn: parsed.data.summaryEn,
      expectedReturnRu: parsed.data.expectedReturnRu,
      expectedReturnEn: parsed.data.expectedReturnEn,
      expectedYieldRu: parsed.data.expectedYieldRu,
      expectedYieldEn: parsed.data.expectedYieldEn,
      stageRu: parsed.data.stageRu,
      stageEn: parsed.data.stageEn,
      currentProgressRu: parsed.data.currentProgressRu,
      currentProgressEn: parsed.data.currentProgressEn,
      fundraisingStartAt: parsed.data.fundraisingStartAt,
      fundraisingEndAt: parsed.data.fundraisingEndAt,
      plannedLaunchAt: parsed.data.plannedLaunchAt,
      plannedDividendAt: parsed.data.plannedDividendAt,
      participationTermRu: parsed.data.participationTermRu,
      participationTermEn: parsed.data.participationTermEn,
      raisePlanRu: parsed.data.raisePlanRu,
      raisePlanEn: parsed.data.raisePlanEn,
      status: parsed.data.status,
      targetUsdt: parsed.data.targetUsdt,
      fundedUsdt: 0,
      location: parsed.data.location || "UAE",
      structure: parsed.data.structure,
      riskLevel: parsed.data.riskLevel || "Moderate"
    }
  });

  await prisma.adminAuditLog.create({
    data: {
      actorId: session?.user?.id,
      action: "project.create",
      entityType: "Project",
      entityId: project.id,
      payload: {
        slug: project.slug,
        status: project.status
      }
    }
  });

  return NextResponse.json({
    title: localeRu ? "Черновик проекта создан" : "Project draft created",
    message:
      localeRu
        ? "Проект сохранён в базе. Его можно готовить к публикации и документам."
        : "The project was saved in the database. It can be prepared for publication and documents."
  });
}
