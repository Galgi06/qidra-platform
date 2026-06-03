import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { getAdminProjects } from "@/lib/project-catalog";

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

            <div className="grid gap-6 lg:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
