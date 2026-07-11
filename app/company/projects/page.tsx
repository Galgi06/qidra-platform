import Link from "next/link";
import { DividendPeriodStatus } from "@prisma/client";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { payoutFrequencyLabel } from "@/lib/project-catalog";
import { prisma } from "@/lib/prisma";

export default async function CompanyProjectsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const isRu = locale === "ru";
  const view = Array.isArray(params?.view) ? params?.view[0] : params?.view;
  const { membership } = await requireCompanyAccess(locale, "/company/projects");
  const organizationId = membership.organizationId;

  const [projects, submissions] = await Promise.all([
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
