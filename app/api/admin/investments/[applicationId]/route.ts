import { InvestmentStatus, KycStatus, PaymentStatus, Prisma, ProjectStatus, TransactionType } from "@prisma/client";
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
          wallet: true,
          kycApplications: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
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
    const latestKyc = application.user.kycApplications[0];

    if (latestKyc?.status !== KycStatus.APPROVED) {
      return NextResponse.json(
        {
          title: localeRu ? "KYC не одобрен" : "KYC is not approved",
          message:
            localeRu
              ? "Перед подтверждением заявки профиль и документы участника должны быть одобрены."
              : "Before confirming the application, the participant profile and documents must be approved."
        },
        { status: 409 }
      );
    }

    const reservedUsdt = application.reservedUsdt;
    const reserveGapUsdt = application.amountUsdt.minus(reservedUsdt);
    const amountFromAvailableUsdt = reserveGapUsdt.gt(0) ? reserveGapUsdt : new Prisma.Decimal(0);

    if (!wallet || wallet.availableUsdt.lt(amountFromAvailableUsdt)) {
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

    try {
      await prisma.$transaction(async (tx) => {
        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            availableUsdt: { gte: amountFromAvailableUsdt },
            reservedUsdt: { gte: reservedUsdt }
          },
          data: {
            availableUsdt: { decrement: amountFromAvailableUsdt },
            reservedUsdt: { decrement: reservedUsdt }
          }
        });

        if (walletUpdate.count !== 1) {
          throw new Error("insufficient_wallet_balance");
        }

        await tx.investmentApplication.update({
          where: { id: application.id },
          data: {
            status: InvestmentStatus.CONFIRMED,
            reservedUsdt: 0,
            adminNote: parsed.data.note
          }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.INVESTMENT,
            status: PaymentStatus.CONFIRMED,
            amountUsdt: application.amountUsdt,
            note: `${application.project.titleEn} · ${application.id}`
          }
        });

        const nextFundedUsdt = application.project.fundedUsdt.plus(application.amountUsdt);

        await tx.project.update({
          where: { id: application.projectId },
          data: {
            fundedUsdt: { increment: application.amountUsdt },
            ...(nextFundedUsdt.gte(application.project.targetUsdt) ? { status: ProjectStatus.FUNDED } : {})
          }
        });

        await tx.adminAuditLog.create({
          data: {
            actorId: session?.user?.id,
            action: "investment.confirm",
            entityType: "InvestmentApplication",
            entityId: application.id,
            payload: {
              amountUsdt: application.amountUsdt.toString(),
              projectFundedUsdt: nextFundedUsdt.toString(),
              projectId: application.projectId,
              note: parsed.data.note
            }
          }
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "insufficient_wallet_balance") {
        return NextResponse.json(
          {
            title: localeRu ? "Баланс изменился" : "Balance changed",
            message:
              localeRu
                ? "Свободный баланс или резерв участника изменился во время подтверждения. Обновите страницу и проверьте заявку снова."
                : "The participant available balance or reserve changed during confirmation. Refresh the page and check the request again."
          },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      title: localeRu ? "Заявка подтверждена" : "Application confirmed",
      message:
        localeRu
          ? "Зарезервированная сумма переведена в участие, а прогресс проекта обновлён."
          : "The reserved amount was moved into participation and the project progress was updated."
    });
  }

  await prisma.$transaction(async (tx) => {
    if (application.user.wallet && application.reservedUsdt.gt(0)) {
      await tx.wallet.update({
        where: { id: application.user.wallet.id },
        data: {
          availableUsdt: { increment: application.reservedUsdt },
          reservedUsdt: { decrement: application.reservedUsdt }
        }
      });
    }

    await tx.investmentApplication.update({
      where: { id: application.id },
      data: {
        status: InvestmentStatus.REJECTED,
        reservedUsdt: 0,
        adminNote: parsed.data.note
      }
    });

    await tx.adminAuditLog.create({
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
    });
  });

  return NextResponse.json({
    title: localeRu ? "Заявка отклонена" : "Application rejected",
    message: localeRu ? "Участник увидит обновлённый статус в профиле участника." : "The participant will see the updated status in the participant profile."
  });
}
