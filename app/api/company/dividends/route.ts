import { OrganizationMemberRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";
import { dividendActionSchema, executeDividendAction } from "@/lib/dividend-actions";
import { canManageCompanyDividends } from "@/lib/organizations";

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
  const actorId = session?.user?.id;

  if (!actorId) {
    return NextResponse.json(
      {
        title: localeRu ? "Нужен вход" : "Sign in required",
        message: localeRu ? "Войдите в кабинет компании." : "Sign in to the company workspace."
      },
      { status: 401 }
    );
  }

  const parsed = dividendActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте данные" : "Check the data",
        message: localeRu ? "Заполните период, суммы и подтверждение действия." : "Fill in the period, amounts and confirmation."
      },
      { status: 400 }
    );
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: actorId },
    select: { organizationId: true, role: true }
  });

  if (!membership || !canManageCompanyDividends(membership.role as OrganizationMemberRole)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Управление дивидендами доступно только владельцу или администратору компании." : "Dividend operations are available only to the company owner or company admin."
      },
      { status: 403 }
    );
  }

  return executeDividendAction({
    actorId,
    data: parsed.data,
    localeRu,
    canAccessProject: async ({ periodId, projectId }) => {
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { organizationId: true }
        });

        return project?.organizationId === membership.organizationId;
      }

      if (periodId) {
        const period = await prisma.projectDividendPeriod.findUnique({
          where: { id: periodId },
          select: { project: { select: { organizationId: true } } }
        });

        return period?.project.organizationId === membership.organizationId;
      }

      return false;
    }
  });
}
