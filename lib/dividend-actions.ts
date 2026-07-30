import { DividendPaymentStatus, DividendPeriodStatus, InvestmentStatus, PaymentStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { saveProjectReportFile } from "@/lib/company-workspace";
import { deleteStoredFile } from "@/lib/file-storage";
import { prisma } from "@/lib/prisma";
import {
  buildDividendPreview,
  DIVIDEND_ALGORITHM_VERSION,
  DIVIDEND_CALCULATION_MODES,
  parseDateInput,
  resolveFinancials,
  toDecimal,
  type DividendCalculationMode,
  type DividendPreviewRow
} from "@/lib/dividend-calculator.js";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return value;
}, z.coerce.number().finite().nonnegative().optional());

const optionalText = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") return undefined;
  return value;
}, z.string().trim().max(1000).optional());

export const calculateDividendSchema = z
  .object({
    action: z.literal("calculate"),
    projectId: z.string().min(1),
    periodLabel: z.string().trim().min(2).max(40),
    periodStart: z.string().min(1),
    periodEnd: z.string().min(1),
    calculationMode: z.enum([DIVIDEND_CALCULATION_MODES.PROJECT_PROFIT, DIVIDEND_CALCULATION_MODES.READY_POOL]),
    grossRevenueUsdt: optionalNumber,
    directCostUsdt: optionalNumber,
    operatingExpenseUsdt: optionalNumber,
    investorSharePercent: optionalNumber,
    qidraParticipantPoolUsdt: optionalNumber,
    profitAccrualStart: z.preprocess((value) => (value ? value : undefined), z.string().min(1).optional()),
    adminNote: optionalText,
    confirmation: z.string().trim()
  })
  .superRefine((data, ctx) => {
    if (data.calculationMode === DIVIDEND_CALCULATION_MODES.PROJECT_PROFIT) {
      if (typeof data.grossRevenueUsdt === "undefined") {
        ctx.addIssue({ code: "custom", message: "grossRevenueUsdt_required", path: ["grossRevenueUsdt"] });
      }
      if (typeof data.directCostUsdt === "undefined") {
        ctx.addIssue({ code: "custom", message: "directCostUsdt_required", path: ["directCostUsdt"] });
      }
      if (typeof data.operatingExpenseUsdt === "undefined") {
        ctx.addIssue({ code: "custom", message: "operatingExpenseUsdt_required", path: ["operatingExpenseUsdt"] });
      }
      if (typeof data.investorSharePercent === "undefined" || data.investorSharePercent <= 0 || data.investorSharePercent > 100) {
        ctx.addIssue({ code: "custom", message: "investorSharePercent_invalid", path: ["investorSharePercent"] });
      }
    }

    if (data.calculationMode === DIVIDEND_CALCULATION_MODES.READY_POOL) {
      if (typeof data.qidraParticipantPoolUsdt === "undefined") {
        ctx.addIssue({ code: "custom", message: "qidraParticipantPoolUsdt_required", path: ["qidraParticipantPoolUsdt"] });
      }
    }
  });

export const periodDividendActionSchema = z.object({
  action: z.enum(["approve", "pay", "cancel"]),
  periodId: z.string().min(1),
  adminNote: optionalText,
  confirmation: z.string().trim()
});

export const dividendActionSchema = z.discriminatedUnion("action", [calculateDividendSchema, periodDividendActionSchema]);

export type DividendActionPayload = z.infer<typeof dividendActionSchema>;
export type CalculateDividendPayload = z.infer<typeof calculateDividendSchema>;

type StoredProjectReport = {
  fileUrl: string;
  titleEn: string;
  titleRu: string;
};

type SnapshotRow = {
  id: string;
  participantId: string;
  participantName: string;
  platformSource: string;
  investmentAmountUsdt: string;
  participantInvestmentDate: string | null;
  eligibleStartDate: string | null;
  eligibleDays: number;
  weight: string;
  sharePercent: string;
  rawAmountUsdt: string;
  accruedAmountUsdt: string;
  status: "included" | "excluded";
  exclusionReason: string | null;
};

type SnapshotSummary = {
  participantPoolUsdt: string;
  activeInvestmentTotalUsdt: string;
  totalWeight: string;
  accrualTotalUsdt: string;
  roundingDifferenceUsdt: string;
  participantCount: number;
  includedParticipantsCount: number;
  algorithmVersion: string;
  companyMode: string;
};

