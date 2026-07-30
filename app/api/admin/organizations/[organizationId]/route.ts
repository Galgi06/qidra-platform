import { OrganizationStatus, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  action: z.enum(["approve", "reject", "review"])
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ organizationId: string }> }) {
  const localeRu = isRu(request);
  await requireAdmin(localeRu ? "ru" : "en", `/admin/organizations`);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте действие" : "Check the action",
        message: localeRu ? "Выберите корректный статус компании." : "Choose a valid company status."
      },
      { status: 400 }
    );
  }

  const { organizationId } = await params;
  const nextStatus: Record<typeof parsed.data.action, OrganizationStatus> = {
    approve: OrganizationStatus.APPROVED,
    reject: OrganizationStatus.REJECTED,
    review: OrganizationStatus.REVIEW
  };

  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true, status: true, displayName: true } });

  if (!organization) {
    return NextResponse.json(
      {
        title: localeRu ? "Компания не найдена" : "Company not found",
        message: localeRu ? "Обновите страницу и попробуйте снова." : "Refresh the page and try again."
      },
      { status: 404 }
    );
  }

  const status = nextStatus[parsed.data.action];

  await prisma.$transaction([
    prisma.organization.update({
      where: { id: organizationId },
      data: { status }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "organization.status.update",
        entityId: organizationId,
        entityType: "Organization",
        payload: {
          from: organization.status,
          to: status,
          displayName: organization.displayName
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Статус обновлён" : "Status updated",
    message: localeRu ? "Профиль компании сохранён." : "The company profile was saved.",
    tone: "success"
  });
}
