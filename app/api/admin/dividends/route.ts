import { DividendPaymentStatus, DividendPeriodStatus, InvestmentStatus, PaymentStatus, Prisma, TransactionType } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { canAccessAdmin } from "@/lib/auth";
import { authOptions } from "@/lib/next-auth";
import { prisma } from "@/lib/prisma";

const calculateSchema = z.object({
  action: z.literal("calculate"),
  projectId: z.string().min(1),
  periodLabel: z.string().trim().min(2).max(40),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  grossRevenueUsdt: z.coerce.number().nonnegative(),
  directCostUsdt: z.coerce.number().nonnegative(),
  operatingExpenseUsdt: z.coerce.number().nonnegative(),
  investorSharePercent: z.coerce.number().positive().max(100),
  adminNote: z.string().trim().max(1000).optional(),
  confirmation: z.string().trim()
});

const periodActionSchema = z.object({
  action: z.enum(["approve", "pay", "cancel"]),
  periodId: z.string().min(1),
  adminNote: z.string().trim().max(1000).optional(),
  confirmation: z.string().trim()
});

const dividendActionSchema = z.discriminatedUnion("action", [calculateSchema, periodActionSchema]);

type SessionUser = {
  user?: {
    id?: string;
    role?: string;
  };
};

function isRu(request: NextRequest) {
  return request.nextUrl.searchParams.get("lang") !== "en";
}

export async function POST(request: NextRequest) {
  const localeRu = isRu(request);
  const session = (await getServerSession(authOptions)) as SessionUser | null;

  if (!canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | undefined)) {
    return NextResponse.json(
      {
        title: localeRu ? "Нет доступа" : "Access denied",
        message: localeRu ? "Начисления доступны только администратору." : "Dividend operations are only available to administrators."
      },
      { status: 403 }
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

  if (parsed.data.confirmation !== "CONFIRM") {
    return NextResponse.json(
      {
        title: localeRu ? "Нужно подтверждение" : "Confirmation required",
        message: localeRu ? "Введите CONFIRM, чтобы выполнить финансовое действие." : "Enter CONFIRM to perform this financial action."
      },
      { status: 400 }
    );
  }

  if (parsed.data.action === "calculate") {
    return calculatePeriod(parsed.data, session?.user?.id, localeRu);
  }

  if (parsed.data.action === "approve") {
    return approvePeriod(parsed.data.periodId, parsed.data.adminNote, session?.user?.id, localeRu);
  }

  if (parsed.data.action === "pay") {
    return payPeriod(parsed.data.periodId, parsed.data.adminNote, session?.user?.id, localeRu);
  }

  return cancelPeriod(parsed.data.periodId, parsed.data.adminNote, session?.user?.id, localeRu);
}

async function calculatePeriod(data: z.infer<typeof calculateSchema>, actorId: string | undefined, localeRu: boolean) {
  const periodStart = parseDate(data.periodStart);
  const periodEnd = parseDate(data.periodEnd);

  if (!periodStart || !periodEnd || periodStart > periodEnd) {
    return NextResponse.json(
      {
        title: localeRu ? "Проверьте даты" : "Check dates",
        message: localeRu ? "Дата начала периода должна быть раньше даты окончания." : "The period start date must be before the period end date."
      },
      { status: 400 }
    );
  }

  const grossRevenueUsdt = toMoney(data.grossRevenueUsdt);
  const directCostUsdt = toMoney(data.directCostUsdt);
  const operatingExpenseUsdt = toMoney(data.operatingExpenseUsdt);
  const netProfitUsdt = grossRevenueUsdt.minus(directCostUsdt).minus(operatingExpenseUsdt).toDecimalPlaces(6);
  const investorSharePercent = new Prisma.Decimal(data.investorSharePercent).toDecimalPlaces(4);
  const investorPoolUsdt = netProfitUsdt.gt(0) ? netProfitUsdt.times(investorSharePercent).div(100).toDecimalPlaces(6) : new Prisma.Decimal(0);

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
      select: {
        id: true,
        userId: true,
        amountUsdt: true,
        contractAcceptedAt: true,
        createdAt: true
      }
    });

    const weightedInvestments = investments
      .map((investment) => {
        const eligibleDays = countEligibleDays(investment.contractAcceptedAt ?? investment.createdAt, periodStart, periodEnd);
        const weight = investment.amountUsdt.times(eligibleDays).toDecimalPlaces(6);
        return { ...investment, eligibleDays, weight };
      })
      .filter((investment) => investment.eligibleDays > 0 && investment.weight.gt(0));

    if (investorPoolUsdt.gt(0) && !weightedInvestments.length) {
      throw new DividendError("no_investments");
    }

    const totalWeight = weightedInvestments.reduce((total, investment) => total.plus(investment.weight), new Prisma.Decimal(0));

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
        grossRevenueUsdt,
        directCostUsdt,
        operatingExpenseUsdt,
        netProfitUsdt,
        investorPoolUsdt,
        investorSharePercent,
        status: DividendPeriodStatus.DRAFT,
        adminNote: data.adminNote
      }
    });

    if (investorPoolUsdt.gt(0)) {
      await tx.dividendPayment.createMany({
        data: weightedInvestments.map((investment, index) => {
          const isLast = index === weightedInvestments.length - 1;
          const allocatedBefore = weightedInvestments
            .slice(0, index)
            .reduce((total, previous) => total.plus(investorPoolUsdt.times(previous.weight).div(totalWeight).toDecimalPlaces(6)), new Prisma.Decimal(0));
          const amountUsdt = isLast ? investorPoolUsdt.minus(allocatedBefore).toDecimalPlaces(6) : investorPoolUsdt.times(investment.weight).div(totalWeight).toDecimalPlaces(6);

          return {
            periodId: period.id,
            investmentId: investment.id,
            userId: investment.userId,
            amountUsdt,
            investmentAmountUsdt: investment.amountUsdt,
            weight: investment.weight,
            eligibleDays: investment.eligibleDays
          };
        })
      });
    }

    await tx.adminAuditLog.create({
      data: {
        actorId,
        action: "dividend.calculate",
        entityType: "ProjectDividendPeriod",
        entityId: period.id,
        payload: {
          projectId: data.projectId,
          periodLabel: data.periodLabel,
          netProfitUsdt: netProfitUsdt.toString(),
          investorPoolUsdt: investorPoolUsdt.toString(),
          investorSharePercent: investorSharePercent.toString(),
          payments: investorPoolUsdt.gt(0) ? weightedInvestments.length : 0,
          note: data.adminNote
        }
      }
    });

    return { noDistribution: investorPoolUsdt.lte(0), payments: investorPoolUsdt.gt(0) ? weightedInvestments.length : 0 };
  }).catch((error) => {
    if (error instanceof DividendError) return error.code;
    throw error;
  });

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
          ? "Чистая прибыль периода не положительная, поэтому дивиденды не начислены. Период сохранён для отчётности."
          : "The period net result is not positive, so no dividends were accrued. The period was saved for reporting."
        : localeRu
          ? `Начисления подготовлены для ${result.payments} участников. Перед выплатой утвердите расчёт.`
          : `Accruals were prepared for ${result.payments} participants. Approve the calculation before payout.`
  });
}

