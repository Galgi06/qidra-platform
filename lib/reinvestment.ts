import {
  DividendPaymentStatus,
  InvestmentOrigin,
  InvestmentStatus,
  KycStatus,
  PaymentStatus,
  Prisma,
  ProjectStatus,
  ReinvestmentMode,
  ReinvestmentStatus,
  TransactionType
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateAutomaticReinvestmentGross, calculateReinvestmentAmounts } from "@/lib/reinvestment-calculator.js";
import { AM_CAPITAL_MANAGER_FEE_PERCENT, isAmCapitalPropertyFundProject, parseRealEstateData } from "@/lib/real-estate";

export const REINVESTMENT_TERMS_VERSION = "reinvestment-v1";
export const MIN_REINVESTMENT_USDT = new Prisma.Decimal(100);

export type ReinvestmentErrorCode =
  | "already_reinvested"
  | "insufficient_balance"
  | "invalid_amount"
  | "kyc_required"
  | "payment_not_found"
  | "project_capacity_exceeded"
  | "project_not_available";

export class ReinvestmentError extends Error {
  constructor(public readonly code: ReinvestmentErrorCode) {
    super(code);
  }
}

type ExecuteReinvestmentInput = {
  actorId?: string;
  grossAmountUsdt: Prisma.Decimal;
  mode: ReinvestmentMode;
  sourceDividendPaymentId: string;
  targetProjectId: string;
  userId: string;
};

export async function executeReinvestment(input: ExecuteReinvestmentInput) {
  return prisma.$transaction(async (tx) => {
    const [payment, project, approvedKyc, wallet] = await Promise.all([
      tx.dividendPayment.findFirst({
        where: {
          id: input.sourceDividendPaymentId,
          userId: input.userId,
          status: DividendPaymentStatus.PAID
        },
        include: { reinvestmentOrders: { where: { status: ReinvestmentStatus.COMPLETED }, select: { id: true } } }
      }),
      tx.project.findUnique({
        where: { id: input.targetProjectId },
        include: {
          organization: { select: { displayName: true, legalName: true } }
        }
      }),
      tx.kycApplication.findFirst({
        where: { userId: input.userId, status: KycStatus.APPROVED },
        select: { id: true }
      }),
      tx.wallet.findUnique({
        where: { userId: input.userId },
        select: { availableUsdt: true, id: true }
      })
    ]);

    if (!payment) throw new ReinvestmentError("payment_not_found");
    if (payment.reinvestmentOrders.length) throw new ReinvestmentError("already_reinvested");
    if (!approvedKyc) throw new ReinvestmentError("kyc_required");
    if (!project || project.status !== ProjectStatus.ACTIVE || project.fundedUsdt.gte(project.targetUsdt)) {
      throw new ReinvestmentError("project_not_available");
    }

    const grossAmountUsdt = input.grossAmountUsdt.toDecimalPlaces(6);
    if (grossAmountUsdt.lte(0) || grossAmountUsdt.gt(payment.amountUsdt)) {
      throw new ReinvestmentError("invalid_amount");
    }

    const realEstate = parseRealEstateData(project.propertyData);
    const useManagerFee = isAmCapitalPropertyFundProject({
      sector: realEstate ? "real-estate" : null,
      organizationDisplayName: project.organization?.displayName,
      organizationLegalName: project.organization?.legalName,
      partnerName: realEstate?.partnerName,
      managerName: realEstate?.managerName,
      initiatorName: null
    });
    if (useManagerFee) {
      const acceptedAmCapitalContract = await tx.investmentApplication.findFirst({
        where: {
          contactDetails: { path: ["amCapitalFlow"], equals: true },
          projectId: project.id,
          status: InvestmentStatus.CONFIRMED,
          userId: input.userId
        },
        select: { id: true }
      });
      if (!acceptedAmCapitalContract) throw new ReinvestmentError("project_not_available");
    }
    const { feeUsdt, investedAmountUsdt } = calculateReinvestmentAmounts(
      grossAmountUsdt,
      useManagerFee ? AM_CAPITAL_MANAGER_FEE_PERCENT : 0
    );

    if (investedAmountUsdt.lt(MIN_REINVESTMENT_USDT)) {
      throw new ReinvestmentError("invalid_amount");
    }
    if (!wallet || wallet.availableUsdt.lt(grossAmountUsdt)) {
      throw new ReinvestmentError("insufficient_balance");
    }

    const walletUpdate = await tx.wallet.updateMany({
      where: { id: wallet.id, availableUsdt: { gte: grossAmountUsdt } },
      data: { availableUsdt: { decrement: grossAmountUsdt } }
    });
    if (walletUpdate.count !== 1) throw new ReinvestmentError("insufficient_balance");

    const projectUpdate = await tx.project.updateMany({
      where: {
        id: project.id,
        status: ProjectStatus.ACTIVE,
        fundedUsdt: { lte: project.targetUsdt.minus(investedAmountUsdt) }
      },
      data: { fundedUsdt: { increment: investedAmountUsdt } }
    });
    if (projectUpdate.count !== 1) throw new ReinvestmentError("project_capacity_exceeded");

    const completedAt = new Date();
    const application = await tx.investmentApplication.create({
      data: {
        amountUsdt: investedAmountUsdt,
        contractAcceptedAt: completedAt,
        contactDetails: {
          feeUsdt: feeUsdt.toString(),
          grossReinvestmentUsdt: grossAmountUsdt.toString(),
          reinvestmentMode: input.mode,
          sourceDividendPaymentId: payment.id,
          termsVersion: REINVESTMENT_TERMS_VERSION
        },
        origin: InvestmentOrigin.REINVESTMENT,
        projectId: project.id,
        reservedUsdt: 0,
        status: InvestmentStatus.CONFIRMED,
        termsAcceptedAt: completedAt,
        userId: input.userId
      }
    });

    await tx.walletTransaction.create({
      data: {
        amountUsdt: grossAmountUsdt,
        note: `${project.titleEn} · ${application.id} · reinvestment from dividend ${payment.id}`,
        status: PaymentStatus.CONFIRMED,
        type: TransactionType.REINVESTMENT,
        walletId: wallet.id
      }
    });

    const order = await tx.reinvestmentOrder.create({
      data: {
        completedAt,
        feeUsdt,
        grossAmountUsdt,
        investedAmountUsdt,
        investmentApplicationId: application.id,
        mode: input.mode,
        sourceDividendPaymentId: payment.id,
        status: ReinvestmentStatus.COMPLETED,
        targetProjectId: project.id,
        userId: input.userId
      }
    });

    const updatedProject = await tx.project.findUnique({
      where: { id: project.id },
      select: { fundedUsdt: true, targetUsdt: true }
    });
    if (updatedProject && updatedProject.fundedUsdt.gte(updatedProject.targetUsdt)) {
      await tx.project.update({ where: { id: project.id }, data: { status: ProjectStatus.FUNDED } });
    }

    await Promise.all([
      tx.adminAuditLog.create({
        data: {
          action: input.mode === ReinvestmentMode.AUTOMATIC ? "reinvestment.automatic.complete" : "reinvestment.one_time.complete",
          actorId: input.actorId ?? input.userId,
          entityId: order.id,
          entityType: "ReinvestmentOrder",
          payload: {
            feeUsdt: feeUsdt.toString(),
            grossAmountUsdt: grossAmountUsdt.toString(),
            investmentApplicationId: application.id,
            investedAmountUsdt: investedAmountUsdt.toString(),
            sourceDividendPaymentId: payment.id,
            targetProjectId: project.id
          }
        }
      }),
      tx.notification.create({
        data: {
          actorId: input.actorId,
          bodyEn: `${investedAmountUsdt.toString()} USDT was reinvested in ${project.titleEn}.`,
          bodyRu: `${investedAmountUsdt.toString()} USDT реинвестировано в проект «${project.titleRu}».`,
          href: `/investor/investments/${application.id}`,
          titleEn: "Reinvestment completed",
          titleRu: "Реинвест выполнен",
          type: "reinvestment",
          userId: input.userId
        }
      })
    ]);

    return { applicationId: application.id, feeUsdt, grossAmountUsdt, investedAmountUsdt, orderId: order.id };
  });
}

