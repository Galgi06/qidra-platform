import Link from "next/link";
import type { ReactNode } from "react";
import { DividendPaymentStatus, DividendPeriodStatus, InvestmentStatus, KycStatus, PaymentStatus, ProjectStatus, Role, SupportThreadStatus, TransactionType } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/analytics");
  const isRu = locale === "ru";
  const realClientTransactionsWhere = nonInternalTransactionsWhere();

  const [
    totalUsers,
    investorCount,
    adminCount,
    staffCount,
    ownEmailInvestorCount,
    importedEmailInvestorCount,
    verifiedEmailCount,
    walletTotals,
    totalProjects,
    activeProjects,
    fundedProjects,
    reviewProjects,
    targetUsdtTotal,
    fundedUsdtTotal,
    confirmedInvestments,
    pendingInvestments,
    confirmedInvestmentsAmount,
    pendingInvestmentsAmount,
    confirmedDepositsAmount,
    confirmedWithdrawalsAmount,
    confirmedReturnsAmount,
    pendingPayments,
    totalTransactions,
    approvedDividendPeriods,
    paidDividendPeriods,
    accruedDividendsAmount,
    paidDividendsAmount,
    submittedKycCount,
    approvedKycCount,
    rejectedKycCount,
    openSupportCount,
    pendingSupportCount,
    closedSupportCount,
    supportRatings,
    incomingSubmissionCount,
    linkedSubmissionCount,
    unreadNotificationsCount,
    auditEventsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: Role.INVESTOR } }),
    prisma.user.count({ where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] } } }),
    prisma.user.count({ where: { role: { in: [Role.TECH_SUPPORT, Role.SALES_MANAGER] } } }),
    prisma.user.count({
      where: {
        role: Role.INVESTOR,
        NOT: [{ email: { endsWith: "@qidra.import" } }, { email: { endsWith: "@qidra.local" } }, { email: { endsWith: "@telegram.qidra.local" } }]
      }
    }),
    prisma.user.count({ where: { role: Role.INVESTOR, email: { endsWith: "@qidra.import" } } }),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.wallet.aggregate({
      _sum: {
        availableUsdt: true,
        pendingUsdt: true,
        reservedUsdt: true
      }
    }),
    prisma.project.count(),
    prisma.project.count({ where: { status: ProjectStatus.ACTIVE } }),
    prisma.project.count({ where: { status: ProjectStatus.FUNDED } }),
    prisma.project.count({ where: { status: ProjectStatus.REVIEW } }),
    prisma.project.aggregate({ _sum: { targetUsdt: true } }),
    prisma.project.aggregate({ _sum: { fundedUsdt: true } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.CONFIRMED } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.PENDING } }),
    prisma.investmentApplication.aggregate({ where: { status: InvestmentStatus.CONFIRMED }, _sum: { amountUsdt: true } }),
    prisma.investmentApplication.aggregate({ where: { status: InvestmentStatus.PENDING }, _sum: { amountUsdt: true } }),
    prisma.walletTransaction.aggregate({
      where: { AND: [realClientTransactionsWhere, { status: PaymentStatus.CONFIRMED, type: TransactionType.DEPOSIT }] },
      _sum: { amountUsdt: true }
    }),
    prisma.walletTransaction.aggregate({
      where: { AND: [realClientTransactionsWhere, { status: PaymentStatus.CONFIRMED, type: TransactionType.WITHDRAWAL }] },
      _sum: { amountUsdt: true }
    }),
    prisma.walletTransaction.aggregate({
      where: { AND: [realClientTransactionsWhere, { status: PaymentStatus.CONFIRMED, type: TransactionType.RETURN }] },
      _sum: { amountUsdt: true }
    }),
    prisma.walletTransaction.count({ where: { AND: [realClientTransactionsWhere, { status: PaymentStatus.PENDING }] } }),
    prisma.walletTransaction.count({ where: realClientTransactionsWhere }),
    prisma.projectDividendPeriod.count({ where: { status: DividendPeriodStatus.APPROVED } }),
    prisma.projectDividendPeriod.count({ where: { status: DividendPeriodStatus.PAID } }),
    prisma.dividendPayment.aggregate({
      where: { status: { in: [DividendPaymentStatus.CALCULATED, DividendPaymentStatus.APPROVED, DividendPaymentStatus.PAID] } },
      _sum: { amountUsdt: true }
    }),
    prisma.dividendPayment.aggregate({ where: { status: DividendPaymentStatus.PAID }, _sum: { amountUsdt: true } }),
    prisma.kycApplication.count({ where: { status: KycStatus.SUBMITTED } }),
    prisma.kycApplication.count({ where: { status: KycStatus.APPROVED } }),
    prisma.kycApplication.count({ where: { status: KycStatus.REJECTED } }),
    prisma.supportThread.count({ where: { status: SupportThreadStatus.OPEN } }),
    prisma.supportThread.count({ where: { status: SupportThreadStatus.PENDING } }),
    prisma.supportThread.count({ where: { status: SupportThreadStatus.CLOSED } }),
    prisma.supportThread.aggregate({ _avg: { rating: true }, _count: { rating: true } }),
    prisma.projectSubmission.count({ where: { status: { in: ["SUBMITTED", "REVIEW"] } } }),
    prisma.projectSubmission.count({ where: { projectId: { not: null } } }),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.adminAuditLog.count()
  ]);

  const averageSupportRating = supportRatings._avg.rating ? Number(supportRatings._avg.rating).toFixed(1) : "0.0";
  const ratedSupportCount = supportRatings._count.rating ?? 0;
  const coveragePercent = percentage(sumDecimal(fundedUsdtTotal._sum.fundedUsdt), sumDecimal(targetUsdtTotal._sum.targetUsdt));

  return (
    <>
      <Header locale={locale} path="/admin/analytics" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: isRu ? "Аналитика" : "Analytics" }
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Сводка платформы" : "Platform intelligence"}</p>
                <h1 className="mt-4 title-48 text-qidra-dark">{isRu ? "Аналитика Qidra" : "Qidra analytics"}</h1>
                <p className="mt-5 max-w-3xl text-20 text-qidra-grayBlue">
                  {isRu
                    ? "Единый экран по пользователям, платежам, проектам, заявкам, дивидендам и качеству операционной воронки."
                    : "A single screen for users, payments, projects, applications, dividends, and operational funnel quality."}
                </p>
              </div>
              <NotificationCard
                tone="warning"
                title={isRu ? "Что важно проверить" : "What to review first"}
                text={
                  isRu
                    ? "Если у участника виден служебный email импорта, откройте досье и замените его на реальный email клиента."
                    : "If a participant still has an imported placeholder email, open the dossier and replace it with the client's real email."
                }
              />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/analytics" locale={locale} />

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <AnalyticsCard label={isRu ? "Всего аккаунтов" : "Total accounts"} value={formatCount(totalUsers)} />
              <AnalyticsCard label={isRu ? "Участники" : "Participants"} value={formatCount(investorCount)} />
              <AnalyticsCard label={isRu ? "Собственный email" : "Own email"} tone="success" value={formatCount(ownEmailInvestorCount)} />
              <AnalyticsCard label={isRu ? "Импортный email" : "Imported email"} tone="warning" value={formatCount(importedEmailInvestorCount)} />
              <AnalyticsCard label={isRu ? "Админы" : "Admins"} tone="accent" value={formatCount(adminCount)} />
              <AnalyticsCard label={isRu ? "Команда" : "Staff"} tone="accent" value={formatCount(staffCount)} />
            </section>

            <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                title={isRu ? "Покрытие email участников" : "Participant email coverage"}
                value={`${formatCount(ownEmailInvestorCount)} / ${formatCount(investorCount)}`}
                note={
                  isRu
                    ? `${formatCount(importedEmailInvestorCount)} карточек ещё на служебном email.`
                    : `${formatCount(importedEmailInvestorCount)} cards still use placeholder emails.`
                }
                href={withLocale("/admin/users", locale)}
              />
              <InsightCard
                title={isRu ? "Верификация email" : "Email verification"}
                value={formatCount(verifiedEmailCount)}
                note={isRu ? "Подтверждённые адреса по всей платформе." : "Verified addresses across the platform."}
                href={withLocale("/admin/users", locale)}
              />
              <InsightCard
                title={isRu ? "Заполненность проектов" : "Project coverage"}
                value={`${coveragePercent}%`}
                note={
                  isRu
                    ? `${formatUsdt(sumDecimal(fundedUsdtTotal._sum.fundedUsdt))} из ${formatUsdt(sumDecimal(targetUsdtTotal._sum.targetUsdt))}.`
                    : `${formatUsdt(sumDecimal(fundedUsdtTotal._sum.fundedUsdt))} out of ${formatUsdt(sumDecimal(targetUsdtTotal._sum.targetUsdt))}.`
                }
                href={withLocale("/admin/projects", locale)}
              />
              <InsightCard
                title={isRu ? "Средняя оценка поддержки" : "Support average rating"}
                value={averageSupportRating}
                note={
                  isRu ? `Оценённых обращений: ${formatCount(ratedSupportCount)}.` : `Rated threads: ${formatCount(ratedSupportCount)}.`
                }
                href={withLocale("/admin/support", locale)}
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <MetricGroup title={isRu ? "Деньги и кошельки" : "Funds and wallets"}>
                <AnalyticsStat label={isRu ? "Доступный баланс" : "Available balance"} value={formatUsdt(sumDecimal(walletTotals._sum.availableUsdt))} tone="success" />
                <AnalyticsStat label={isRu ? "В ожидании" : "Pending balance"} value={formatUsdt(sumDecimal(walletTotals._sum.pendingUsdt))} />
                <AnalyticsStat label={isRu ? "В резерве" : "Reserved balance"} value={formatUsdt(sumDecimal(walletTotals._sum.reservedUsdt))} tone="accent" />
                <AnalyticsStat label={isRu ? "Подтверждённые пополнения" : "Confirmed deposits"} value={formatUsdt(sumDecimal(confirmedDepositsAmount._sum.amountUsdt))} tone="success" />
                <AnalyticsStat label={isRu ? "Подтверждённые выводы" : "Confirmed withdrawals"} value={formatUsdt(sumDecimal(confirmedWithdrawalsAmount._sum.amountUsdt))} />
                <AnalyticsStat label={isRu ? "Подтверждённые возвраты" : "Confirmed returns"} value={formatUsdt(sumDecimal(confirmedReturnsAmount._sum.amountUsdt))} />
              </MetricGroup>

              <MetricGroup title={isRu ? "Заявки и проекты" : "Applications and projects"}>
                <AnalyticsStat label={isRu ? "Всего проектов" : "Total projects"} value={formatCount(totalProjects)} />
                <AnalyticsStat label={isRu ? "Активные проекты" : "Active projects"} value={formatCount(activeProjects)} tone="success" />
                <AnalyticsStat label={isRu ? "Собранные проекты" : "Funded projects"} value={formatCount(fundedProjects)} tone="success" />
                <AnalyticsStat label={isRu ? "Проекты на проверке" : "Projects in review"} value={formatCount(reviewProjects)} tone="accent" />
                <AnalyticsStat label={isRu ? "Подтверждённые заявки" : "Confirmed applications"} value={formatCount(confirmedInvestments)} tone="success" />
                <AnalyticsStat label={isRu ? "На проверке" : "Pending applications"} value={formatCount(pendingInvestments)} tone="accent" />
                <AnalyticsStat label={isRu ? "Подтверждено USDT" : "Confirmed USDT"} value={formatUsdt(sumDecimal(confirmedInvestmentsAmount._sum.amountUsdt))} tone="success" />
                <AnalyticsStat label={isRu ? "Ожидает USDT" : "Pending USDT"} value={formatUsdt(sumDecimal(pendingInvestmentsAmount._sum.amountUsdt))} tone="accent" />
              </MetricGroup>

              <MetricGroup title={isRu ? "Операции и качество" : "Operations and quality"}>
                <AnalyticsStat label={isRu ? "KYC на проверке" : "KYC pending"} value={formatCount(submittedKycCount)} tone="accent" />
                <AnalyticsStat label={isRu ? "KYC одобрено" : "KYC approved"} value={formatCount(approvedKycCount)} tone="success" />
                <AnalyticsStat label={isRu ? "KYC отклонено" : "KYC rejected"} value={formatCount(rejectedKycCount)} />
                <AnalyticsStat label={isRu ? "Платежей в очереди" : "Payments pending"} value={formatCount(pendingPayments)} tone="accent" />
                <AnalyticsStat label={isRu ? "Всего операций" : "Total transactions"} value={formatCount(totalTransactions)} />
                <AnalyticsStat label={isRu ? "Открытые диалоги" : "Open threads"} value={formatCount(openSupportCount)} tone="accent" />
                <AnalyticsStat label={isRu ? "Ожидают участника" : "Waiting participant"} value={formatCount(pendingSupportCount)} />
                <AnalyticsStat label={isRu ? "Закрытые диалоги" : "Closed threads"} value={formatCount(closedSupportCount)} tone="success" />
              </MetricGroup>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <MetricGroup title={isRu ? "Дивиденды и отчётность" : "Dividends and reporting"}>
                <AnalyticsStat label={isRu ? "Периоды утверждены" : "Approved periods"} value={formatCount(approvedDividendPeriods)} />
                <AnalyticsStat label={isRu ? "Периоды выплачены" : "Paid periods"} value={formatCount(paidDividendPeriods)} tone="success" />
                <AnalyticsStat label={isRu ? "Начислено дивидендов" : "Accrued dividends"} value={formatUsdt(sumDecimal(accruedDividendsAmount._sum.amountUsdt))} tone="accent" />
                <AnalyticsStat label={isRu ? "Выплачено дивидендов" : "Paid dividends"} value={formatUsdt(sumDecimal(paidDividendsAmount._sum.amountUsdt))} tone="success" />
              </MetricGroup>

              <MetricGroup title={isRu ? "Очереди админки" : "Admin queues"}>
                <QueueLink href={withLocale("/admin/project-submissions", locale)} label={isRu ? "Входящие размещения" : "Incoming listings"} value={formatCount(incomingSubmissionCount)} />
                <QueueLink href={withLocale("/admin/projects", locale)} label={isRu ? "Связанные размещения" : "Linked listings"} value={formatCount(linkedSubmissionCount)} />
                <QueueLink href={withLocale("/admin/support", locale)} label={isRu ? "Непрочитанные уведомления" : "Unread notifications"} value={formatCount(unreadNotificationsCount)} />
                <QueueLink href={withLocale("/admin/audit", locale)} label={isRu ? "События журнала" : "Audit events"} value={formatCount(auditEventsCount)} />
              </MetricGroup>
            </section>

            <div className="flex flex-wrap gap-3">
              <ButtonLink href={withLocale("/admin/users", locale)} size="sm" variant="outline">
                {isRu ? "Открыть пользователей" : "Open users"}
              </ButtonLink>
              <ButtonLink href={withLocale("/admin/projects", locale)} size="sm" variant="outline">
                {isRu ? "Открыть проекты" : "Open projects"}
              </ButtonLink>
              <ButtonLink href={withLocale("/admin/payments", locale)} size="sm" variant="outline">
                {isRu ? "Открыть платежи" : "Open payments"}
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function nonInternalTransactionsWhere() {
  return {
    NOT: [
      {
        wallet: {
          is: {
            user: {
              is: {
                email: {
                  endsWith: "@qidra.local"
                }
              }
            }
          }
        }
      }
    ]
  };
}

