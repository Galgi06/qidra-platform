import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function CompanyAnalyticsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";
  const { membership } = await requireCompanyAccess(locale, "/company/analytics");
  const organizationId = membership.organizationId;
  const [events, leads, projects] = await Promise.all([
    prisma.organizationAnalyticsEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.organizationLead.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 500
    }),
    prisma.project.findMany({
      where: { organizationId },
      select: { id: true, slug: true, titleEn: true, titleRu: true }
    })
  ]);

  const companyViews = events.filter((event) => event.type === "COMPANY_PAGE_VIEW");
  const projectViews = events.filter((event) => event.type === "PROJECT_PAGE_VIEW");
  const leadEvents = events.filter((event) => event.type === "LEAD_CAPTURED");
  const totalViews = companyViews.length + projectViews.length;
  const totalLeads = leads.length;
  const conversion = totalViews ? `${((totalLeads / totalViews) * 100).toFixed(1)}%` : "0%";
  const leadStageCounts = {
    NEW: leads.filter((lead) => lead.status === "NEW").length,
    CONTACTED: leads.filter((lead) => lead.status === "CONTACTED").length,
    QUALIFIED: leads.filter((lead) => lead.status === "QUALIFIED").length,
    CLOSED: leads.filter((lead) => lead.status === "CLOSED").length
  };
  const sourceBreakdown = Object.entries(
    leads.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {})
  );
  const projectViewCounts = projects.map((project) => ({
    id: project.id,
    title: locale === "ru" ? project.titleRu : project.titleEn,
    views: projectViews.filter((event) => event.projectId === project.id).length,
    leads: leads.filter((lead) => lead.projectId === project.id).length
  }));
  const recentActivity = events.slice(0, 12);
  const topProjects = projectViewCounts.sort((a, b) => b.leads - a.leads || b.views - a.views).slice(0, 6);
  const recentLeads = leads.slice(0, 8);

  return (
    <>
      <Header locale={locale} path="/company/analytics" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card p-6 sm:p-8">
              <p className="eyebrow">{isRu ? "B2B metrics" : "B2B metrics"}</p>
              <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">{isRu ? "Аналитика компании" : "Company analytics"}</h1>
              <p className="mt-4 max-w-4xl text-18 text-qidra-grayBlue">
                {isRu
                  ? "Минимальный операционный дашборд по просмотрам страниц компании и проектов, входящим лидам и конверсии в обращения."
                  : "A minimal operating dashboard for company and project page views, inbound leads, and lead conversion."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath="/company/analytics" locale={locale}>
            <div className="grid gap-8">
              <div className="grid gap-5 md:grid-cols-4">
                <MetricCard label={isRu ? "Все просмотры" : "Total views"} value={totalViews.toString()} />
                <MetricCard label={isRu ? "Просмотры компании" : "Company page views"} value={companyViews.length.toString()} />
                <MetricCard label={isRu ? "Получено лидов" : "Leads captured"} value={leadEvents.length.toString()} />
                <MetricCard label={isRu ? "Конверсия view -> lead" : "View-to-lead conversion"} value={conversion} />
              </div>

              <div className="grid gap-5 md:grid-cols-4">
                <MetricCard label={isRu ? "Новые лиды" : "New leads"} value={leadStageCounts.NEW.toString()} />
                <MetricCard label={isRu ? "В работе" : "Contacted"} value={leadStageCounts.CONTACTED.toString()} />
                <MetricCard label={isRu ? "Квалифицированы" : "Qualified"} value={leadStageCounts.QUALIFIED.toString()} />
                <MetricCard label={isRu ? "Закрыты" : "Closed"} value={leadStageCounts.CLOSED.toString()} />
              </div>

              <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Воронка по проектам" : "Project funnel breakdown"}</h2>
                  <div className="mt-6 grid gap-3">
                    {topProjects.length ? (
                      topProjects.map((item) => (
                        <article key={item.id} className="rounded-[18px] bg-qidra-grayLight p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-16 font-medium text-qidra-dark">{item.title}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-12 font-medium text-qidra-accent">{item.views} / {item.leads}</span>
                          </div>
                          <p className="mt-2 text-14 text-qidra-grayBlue">{isRu ? `Просмотры: ${item.views}. Лиды: ${item.leads}.` : `Views: ${item.views}. Leads: ${item.leads}.`}</p>
                        </article>
                      ))
                    ) : (
                      <p className="text-15 text-qidra-grayBlue">{isRu ? "После публикации проектов здесь появится разбивка по просмотрам." : "A project-level view breakdown will appear here after listings go live."}</p>
                    )}
                  </div>
                </section>

                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Источники и лиды" : "Sources and leads"}</h2>
                  <div className="mt-6 grid gap-3">
                    {sourceBreakdown.length ? (
                      sourceBreakdown.map(([source, count]) => (
                        <article key={source} className="rounded-[18px] bg-qidra-grayLight p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-16 font-medium text-qidra-dark">{source}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-12 font-medium text-qidra-accent">{count}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <NotificationCard
                        title={isRu ? "Событий пока нет" : "No events yet"}
                        text={isRu ? "Первые просмотры и лиды появятся здесь автоматически." : "The first views and leads will appear here automatically."}
                        tone="info"
                      />
                    )}
                  </div>
                </section>
              </div>

              <div className="grid gap-8 lg:grid-cols-[0.86fr_1.14fr]">
                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Последние лиды" : "Latest leads"}</h2>
                  <div className="mt-6 grid gap-3">
                    {recentLeads.length ? (
                      recentLeads.map((lead) => (
                        <article key={lead.id} className="rounded-[18px] bg-qidra-grayLight p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-16 font-medium text-qidra-dark">{lead.leadName || lead.leadEmail || sourceLabel(lead.source, locale)}</p>
                            <span className="rounded-full bg-white px-3 py-1 text-12 font-medium text-qidra-accent">{lead.status}</span>
                          </div>
                          <p className="mt-2 text-14 text-qidra-grayBlue">{lead.leadEmail || lead.leadPhone || sourceLabel(lead.source, locale)}</p>
                        </article>
                      ))
                    ) : (
                      <p className="text-15 text-qidra-grayBlue">{isRu ? "Лиды пока не поступали." : "No leads have been captured yet."}</p>
                    )}
                  </div>
                </section>

                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Последние сигналы" : "Latest signals"}</h2>
                  <div className="mt-6 grid gap-3">
                    {recentActivity.length ? (
                      recentActivity.map((event) => (
                        <article key={event.id} className="rounded-[18px] bg-qidra-grayLight p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-16 font-medium text-qidra-dark">{event.type}</p>
                            <span className="text-13 text-qidra-grayBlue">
                              {new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(event.createdAt)}
                            </span>
                          </div>
                          <p className="mt-2 text-14 text-qidra-grayBlue">{event.path || (isRu ? "Путь не указан" : "No path recorded")}</p>
                        </article>
                      ))
                    ) : (
                      <NotificationCard
                        title={isRu ? "Событий пока нет" : "No events yet"}
                        text={isRu ? "Первые просмотры и лиды появятся здесь автоматически." : "The first views and leads will appear here automatically."}
                        tone="info"
                      />
                    )}
                  </div>
                </section>
              </div>
            </div>
          </CompanyWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function sourceLabel(source: string, locale: "ru" | "en") {
  if (source === "platform_application") {
    return locale === "ru" ? "Заявка с платформы" : "Platform application";
  }

  return source;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="mt-3 text-[28px] font-medium leading-none text-qidra-dark">{value}</p>
    </div>
  );
}
