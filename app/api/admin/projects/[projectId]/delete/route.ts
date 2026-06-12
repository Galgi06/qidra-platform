import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const deleteSchema = z.object({
  confirmation: z.string().trim(),
  reason: z.string().trim().min(12).max(800),
  slug: z.string().trim().min(3).max(120)
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ projectId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const actorRole = session?.user?.role as Role | undefined;

  if (!session?.user?.id || (actorRole !== Role.ADMIN && actorRole !== Role.SUPER_ADMIN)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен администратор" : "Administrator required",
        message: localeRu ? "Удалять проекты может только администратор." : "Only an administrator can delete projects."
      },
      { status: 403 }
    );
  }

  const { projectId } = await params;
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        fieldErrors: parsed.error.flatten().fieldErrors,
        title: localeRu ? "Проверьте форму" : "Check the form",
        message:
          localeRu
            ? "Введите адрес проекта, причину не короче 12 символов и подтверждение DELETE."
            : "Enter the project address, a reason of at least 12 characters and DELETE confirmation."
      },
      { status: 400 }
    );
  }

  if (parsed.data.confirmation !== "DELETE") {
    return NextResponse.json(
      {
        fieldErrors: {
          confirmation: localeRu ? "Введите DELETE, чтобы подтвердить удаление проекта." : "Enter DELETE to confirm project deletion."
        },
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Подтверждение должно быть ровно DELETE." : "The confirmation must be exactly DELETE."
      },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: {
          dividendPeriods: true,
          documents: true,
          investments: true,
          reports: true
        }
      }
    }
  });

  if (!project) {
    return NextResponse.json(
      {
        title: localeRu ? "Проект не найден" : "Project not found",
        message: localeRu ? "Обновите страницу и выберите проект из списка." : "Refresh the page and choose a project from the list."
      },
      { status: 404 }
    );
  }

  if (parsed.data.slug.toLowerCase() !== project.slug.toLowerCase()) {
    return NextResponse.json(
      {
        fieldErrors: {
          slug: localeRu ? "Адрес проекта должен совпадать с удаляемой карточкой." : "The project address must match the project being deleted."
        },
        title: localeRu ? "Адрес не совпадает" : "Address does not match",
        message: localeRu ? "Введите адрес именно этой карточки проекта." : "Enter the address from this project card."
      },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.adminAuditLog.create({
      data: {
        actorId: session.user.id,
        action: "project.delete.permanent",
        entityType: "Project",
        entityId: project.id,
        payload: {
          counts: project._count,
          fundedUsdt: project.fundedUsdt.toString(),
          reason: parsed.data.reason,
          slug: project.slug,
          status: project.status,
          titleEn: project.titleEn,
          titleRu: project.titleRu
        }
      }
    }),
    prisma.project.delete({
      where: { id: project.id }
    })
  ]);

  return NextResponse.json({
    redirectTo: `/admin/projects?lang=${localeRu ? "ru" : "en"}`,
    title: localeRu ? "Проект удалён" : "Project deleted",
    message:
      localeRu
        ? "Карточка проекта, документы, отчёты, заявки участия и связанные дивидендные периоды удалены."
        : "The project card, documents, reports, participation applications and linked dividend periods were removed.",
    tone: "warning"
  });
}
