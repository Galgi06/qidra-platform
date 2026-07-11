import Link from "next/link";
import { DividendPeriodStatus, Prisma } from "@prisma/client";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { canManageCompanyDividends } from "@/lib/organizations";
import { payoutFrequencyLabel } from "@/lib/project-catalog";
import { prisma } from "@/lib/prisma";

export default async function CompanyProjectsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const isRu = locale === "ru";
  const view = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const { membership } = await requireCompanyAccess(locale, "/company/projects");
  const organizationId = membership.organizationId;
  const canManageDividends = canManageCompanyDividends(membership.role);

  const [projects, submissions, dividendPeriods] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId },
      include: {
        dividendPeriods: {
          orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
          take: 1
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.projectSubmission.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" }
    }),
    prisma.projectDividendPeriod.findMany({
      where: { project: { organizationId } },
      include: {
        project: { select: { titleRu: true, titleEn: true } },
        _count: { select: { payments: true } }
      },
      orderBy: [{ periodEnd: "desc" }, { createdAt: "desc" }],
      take: 12
    })
  ]);

  const activeView = view === "submissions" ? "submissions" : "projects";

  return (
    <>
      <Header locale={locale} path="/company/projects" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card grid gap-5 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">{isRu ? "Кабинет компании" : "Company workspace"}</p>
                <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">
                  {isRu ? "Проекты и выплаты" : "Projects and distributions"}
                </h1>
                <p className="mt-3 max-w-4xl text-18 text-qidra-grayBlue">
                  {isRu
                    ? "Здесь отображаются опубликованные проекты компании, их статусы сбора, график выплат и очередь размещённых заявок."
                    : "Published company projects, raise statuses, payout schedules and submitted listing queue are shown here."}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={withLocale("/investor/projects/new", locale)} className="h-12 min-w-44">
                  {isRu ? "Новый листинг" : "New listing"}
                </ButtonLink>
                <ButtonLink href={withLocale("/company", locale)} variant="outline" className="h-12 min-w-44">
                  {isRu ? "Вернуться в кабинет" : "Back to workspace"}
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath={activeView === "submissions" ? "/company/projects?view=submissions" : "/company/projects"} locale={locale}>
            <div className="grid gap-6">
              {activeView === "projects" && canManageDividends ? <CompanyDividendPanel locale={locale} periods={dividendPeriods} projects={projects} /> : null}
              <div className="flex flex-wrap gap-3">
                <FilterPill active={activeView === "projects"} href={withLocale("/company/projects", locale)}>
                  {isRu ? `Проекты (${projects.length})` : `Projects (${projects.length})`}
                </FilterPill>
                <FilterPill active={activeView === "submissions"} href={withLocale("/company/projects?view=submissions", locale)}>
                  {isRu ? `Листинги (${submissions.length})` : `Listings (${submissions.length})`}
                </FilterPill>
              </div>

              {activeView === "projects" ? (
                projects.length ? (
                  <div className="grid gap-5">
                    {projects.map((project) => {
                      const latestPeriod = project.dividendPeriods[0] ?? null;

                      return (
                        <article key={project.id} className="premium-card grid gap-5 p-6 sm:p-8">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="text-14 text-qidra-grayBlue">{project.slug}</p>
                              <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">
                                {locale === "ru" ? project.titleRu : project.titleEn}
                              </h2>
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <ProjectStatusBadge locale={locale} status={mapProjectStatus(project.status)} />
                              <ButtonLink href={withLocale(`/projects/${project.slug}`, locale)} size="sm" variant="outline">
                                {isRu ? "Открыть публично" : "Open public page"}
                              </ButtonLink>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <Fact label={isRu ? "Структура" : "Structure"} value={project.structure} />
                            <Fact label={isRu ? "Целевой объём" : "Target raise"} value={`${Number(project.targetUsdt.toString()).toLocaleString()} USDT`} />
                            <Fact label={isRu ? "Собрано" : "Funded"} value={`${Number(project.fundedUsdt.toString()).toLocaleString()} USDT`} />
                            <Fact label={isRu ? "График выплат" : "Distribution schedule"} value={payoutFrequencyLabel(project.payoutFrequency)[locale]} />
                            <Fact label={isRu ? "Первые выплаты" : "First distributions"} value={formatOptionalDate(project.plannedDividendAt, locale)} />
                            <Fact label={isRu ? "Последний отчётный период" : "Latest reporting period"} value={latestPeriod?.periodLabel || (isRu ? "Пока не создан" : "Not created yet")} />
                            <Fact label={isRu ? "Статус периода" : "Period status"} value={latestPeriod ? dividendPeriodStatusLabel(latestPeriod.status, locale) : isRu ? "Ожидает расчёта" : "Pending calculation"} />
                            <Fact
                              label={isRu ? "Что делать дальше" : "Next step"}
                              value={
                                latestPeriod
                                  ? latestPeriod.status === DividendPeriodStatus.PAID
                                    ? isRu
                                      ? "Период закрыт, ожидайте следующий расчёт."
                                      : "The period is closed, wait for the next calculation."
                                    : isRu
                                      ? "Отчётный период в обработке администратором."
                                      : "The reporting period is being processed by an administrator."
                                  : isRu
                                    ? "После расчёта квартала или года период появится здесь."
                                    : "The period will appear here after the quarter or year is calculated."
                              }
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <NotificationCard
                    title={isRu ? "Проектов компании пока нет" : "No company projects yet"}
                    text={isRu ? "После одобрения и публикации листинги появятся здесь." : "Approved and published listings will appear here."}
                  />
                )
              ) : submissions.length ? (
                <div className="grid gap-5">
                  {submissions.map((submission) => (
                    <article key={submission.id} className="premium-card grid gap-4 p-6 sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{formatDate(submission.createdAt, locale)}</p>
                          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{submission.title}</h2>
                        </div>
                        <span className="rounded-full bg-qidra-grayLight px-4 py-2 text-13 font-medium text-qidra-accent">{submission.status}</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Fact label={isRu ? "Локация" : "Location"} value={submission.location || (isRu ? "Не указано" : "Not set")} />
                        <Fact label={isRu ? "Структура" : "Structure"} value={submission.structure || (isRu ? "Не указано" : "Not set")} />
                        <Fact label={isRu ? "Первые выплаты" : "First distributions"} value={formatOptionalDate(submission.plannedDividendAt, locale)} />
                        <Fact label={isRu ? "График выплат" : "Distribution schedule"} value={payoutFrequencyLabel(submission.payoutFrequency)[locale]} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <NotificationCard
                  title={isRu ? "Листингов пока нет" : "No listings yet"}
                  text={isRu ? "Отправленные на модерацию заявки появятся здесь." : "Submitted listings will appear here."}
                />
              )}
            </div>
          </CompanyWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function FilterPill({ active, children, href }: { active: boolean; children: React.ReactNode; href: string }) {
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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-qidra-grayLight p-4">
      <p className="text-13 text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-15 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}

function formatDate(value: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function formatOptionalDate(value: Date | null, locale: "ru" | "en") {
  return value ? formatDate(value, locale) : locale === "ru" ? "Не указано" : "Not set";
}

function mapProjectStatus(status: string) {
  if (status === "ACTIVE") return "active";
  if (status === "FUNDED") return "funded";
  if (status === "PAUSED") return "paused";
  if (status === "CLOSED") return "closed";
  if (status === "DRAFT") return "draft";
  return "review";
}

function dividendPeriodStatusLabel(status: DividendPeriodStatus, locale: "ru" | "en") {
  const labels: Record<DividendPeriodStatus, { ru: string; en: string }> = {
    DRAFT: { ru: "Рассчитан", en: "Calculated" },
    APPROVED: { ru: "Утверждён", en: "Approved" },
    PAID: { ru: "Выплачен", en: "Paid" },
    CANCELLED: { ru: "Отменён", en: "Cancelled" }
  };

  return labels[status][locale];
}

type CompanyProject = Prisma.ProjectGetPayload<{
  include: {
    dividendPeriods: true;
  };
}>;

type CompanyDividendPeriod = Prisma.ProjectDividendPeriodGetPayload<{
  include: {
    project: {
      select: {
        titleRu: true;
        titleEn: true;
      };
    };
    _count: {
      select: {
        payments: true;
      };
    };
  };
}>;

function CompanyDividendPanel({
  locale,
  periods,
  projects
}: {
  locale: "ru" | "en";
  periods: CompanyDividendPeriod[];
  projects: CompanyProject[];
}) {
  const isRu = locale === "ru";
  const defaultDates = currentQuarterDefaults();

  return (
    <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Управление выплатами" : "Dividend operations"}</p>
          <h2 className="mt-2 text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">
            {isRu ? "Периоды и дивиденды компании" : "Company reporting periods and dividends"}
          </h2>
          <p className="mt-3 max-w-4xl text-16 text-qidra-grayBlue">
            {isRu
              ? "Владелец или администратор компании может рассчитать период, утвердить начисления и провести выплату только по проектам своей организации."
              : "The company owner or company admin can calculate a period, approve accruals, and complete payout only for projects that belong to this organization."}
          </p>
        </div>
        <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4 text-14 text-qidra-grayBlue">
          {isRu ? "Доступ не открывает права на чужие проекты и не заменяет глобальную админ-панель." : "This access does not open rights to external projects and does not replace the global admin panel."}
        </div>
      </div>

      <FeedbackForm
        className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4"
        endpoint={`/api/company/dividends?lang=${locale}`}
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
                  {isRu ? project.titleRu : project.titleEn} · {payoutFrequencyLabel(project.payoutFrequency)[locale]}
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
          {isRu ? "Комментарий компании" : "Company note"}
          <textarea className="min-h-24 rounded-qidra border border-qidra-grayLight bg-white px-4 py-3 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" name="adminNote" />
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

              return (
                <article key={period.id} className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_1.1fr_1fr_auto] xl:items-start">
                    <div>
                      <p className="text-16 font-medium text-qidra-dark">{isRu ? period.project.titleRu : period.project.titleEn}</p>
                      <p className="mt-1 text-14 text-qidra-grayBlue">
                        {period.periodLabel} · {formatDateRange(period.periodStart, period.periodEnd, locale)}
                      </p>
                      <p className="mt-2 font-medium text-qidra-accent">{dividendPeriodStatusLabel(period.status, locale)}</p>
                    </div>
                    <div className="grid gap-1 text-14">
                      <p className="text-qidra-grayBlue">{isRu ? "Выручка" : "Revenue"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.grossRevenueUsdt)}</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Прямые расходы" : "Direct costs"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.directCostUsdt)}</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Опер. расходы" : "Operating expenses"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.operatingExpenseUsdt)}</span></p>
                    </div>
                    <div className="grid gap-1 text-14">
                      <p className="text-qidra-grayBlue">{isRu ? "Пул участников" : "Participant pool"}: <span className="font-medium text-qidra-dark">{formatUsdt(period.investorPoolUsdt)}</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Доля" : "Share"}: <span className="font-medium text-qidra-dark">{period.investorSharePercent.toString()}%</span></p>
                      <p className="text-qidra-grayBlue">{isRu ? "Начислений" : "Accruals"}: <span className="font-medium text-qidra-dark">{period._count.payments}</span></p>
                    </div>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      {period.status === DividendPeriodStatus.DRAFT ? (
                        <>
                          <CompanyDividendActionForm action="approve" locale={locale} periodId={period.id} />
                          <CompanyDividendActionForm action="cancel" locale={locale} periodId={period.id} />
                        </>
                      ) : null}
                      {period.status === DividendPeriodStatus.APPROVED ? (
                        <>
                          <CompanyDividendActionForm action="pay" label={zeroDistribution ? (isRu ? "Закрыть без выплаты" : "Close without payout") : undefined} locale={locale} periodId={period.id} />
                          <CompanyDividendActionForm action="cancel" locale={locale} periodId={period.id} />
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <NotificationCard
            title={isRu ? "Периодов пока нет" : "No periods yet"}
            text={isRu ? "После расчёта квартала или года он появится здесь для утверждения и выплаты." : "After calculation, the period will appear here for approval and payout."}
          />
        )}
      </div>
    </section>
  );
}

function CompanyDividendActionForm({ action, label, locale, periodId }: { action: "approve" | "cancel" | "pay"; label?: string; locale: "ru" | "en"; periodId: string }) {
  const isRu = locale === "ru";
  const labels = {
    approve: isRu ? "Утвердить" : "Approve",
    cancel: isRu ? "Отменить" : "Cancel",
    pay: isRu ? "Провести выплату" : "Pay"
  };

  return (
    <FeedbackForm
      className="contents"
      endpoint={`/api/company/dividends?lang=${locale}`}
      feedback={{
        title: action === "pay" ? (isRu ? "Период обновлён" : "Period updated") : isRu ? "Период обновлён" : "Period updated",
        text: isRu ? "Финансовое действие сохранено и отражено в журнале." : "The financial action was saved and logged.",
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

function formatUsdt(value: Prisma.Decimal | { toString(): string }) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value.toString()))} USDT`;
}
