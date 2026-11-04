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
        const applicationClaim = await tx.investmentApplication.updateMany({
          where: { id: application.id, status: InvestmentStatus.PENDING },
          data: {
            status: InvestmentStatus.CONFIRMED,
            reservedUsdt: 0,
            adminNote: parsed.data.note
          }
        });

        if (applicationClaim.count !== 1) {
          throw new Error("application_already_processed");
        }

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

        const maximumCurrentFunding = application.project.targetUsdt.minus(application.amountUsdt);
        const projectUpdate = maximumCurrentFunding.gte(0)
          ? await tx.project.updateMany({
              where: {
                id: application.projectId,
                status: ProjectStatus.ACTIVE,
                fundedUsdt: { lte: maximumCurrentFunding }
              },
              data: { fundedUsdt: { increment: application.amountUsdt } }
            })
          : { count: 0 };

        if (projectUpdate.count !== 1) {
          throw new Error("project_capacity_changed");
        }

        const updatedProject = await tx.project.findUniqueOrThrow({
          where: { id: application.projectId },
          select: { fundedUsdt: true, targetUsdt: true }
        });

        if (updatedProject.fundedUsdt.gte(updatedProject.targetUsdt)) {
          await tx.project.update({ where: { id: application.projectId }, data: { status: ProjectStatus.FUNDED } });
        }

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: TransactionType.INVESTMENT,
            status: PaymentStatus.CONFIRMED,
            amountUsdt: application.amountUsdt,
            note: `${application.project.titleEn} · ${application.id}`
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
              projectFundedUsdt: updatedProject.fundedUsdt.toString(),
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

      if (error instanceof Error && error.message === "application_already_processed") {
        return alreadyProcessedResponse(localeRu);
      }

      if (error instanceof Error && error.message === "project_capacity_changed") {
        return NextResponse.json(
          {
            title: localeRu ? "Объём проекта изменился" : "Project capacity changed",
            message: localeRu
              ? "Свободный объём проекта изменился во время подтверждения. Обновите страницу и проверьте заявку снова."
              : "The project's available capacity changed during confirmation. Refresh the page and review the application again."
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

  try {
    await prisma.$transaction(async (tx) => {
      const applicationClaim = await tx.investmentApplication.updateMany({
        where: { id: application.id, status: InvestmentStatus.PENDING },
        data: {
          status: InvestmentStatus.REJECTED,
          reservedUsdt: 0,
          adminNote: parsed.data.note
        }
      });

      if (applicationClaim.count !== 1) {
        throw new Error("application_already_processed");
      }

      if (application.reservedUsdt.gt(0)) {
        if (!application.user.wallet) {
          throw new Error("reserved_balance_changed");
        }

        const walletUpdate = await tx.wallet.updateMany({
          where: {
            id: application.user.wallet.id,
            reservedUsdt: { gte: application.reservedUsdt }
          },
          data: {
            availableUsdt: { increment: application.reservedUsdt },
            reservedUsdt: { decrement: application.reservedUsdt }
          }
        });

        if (walletUpdate.count !== 1) {
          throw new Error("reserved_balance_changed");
        }
      }

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
  } catch (error) {
    if (error instanceof Error && error.message === "application_already_processed") {
      return alreadyProcessedResponse(localeRu);
    }

    if (error instanceof Error && error.message === "reserved_balance_changed") {
      return NextResponse.json(
        {
          title: localeRu ? "Резерв изменился" : "Reserved balance changed",
          message: localeRu
            ? "Резерв участника изменился во время отклонения. Обновите страницу и проверьте заявку снова."
            : "The participant's reserved balance changed during rejection. Refresh the page and review the application again."
        },
        { status: 409 }
      );
    }

    throw error;
  }

  return NextResponse.json({
    title: localeRu ? "Заявка отклонена" : "Application rejected",
    message: localeRu ? "Участник увидит обновлённый статус в профиле участника." : "The participant will see the updated status in the participant profile."
  });
}

function alreadyProcessedResponse(localeRu: boolean) {
  return NextResponse.json(
    {
      title: localeRu ? "Заявка уже обработана" : "Application already processed",
      message: localeRu ? "Эта заявка уже была подтверждена или отклонена." : "This application has already been confirmed or rejected."
    },
    { status: 409 }
  );
}