function AnalyticsCard({
  label,
  tone = "neutral",
  value
}: {
  label: string;
  tone?: "accent" | "neutral" | "success" | "warning";
  value: string;
}) {
  const valueClass =
    tone === "success"
      ? "text-qidra-green"
      : tone === "accent"
        ? "text-qidra-accent"
        : tone === "warning"
          ? "text-qidra-gold"
          : "text-qidra-dark";

  return (
    <article className="surface bg-white p-6">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{value}</p>
    </article>
  );
}

function InsightCard({ href, note, title, value }: { href: string; note: string; title: string; value: string }) {
  return (
    <Link className="surface bg-white p-6 transition hover:border-qidra-accent" href={href}>
      <p className="text-14 font-medium uppercase text-qidra-accent">{title}</p>
      <p className="mt-3 text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{value}</p>
      <p className="mt-3 text-14 text-qidra-grayBlue">{note}</p>
    </Link>
  );
}

function MetricGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="surface bg-white p-6">
      <h2 className="text-24 font-medium text-qidra-dark">{title}</h2>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  );
}

function AnalyticsStat({
  label,
  tone = "neutral",
  value
}: {
  label: string;
  tone?: "accent" | "neutral" | "success";
  value: string;
}) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <div className="flex items-start justify-between gap-4 rounded-qidra border border-qidra-line bg-qidra-panel px-4 py-3">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className={`text-16 font-medium ${valueClass}`}>{value}</p>
    </div>
  );
}

function QueueLink({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link className="flex items-start justify-between gap-4 rounded-qidra border border-qidra-line bg-qidra-panel px-4 py-3 transition hover:border-qidra-accent" href={href}>
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="text-16 font-medium text-qidra-dark">{value}</p>
    </Link>
  );
}

function sumDecimal(value?: { toString(): string } | null) {
  return Number(value?.toString() ?? 0);
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} USDT`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function percentage(value: number, total: number) {
  if (total <= 0) return "0";
  return Math.round((value / total) * 100).toString();
}
