import { InvestmentStatus, PaymentStatus, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const investmentActionSchema = z.object({
  action: z.enum(["confirm", "reject"]),
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
  const parsed = investmentActionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте действие" : "Check the action",
        message: localeRu ? "Выберите подтверждение или отклонение заявки." : "Choose whether to confirm or reject the application."
      },
      { status: 400 }
    );
  }

  const application = await prisma.investmentApplication.findUnique({
    where: { id: applicationId },
    include: {
      project: true,
      user: {
        include: {
          wallet: true
        }
      }
    }
  });

  if (!application) {
    return NextResponse.json(
      {
        title: localeRu ? "Заявка не найдена" : "Application not found",
        message: localeRu ? "Обновите страницу и выберите заявку из списка." : "Refresh the page and choose an application from the list."
      },
      { status: 404 }
    );
  }

  if (application.status !== InvestmentStatus.PENDING) {
    return NextResponse.json(
      {
        title: localeRu ? "Заявка уже обработана" : "Application already processed",
        message: localeRu ? "Эта заявка уже была подтверждена или отклонена." : "This application has already been confirmed or rejected."
      },
      { status: 409 }
    );
  }

  if (parsed.data.action === "confirm") {
    const wallet = application.user.wallet;

    if (!wallet || wallet.availableUsdt.lt(application.amountUsdt)) {
      return NextResponse.json(
        {
          title: localeRu ? "Недостаточно баланса" : "Insufficient balance",
          message:
            localeRu
              ? "Перед подтверждением заявки участнику нужно иметь доступный баланс на сумму участия."
              : "Before confirmation, the participant needs enough available balance for the participation amount."
        },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.investmentApplication.update({
        where: { id: application.id },
        data: {
          status: InvestmentStatus.CONFIRMED,
          adminNote: parsed.data.note
        }
      }),
      prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          availableUsdt: { decrement: application.amountUsdt }
        }
      }),
      prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: TransactionType.INVESTMENT,
          status: PaymentStatus.CONFIRMED,
          amountUsdt: application.amountUsdt,
          note: `${application.project.titleEn} · ${application.id}`
        }
      }),
      prisma.adminAuditLog.create({
        data: {
          actorId: session?.user?.id,
          action: "investment.confirm",
          entityType: "InvestmentApplication",
          entityId: application.id,
          payload: {
            amountUsdt: application.amountUsdt.toString(),
            projectId: application.projectId,
            note: parsed.data.note
          }
        }
      })
    ]);

    return NextResponse.json({
      title: localeRu ? "Заявка подтверждена" : "Application confirmed",
      message: localeRu ? "Сумма списана с доступного баланса участника." : "The amount was deducted from the participant's available balance."
    });
  }

  await prisma.$transaction([
    prisma.investmentApplication.update({
      where: { id: application.id },
      data: {
        status: InvestmentStatus.REJECTED,
        adminNote: parsed.data.note
      }
    }),
    prisma.adminAuditLog.create({
      data: {
        actorId: session?.user?.id,
        action: "investment.reject",
        entityType: "InvestmentApplication",
        entityId: application.id,
        payload: {
          amountUsdt: application.amountUsdt.toString(),
          projectId: application.projectId,
          note: parsed.data.note
        }
      }
    })
  ]);

  return NextResponse.json({
    title: localeRu ? "Заявка отклонена" : "Application rejected",
    message: localeRu ? "Участник увидит обновлённый статус в кабинете." : "The participant will see the updated status in the cabinet."
  });
}