type CalculationSnapshot = {
  draftVersion: number;
  calculatedAt: string;
  actorId: string | null;
  mode: DividendCalculationMode;
  sourceInputs: {
    grossRevenueUsdt: string;
    directCostUsdt: string;
    operatingExpenseUsdt: string;
    investorSharePercent: string;
    qidraParticipantPoolUsdt: string;
    profitAccrualStart: string | null;
  };
  financials: {
    grossRevenueUsdt: string;
    directCostUsdt: string;
    operatingExpenseUsdt: string;
    netProfitUsdt: string;
    participantPoolUsdt: string;
    companyProfitUsdt: string;
    investorSharePercent: string;
  };
  summary: SnapshotSummary;
  rows: SnapshotRow[];
  errors: string[];
};

export async function executeDividendAction({
  actorId,
  attachments = [],
  canAccessProject,
  data,
  localeRu
}: {
  actorId?: string;
  attachments?: File[];
  canAccessProject: (params: { periodId?: string; projectId?: string }) => Promise<boolean>;
  data: DividendActionPayload;
  localeRu: boolean;
}) {
  if (data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы выполнить финансовое действие." : "Enter CONFIRM to perform this financial action."
      },
      { status: 400 }
    );
  }

  if (data.action === "calculate") {
    const allowed = await canAccessProject({ projectId: data.projectId });
    if (!allowed) return accessDenied(localeRu);
    return calculatePeriod(data, actorId, localeRu, attachments);
  }

  const allowed = await canAccessProject({ periodId: data.periodId });
  if (!allowed) return accessDenied(localeRu);

  if (data.action === "approve") {
    return approvePeriod(data.periodId, data.adminNote, actorId, localeRu);
  }

  if (data.action === "pay") {
    return payPeriod(data.periodId, data.adminNote, actorId, localeRu);
  }

  return cancelPeriod(data.periodId, data.adminNote, actorId, localeRu);
}

function accessDenied(localeRu: boolean) {
  return NextResponse.json(
    {
      title: localeRu ? "Нет доступа" : "Access denied",
      message: localeRu ? "У вас нет доступа к этому проекту или периоду выплаты." : "You do not have access to this project or dividend period."
    },
    { status: 403 }
  );
}