async function approvePeriod(periodId: string, adminNote: string | undefined, actorId: string | undefined, localeRu: boolean) {
  const period = await prisma.projectDividendPeriod.findUnique({ where: { id: periodId }, include: { payments: true } });

  if (!period) {
    return periodNotFound(localeRu);
  }

  if (period.status !== DividendPeriodStatus.DRAFT || (!period.payments.length && period.investorPoolUsdt.gt(0))) {
    return NextResponse.json(
      {
        title: localeRu ? "Нельзя утвердить" : "Cannot approve",
        message:
          localeRu
            ? "Утвердить можно только рассчитанный период. Если есть сумма к выплате, должны быть строки начислений."
            : "Only a calculated period can be approved. If there is a payout pool, accrual rows are required."
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
        payload: { note: adminNote, payments: period.payments.length }
      }
    });
  });

  return NextResponse.json({
    title: localeRu ? "Расчёт утверждён" : "Calculation approved",
    message: localeRu ? "Теперь период можно провести к выплате." : "The period can now be paid."
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
          type: TransactionType.RETURN,
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
        ? "Период закрыт для отчётности. Начислений не было, потому что пул участников равен нулю."
        : "The period was closed for reporting. No accruals were created because the participant pool is zero."
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
      data: { status: DividendPeriodStatus.CANCELLED, adminNote: adminNote ?? period.adminNote }
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
    message: localeRu ? "Начисления по периоду отменены." : "Accruals for the period were cancelled."
  });
}

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toMoney(value: number) {
  return new Prisma.Decimal(value).toDecimalPlaces(6);
}

function countEligibleDays(participationDate: Date, periodStart: Date, periodEnd: Date) {
  const eligibleStart = participationDate > periodStart ? participationDate : periodStart;

  if (eligibleStart > periodEnd) return 0;

  const startUtc = Date.UTC(eligibleStart.getUTCFullYear(), eligibleStart.getUTCMonth(), eligibleStart.getUTCDate());
  const endUtc = Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), periodEnd.getUTCDate());

  return Math.floor((endUtc - startUtc) / 86_400_000) + 1;
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

class DividendError extends Error {
  code: "locked_period" | "no_investments" | "project_not_found";

  constructor(code: DividendError["code"]) {
    super(code);
    this.code = code;
  }
}
