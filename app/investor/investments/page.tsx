import Link from "next/link";
import type { ReactNode } from "react";
import { DividendPaymentStatus, InvestmentStatus } from "@prisma/client";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorWorkspace } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function InvestmentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const session = await requireAuth(locale, "/investor/investments");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const statusFilter = parseInvestmentStatus(searchParamString(params?.status));
  const allApplications = await prisma.investmentApplication.findMany({
    where: { userId },
    include: {
      project: true,
      dividendPayments: {
        include: { period: true },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { availableUsdt: true, reservedUsdt: true }
  });
  const applications = statusFilter ? allApplications.filter((application) => application.status === statusFilter) : allApplications;
  const pendingTotal = allApplications
    .filter((application) => application.status === InvestmentStatus.PENDING)
    .reduce((total, application) => total + Number(application.amountUsdt.toString()), 0);
  const availableUsdt = Number(wallet?.availableUsdt.toString() ?? 0);
  const reservedUsdt = Number(wallet?.reservedUsdt.toString() ?? 0);
  const freeUsdt = Math.max(availableUsdt, 0);
  const unbackedPendingUsdt = Math.max(pendingTotal - reservedUsdt - availableUsdt, 0);
  const stats = buildApplicationStats(allApplications);
  const dividendTotals = buildDividendTotals(allApplications.flatMap((application) => application.dividendPayments));

  return (
    <>
      <Header locale={locale} path="/investor/investments" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Профиль участника" : "Participant profile"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Моё участие" : "My participation"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Здесь отображаются заявки на участие, которые вы отправили через страницы проектов."
                  : "This page shows participation applications submitted from project pages."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <InvestorWorkspace activePath="/investor/investments" locale={locale}>
          <div className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={isRu ? "Доступно для новых заявок" : "Available for new applications"} value={formatUsdt(freeUsdt)} />
              <SummaryCard label={isRu ? "Зарезервировано" : "Reserved"} value={formatUsdt(reservedUsdt)} />
              <SummaryCard label={isRu ? "Заявки на проверке" : "Pending applications"} value={formatUsdt(pendingTotal)} tone={unbackedPendingUsdt > 0 ? "warning" : "success"} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={isRu ? "Начислено дивидендов" : "Dividends accrued"} value={formatUsdt(dividendTotals.accrued)} />
              <SummaryCard label={isRu ? "Выплачено дивидендов" : "Dividends paid"} value={formatUsdt(dividendTotals.paid)} tone="success" />
              <SummaryCard label={isRu ? "Ожидает выплаты" : "Awaiting payout"} value={formatUsdt(dividendTotals.awaiting)} tone={dividendTotals.awaiting > 0 ? "warning" : "default"} />
            </div>
            <InvestmentFilters locale={locale} stats={stats} statusFilter={statusFilter} />
            {applications.length ? (
              <div className="grid gap-4">
                {applications.map((application) => {
                  const applicationAmountUsdt = Number(application.amountUsdt.toString());
                  const applicationReservedUsdt = Number(application.reservedUsdt.toString());
                  const applicationShortfall = Math.max(applicationAmountUsdt - applicationReservedUsdt - availableUsdt, 0);
                  const balanceWarning = application.status === InvestmentStatus.PENDING && applicationShortfall > 0;

                  return (
                    <article key={application.id} className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto] lg:items-center">
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{formatDate(application.createdAt, locale)}</p>
                          <Link className="mt-2 block text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark hover:text-qidra-accent" href={withLocale(`/projects/${application.project.slug}`, locale)}>
                            {locale === "ru" ? application.project.titleRu : application.project.titleEn}
                          </Link>
                        </div>
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{isRu ? "Сумма" : "Amount"}</p>
                          <p className="mt-1 text-18 font-medium text-qidra-dark">{formatUsdt(application.amountUsdt)}</p>
                        </div>
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{isRu ? "Резерв" : "Reserve"}</p>
                          <p className="mt-1 text-18 font-medium text-qidra-dark">{formatUsdt(application.reservedUsdt)}</p>
                        </div>
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{isRu ? "Статус" : "Status"}</p>
                          <div className="mt-2">
                            <ProjectStatusBadge status={investmentStatus(application.status)} locale={locale} />
                          </div>
                        </div>
                        <ButtonLink href={withLocale(`/projects/${application.project.slug}/documents`, locale)} variant="outline" size="sm">
                          {isRu ? "Документы" : "Documents"}
                        </ButtonLink>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <ButtonLink href={withLocale(`/investor/investments/${application.id}`, locale)} size="sm">
                          {isRu ? "Открыть контракт" : "Open contract"}
                        </ButtonLink>
                        <ButtonLink href={withLocale(`/projects/${application.project.slug}`, locale)} variant="outline" size="sm">
                          {isRu ? "Страница проекта" : "Project page"}
                        </ButtonLink>
                      </div>
                      {balanceWarning ? (
                        <div className="mt-5 grid gap-3 rounded-qidra border border-qidra-gold bg-yellow-50 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                          <div>
                            <p className="text-16 font-medium text-qidra-dark">{isRu ? "Недостаточно средств для этой заявки" : "Insufficient funds for this application"}</p>
                            <p className="mt-1 text-14 text-qidra-grayBlue">
                              {isRu
                                ? `По заявке зарезервировано ${formatUsdt(applicationReservedUsdt)}, свободно ${formatUsdt(availableUsdt)}. Чтобы покрыть сумму ${formatUsdt(applicationAmountUsdt)}, пополните ещё ${formatUsdt(applicationShortfall)} или отмените заявку.`
                                : `This application has ${formatUsdt(applicationReservedUsdt)} reserved and ${formatUsdt(availableUsdt)} available. To cover ${formatUsdt(applicationAmountUsdt)}, top up ${formatUsdt(applicationShortfall)} or cancel the application.`}
                            </p>
                          </div>
                          <ButtonLink href={withLocale(`/investor/wallet?amount=${formatAmountForInput(applicationShortfall)}`, locale)} size="sm">
                            {isRu ? "Пополнить разницу" : "Top up difference"}
                          </ButtonLink>
                          <CancelApplicationForm applicationId={application.id} locale={locale} />
                        </div>
                      ) : application.status === InvestmentStatus.PENDING ? (
                        <div className="mt-5 flex justify-end">
                          <CancelApplicationForm applicationId={application.id} locale={locale} />
                        </div>
                      ) : null}
                      {application.dividendPayments.length ? (
                        <div className="mt-6 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-16 font-medium text-qidra-dark">{isRu ? "Начисления по контракту" : "Contract accruals"}</p>
                              <p className="mt-1 text-14 text-qidra-grayBlue">
                                {isRu ? "История квартальных и иных выплат по выбранному проекту." : "History of quarterly and other payouts for this project."}
                              </p>
                            </div>
                            <p className="text-16 font-medium text-qidra-dark">
                              {formatUsdt(application.dividendPayments.reduce((total, payment) => total + Number(payment.amountUsdt.toString()), 0))}
                            </p>
                          </div>
                          <div className="mt-4 grid gap-2">
                            {application.dividendPayments.slice(0, 4).map((payment) => (
                              <div key={payment.id} className="grid gap-2 rounded-qidra bg-white p-3 text-14 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                                <span className="font-medium text-qidra-dark">{payment.period.periodLabel}</span>
                                <span className="text-qidra-grayBlue">{dividendStatusLabel(payment.status, locale)}</span>
                                <span className="font-medium text-qidra-dark">{formatUsdt(payment.amountUsdt)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <NotificationCard
                  title={allApplications.length ? (isRu ? "По этому статусу заявок нет" : "No applications with this status") : isRu ? "Заявок пока нет" : "No applications yet"}
                  text={
                    allApplications.length
                      ? isRu
                        ? "Выберите другой статус или откройте все заявки."
                        : "Choose another status or open all applications."
                      : isRu
                        ? "Выберите проект, изучите документы и отправьте заявку на участие."
                        : "Choose a project, review documents and submit a participation application."
                  }
                />
                <ButtonLink href={allApplications.length ? investmentFilterHref(locale) : withLocale("/projects", locale)}>
                  {allApplications.length ? (isRu ? "Все заявки" : "All applications") : isRu ? "Открыть проекты" : "Open projects"}
                </ButtonLink>
              </section>
            )}
          </div>
          </InvestorWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function SummaryCard({ label, tone = "default", value }: { label: string; tone?: "default" | "success" | "warning"; value: string }) {
  const color = tone === "success" ? "bg-green-50 text-qidra-green" : tone === "warning" ? "bg-yellow-50 text-qidra-dark" : "bg-white text-qidra-dark";

  return (
    <article className={`rounded-[20px] p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] ${color}`}>
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className="mt-3 text-[28px] font-medium leading-tight tracking-[0]">{value}</p>
    </article>
  );
}

type ApplicationStats = {
  cancelledCount: number;
  confirmedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
};

type DividendPaymentSummary = {
  amountUsdt: { toString(): string };
  status: DividendPaymentStatus;
};

function InvestmentFilters({ locale, stats, statusFilter }: { locale: "ru" | "en"; stats: ApplicationStats; statusFilter?: InvestmentStatus }) {
  return (
    <div className="grid gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Статус заявки" : "Application status"}</p>
      <div className="flex flex-wrap gap-2">
        <InvestmentFilterPill active={!statusFilter} href={investmentFilterHref(locale)}>
          {locale === "ru" ? "Все" : "All"} ({formatCount(stats.totalCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.PENDING} href={investmentFilterHref(locale, InvestmentStatus.PENDING)}>
          {locale === "ru" ? "На проверке" : "Pending"} ({formatCount(stats.pendingCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.CONFIRMED} href={investmentFilterHref(locale, InvestmentStatus.CONFIRMED)}>
          {locale === "ru" ? "Подтверждено" : "Confirmed"} ({formatCount(stats.confirmedCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.REJECTED} href={investmentFilterHref(locale, InvestmentStatus.REJECTED)}>
          {locale === "ru" ? "Отклонено" : "Rejected"} ({formatCount(stats.rejectedCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.CANCELLED} href={investmentFilterHref(locale, InvestmentStatus.CANCELLED)}>
          {locale === "ru" ? "Отменено" : "Cancelled"} ({formatCount(stats.cancelledCount)})
        </InvestmentFilterPill>
      </div>
    </div>
  );
}

function InvestmentFilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        active ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayLight bg-white text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

function CancelApplicationForm({ applicationId, locale }: { applicationId: string; locale: "ru" | "en" }) {
  return (
    <FeedbackForm
      className="contents"
      endpoint={`/api/investments/${applicationId}?lang=${locale}`}
      feedback={{
        title: locale === "ru" ? "Заявка отменена" : "Application cancelled",
        text: locale === "ru" ? "Заявка снята с проверки. Страница обновится." : "The application was removed from review. The page will refresh.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value="cancel" />
      <button className="inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-grayMedium bg-white px-4 text-14 font-medium text-qidra-dark transition-colors hover:border-qidra-red hover:text-qidra-red" type="submit">
        {locale === "ru" ? "Отменить заявку" : "Cancel application"}
      </button>
    </FeedbackForm>
  );
}

function investmentStatus(status: string): BadgeStatus {
  if (status === InvestmentStatus.CONFIRMED) return "confirmed";
  if (status === InvestmentStatus.REJECTED || status === InvestmentStatus.CANCELLED) return "rejected";
  return "pending";
}

function formatUsdt(value: { toString(): string }) {
  const amount = Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatAmountForInput(value: number) {
  return Math.max(value, 0).toFixed(6).replace(/\.?0+$/, "");
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function buildApplicationStats(applications: Array<{ status: InvestmentStatus }>): ApplicationStats {
  return applications.reduce<ApplicationStats>(
    (stats, application) => {
      stats.totalCount += 1;

      if (application.status === InvestmentStatus.PENDING) stats.pendingCount += 1;
      if (application.status === InvestmentStatus.CONFIRMED) stats.confirmedCount += 1;
      if (application.status === InvestmentStatus.REJECTED) stats.rejectedCount += 1;
      if (application.status === InvestmentStatus.CANCELLED) stats.cancelledCount += 1;

      return stats;
    },
    {
      cancelledCount: 0,
      confirmedCount: 0,
      pendingCount: 0,
      rejectedCount: 0,
      totalCount: 0
    }
  );
}

function buildDividendTotals(payments: DividendPaymentSummary[]) {
  return payments.reduce(
    (totals, payment) => {
      const amount = Number(payment.amountUsdt.toString());

      totals.accrued += amount;

      if (payment.status === DividendPaymentStatus.PAID) {
        totals.paid += amount;
      } else if (payment.status !== DividendPaymentStatus.CANCELLED) {
        totals.awaiting += amount;
      }

      return totals;
    },
    { accrued: 0, awaiting: 0, paid: 0 }
  );
}

function dividendStatusLabel(status: DividendPaymentStatus, locale: "ru" | "en") {
  const labels = {
    [DividendPaymentStatus.CALCULATED]: { ru: "Рассчитано", en: "Calculated" },
    [DividendPaymentStatus.APPROVED]: { ru: "Утверждено", en: "Approved" },
    [DividendPaymentStatus.PAID]: { ru: "Выплачено", en: "Paid" },
    [DividendPaymentStatus.CANCELLED]: { ru: "Отменено", en: "Cancelled" }
  };

  return labels[status][locale];
}

function searchParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInvestmentStatus(value: string | undefined) {
  const normalized = value?.toUpperCase();

  if (normalized === InvestmentStatus.PENDING) return InvestmentStatus.PENDING;
  if (normalized === InvestmentStatus.CONFIRMED) return InvestmentStatus.CONFIRMED;
  if (normalized === InvestmentStatus.REJECTED) return InvestmentStatus.REJECTED;
  if (normalized === InvestmentStatus.CANCELLED) return InvestmentStatus.CANCELLED;
  return undefined;
}

function investmentFilterHref(locale: "ru" | "en", status?: InvestmentStatus) {
  const params = new URLSearchParams({ lang: locale });

  if (status) params.set("status", status.toLowerCase());

  return `/investor/investments?${params.toString()}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