async function calculatePeriod(data: CalculateDividendPayload, actorId: string | undefined, localeRu: boolean, attachments: File[]) {
  const periodStart = parseDate(data.periodStart);
  const periodEnd = parseDate(data.periodEnd);
  const profitAccrualStartAt = data.profitAccrualStart ? parseDate(data.profitAccrualStart) : null;

  if (!periodStart || !periodEnd || periodStart > periodEnd) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте даты" : "Check dates",
        message: localeRu ? "Дата начала периода должна быть раньше даты окончания." : "The period start date must be before the period end date."
      },
      { status: 400 }
    );
  }

  if (profitAccrualStartAt && profitAccrualStartAt > periodEnd) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте дату начисления" : "Check accrual start date",
        message: localeRu
          ? "Дата начала участия в прибыли не может быть позже конца периода."
          : "The profit accrual start date cannot be later than the period end date."
      },
      { status: 400 }
    );
  }

  const financials = resolveFinancials({
    directCostUsdt: data.directCostUsdt ?? 0,
    grossRevenueUsdt: data.grossRevenueUsdt ?? 0,
    mode: data.calculationMode,
    operatingExpenseUsdt: data.operatingExpenseUsdt ?? 0,
    participantSharePercent: data.investorSharePercent ?? 0,
    qidraParticipantPoolUsdt: data.qidraParticipantPoolUsdt ?? 0
  });

  const storedReports = attachments.length ? await storeProjectReports(data.projectId, data.periodLabel, attachments) : [];
  const staleDraftReports = await prisma.projectReport.findMany({
    where: {
      projectId: data.projectId,
      period: data.periodLabel,
      publishedAt: null
    },
    select: {
      fileUrl: true,
      id: true
    }
  });

  const result = await prisma.$transaction(async (tx) => {
    const existingPeriod = await tx.projectDividendPeriod.findUnique({
      where: { projectId_periodLabel: { projectId: data.projectId, periodLabel: data.periodLabel } },
      include: { payments: true }
    });

    if (existingPeriod && existingPeriod.status !== DividendPeriodStatus.DRAFT) {
      throw new DividendError("locked_period");
    }

    const project = await tx.project.findUnique({
      where: { id: data.projectId },
      select: { id: true, titleRu: true, titleEn: true }
    });

    if (!project) {
      throw new DividendError("project_not_found");
    }

    const investments = await tx.investmentApplication.findMany({
      where: {
        projectId: data.projectId,
        status: InvestmentStatus.CONFIRMED
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: [{ contractAcceptedAt: "asc" }, { createdAt: "asc" }]
    });

    const preview = buildDividendPreview({
      investments: investments.map((investment) => ({
        amountUsdt: investment.amountUsdt,
        enteredAt: investment.contractAcceptedAt ?? investment.createdAt,
        id: investment.id,
        isActive: investment.status === InvestmentStatus.CONFIRMED,
        participantName: investment.user.name?.trim() || investment.user.email,
        platformSource: "QIDRA",
        userId: investment.userId
      })),
      mode: data.calculationMode,
      participantPoolUsdt: financials.participantPoolUsdt,
      periodEnd,
      periodStart,
      profitAccrualStartDate: profitAccrualStartAt
    });

    if (financials.participantPoolUsdt.gt(0) && preview.summary.includedParticipantsCount === 0) {
      throw new DividendError("no_investments");
    }

    const draftVersion = existingPeriod ? existingPeriod.draftVersion + 1 : 1;
    const calculationSnapshot = buildCalculationSnapshot({
      actorId,
      data,
      draftVersion,
      errors: preview.errors,
      financials,
      profitAccrualStartAt,
      rows: preview.rows,
      summary: preview.summary
    });

    const period =
      existingPeriod ??
      (await tx.projectDividendPeriod.create({
        data: {
          projectId: data.projectId,
          titleRu: `${project.titleRu}: ${data.periodLabel}`,
          titleEn: `${project.titleEn}: ${data.periodLabel}`,
          periodLabel: data.periodLabel,
          periodStart,
          periodEnd
        }
      }));

    await tx.dividendPayment.deleteMany({ where: { periodId: period.id } });

    await tx.projectDividendPeriod.update({
      where: { id: period.id },
      data: {
        titleRu: `${project.titleRu}: ${data.periodLabel}`,
        titleEn: `${project.titleEn}: ${data.periodLabel}`,
        periodLabel: data.periodLabel,
        periodStart,
        periodEnd,
        calculationMode: data.calculationMode,
        grossRevenueUsdt: financials.grossRevenueUsdt,
        directCostUsdt: financials.directCostUsdt,
        operatingExpenseUsdt: financials.operatingExpenseUsdt,
        netProfitUsdt: financials.netProfitUsdt,
        investorPoolUsdt: financials.participantPoolUsdt,
        companyProfitUsdt: financials.companyProfitUsdt,
        roundingDifferenceUsdt: parseDecimal(calculationSnapshot.summary.roundingDifferenceUsdt),
        investorSharePercent: financials.investorSharePercent,
        profitAccrualStartAt,
        status: DividendPeriodStatus.DRAFT,
        adminNote: data.adminNote,
        draftVersion,
        algorithmVersion: DIVIDEND_ALGORITHM_VERSION,
        calculationSnapshot: calculationSnapshot as Prisma.InputJsonValue,
        calculatedAt: new Date(),
        approvedAt: null,
        paidAt: null,
        cancelledAt: null
      }
    });

    if (storedReports.length) {
      await tx.projectReport.deleteMany({
        where: {
          projectId: data.projectId,
          period: data.periodLabel,
          publishedAt: null
        }
      });

      await tx.projectReport.createMany({
        data: storedReports.map((report) => ({
          projectId: data.projectId,
          titleRu: report.titleRu,
          titleEn: report.titleEn,
          period: data.periodLabel,
          fileUrl: report.fileUrl,
          publishedAt: null
        }))
      });
    }

    const includedRows = preview.rows.filter((row) => row.status === "included");

    if (includedRows.length) {
      await tx.dividendPayment.createMany({
        data: includedRows.map((row) => ({
          periodId: period.id,
          investmentId: row.id,
          userId: row.participantId,
          amountUsdt: row.accruedAmountUsdt.toDecimalPlaces(2),
          rawAmountUsdt: row.rawAmountUsdt,
          investmentAmountUsdt: row.investmentAmountUsdt,
          weight: row.weight,
          sharePercent: row.sharePercent,
          eligibleDays: row.eligibleDays,
          eligibleStartAt: row.eligibleStartDate
        }))
      });
    }

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "dividend.calculate",
        entityType: "ProjectDividendPeriod",
        entityId: period.id,
        payload: {
          calculationMode: data.calculationMode,
          companyProfitUsdt: financials.companyProfitUsdt.toString(),
          draftVersion,
          errors: preview.errors,
          includedParticipants: preview.summary.includedParticipantsCount,
          investorPoolUsdt: financials.participantPoolUsdt.toString(),
          investorSharePercent: financials.investorSharePercent.toString(),
          netProfitUsdt: financials.netProfitUsdt.toString(),
          note: data.adminNote,
          periodLabel: data.periodLabel,
          projectId: data.projectId
        }
      }
    });

    return {
      noDistribution: financials.participantPoolUsdt.lte(0),
      participantCount: preview.summary.participantCount,
      payments: preview.summary.includedParticipantsCount,
      periodId: period.id
    };
  }).catch((error) => {
    if (error instanceof DividendError) return error.code;
    throw error;
  });

  if (typeof result === "string" && storedReports.length) {
    await Promise.allSettled(storedReports.map((report) => deleteStoredFile(report.fileUrl, "project-reports")));
  }

  if (typeof result !== "string" && storedReports.length && staleDraftReports.length) {
    await Promise.allSettled(staleDraftReports.map((report) => deleteStoredFile(report.fileUrl, "project-reports")));
  }

  if (result === "locked_period") {
    return NextResponse.json(
      {
        title: localeRu ? "Период уже утверждён" : "Period already approved",
        message: localeRu ? "Утверждённый или выплаченный период нельзя пересчитать." : "An approved or paid period cannot be recalculated."
      },
      { status: 409 }
    );
  }

  if (result === "project_not_found") {
    return NextResponse.json(
      {
        title: localeRu ? "Проект не найден" : "Project not found",
        message: localeRu ? "Выберите проект из списка." : "Choose a project from the list."
      },
      { status: 404 }
    );
  }

  if (result === "no_investments") {
    return NextResponse.json(
      {
        title: localeRu ? "Нет участников периода" : "No participants for this period",
        message: localeRu ? "В выбранном периоде нет подтверждённых участий для расчёта дивидендов." : "There are no confirmed participations in the selected period."
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    title: result.noDistribution ? (localeRu ? "Период сохранён" : "Period saved") : localeRu ? "Период рассчитан" : "Period calculated",
    message:
      result.noDistribution
        ? localeRu
          ? "Чистая прибыль не положительная. Период сохранён как отчётный черновик без начислений."
          : "Net profit is not positive. The period was saved as a reporting draft without accruals."
        : localeRu
          ? `Подготовлен черновик расчёта для ${result.payments} участников из ${result.participantCount}. Проверьте превью и утвердите период.`
          : `A calculation draft was prepared for ${result.payments} participants out of ${result.participantCount}. Review the preview and approve the period.`
  });
}

