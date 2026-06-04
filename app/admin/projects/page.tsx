import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { Select } from "@/components/ui/Select";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type Locale, type SearchParams, withLocale } from "@/lib/i18n";
import { getAdminProjects, type CatalogProject } from "@/lib/project-catalog";

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/projects");
  const projects = await getAdminProjects();

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
                    { value: "REVIEW", label: locale === "ru" ? "Проверка" : "Review" },
                    { value: "ACTIVE", label: locale === "ru" ? "Активен" : "Active" }
                  ]}
                />
                <Input label={locale === "ru" ? "Локация" : "Location"} name="location" placeholder="UAE" />
                <Input label={locale === "ru" ? "Риск" : "Risk"} name="riskLevel" placeholder="Moderate" />
                <Input label={locale === "ru" ? "Кратко RU" : "Summary RU"} name="summaryRu" required />
                <Input label={locale === "ru" ? "Кратко EN" : "Summary EN"} name="summaryEn" required />
              </div>
              <Button type="submit" className="w-full sm:w-fit">
                {locale === "ru" ? "Создать черновик" : "Create draft"}
              </Button>
            </FeedbackForm>

            <div className="grid gap-5">
              {projects.map((project) => (
                <AdminProjectPanel key={project.id} project={project} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
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
