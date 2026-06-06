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

const noteSchema = z.string().trim().min(12).max(800);

const submissionActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("review"),
    note: noteSchema
  }),
  z.object({
    action: z.literal("reject"),
    note: noteSchema
  }),
  z.object({
    action: z.literal("prepare"),
    confirmation: z.string().trim(),
    descriptionEn: z.string().trim().min(20).max(5000),
    descriptionRu: z.string().trim().min(20).max(5000),
    location: z.string().trim().min(2).max(120),
    note: noteSchema,
    riskLevel: z.string().trim().min(2).max(80),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["DRAFT", "REVIEW"]).default("DRAFT"),
    structure: z.enum(["Mudaraba", "Musharaka"]).default("Mudaraba"),
    summaryEn: z.string().trim().min(5).max(260),
    summaryRu: z.string().trim().min(5).max(260),
    targetUsdt: amountSchema,
    titleEn: z.string().trim().min(2).max(160),
    titleRu: z.string().trim().min(2).max(160)
  })
]);

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Заявки на размещение может обрабатывать только администратор." : "Only an administrator can process listing submissions."
      },
      { status: 403 }
    );
  }

  const { submissionId } = await params;
  const parsed = submissionActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Укажите действие, причину не короче 12 символов и корректные данные проекта."
            : "Provide an action, a reason of at least 12 characters and valid project details."
      },
      { status: 400 }
    );
  }

  const submission = await prisma.projectSubmission.findUnique({
    where: { id: submissionId },
    include: { user: { select: { email: true, id: true, name: true } } }
  });

  if (!submission) {
    return NextResponse.json(
      {
        title: localeRu ? "Заявка не найдена" : "Submission not found",
        message: localeRu ? "Обновите страницу и выберите заявку из списка." : "Refresh the page and choose a submission from the list."
      },
      { status: 404 }
    );
  }

  if (parsed.data.action === "review") {
    if (submission.status !== "SUBMITTED") {
      return NextResponse.json(
        {
          title: localeRu ? "Статус уже изменён" : "Status already changed",
          message: localeRu ? "В проверку можно взять только новую отправленную заявку." : "Only a newly submitted request can be moved to review."
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.projectSubmission.update({
        where: { id: submission.id },
        data: {
          adminNote: parsed.data.note,
          status: "REVIEW"
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          actorId: session?.user?.id,
          action: "project.submission.review",
          entityId: submission.id,
          entityType: "ProjectSubmission",
          payload: {
            from: submission.status,
            note: parsed.data.note,
            participantEmail: submission.user.email,
            to: "REVIEW"
          }
        }
      })
    ]);

    return NextResponse.json({
      title: localeRu ? "Заявка взята в проверку" : "Submission moved to review",
      message: localeRu ? "Статус обновлён и действие записано в журнал." : "The status was updated and the action was written to the audit log.",
      tone: "success"
    });
  }

  if (parsed.data.action === "reject") {
    if (submission.status === "APPROVED") {
      return NextResponse.json(
        {
          title: localeRu ? "Проект уже подготовлен" : "Project already prepared",
          message: localeRu ? "Одобренную заявку нельзя отклонить без отдельной административной корректировки." : "An approved request cannot be rejected without a separate admin adjustment."
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.projectSubmission.update({
        where: { id: submission.id },
        data: {
          adminNote: parsed.data.note,
          status: "REJECTED"
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          actorId: session?.user?.id,
          action: "project.submission.reject",
          entityId: submission.id,
          entityType: "ProjectSubmission",
          payload: {
            from: submission.status,
            note: parsed.data.note,
            participantEmail: submission.user.email,
            to: "REJECTED"
          }
        }
      })
    ]);

    return NextResponse.json({
      title: localeRu ? "Заявка отклонена" : "Submission rejected",
      message: localeRu ? "Причина сохранена в карточке заявки и журнале действий." : "The reason was saved in the submission card and audit log.",
      tone: "warning"
    });
  }

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы создать черновик проекта из заявки." : "Enter CONFIRM to create a project draft from this submission."
      },
      { status: 400 }
    );
  }

  if (submission.status === "REJECTED") {
    return NextResponse.json(
      {
        title: localeRu ? "Заявка отклонена" : "Submission rejected",
        message: localeRu ? "Отклонённую заявку нельзя превратить в проект без повторной подачи участником." : "A rejected request cannot be converted into a project without a new participant submission."
      },
      { status: 409 }
    );
  }

  if (submission.projectId) {
    return NextResponse.json(
      {
        title: localeRu ? "Проект уже создан" : "Project already created",
        message:
          localeRu
            ? "Эта заявка уже связана с черновиком проекта. Откройте связанный проект в админке."
            : "This submission is already linked to a project draft. Open the linked project in admin."
      },
      { status: 409 }
    );
  }

  const existingProject = await prisma.project.findUnique({ where: { slug: parsed.data.slug } });

  if (existingProject) {
    return NextResponse.json(
      {
        title: localeRu ? "Slug уже занят" : "Slug already exists",
        message: localeRu ? "Выберите другой slug для проекта." : "Choose another slug for the project."
      },
      { status: 409 }
    );
  }

  const data = parsed.data;
  const projectStatus = data.status === "REVIEW" ? ProjectStatus.REVIEW : ProjectStatus.DRAFT;
  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        descriptionEn: data.descriptionEn,
        descriptionRu: data.descriptionRu,
        fundedUsdt: 0,
        location: data.location,
        riskLevel: data.riskLevel,
        slug: data.slug,
        status: projectStatus,
        structure: data.structure,
        summaryEn: data.summaryEn,
        summaryRu: data.summaryRu,
        targetUsdt: data.targetUsdt,
        titleEn: data.titleEn,
        titleRu: data.titleRu
      }
    });

    await tx.projectSubmission.update({
      where: { id: submission.id },
      data: {
        adminNote: data.note,
        projectId: created.id,
        status: "APPROVED"
      }
    });

    await tx.adminAuditLog.createMany({
      data: [
        {
          actorId: session?.user?.id,
          action: "project.submission.prepare",
          entityId: submission.id,
          entityType: "ProjectSubmission",
          payload: {
            from: submission.status,
            note: data.note,
            participantEmail: submission.user.email,
            projectId: created.id,
            projectSlug: created.slug,
            to: "APPROVED"
          }
        },
        {
          actorId: session?.user?.id,
          action: "project.create.from_submission",
          entityId: created.id,
          entityType: "Project",
          payload: {
            participantEmail: submission.user.email,
            projectSlug: created.slug,
            status: created.status,
            submissionId: submission.id,
            targetUsdt: created.targetUsdt.toString()
          }
        }
      ]
    });

    return created;
  });

  return NextResponse.json({
    title: localeRu ? "Черновик проекта создан" : "Project draft created",
    message:
      localeRu
        ? "Заявка одобрена, проект создан в админке. Проверьте публичные документы перед публикацией."
        : "The submission was approved and a project was created in admin. Review public documents before publishing.",
    projectId: project.id,
    tone: "success"
  });
}