async function approvePeriod(periodId: string, adminNote: string | undefined, actorId: string | undefined, localeRu: boolean) {
  const period = await prisma.projectDividendPeriod.findUnique({
    where: { id: periodId },
    include: { payments: true }
  });

  if (!period) {
    return periodNotFound(localeRu);
  }

  const snapshot = parseCalculationSnapshot(period.calculationSnapshot);
  const reportsCount = await prisma.projectReport.count({
    where: {
      projectId: period.projectId,
      period: period.periodLabel
    }
  });

  const validationErrors = validatePeriodBeforeApproval(period, snapshot, reportsCount);

  if (period.status !== DividendPeriodStatus.DRAFT || validationErrors.length) {
    return NextResponse.json(
      {
        title: localeRu ? "Нельзя утвердить" : "Cannot approve",
        message:
          validationErrors.length > 0
            ? translateValidationErrors(validationErrors, localeRu)
            : localeRu
              ? "Утвердить можно только рассчитанный период."
              : "Only a calculated period can be approved."
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectDividendPeriod.update({
      where: { id: periodId },
      data: {
        status: DividendPeriodStatus.APPROVED,
        approvedAt: new Date(),
        adminNote: adminNote ?? period.adminNote
      }
    });
    await tx.projectReport.updateMany({
      where: {
        projectId: period.projectId,
        period: period.periodLabel,
        publishedAt: null
      },
      data: {
        publishedAt: new Date()
      }
    });
    await tx.dividendPayment.updateMany({
      where: { periodId },
      data: { status: DividendPaymentStatus.APPROVED }
    });
    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "dividend.approve",
        entityType: "ProjectDividendPeriod",
        entityId: periodId,
        payload: {
          draftVersion: period.draftVersion,
          note: adminNote,
          payments: period.payments.length
        }
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Расчёт утверждён" : "Calculation approved",
    message: localeRu ? "Период утверждён. Теперь можно провести выплату." : "The period was approved. You can now complete the payout."
  });
}

async function payPeriod(periodId: string, adminNote: string | undefined, actorId: string | undefined, localeRu: boolean) {
  const period = await prisma.projectDividendPeriod.findUnique({
    where: { id: periodId },
    include: {
      payments: {
        where: { status: DividendPaymentStatus.APPROVED },
        include: { user: true }
      },
      project: true
    }
  });

  if (!period) {
    return periodNotFound(localeRu);
  }

  if (period.status !== DividendPeriodStatus.APPROVED || (!period.payments.length && period.investorPoolUsdt.gt(0))) {
    return NextResponse.json(
      {
        title: localeRu ? "Выплата недоступна" : "Payout unavailable",
        message:
          localeRu
            ? "Сначала утвердите рассчитанный период. Если есть сумма к выплате, должны быть строки начислений."
            : "Approve the calculated period first. If there is a payout pool, accrual rows are required."
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const paidAt = new Date();

    for (const payment of period.payments) {
      const wallet = await tx.wallet.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, availableUsdt: 0 },
        update: {},
        select: { id: true }
      });

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableUsdt: { increment: payment.amountUsdt } }
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "RETURN",
          status: PaymentStatus.CONFIRMED,
          amountUsdt: payment.amountUsdt,
          note: `${period.project.titleEn} · dividend ${period.periodLabel}`
        }
      });

      await tx.dividendPayment.update({
        where: { id: payment.id },
        data: {
          status: DividendPaymentStatus.PAID,
          paidAt,
          walletTransactionId: transaction.id
        }
      });

      await tx.notification.create({
        data: {
          userId: payment.userId,
          actorId,
          titleRu: "Дивиденды начислены",
          titleEn: "Dividend credited",
          bodyRu: `${period.project.titleRu}: ${formatUsdt(payment.amountUsdt)} за период ${period.periodLabel} зачислены на ваш баланс.`,
          bodyEn: `${period.project.titleEn}: ${formatUsdt(payment.amountUsdt)} for ${period.periodLabel} was credited to your balance.`,
          type: "dividend",
          href: "/investor/investments"
        }
      });
    }

    await tx.projectDividendPeriod.update({
      where: { id: periodId },
      data: {
        status: DividendPeriodStatus.PAID,
        paidAt,
        adminNote: adminNote ?? period.adminNote
      }
    });

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "dividend.pay",
        entityType: "ProjectDividendPeriod",
        entityId: periodId,
        payload: {
          note: adminNote,
          payments: period.payments.length,
          investorPoolUsdt: period.investorPoolUsdt.toString()
        }
      }
    });
  });

  return NextResponse.json({
    title: period.payments.length ? (localeRu ? "Выплата проведена" : "Payout completed") : localeRu ? "Период закрыт без выплаты" : "Period closed without payout",
    message: period.payments.length
      ? localeRu
        ? "Дивиденды зачислены на балансы участников и отражены в истории операций."
        : "Dividends were credited to participant balances and transaction histories."
      : localeRu
        ? "Период закрыт без начислений, потому что пул участников равен нулю."
        : "The period was closed without accruals because the participant pool is zero."
  });
}

