import Link from "next/link";
import { notFound } from "next/navigation";
import { DividendPaymentStatus, DividendPeriodStatus, InvestmentStatus, PaymentStatus, TransactionType } from "@prisma/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorTabs } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAuth } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvestorContractPage({
  params,
  searchParams
}: {
  params: Promise<{ applicationId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const [{ applicationId }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = await requireAuth(locale, `/investor/investments/${applicationId}`);
  const userId = session.user?.id ?? "";
  const isRu = locale === "ru";
  const application = await prisma.investmentApplication.findFirst({
    where: { id: applicationId, userId },
    include: {
      project: {
        include: {
          documents: true,
          reports: true,
          dividendPeriods: {
            where: {
              status: { in: [DividendPeriodStatus.APPROVED, DividendPeriodStatus.PAID] }
            },
            orderBy: { periodEnd: "desc" },
            take: 12
          }
        }
      },
      dividendPayments: {
        include: { period: true },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!application) {
    notFound();
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        where: {
          note: { contains: application.id }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      }
    }
  });
  const projectTitle = isRu ? application.project.titleRu : application.project.titleEn;
  const expectedReturn = localizedText(application.project.expectedReturnRu, application.project.expectedReturnEn, locale);
  const expectedYield = localizedText(application.project.expectedYieldRu, application.project.expectedYieldEn, locale);
  const linkedTransactions = wallet?.transactions ?? [];
  const dividendPayments = application.dividendPayments;
  const dividendPaymentsByPeriodId = new Map(dividendPayments.map((payment) => [payment.periodId, payment]));
  const dividendAccruedUsdt = sumUsdt(dividendPayments.filter((payment) => payment.status !== DividendPaymentStatus.CANCELLED).map((payment) => payment.amountUsdt));
  const dividendPaidUsdt = sumUsdt(dividendPayments.filter((payment) => payment.status === DividendPaymentStatus.PAID).map((payment) => payment.amountUsdt));
  const withdrawnUsdt = sumUsdt(linkedTransactions.filter((transaction) => transaction.type === TransactionType.WITHDRAWAL && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt));
  const reportingPeriods = application.project.dividendPeriods;

  return (
    <>
      <Header locale={locale} path={`/investor/investments/${application.id}`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: isRu ? "Кабинет" : "Dashboard", href: withLocale("/investor", locale) },
                { label: isRu ? "Моё участие" : "My participation", href: withLocale("/investor/investments", locale) },
                { label: projectTitle }
              ]}
            />
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Партнёрский контракт" : "Partnership contract"}</p>
                <h1 className="mt-3 max-w-5xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[58px]">{projectTitle}</h1>
                <p className="mt-4 max-w-4xl text-20 text-qidra-grayBlue">
                  {isRu
                    ? "Детали вашего участия: сумма, статус, документы проекта, начисления, выводы и связанные операции."
                    : "Your participation details: amount, status, project documents, accruals, withdrawals and linked operations."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={withLocale(`/projects/${application.project.slug}`, locale)} variant="outline">
                  {isRu ? "Открыть проект" : "Open project"}
                </ButtonLink>
                <ButtonLink href={withLocale("/investor/investments", locale)}>
                  {isRu ? "Все контракты" : "All contracts"}
                </ButtonLink>
              </div>
            </div>
            <InvestorTabs activePath="/investor/investments" locale={locale} />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <MetricCard label={isRu ? "Статус" : "Status"} value={investmentStatusLabel(application.status, locale)} tone={investmentTone(application.status)} />
              <MetricCard label={isRu ? "Сумма контракта" : "Contract amount"} value={formatUsdt(application.amountUsdt)} />
              <MetricCard label={isRu ? "Резерв" : "Reserve"} value={formatUsdt(application.reservedUsdt)} />
              <MetricCard label={isRu ? "Начислено" : "Accrued"} value={formatUsdt(dividendAccruedUsdt)} tone="success" />
              <MetricCard label={isRu ? "Выплачено" : "Paid"} value={formatUsdt(dividendPaidUsdt)} tone="success" />
              <MetricCard label={isRu ? "Выведено" : "Withdrawn"} value={formatUsdt(withdrawnUsdt)} />
            </div>

            <div className="grid gap-8 xl:grid-cols-[1fr_0.74fr]">
              <section className="grid gap-6">
                <Panel title={isRu ? "Условия и параметры" : "Terms and parameters"}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock label={isRu ? "Дата заявки" : "Application date"} value={formatDateTime(application.createdAt, locale)} />
                    <InfoBlock label={isRu ? "Дата активации" : "Activation date"} value={application.contractAcceptedAt ? formatDateTime(application.contractAcceptedAt, locale) : null} />
                    <InfoBlock label={isRu ? "Структура" : "Structure"} value={application.project.structure} />
                    <InfoBlock label={isRu ? "Локация" : "Location"} value={application.project.location} />
                    <InfoBlock label={isRu ? "Риск" : "Risk"} value={application.project.riskLevel} />
                    <InfoBlock label={isRu ? "Статус проекта" : "Project status"} value={application.project.status} />
                    <InfoBlock label={isRu ? "Стадия проекта" : "Project stage"} value={localizedText(application.project.stageRu, application.project.stageEn, locale) || (isRu ? "Уточняется" : "To be confirmed")} />
                    <InfoBlock label={isRu ? "Период сбора" : "Raise period"} value={formatOptionalDateRange(application.project.fundraisingStartAt, application.project.fundraisingEndAt, locale)} />
                    <InfoBlock label={isRu ? "План запуска" : "Planned launch"} value={formatOptionalDate(application.project.plannedLaunchAt, locale)} />
                    <InfoBlock label={isRu ? "Первые выплаты" : "First distributions"} value={formatOptionalDate(application.project.plannedDividendAt, locale)} />
                    <InfoBlock label={isRu ? "Срок участия" : "Participation term"} value={localizedText(application.project.participationTermRu, application.project.participationTermEn, locale) || (isRu ? "По условиям проекта" : "Per project terms")} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock label={isRu ? "Ожидаемый результат" : "Expected result"} value={expectedReturn || (isRu ? "По условиям проекта" : "Per project terms")} />
                    <InfoBlock label={isRu ? "Ориентир доходности" : "Yield guidance"} value={expectedYield || (isRu ? "Смотрите документы проекта" : "See project documents")} />
                  </div>
                  {application.adminNote ? (
                    <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                      <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Комментарий Qidra" : "Qidra note"}</p>
                      <p className="mt-2 whitespace-pre-wrap text-14 text-qidra-grayBlue">{application.adminNote}</p>
                    </div>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock
                      label={isRu ? "Что сделано сейчас" : "Current progress"}
                      value={localizedText(application.project.currentProgressRu, application.project.currentProgressEn, locale) || (isRu ? "Смотрите документы проекта" : "See project documents")}
                    />
                    <InfoBlock
                      label={isRu ? "План сбора" : "Raise plan"}
                      value={localizedText(application.project.raisePlanRu, application.project.raisePlanEn, locale) || (isRu ? "По условиям проекта" : "Per project terms")}
                    />
                  </div>
                </Panel>

                <Panel title={isRu ? "Документы проекта" : "Project documents"}>
                  {application.project.documents.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {application.project.documents.map((document) => (
                        <DocumentItem
                          key={document.id}
                          actionLabel={isRu ? "Открыть" : "Open"}
                          href={document.fileUrl}
                          meta={document.kind}
                          title={isRu ? document.titleRu : document.titleEn}
                        />
                      ))}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Документы пока не опубликованы" : "Documents are not published yet"}
                      text={isRu ? "Документы появятся здесь после подготовки проекта." : "Documents will appear here after project preparation."}
                    />
                  )}
                </Panel>

                <Panel title={isRu ? "Отчётность по проекту" : "Project reporting"}>
                  {application.project.reports.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {application.project.reports.map((report) => (
                        <DocumentItem
                          key={report.id}
                          actionLabel={isRu ? "Открыть" : "Open"}
                          href={report.fileUrl}
                          meta={report.publishedAt ? formatDate(report.publishedAt, locale) : report.period}
                          title={isRu ? report.titleRu : report.titleEn}
                        />
                      ))}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Отчётов пока нет" : "No reports yet"}
                      text={isRu ? "Когда проект начнёт публиковать отчётность, материалы появятся в этом разделе." : "When the project starts publishing reports, materials will appear here."}
                    />
                  )}
                </Panel>

                <Panel title={isRu ? "Дивиденды и отчётные периоды" : "Dividends and reporting periods"}>
                  {reportingPeriods.length || dividendPayments.length ? (
                    <div className="grid gap-3">
                      {reportingPeriods.map((period) => {
                        const payment = dividendPaymentsByPeriodId.get(period.id);
                        const zeroDistribution = Number(period.investorPoolUsdt.toString()) <= 0;
                        const amount = payment?.amountUsdt ?? 0;
                        const statusLabel = payment
                          ? dividendPaymentStatusLabel(payment.status, locale)
                          : dividendPeriodParticipantStatusLabel(period.status, locale, zeroDistribution);

                        return (
                          <article key={period.id} className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-18 font-medium text-qidra-dark">{period.periodLabel}</p>
                                <span className="rounded-full bg-white px-3 py-1 text-12 font-medium text-qidra-grayBlue">{statusLabel}</span>
                              </div>
                              <p className="mt-2 text-14 text-qidra-grayBlue">
                                {formatDate(period.periodStart, locale)} - {formatDate(period.periodEnd, locale)}
                              </p>
                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <InfoBlock label={isRu ? "Чистый результат" : "Net result"} value={formatUsdt(period.netProfitUsdt)} />
                                <InfoBlock label={isRu ? "Пул участников" : "Participant pool"} value={formatUsdt(period.investorPoolUsdt)} />
                                <InfoBlock label={isRu ? "Доля участников" : "Participant share"} value={`${formatPercent(period.investorSharePercent)}%`} />
                                <InfoBlock label={isRu ? "Ваше начисление" : "Your accrual"} value={formatUsdt(amount)} />
                              </div>
                              {zeroDistribution ? (
                                <p className="mt-3 rounded-qidra border border-qidra-gold bg-yellow-50 px-4 py-3 text-14 text-qidra-grayBlue">
                                  {isRu
                                    ? "За этот отчётный период положительный распределяемый результат не сформирован, поэтому начисление участникам равно 0 USDT."
                                    : "This reporting period did not generate a positive distributable result, so participant accrual is 0 USDT."}
                                </p>
                              ) : null}
                              {period.adminNote ? <p className="mt-3 whitespace-pre-wrap text-14 text-qidra-grayBlue">{period.adminNote}</p> : null}
                            </div>
                            <div className="rounded-qidra bg-white p-4 text-right">
                              <p className="text-12 font-medium uppercase text-qidra-grayBlue">{isRu ? "Начислено вам" : "Accrued to you"}</p>
                              <p className="mt-2 text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{formatUsdt(amount)}</p>
                              {payment ? <p className="mt-2 text-13 text-qidra-grayBlue">{payment.eligibleDays} {isRu ? "дн. участия" : "eligible days"}</p> : null}
                            </div>
                          </article>
                        );
                      })}
                      {!reportingPeriods.length
                        ? dividendPayments.map((payment) => (
                            <article key={payment.id} className="grid gap-3 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                              <div>
                                <p className="text-18 font-medium text-qidra-dark">{payment.period.periodLabel}</p>
                                <p className="mt-1 text-14 text-qidra-grayBlue">
                                  {formatDate(payment.period.periodStart, locale)} - {formatDate(payment.period.periodEnd, locale)}
                                </p>
                              </div>
                              <p className="text-14 font-medium text-qidra-accent">{dividendPaymentStatusLabel(payment.status, locale)}</p>
                              <p className="text-18 font-medium text-qidra-dark">{formatUsdt(payment.amountUsdt)}</p>
                            </article>
                          ))
                        : null}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Отчётных периодов пока нет" : "No reporting periods yet"}
                      text={
                        isRu
                          ? "Когда Qidra утвердит квартальный, ежемесячный или годовой период по проекту, он появится здесь вместе с вашим начислением."
                          : "When Qidra approves a quarterly, monthly or annual project period, it will appear here with your accrual."
                      }
                    />
                  )}
                </Panel>
              </section>

              <aside className="grid content-start gap-6">
                <Panel title={isRu ? "Состояние договора" : "Contract state"}>
                  <div className="flex items-center justify-between gap-4 rounded-qidra bg-qidra-grayLight p-4">
                    <span className="text-14 font-medium text-qidra-grayBlue">{isRu ? "Текущий статус" : "Current status"}</span>
                    <ProjectStatusBadge status={investmentBadgeStatus(application.status)} locale={locale} />
                  </div>
                  <InfoBlock label={isRu ? "ID заявки" : "Application ID"} value={application.id} />
                  <InfoBlock label={isRu ? "Согласие с условиями" : "Terms accepted"} value={application.termsAcceptedAt ? formatDateTime(application.termsAcceptedAt, locale) : null} />
                </Panel>

                <Panel title={isRu ? "История операций" : "Operation history"}>
                  {linkedTransactions.length ? (
                    <div className="grid gap-3">
                      {linkedTransactions.map((transaction) => (
                        <article key={transaction.id} className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-16 font-medium text-qidra-dark">{transactionTitle(transaction.type, locale)}</p>
                              <p className="mt-1 text-12 text-qidra-grayBlue">{formatDateTime(transaction.createdAt, locale)}</p>
                            </div>
                            <strong className="text-16 text-qidra-dark">{transactionAmount(transaction.type, transaction.amountUsdt)}</strong>
                          </div>
                          <p className="mt-2 break-all text-12 text-qidra-grayBlue">{transaction.txHash || transaction.destinationAddress || transaction.note}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Операций по контракту пока нет" : "No contract operations yet"}
                      text={
                        isRu
                          ? "После активации, начислений или вывода по этому договору операции появятся здесь."
                          : "After activation, accruals or withdrawals for this contract, operations will appear here."
                      }
                    />
                  )}
                </Panel>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
      <h2 className="text-[30px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({ label, tone = "neutral", value }: { label: string; tone?: "danger" | "neutral" | "success" | "warning"; value: string }) {
  const toneClass = tone === "success" ? "text-qidra-green" : tone === "danger" ? "text-qidra-red" : tone === "warning" ? "text-qidra-gold" : "text-qidra-dark";

  return (
    <article className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 break-words text-[26px] font-medium leading-tight tracking-[0] ${toneClass}`}>{value}</p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="mt-2 break-words text-16 font-medium text-qidra-dark">{value || "—"}</p>
    </div>
  );
}

function sumUsdt(values: Array<{ toString(): string }>) {
  return values.reduce<number>((sum, value) => sum + Number(value.toString()), 0);
}

function localizedText(ru: string | null | undefined, en: string | null | undefined, locale: "ru" | "en") {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function investmentStatusLabel(status: InvestmentStatus, locale: "ru" | "en") {
  if (status === InvestmentStatus.CONFIRMED) return locale === "ru" ? "Активирован" : "Activated";
  if (status === InvestmentStatus.REJECTED) return locale === "ru" ? "Отклонён" : "Rejected";
  if (status === InvestmentStatus.CANCELLED) return locale === "ru" ? "Отменён" : "Cancelled";
  return locale === "ru" ? "На проверке" : "Under review";
}

function investmentTone(status: InvestmentStatus): "danger" | "neutral" | "success" | "warning" {
  if (status === InvestmentStatus.CONFIRMED) return "success";
  if (status === InvestmentStatus.REJECTED) return "danger";
  if (status === InvestmentStatus.CANCELLED) return "neutral";
  return "warning";
}

function investmentBadgeStatus(status: InvestmentStatus): BadgeStatus {
  if (status === InvestmentStatus.CONFIRMED) return "confirmed";
  if (status === InvestmentStatus.REJECTED || status === InvestmentStatus.CANCELLED) return "rejected";
  return "pending";
}

function transactionTitle(type: TransactionType, locale: "ru" | "en") {
  if (type === TransactionType.WITHDRAWAL) return locale === "ru" ? "Вывод" : "Withdrawal";
  if (type === TransactionType.INVESTMENT) return locale === "ru" ? "Участие" : "Participation";
  if (type === TransactionType.RETURN) return locale === "ru" ? "Начисление" : "Accrual";
  if (type === TransactionType.ADJUSTMENT) return locale === "ru" ? "Корректировка" : "Adjustment";
  return locale === "ru" ? "Пополнение" : "Deposit";
}

function transactionAmount(type: TransactionType, amount: { toString(): string }) {
  const sign = type === TransactionType.INVESTMENT || type === TransactionType.WITHDRAWAL ? "-" : "+";
  return `${sign}${formatUsdt(amount)}`;
}

function dividendPaymentStatusLabel(status: DividendPaymentStatus, locale: "ru" | "en") {
  const labels: Record<DividendPaymentStatus, { ru: string; en: string }> = {
    [DividendPaymentStatus.CALCULATED]: { ru: "Рассчитано", en: "Calculated" },
    [DividendPaymentStatus.APPROVED]: { ru: "Утверждено", en: "Approved" },
    [DividendPaymentStatus.PAID]: { ru: "Выплачено", en: "Paid" },
    [DividendPaymentStatus.CANCELLED]: { ru: "Отменено", en: "Cancelled" }
  };

  return labels[status][locale];
}

function dividendPeriodParticipantStatusLabel(status: DividendPeriodStatus, locale: "ru" | "en", zeroDistribution: boolean) {
  if (zeroDistribution && status === DividendPeriodStatus.PAID) {
    return locale === "ru" ? "Закрыт без выплаты" : "Closed without payout";
  }

  if (zeroDistribution && status === DividendPeriodStatus.APPROVED) {
    return locale === "ru" ? "Утверждён без начислений" : "Approved without accruals";
  }

  const labels: Record<DividendPeriodStatus, { ru: string; en: string }> = {
    [DividendPeriodStatus.DRAFT]: { ru: "Рассчитано", en: "Calculated" },
    [DividendPeriodStatus.APPROVED]: { ru: "Утверждено", en: "Approved" },
    [DividendPeriodStatus.PAID]: { ru: "Выплачено", en: "Paid" },
    [DividendPeriodStatus.CANCELLED]: { ru: "Отменено", en: "Cancelled" }
  };

  return labels[status][locale];
}

function formatPercent(value: { toString(): string } | number) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(amount);
}

function formatUsdt(value: { toString(): string } | number) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatOptionalDate(date: Date | null, locale: "ru" | "en") {
  return date ? formatDate(date, locale) : locale === "ru" ? "Уточняется" : "To be confirmed";
}

function formatOptionalDateRange(start: Date | null, end: Date | null, locale: "ru" | "en") {
  if (!start && !end) return locale === "ru" ? "Уточняется" : "To be confirmed";
  if (start && end) return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
  return formatOptionalDate(start ?? end, locale);
}

function formatDateTime(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