export async function processAutomaticReinvestment(sourceDividendPaymentId: string, actorId?: string) {
  const payment = await prisma.dividendPayment.findUnique({
    where: { id: sourceDividendPaymentId },
    include: {
      reinvestmentOrders: true,
      user: { include: { autoReinvestmentPreference: true } }
    }
  });
  const preference = payment?.user.autoReinvestmentPreference;

  if (!payment || payment.status !== DividendPaymentStatus.PAID || payment.reinvestmentOrders.length || !preference?.enabled) {
    return null;
  }

  const grossAmountUsdt = calculateAutomaticReinvestmentGross(payment.amountUsdt, preference.allocationPercent);

  try {
    return await executeReinvestment({
      actorId,
      grossAmountUsdt,
      mode: ReinvestmentMode.AUTOMATIC,
      sourceDividendPaymentId: payment.id,
      targetProjectId: preference.targetProjectId,
      userId: payment.userId
    });
  } catch (error) {
    if (!(error instanceof ReinvestmentError)) throw error;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.reinvestmentOrder.findFirst({
        where: { sourceDividendPaymentId: payment.id, mode: ReinvestmentMode.AUTOMATIC }
      });
      if (existing) return;

      const order = await tx.reinvestmentOrder.create({
        data: {
          fallbackReason: error.code,
          grossAmountUsdt,
          mode: ReinvestmentMode.AUTOMATIC,
          sourceDividendPaymentId: payment.id,
          status: ReinvestmentStatus.FALLBACK,
          targetProjectId: preference.targetProjectId,
          userId: payment.userId
        }
      });

      await Promise.all([
        tx.adminAuditLog.create({
          data: {
            action: "reinvestment.automatic.fallback",
            actorId,
            entityId: order.id,
            entityType: "ReinvestmentOrder",
            payload: { reason: error.code, sourceDividendPaymentId: payment.id, targetProjectId: preference.targetProjectId }
          }
        }),
        tx.notification.create({
          data: {
            actorId,
            bodyEn: "Automatic reinvestment could not be completed. The dividend remains available in your wallet.",
            bodyRu: "Автоматический реинвест не выполнен. Дивиденды остались на доступном балансе.",
            href: "/investor/wallet",
            titleEn: "Dividend credited to wallet",
            titleRu: "Дивиденды зачислены на баланс",
            type: "reinvestment",
            userId: payment.userId
          }
        })
      ]);
    });

    return null;
  }
}