async function cancelPeriod(periodId: string, adminNote: string | undefined, actorId: string | undefined, localeRu: boolean) {
  const period = await prisma.projectDividendPeriod.findUnique({ where: { id: periodId } });

  if (!period) return periodNotFound(localeRu);

  if (period.status === DividendPeriodStatus.PAID) {
    return NextResponse.json(
      {
        title: localeRu ? "Период уже выплачен" : "Period already paid",
        message: localeRu ? "Выплаченный период нельзя отменить." : "A paid period cannot be cancelled."
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectDividendPeriod.update({
      where: { id: periodId },
      data: {
        status: DividendPeriodStatus.CANCELLED,
        cancelledAt: new Date(),
        adminNote: adminNote ?? period.adminNote
      }
    });
    await tx.dividendPayment.updateMany({
      where: { periodId },
      data: { status: DividendPaymentStatus.CANCELLED }
    });
    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "dividend.cancel",
        entityType: "ProjectDividendPeriod",
        entityId: periodId,
        payload: { note: adminNote }
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Период отменён" : "Period cancelled",
    message: localeRu ? "Черновик начислений отменён." : "The accrual draft was cancelled."
  });
}

function parseDate(value: string) {
  const date = parseDateInput(value);
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function periodNotFound(localeRu: boolean) {
  return NextResponse.json(
    {
      title: localeRu ? "Период не найден" : "Period not found",
      message: localeRu ? "Обновите страницу и выберите период из списка." : "Refresh the page and choose a period from the list."
    },
    { status: 404 }
  );
}

function formatUsdt(value: { toString(): string }) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value.toString()))} USDT`;
}

function buildCalculationSnapshot({
  actorId,
  data,
  draftVersion,
  errors,
  financials,
  profitAccrualStartAt,
  rows,
  summary
}: {
  actorId?: string;
  data: CalculateDividendPayload;
  draftVersion: number;
  errors: string[];
  financials: ReturnType<typeof resolveFinancials>;
  profitAccrualStartAt: Date | null;
  rows: DividendPreviewRow[];
  summary: ReturnType<typeof buildDividendPreview>["summary"];
}): CalculationSnapshot {
  return {
    actorId: actorId ?? null,
    calculatedAt: new Date().toISOString(),
    draftVersion,
    errors,
    financials: {
      companyProfitUsdt: financials.companyProfitUsdt.toString(),
      directCostUsdt: financials.directCostUsdt.toString(),
      grossRevenueUsdt: financials.grossRevenueUsdt.toString(),
      investorSharePercent: financials.investorSharePercent.toString(),
      netProfitUsdt: financials.netProfitUsdt.toString(),
      operatingExpenseUsdt: financials.operatingExpenseUsdt.toString(),
      participantPoolUsdt: financials.participantPoolUsdt.toString()
    },
    mode: data.calculationMode,
    rows: rows.map((row) => ({
      accruedAmountUsdt: row.accruedAmountUsdt.toString(),
      eligibleDays: row.eligibleDays,
      eligibleStartDate: row.eligibleStartDate?.toISOString() ?? null,
      exclusionReason: row.exclusionReason,
      id: row.id,
      investmentAmountUsdt: row.investmentAmountUsdt.toString(),
      participantId: row.participantId,
      participantInvestmentDate: row.participantInvestmentDate?.toISOString() ?? null,
      participantName: row.participantName,
      platformSource: row.platformSource,
      rawAmountUsdt: row.rawAmountUsdt.toString(),
      sharePercent: row.sharePercent.toString(),
      status: row.status,
      weight: row.weight.toString()
    })),
    sourceInputs: {
      directCostUsdt: String(data.directCostUsdt ?? 0),
      grossRevenueUsdt: String(data.grossRevenueUsdt ?? 0),
      investorSharePercent: String(data.investorSharePercent ?? 0),
      operatingExpenseUsdt: String(data.operatingExpenseUsdt ?? 0),
      profitAccrualStart: profitAccrualStartAt?.toISOString() ?? null,
      qidraParticipantPoolUsdt: String(data.qidraParticipantPoolUsdt ?? 0)
    },
    summary: {
      accrualTotalUsdt: summary.accrualTotalUsdt.toString(),
      activeInvestmentTotalUsdt: summary.activeInvestmentTotalUsdt.toString(),
      algorithmVersion: summary.algorithmVersion,
      companyMode: summary.companyMode,
      includedParticipantsCount: summary.includedParticipantsCount,
      participantCount: summary.participantCount,
      participantPoolUsdt: summary.participantPoolUsdt.toString(),
      roundingDifferenceUsdt: summary.roundingDifferenceUsdt.toString(),
      totalWeight: summary.totalWeight.toString()
    }
  };
}

function parseCalculationSnapshot(value: Prisma.JsonValue | null): CalculationSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const snapshot = value as Record<string, unknown>;
  if (!Array.isArray(snapshot.rows) || !snapshot.summary || !snapshot.financials || typeof snapshot.mode !== "string") {
    return null;
  }

  return snapshot as unknown as CalculationSnapshot;
}

function validatePeriodBeforeApproval(
  period: {
    investorPoolUsdt: Prisma.Decimal;
    payments: Array<{ amountUsdt: Prisma.Decimal }>;
    status: DividendPeriodStatus;
  },
  snapshot: CalculationSnapshot | null,
  reportsCount: number
) {
  const errors: string[] = [];

  if (!snapshot) {
    errors.push("missing_snapshot");
    return errors;
  }

  if (snapshot.errors.length) {
    errors.push(...snapshot.errors);
  }

  if (reportsCount <= 0) {
    errors.push("missing_reporting_files");
  }

  const participantPoolUsdt = parseDecimal(snapshot.summary.participantPoolUsdt);
  const totalWeight = parseDecimal(snapshot.summary.totalWeight);
  const accrualTotalUsdt = parseDecimal(snapshot.summary.accrualTotalUsdt);
  const roundingDifferenceUsdt = parseDecimal(snapshot.summary.roundingDifferenceUsdt);
  const paymentTotalUsdt = period.payments.reduce((total, payment) => total.plus(payment.amountUsdt), new Prisma.Decimal(0)).toDecimalPlaces(2);

  if (participantPoolUsdt.gt(0) && totalWeight.lte(0)) {
    errors.push("zero_total_weight");
  }

  if (participantPoolUsdt.gt(0) && snapshot.rows.filter((row) => row.status === "included").length === 0) {
    errors.push("no_included_rows");
  }

  if (snapshot.rows.some((row) => parseDecimal(row.accruedAmountUsdt).lt(0))) {
    errors.push("negative_accrual");
  }

  if (!roundingDifferenceUsdt.eq(0)) {
    errors.push("rounding_difference_not_zero");
  }

  if (!accrualTotalUsdt.eq(paymentTotalUsdt)) {
    errors.push("totals_mismatch");
  }

  if (!period.investorPoolUsdt.toDecimalPlaces(2).eq(participantPoolUsdt.toDecimalPlaces(2))) {
    errors.push("pool_mismatch");
  }

  return [...new Set(errors)];
}

function translateValidationErrors(errors: string[], localeRu: boolean) {
  const uniqueErrors = [...new Set(errors)];
  const messages = uniqueErrors.map((error) => {
    switch (error) {
      case "missing_snapshot":
        return localeRu ? "Нет сохранённого превью расчёта." : "The saved calculation preview is missing.";
      case "missing_reporting_files":
        return localeRu ? "Перед утверждением приложите хотя бы один отчётный файл." : "Attach at least one reporting file before approval.";
      case "zero_total_weight":
      case "no_included_rows":
        return localeRu ? "Нет корректных строк начислений для распределения." : "There are no valid accrual rows for distribution.";
      case "negative_accrual":
        return localeRu ? "Обнаружены отрицательные начисления." : "Negative accruals were detected.";
      case "rounding_difference_not_zero":
      case "rounding_difference_too_large":
        return localeRu ? "Разница округления должна быть равна 0.00 USDT." : "The rounding difference must equal 0.00 USDT.";
      case "totals_mismatch":
      case "pool_mismatch":
        return localeRu ? "Контрольные суммы периода не совпадают." : "The control totals for the period do not match.";
      case "negative_participant_pool":
        return localeRu ? "Пул участников не может быть отрицательным." : "The participant pool cannot be negative.";
      default:
        return localeRu ? "Период содержит техническую ошибку расчёта." : "The period contains a technical calculation error.";
    }
  });

  return messages.join(" ");
}

function parseDecimal(value: string) {
  return new Prisma.Decimal(value).toDecimalPlaces(6);
}

class DividendError extends Error {
  code: "locked_period" | "no_investments" | "project_not_found";

  constructor(code: DividendError["code"]) {
    super(code);
    this.code = code;
  }
}

async function storeProjectReports(projectId: string, periodLabel: string, attachments: File[]): Promise<StoredProjectReport[]> {
  return Promise.all(
    attachments.map(async (file) => {
      const stored = await saveProjectReportFile(file, projectId);
      return {
        fileUrl: stored.storagePath,
        titleEn: `Report ${periodLabel}: ${stored.name}`,
        titleRu: `Отчёт ${periodLabel}: ${stored.name}`
      };
    })
  );
}
