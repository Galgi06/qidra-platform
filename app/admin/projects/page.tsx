import Link from "next/link";
import type { ReactNode } from "react";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { Select } from "@/components/ui/Select";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type Locale, type SearchParams, withLocale } from "@/lib/i18n";
import { getAdminProjects, type CatalogProject } from "@/lib/project-catalog";

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  await requireAdmin(locale, "/admin/projects");
  const statusFilter = parseProjectStatus(searchParamString(params.status));
  const projects = await getAdminProjects();
  const stats = buildProjectStats(projects);
  const filteredProjects = statusFilter ? projects.filter((project) => project.status === statusFilter) : projects;

  return (
    <>
      <Header locale={locale} path="/admin/projects" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: locale === "ru" ? "Проекты" : "Projects" }
              ]}
            />
            <div className="mt-8">
              <h1 className="title-48 text-qidra-dark">{locale === "ru" ? "Управление проектами" : "Project management"}</h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {locale === "ru"
                  ? "Создавайте черновики, готовьте описание и публикуйте проект после юридической проверки."
                  : "Create drafts, prepare descriptions and publish projects after legal review."}
              </p>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/projects" locale={locale} />
            <ProjectsDashboard locale={locale} stats={stats} />
            <ProjectsFilters locale={locale} stats={stats} statusFilter={statusFilter} />
            <FeedbackForm
              className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8"
              endpoint={`/api/admin/projects?lang=${locale}`}
              feedback={{
                title: locale === "ru" ? "Черновик проекта создан" : "Project draft created",
                text:
                  locale === "ru"
                    ? "Проект сохранён в базе как черновик. Его можно подготовить к публикации."
                    : "The project was saved in the database as a draft. It can be prepared for publication.",
                buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              refreshOnSuccess
              resetOnSubmit
            >
              <div>
                <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{locale === "ru" ? "Новый проект" : "New project"}</h2>
                <p className="mt-2 text-16 text-qidra-grayBlue">
                  {locale === "ru" ? "Минимальные данные для черновика. Подробности можно расширить позже." : "Minimum details for a draft. More information can be expanded later."}
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <Input label={locale === "ru" ? "Название RU" : "Title RU"} name="titleRu" required />
                <Input label={locale === "ru" ? "Название EN" : "Title EN"} name="titleEn" required />
                <Input label="Slug" name="slug" placeholder="qidra-new-project" required />
                <Input label={locale === "ru" ? "Цель USDT" : "Target USDT"} name="targetUsdt" inputMode="decimal" placeholder="100000" required />
                <Select
                  label={locale === "ru" ? "Структура" : "Structure"}
                  name="structure"
                  defaultValue="Mudaraba"
                  options={[
                    { value: "Mudaraba", label: "Mudaraba" },
                    { value: "Musharaka", label: "Musharaka" }
                  ]}
                />
                <Select
                  label={locale === "ru" ? "Статус" : "Status"}
                  name="status"
                  defaultValue="DRAFT"
                  options={[
                    { value: "DRAFT", label: locale === "ru" ? "Черновик" : "Draft" },
                    { value: "REVIEW", label: locale === "ru" ? "Проверка" : "Review" }
                  ]}
                />
                <Input label={locale === "ru" ? "Локация" : "Location"} name="location" placeholder="UAE" />
                <Input label={locale === "ru" ? "Риск" : "Risk"} name="riskLevel" placeholder="Moderate" />
                <Input label={locale === "ru" ? "Кратко RU" : "Summary RU"} name="summaryRu" required />
                <Input label={locale === "ru" ? "Кратко EN" : "Summary EN"} name="summaryEn" required />
                <Input label={locale === "ru" ? "Ожидаемый результат RU" : "Expected result RU"} name="expectedReturnRu" placeholder={locale === "ru" ? "Зависит от фактических итогов проекта" : "Depends on actual project results"} required />
                <Input label={locale === "ru" ? "Ожидаемый результат EN" : "Expected result EN"} name="expectedReturnEn" placeholder="Depends on actual project results" required />
                <Input label={locale === "ru" ? "Ориентир доходности RU" : "Return guidance RU"} name="expectedYieldRu" placeholder={locale === "ru" ? "Например: ориентировочно 30-40%, не гарантия" : "Example: approximately 30-40%, not guaranteed"} required />
                <Input label={locale === "ru" ? "Ориентир доходности EN" : "Return guidance EN"} name="expectedYieldEn" placeholder="Example: approximately 30-40%, not guaranteed" required />
              </div>
              <Button type="submit" className="w-full sm:w-fit">
                {locale === "ru" ? "Создать черновик" : "Create draft"}
              </Button>
            </FeedbackForm>

            <div className="grid gap-5">
              {filteredProjects.length ? (
                filteredProjects.map((project) => <AdminProjectPanel key={project.id} project={project} locale={locale} />)
              ) : (
                <NotificationCard
                  title={locale === "ru" ? "Проекты не найдены" : "No projects found"}
                  text={locale === "ru" ? "Измените фильтр статуса или создайте новый проект." : "Change the status filter or create a new project."}
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

type ProjectFilterStatus = Extract<BadgeStatus, "active" | "closed" | "draft" | "funded" | "paused" | "review">;

type ProjectStats = {
  activeCount: number;
  closedCount: number;
  draftCount: number;
  fundedCount: number;
  pausedCount: number;
  reviewCount: number;
  totalCount: number;
  totalFundedUsdt: number;
  totalTargetUsdt: number;
};

function ProjectsDashboard({ locale, stats }: { locale: Locale; stats: ProjectStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <ProjectStatCard label={locale === "ru" ? "Всего проектов" : "Total projects"} value={stats.totalCount} />
      <ProjectStatCard label={locale === "ru" ? "Опубликовано" : "Published"} tone="success" value={stats.activeCount} />
      <ProjectStatCard label={locale === "ru" ? "На проверке" : "In review"} tone="accent" value={stats.reviewCount} />
      <ProjectStatCard label={locale === "ru" ? "Черновики" : "Drafts"} value={stats.draftCount} />
      <ProjectStatCard label={locale === "ru" ? "Собрано" : "Funded"} tone="success" value={formatUsdt(stats.totalFundedUsdt)} />
    </div>
  );
}

function ProjectStatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "neutral" | "success"; value: ReactNode }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{typeof value === "number" ? formatCount(value) : value}</p>
    </article>
  );
}

function ProjectsFilters({ locale, stats, statusFilter }: { locale: Locale; stats: ProjectStats; statusFilter?: ProjectFilterStatus }) {
  return (
    <div className="grid gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Статус проекта" : "Project status"}</p>
      <div className="flex flex-wrap gap-2">
        <ProjectFilterPill active={!statusFilter} href={projectFilterHref(locale)}>
          {locale === "ru" ? "Все" : "All"} ({formatCount(stats.totalCount)})
        </ProjectFilterPill>
        <ProjectFilterPill active={statusFilter === "draft"} href={projectFilterHref(locale, "draft")}>
          {locale === "ru" ? "Черновики" : "Drafts"} ({formatCount(stats.draftCount)})
        </ProjectFilterPill>
        <ProjectFilterPill active={statusFilter === "review"} href={projectFilterHref(locale, "review")}>
          {locale === "ru" ? "Проверка" : "Review"} ({formatCount(stats.reviewCount)})
        </ProjectFilterPill>
        <ProjectFilterPill active={statusFilter === "active"} href={projectFilterHref(locale, "active")}>
          {locale === "ru" ? "Опубликованы" : "Published"} ({formatCount(stats.activeCount)})
        </ProjectFilterPill>
        <ProjectFilterPill active={statusFilter === "funded"} href={projectFilterHref(locale, "funded")}>
          {locale === "ru" ? "Собраны" : "Funded"} ({formatCount(stats.fundedCount)})
        </ProjectFilterPill>
        <ProjectFilterPill active={statusFilter === "paused"} href={projectFilterHref(locale, "paused")}>
          {locale === "ru" ? "Пауза" : "Paused"} ({formatCount(stats.pausedCount)})
        </ProjectFilterPill>
        <ProjectFilterPill active={statusFilter === "closed"} href={projectFilterHref(locale, "closed")}>
          {locale === "ru" ? "Закрыты" : "Closed"} ({formatCount(stats.closedCount)})
        </ProjectFilterPill>
      </div>
    </div>
  );
}

function ProjectFilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
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

function AdminProjectPanel({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const isRu = locale === "ru";
  const progress = project.targetUsdt > 0 ? Math.round((project.fundedUsdt / project.targetUsdt) * 100) : 0;

  return (
    <article className="surface grid gap-6 p-6 sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="grid gap-3">
          <ProjectStatusBadge status={project.status} locale={locale} />
          <div>
            <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[34px]">{project.title[locale]}</h2>
            <p className="mt-2 max-w-4xl text-16 text-qidra-grayBlue">{project.summary[locale]}</p>
          </div>
        </div>
        <ButtonLink href={withLocale(`/projects/${project.slug}`, locale)} size="sm" variant="outline">
          {isRu ? "Открыть страницу" : "Open page"}
        </ButtonLink>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="grid gap-2">
          <ProgressBar value={progress} />
          <div className="flex flex-wrap justify-between gap-2 text-14 text-qidra-grayBlue">
            <span>{formatUsdt(project.fundedUsdt)}</span>
            <span>{formatUsdt(project.targetUsdt)}</span>
          </div>
        </div>
        <dl className="grid gap-3 text-14 sm:grid-cols-3">
          <ProjectFact label={isRu ? "Структура" : "Structure"} value={project.structure} />
          <ProjectFact label={isRu ? "Локация" : "Location"} value={project.location} />
          <ProjectFact label={isRu ? "Риск" : "Risk"} value={project.riskLevel} />
        </dl>
      </div>

      <div className="grid gap-6 border-t border-qidra-grayLight pt-6 lg:grid-cols-[0.7fr_1.3fr]">
        <StatusForm project={project} locale={locale} />
        <DocumentForm projectId={project.id} locale={locale} />
      </div>

      <div className="grid gap-3 border-t border-qidra-grayLight pt-6">
        <h3 className="text-18 font-medium text-qidra-dark">{isRu ? "Документы проекта" : "Project documents"}</h3>
        {project.documents.length ? (
          <div className="grid gap-2">
            {project.documents.map((document) => (
              <a
                key={document.href}
                className="flex flex-wrap items-center justify-between gap-2 rounded-qidra border border-qidra-grayLight px-4 py-3 text-14 transition-colors hover:border-qidra-accent hover:text-qidra-accent"
                href={document.href}
                rel="noreferrer"
                target={document.href.startsWith("http") ? "_blank" : undefined}
              >
                <span className="font-medium text-qidra-dark">{document.title[locale]}</span>
                <span className="text-qidra-grayBlue">{document.kind}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-14 text-qidra-grayBlue">{isRu ? "Документы ещё не добавлены." : "No documents added yet."}</p>
        )}
      </div>
    </article>
  );
}

function StatusForm({ project, locale }: { project: CatalogProject; locale: Locale }) {
  return (
    <FeedbackForm
      className="grid gap-3"
      endpoint={`/api/admin/projects/${project.id}/status?lang=${locale}`}
      feedback={{
        title: locale === "ru" ? "Статус проекта обновлён" : "Project status updated",
        text:
          locale === "ru"
            ? "Изменение сохранено. Публичный каталог обновится после перезагрузки страницы."
            : "The change was saved. The public catalog will update after the page refreshes.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      refreshOnSuccess
    >
      <Select
        label={locale === "ru" ? "Статус публикации" : "Publication status"}
        name="status"
        defaultValue={project.status.toUpperCase()}
        options={[
          { value: "DRAFT", label: locale === "ru" ? "Черновик" : "Draft" },
          { value: "REVIEW", label: locale === "ru" ? "Проверка" : "Review" },
          { value: "ACTIVE", label: locale === "ru" ? "Опубликован" : "Published" },
          { value: "FUNDED", label: locale === "ru" ? "Собран" : "Funded" },
          { value: "PAUSED", label: locale === "ru" ? "Пауза" : "Paused" },
          { value: "CLOSED", label: locale === "ru" ? "Закрыт" : "Closed" }
        ]}
      />
      <Button className="w-full sm:w-fit" size="sm" type="submit">
        {locale === "ru" ? "Сохранить статус" : "Save status"}
      </Button>
    </FeedbackForm>
  );
}

function DocumentForm({ projectId, locale }: { projectId: string; locale: Locale }) {
  return (
    <FeedbackForm
      className="grid gap-4"
      endpoint={`/api/admin/projects/${projectId}/documents?lang=${locale}`}
      feedback={{
        title: locale === "ru" ? "Документ добавлен" : "Document added",
        text: locale === "ru" ? "Документ сохранён и будет виден на странице проекта." : "The document was saved and will be visible on the project page.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      refreshOnSuccess
      resetOnSubmit
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Input label={locale === "ru" ? "Документ RU" : "Document RU"} name="titleRu" required />
        <Input label={locale === "ru" ? "Документ EN" : "Document EN"} name="titleEn" required />
        <Select
          label={locale === "ru" ? "Тип" : "Type"}
          name="kind"
          defaultValue="PROJECT"
          options={[
            { value: "PROJECT", label: locale === "ru" ? "Проект" : "Project" },
            { value: "LEGAL", label: locale === "ru" ? "Юридический" : "Legal" },
            { value: "COMPLIANCE", label: "Compliance" },
            { value: "REPORT", label: locale === "ru" ? "Отчёт" : "Report" },
            { value: "CONTRACT", label: locale === "ru" ? "Договор" : "Contract" }
          ]}
        />
        <Input label={locale === "ru" ? "Ссылка на файл" : "File link"} name="fileUrl" placeholder="/assets/documents/project.pdf" required />
      </div>
      <Button className="w-full sm:w-fit" size="sm" type="submit">
        {locale === "ru" ? "Добавить документ" : "Add document"}
      </Button>
    </FeedbackForm>
  );
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-qidra-grayBlue">{label}</dt>
      <dd className="mt-1 font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)} USDT`;
}

function buildProjectStats(projects: CatalogProject[]): ProjectStats {
  return projects.reduce<ProjectStats>(
    (stats, project) => {
      stats.totalCount += 1;
      stats.totalFundedUsdt += project.fundedUsdt;
      stats.totalTargetUsdt += project.targetUsdt;

      if (project.status === "active") stats.activeCount += 1;
      if (project.status === "closed") stats.closedCount += 1;
      if (project.status === "draft") stats.draftCount += 1;
      if (project.status === "funded") stats.fundedCount += 1;
      if (project.status === "paused") stats.pausedCount += 1;
      if (project.status === "review") stats.reviewCount += 1;

      return stats;
    },
    {
      activeCount: 0,
      closedCount: 0,
      draftCount: 0,
      fundedCount: 0,
      pausedCount: 0,
      reviewCount: 0,
      totalCount: 0,
      totalFundedUsdt: 0,
      totalTargetUsdt: 0
    }
  );
}

function searchParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseProjectStatus(value: string | undefined): ProjectFilterStatus | undefined {
  if (value === "active") return "active";
  if (value === "closed") return "closed";
  if (value === "draft") return "draft";
  if (value === "funded") return "funded";
  if (value === "paused") return "paused";
  if (value === "review") return "review";
  return undefined;
}

function projectFilterHref(locale: Locale, status?: ProjectFilterStatus) {
  const params = new URLSearchParams({ lang: locale });

  if (status) params.set("status", status);

  return `/admin/projects?${params.toString()}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
