import { KycStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const kycActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional()
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Это действие доступно только администратору." : "This action is only available to an administrator."
      },
      { status: 403 }
    );
  }

  const { applicationId } = await params;
  const parsed = kycActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте действие" : "Check the action",
        message: localeRu ? "Выберите одобрение или отклонение анкеты." : "Choose whether to approve or reject the profile."
      },
      { status: 400 }
    );
  }

  const application = await prisma.kycApplication.findUnique({
    where: { id: applicationId }
  });

  if (!application) {
    return NextResponse.json(
      {
        title: localeRu ? "Анкета не найдена" : "Profile not found",
        message: localeRu ? "Обновите страницу и выберите анкету из списка." : "Refresh the page and choose a profile from the list."
      },
      { status: 404 }
    );
  }

  if (application.status !== KycStatus.SUBMITTED) {
    return NextResponse.json(
      {
        title: localeRu ? "Анкета уже обработана" : "Profile already processed",
        message: localeRu ? "Эта анкета уже была одобрена или отклонена." : "This profile has already been approved or rejected."
      },
      { status: 409 }
    );
  }

  const nextStatus = parsed.data.action === "approve" ? KycStatus.APPROVED : KycStatus.REJECTED;

  await prisma.$transaction([
    prisma.kycApplication.update({
      where: { id: application.id },
      data: {
        status: nextStatus,
        reviewedAt: new Date(),
        reviewerNote: parsed.data.note
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: parsed.data.action === "approve" ? "kyc.approve" : "kyc.reject",
        entityType: "KycApplication",
        entityId: application.id,
        payload: {
          status: nextStatus,
          note: parsed.data.note
        }
      }
    })
  ]);

  return NextResponse.json({
    title: parsed.data.action === "approve" ? (localeRu ? "Анкета одобрена" : "Profile approved") : localeRu ? "Анкета отклонена" : "Profile rejected",
    message:
      parsed.data.action === "approve"
        ? localeRu
          ? "Участник теперь может подавать заявки на участие."
          : "The participant can now submit participation applications."
        : localeRu
          ? "Участник увидит статус и сможет обновить анкету."
          : "The participant will see the status and can update the profile."
  });
}
