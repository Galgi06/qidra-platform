import { OrganizationLeadStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canManageCompanyLeads } from "@/lib/organizations";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  leadId: z.string().trim().min(2).max(120),
  note: z.string().trim().max(1200).optional(),
  status: z.nativeEnum(OrganizationLeadStatus)
});

type SessionUser = { user?: { id?: string } };

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ title: localeRu ? "Нужен вход" : "Sign in required", message: localeRu ? "Войдите в кабинет компании." : "Sign in to the company workspace." }, { status: 401 });
  }

  const membership = await prisma.organizationMember.findFirst({ where: { userId } });

  if (!membership || !canManageCompanyLeads(membership.role)) {
    return NextResponse.json({ title: localeRu ? "Нет доступа" : "Access denied", message: localeRu ? "Недостаточно прав для работы с лидами компании." : "You do not have permission to work with company leads." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ title: localeRu ? "Проверьте данные" : "Check the details", message: localeRu ? "Укажите лид, статус и примечание при необходимости." : "Provide the lead, status, and an optional note." }, { status: 400 });
  }

  const lead = await prisma.organizationLead.findFirst({
    where: {
      id: parsed.data.leadId,
      organizationId: membership.organizationId
    }
  });

  if (!lead) {
    return NextResponse.json({ title: localeRu ? "Лид не найден" : "Lead not found", message: localeRu ? "Этот лид недоступен в текущем кабинете компании." : "This lead is not available in the current company workspace." }, { status: 404 });
  }

  await prisma.organizationLead.update({
    where: { id: lead.id },
    data: {
      closedAt: parsed.data.status === OrganizationLeadStatus.CLOSED ? new Date() : null,
      contactedAt: parsed.data.status === OrganizationLeadStatus.CONTACTED ? new Date() : lead.contactedAt,
      note: parsed.data.note?.trim() || null,
      qualifiedAt: parsed.data.status === OrganizationLeadStatus.QUALIFIED ? new Date() : lead.qualifiedAt,
      status: parsed.data.status
    }
  });

  return NextResponse.json({
    title: localeRu ? "Лид обновлён" : "Lead updated",
    message: localeRu ? "Статус обращения сохранён." : "The lead status was saved."
  });
}
