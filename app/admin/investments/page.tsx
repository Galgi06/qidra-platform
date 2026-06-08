import Link from "next/link";
import type { ReactNode } from "react";
import { DividendPeriodStatus, InvestmentStatus, Prisma } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function AdminInvestmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  await requireAdmin(locale, "/admin/investments");
  const statusFilter = parseInvestmentStatus(searchParamString(params.status));
  const applicationWhere: Prisma.InvestmentApplicationWhereInput = statusFilter ? { status: statusFilter } : {};
  const [requests, totalCount, pendingCount, confirmedCount, rejectedCount, cancelledCount, dividendProjects, dividendPeriods] = await Promise.all([
    prisma.investmentApplication.findMany({
      where: applicationWhere,
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
      },
      orderBy: { createdAt: "desc" },
      take: 80
    }),
    prisma.investmentApplication.count(),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.PENDING } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.CONFIRMED } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.REJECTED } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.CANCELLED } }),
    prisma.project.findMany({
      where: {
        investments: {
          some: { status: InvestmentStatus.CONFIRMED }
        }
      },
      select: {
        id: true,
        titleRu: true,
        titleEn: true,
        payoutFrequency: true,
        fundedUsdt: true,
        targetUsdt: true,
        _count: {
          select: {
            investments: { where: { status: InvestmentStatus.CONFIRMED } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.projectDividendPeriod.findMany({
      include: {
        project: {
          select: { titleRu: true, titleEn: true }
        },
        _count: {
          select: { payments: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);
  const stats = { cancelledCount, confirmedCount, pendingCount, rejectedCount, totalCount };

  return (
    <>
      <Header locale={locale} path="/admin/investments" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: locale === "ru" ? "Заявки" : "Applications" }
              ]}
            />
            <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Заявки на участие" : "Participation applications"}</h1>
            <p className="mt-4 text-20 text-qidra-grayBlue">
              {locale === "ru"
                ? "Подтверждайте заявки только после проверки средств, профиля участника и принятия договорных условий."
                : "Approve only after funds, participant profile and contract acceptance are checked."}
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/investments" locale={locale} />
            <DividendAccountingPanel
              defaultDates={currentQuarterDefaults()}
              locale={locale}
              periods={dividendPeriods}
              projects={dividendProjects}
            />
            <InvestmentDashboard locale={locale} stats={stats} />
            <InvestmentFilters locale={locale} stats={stats} statusFilter={statusFilter} />
            {requests.length ? (
              requests.map((request) => {
                const latestKycStatus = request.user.kycApplications[0]?.status;
                const walletAvailableUsdt = Number(request.user.wallet?.availableUsdt.toString() ?? 0);
                const walletReservedUsdt = Number(request.user.wallet?.reservedUsdt.toString() ?? 0);
                const applicationReservedUsdt = Number(request.reservedUsdt.toString());
                const amountUsdt = Number(request.amountUsdt.toString());
                const reserveGapUsdt = Math.max(amountUsdt - applicationReservedUsdt, 0);
                const hasEnoughAvailable = walletAvailableUsdt >= reserveGapUsdt;
                const hasEnoughReserve = walletReservedUsdt >= applicationReservedUsdt;
                const hasEnoughBalance = hasEnoughAvailable && hasEnoughReserve;
                const canConfirm = latestKycStatus === "APPROVED" && hasEnoughBalance;
                const blockedMessage = investmentBlockedMessage({
                  hasEnoughAvailable,
                  hasEnoughReserve,
                  latestKycStatus,
                  locale
                });
                const userDossierHref = withLocale(`/admin/users/${request.userId}`, locale);

                return (
                  <div key={request.id} className="surface grid gap-5 p-6">
                    <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr_1fr_0.8fr_0.9fr_auto] lg:items-center">
                      <div>
                        <p className="text-16 font-medium text-qidra-dark">{request.id.slice(-8).toUpperCase()}</p>
                        <p className="mt-1 text-14 text-qidra-grayBlue">{formatDate(request.createdAt, locale)}</p>
                        {request.contractAcceptedAt ? (
                          <p className="mt-1 text-13 font-medium text-qidra-green">
                            {locale === "ru" ? "Вход" : "Entry"}: {formatDate(request.contractAcceptedAt, locale)}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Участник" : "Participant"}</p>
                        <Link className="mt-1 block text-16 font-medium text-qidra-dark transition-colors hover:text-qidra-accent" href={userDossierHref}>
                          {request.user.name || request.user.email}
                        </Link>
                        <p className="mt-1 break-words text-14 text-qidra-grayBlue">{request.user.email}</p>
                        <Link className="mt-2 inline-flex text-13 font-medium text-qidra-accent hover:text-qidra-dark" href={userDossierHref}>
                          {locale === "ru" ? "Открыть карточку клиента" : "Open client card"}
                        </Link>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Проект" : "Project"}</p>
                        <p className="mt-1 text-16 font-medium text-qidra-dark">{locale === "ru" ? request.project.titleRu : request.project.titleEn}</p>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Сумма" : "Amount"}</p>
                        <p className="mt-1 text-16 font-medium text-qidra-dark">{formatUsdt(request.amountUsdt)}</p>
                      </div>
                      <div className="grid gap-1 text-14">
                        <p className="font-medium text-qidra-dark">{locale === "ru" ? "KYC" : "KYC"}: {kycStatusLabel(latestKycStatus, locale)}</p>
                        <p className={hasEnoughAvailable ? "text-qidra-green" : "text-qidra-red"}>
                          {locale === "ru" ? "Свободно" : "Available"}: {formatUsdt(request.user.wallet?.availableUsdt ?? 0)}
                        </p>
                        <p className={hasEnoughReserve ? "text-qidra-green" : "text-qidra-red"}>
                          {locale === "ru" ? "Резерв кошелька" : "Wallet reserve"}: {formatUsdt(request.user.wallet?.reservedUsdt ?? 0)}
                        </p>
                        <p className="text-qidra-grayBlue">
                          {locale === "ru" ? "Резерв заявки" : "Application reserve"}: {formatUsdt(request.reservedUsdt)}
                        </p>
                        <p className="text-qidra-grayBlue">
                          {locale === "ru" ? "Нужно из свободного" : "Needed from available"}: {formatUsdt(reserveGapUsdt)}
                        </p>
                      </div>
                      <div className="grid gap-3 lg:justify-items-end">
                        <ProjectStatusBadge status={investmentStatus(request.status)} locale={locale} />
                        {request.status === "PENDING" ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <InvestmentActionForm action="confirm" disabled={!canConfirm} endpoint={`/api/admin/investments/${request.id}?lang=${locale}`} locale={locale} />
                            <InvestmentActionForm action="reject" endpoint={`/api/admin/investments/${request.id}?lang=${locale}`} locale={locale} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {request.status === "PENDING" && !canConfirm ? (
                      <div className="rounded-qidra border border-qidra-gold bg-qidra-accent8 p-4 text-14 text-qidra-dark">
                        {blockedMessage}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <NotificationCard
                title={locale === "ru" ? "Заявок пока нет" : "No applications yet"}
                text={locale === "ru" ? "Новые заявки появятся здесь после отправки формы на странице проекта." : "New applications will appear here after the project form is submitted."}
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

type InvestmentStats = {
  cancelledCount: number;
  confirmedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
};

type DividendProject = {
  id: string;
  titleRu: string;
  titleEn: string;
  payoutFrequency: string;
  fundedUsdt: Prisma.Decimal;
  targetUsdt: Prisma.Decimal;
  _count: { investments: number };
};

type DividendPeriod = {
  adminNote: string | null;
  directCostUsdt: Prisma.Decimal;
  grossRevenueUsdt: Prisma.Decimal;
  id: string;
  operatingExpenseUsdt: Prisma.Decimal;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  netProfitUsdt: Prisma.Decimal;
  investorPoolUsdt: Prisma.Decimal;
  investorSharePercent: Prisma.Decimal;
  status: DividendPeriodStatus;
  project: { titleRu: string; titleEn: string };
  _count: { payments: number };
};

function DividendAccountingPanel({
  defaultDates,
  locale,
  periods,
  projects
}: {
  defaultDates: { end: string; label: string; start: string };
  locale: "ru" | "en";
  periods: DividendPeriod[];
  projects: DividendProject[];
}) {
  const isRu = locale === "ru";

  return (
    <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Финансовый учёт" : "Financial accounting"}</p>
          <h2 className="mt-2 text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">
            {isRu ? "Отчётные периоды и дивиденды" : "Reporting periods and dividends"}
          </h2>
          <p className="mt-3 max-w-4xl text-16 text-qidra-grayBlue">
            {isRu
              ? "Рассчитайте квартальный результат проекта, утвердите начисления и проведите выплату на балансы участников. Распределение учитывает сумму участия и количество дней в периоде."
              : "Calculate a project period, approve accruals and credit payouts to participant balances. Allocation uses participation amount and eligible days in the period."}
          </p>
        </div>
        <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4 text-14 text-qidra-grayBlue">
          {isRu ? "Для квартальных продуктов Al Amana Gold используйте метку вроде 2026 Q1." : "For quarterly Al Amana Gold products, use labels such as 2026 Q1."}
        </div>
      </div>

      <FeedbackForm
        className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4"
        endpoint={`/api/admin/dividends?lang=${locale}`}
        feedback={{
          title: isRu ? "Период рассчитан" : "Period calculated",
          text: isRu ? "Начисления подготовлены. Проверьте строки и утвердите расчёт перед выплатой." : "Accruals are prepared. Review the rows and approve the calculation before payout.",
          buttonLabel: isRu ? "Понятно" : "Got it",
          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
          tone: "success"
        }}
        refreshOnSuccess
      >
        <input name="action" type="hidden" value="calculate" />
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-2 text-14 font-medium text-qidra-dark lg:col-span-2">
            {isRu ? "Проект" : "Project"}
            <select className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" name="projectId" required>
              <option value="">{isRu ? "Выберите проект" : "Choose project"}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {isRu ? project.titleRu : project.titleEn} · {payoutFrequencyLabel(project.payoutFrequency, locale)} · {project._count.investments} {isRu ? "уч." : "part."}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Период" : "Period"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue={defaultDates.label} name="periodLabel" placeholder="2026 Q1" required />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Доля участникам, %" : "Participant share, %"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue="30" inputMode="decimal" min="0.0001" name="investorSharePercent" required step="0.0001" type="number" />
          </label>
        </div>
        <div className="grid gap-4 lg:grid-cols-5">
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Начало периода" : "Period start"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue={defaultDates.start} name="periodStart" required type="date" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Конец периода" : "Period end"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue={defaultDates.end} name="periodEnd" required type="date" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Выручка USDT" : "Revenue USDT"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" inputMode="decimal" min="0" name="grossRevenueUsdt" placeholder="100000" required step="0.000001" type="number" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Прямые расходы" : "Direct costs"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue="0" inputMode="decimal" min="0" name="directCostUsdt" required step="0.000001" type="number" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Опер. расходы" : "Operating expenses"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue="0" inputMode="decimal" min="0" name="operatingExpenseUsdt" required step="0.000001" type="number" />
          </label>
        </div>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Комментарий администратора" : "Admin note"}
          <textarea
            className="min-h-24 rounded-qidra border border-qidra-grayLight bg-white px-4 py-3 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent"
            name="adminNote"
            placeholder={isRu ? "Например: квартальный отчёт Al Amana Gold, Q1 2026" : "Example: Al Amana Gold quarterly report, Q1 2026"}
          />
        </label>
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Подтверждение" : "Confirmation"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" name="confirmation" placeholder="CONFIRM" required />
          </label>
          <button className="inline-flex h-12 items-center justify-center rounded-qidra border border-qidra-accent bg-qidra-accent px-5 text-16 font-medium text-white transition-colors hover:bg-qidra-accent80" type="submit">
            {isRu ? "Рассчитать начисления" : "Calculate accruals"}
          </button>
        </div>
      </FeedbackForm>

      <div className="grid gap-3">
        <h3 className="text-20 font-medium text-qidra-dark">{isRu ? "Последние периоды" : "Recent periods"}</h3>
        {periods.length ? (
          <div className="grid gap-3">
            {periods.map((period) => {
              const zeroDistribution = Number(period.investorPoolUsdt.toString()) <= 0;
              const negativeOrZeroResult = Number(period.netProfitUsdt.toString()) <= 0;

              return (
                <article key={period.id} className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1.1fr_1fr_auto] xl:items-start">
                    <div>
                      <p className="text-16 font-medium text-qidra-dark">{isRu ? period.project.titleRu : period.project.titleEn}</p>
                      <p className="mt-1 text-14 text-qidra-grayBlue">
                        {period.periodLabel} · {formatDateRange(period.periodStart, period.periodEnd, locale)}
                      </p>
                      <p className="mt-2 font-medium text-qidra-accent">{dividendStatusLabel(period.status, locale, zeroDistribution)}</p>
                    </div>
                    <div className="grid gap-1 text-14">
                      <p className="text-qidra-grayBlue">{isRu ? "Выручка" : "Revenue"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.grossRevenueUsdt)}</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Прямые расходы" : "Direct costs"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.directCostUsdt)}</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Опер. расходы" : "Operating expenses"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.operatingExpenseUsdt)}</span></p>
                      <p className={negativeOrZeroResult ? "text-qidra-red" : "text-qidra-green"}>
                        {isRu ? "Чистый результат" : "Net result"}: <span className="font-medium">{formatUsdt(period.netProfitUsdt)}</span>
                      </p>
                    </div>
                    <div className="grid gap-1 text-14">
                      <p className="text-qidra-grayBlue">{isRu ? "Пул участников" : "Participant pool"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.investorPoolUsdt)}</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Доля" : "Share"}: <span className="font-medium text-qidra-dark">{period.investorSharePercent.toString()}%</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Начислений" : "Accruals"}: <span className="font-medium text-qidra-dark">{period._count.payments}</span></p>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {period.status === DividendPeriodStatus.DRAFT ? (
                        <>
                          <DividendPeriodActionForm action="approve" label={zeroDistribution ? (isRu ? "Утвердить без начислений" : "Approve no accruals") : undefined} locale={locale} periodId={period.id} />
                          <DividendPeriodActionForm action="cancel" locale={locale} periodId={period.id} />
                        </>
                      ) : null}
                      {period.status === DividendPeriodStatus.APPROVED ? (
                        <>
                          <DividendPeriodActionForm action="pay" label={zeroDistribution ? (isRu ? "Закрыть без выплаты" : "Close without payout") : undefined} locale={locale} periodId={period.id} />
                          <DividendPeriodActionForm action="cancel" locale={locale} periodId={period.id} />
                        </>
                      ) : null}
                    </div>
                  </div>
                  {zeroDistribution ? (
                    <div className="rounded-qidra border border-qidra-gold bg-qidra-accent8 p-4 text-14 text-qidra-dark">
                      <p className="font-medium">{isRu ? "Дивиденды за период не начисляются" : "No dividends are accrued for this period"}</p>
                      <p className="mt-1 text-qidra-grayBlue">
                        {isRu
                          ? "Пул участников равен 0 USDT, потому что чистая прибыль периода не положительная. Период можно утвердить и закрыть без выплаты, чтобы сохранить квартальную отчётность."
                          : "The participant pool is 0 USDT because the period net profit is not positive. You can approve and close the period without payout to preserve quarterly reporting."}
                      </p>
                    </div>
                  ) : null}
                  {period.adminNote ? (
                    <div className="rounded-qidra bg-qidra-grayLight p-4 text-14 text-qidra-grayBlue">
                      <span className="font-medium text-qidra-dark">{isRu ? "Комментарий администратора" : "Admin note"}: </span>
                      {period.adminNote}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <NotificationCard
            title={isRu ? "Периодов пока нет" : "No periods yet"}
            text={isRu ? "После расчёта квартала он появится здесь для утверждения и выплаты." : "After calculating a quarter, it will appear here for approval and payout."}
          />
        )}
      </div>
    </section>
  );
}

function DividendPeriodActionForm({ action, label, locale, periodId }: { action: "approve" | "cancel" | "pay"; label?: string; locale: "ru" | "en"; periodId: string }) {
  const isRu = locale === "ru";
  const labels = {
    approve: isRu ? "Утвердить" : "Approve",
    cancel: isRu ? "Отменить" : "Cancel",
    pay: isRu ? "Провести выплату" : "Pay"
  };

  return (
    <FeedbackForm
      className="contents"
      endpoint={`/api/admin/dividends?lang=${locale}`}
      feedback={{
        title: action === "pay" && label ? (isRu ? "Период закрыт" : "Period closed") : isRu ? "Период обновлён" : "Period updated",
        text:
          action === "pay" && label
            ? isRu
              ? "Отчётный период закрыт без начисления дивидендов и сохранён в журнале."
              : "The reporting period was closed without dividend accruals and logged."
            : isRu
              ? "Финансовое действие сохранено и отражено в журнале."
              : "The financial action was saved and logged.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: action === "cancel" ? "warning" : "success"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value={action} />
      <input name="periodId" type="hidden" value={periodId} />
      <input name="confirmation" type="hidden" value="CONFIRM" />
      <button className={action === "cancel" ? "inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-grayMedium bg-white px-4 text-14 font-medium text-qidra-dark transition-colors hover:border-qidra-red hover:text-qidra-red" : "inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-accent bg-qidra-accent px-4 text-14 font-medium text-white transition-colors hover:bg-qidra-accent80"} type="submit">
        {label ?? labels[action]}
      </button>
    </FeedbackForm>
  );
}

function InvestmentDashboard({ locale, stats }: { locale: "ru" | "en"; stats: InvestmentStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <InvestmentStatCard label={locale === "ru" ? "Всего заявок" : "Total applications"} value={stats.totalCount} />
      <InvestmentStatCard label={locale === "ru" ? "На проверке" : "Pending review"} tone="accent" value={stats.pendingCount} />
      <InvestmentStatCard label={locale === "ru" ? "Подтверждено" : "Confirmed"} tone="success" value={stats.confirmedCount} />
      <InvestmentStatCard label={locale === "ru" ? "Отклонено" : "Rejected"} tone="danger" value={stats.rejectedCount} />
      <InvestmentStatCard label={locale === "ru" ? "Отменено" : "Cancelled"} value={stats.cancelledCount} />
    </div>
  );
}

function InvestmentStatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "danger" | "neutral" | "success"; value: number }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "danger" ? "text-qidra-red" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{formatCount(value)}</p>
    </article>
  );
}

function InvestmentFilters({ locale, stats, statusFilter }: { locale: "ru" | "en"; stats: InvestmentStats; statusFilter?: InvestmentStatus }) {
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

function InvestmentActionForm({ action, disabled = false, endpoint, locale }: { action: "confirm" | "reject"; disabled?: boolean; endpoint: string; locale: "ru" | "en" }) {
  const confirm = action === "confirm";

  return (
    <FeedbackForm
      className="contents"
      endpoint={endpoint}
      feedback={{
        title: confirm ? (locale === "ru" ? "Заявка подтверждена" : "Application confirmed") : locale === "ru" ? "Заявка отклонена" : "Application rejected",
        text: confirm
          ? locale === "ru"
            ? "Зарезервированная сумма переведена в участие по проекту, прогресс проекта обновлён."
            : "The reserved amount was moved into project participation and the project progress was updated."
          : locale === "ru"
            ? "Участник увидит обновлённый статус в профиле участника."
            : "The participant will see the updated status in the participant profile.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: confirm ? "success" : "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value={action} />
      <ActionButton confirm={confirm} disabled={disabled} locale={locale} />
    </FeedbackForm>
  );
}

function ActionButton({ confirm, disabled, locale }: { confirm: boolean; disabled?: boolean; locale: "ru" | "en" }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        confirm
          ? "border-qidra-accent bg-qidra-accent text-white hover:bg-qidra-accent80 disabled:cursor-not-allowed disabled:opacity-50"
          : "border-qidra-grayMedium bg-transparent text-qidra-dark hover:border-qidra-red hover:text-qidra-red"
      }`}
      disabled={disabled}
      type="submit"
    >
      {confirm ? (locale === "ru" ? "Подтвердить" : "Confirm") : locale === "ru" ? "Отклонить" : "Reject"}
    </button>
  );
}

function investmentStatus(status: string): BadgeStatus {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "pending";
}

function kycStatusLabel(status: string | undefined, locale: "ru" | "en") {
  if (status === "APPROVED") return locale === "ru" ? "одобрен" : "approved";
  if (status === "SUBMITTED") return locale === "ru" ? "на проверке" : "under review";
  if (status === "REJECTED") return locale === "ru" ? "отклонён" : "rejected";
  return locale === "ru" ? "не отправлен" : "not submitted";
}

function investmentBlockedMessage({
  hasEnoughAvailable,
  hasEnoughReserve,
  latestKycStatus,
  locale
}: {
  hasEnoughAvailable: boolean;
  hasEnoughReserve: boolean;
  latestKycStatus: string | undefined;
  locale: "ru" | "en";
}) {
  if (latestKycStatus !== "APPROVED") {
    return locale === "ru"
      ? "Подтверждение заблокировано: сначала одобрите KYC участника."
      : "Confirmation is blocked: approve the participant KYC first.";
  }

  if (!hasEnoughReserve) {
    return locale === "ru"
      ? "Подтверждение заблокировано: резерв кошелька меньше резерва заявки. Обновите страницу или отклоните заявку, чтобы вернуть доступный баланс участнику."
      : "Confirmation is blocked: the wallet reserve is lower than the application reserve. Refresh the page or reject the application to return available balance to the participant.";
  }

  if (!hasEnoughAvailable) {
    return locale === "ru"
      ? "Подтверждение заблокировано: свободного баланса недостаточно для недостающей части заявки."
      : "Confirmation is blocked: available balance is not enough for the remaining part of the application.";
  }

  return locale === "ru"
    ? "Подтверждение временно недоступно. Обновите страницу и проверьте заявку снова."
    : "Confirmation is temporarily unavailable. Refresh the page and check the application again.";
}

function formatUsdt(value: { toString(): string }) {
  const amount = Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
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

  return `/admin/investments?${params.toString()}`;
}

function currentQuarterDefaults() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const year = now.getFullYear();
  const start = new Date(Date.UTC(year, quarter * 3, 1));
  const end = new Date(Date.UTC(year, quarter * 3 + 3, 0));

  return {
    label: `${year} Q${quarter + 1}`,
    start: formatDateInput(start),
    end: formatDateInput(end)
  };
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDateRange(start: Date, end: Date, locale: "ru" | "en") {
  return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
}

function dividendStatusLabel(status: DividendPeriodStatus, locale: "ru" | "en", zeroDistribution = false) {
  if (zeroDistribution && status === DividendPeriodStatus.PAID) {
    return locale === "ru" ? "Закрыт без выплаты" : "Closed without payout";
  }

  if (zeroDistribution && status === DividendPeriodStatus.APPROVED) {
    return locale === "ru" ? "Утверждён, ожидает закрытия без выплаты" : "Approved, pending no-payout close";
  }

  const labels = {
    [DividendPeriodStatus.DRAFT]: { ru: "Рассчитан, ожидает утверждения", en: "Calculated, pending approval" },
    [DividendPeriodStatus.APPROVED]: { ru: "Утверждён", en: "Approved" },
    [DividendPeriodStatus.PAID]: { ru: "Выплачен", en: "Paid" },
    [DividendPeriodStatus.CANCELLED]: { ru: "Отменён", en: "Cancelled" }
  };

  return labels[status][locale];
}

function payoutFrequencyLabel(value: string, locale: "ru" | "en") {
  const labels: Record<string, { ru: string; en: string }> = {
    MONTHLY: { ru: "ежемесячно", en: "monthly" },
    QUARTERLY: { ru: "квартально", en: "quarterly" },
    ANNUAL: { ru: "ежегодно", en: "annual" },
    CUSTOM: { ru: "по условиям", en: "custom" }
  };

  return (labels[value] ?? labels.CUSTOM)[locale];
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
