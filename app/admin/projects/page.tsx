import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackButton } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { requireAdmin } from "@/lib/access";
import { getProjects } from "@/lib/content";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/projects");
  const projects = getProjects(locale);

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
          <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="title-48 text-qidra-dark">{locale === "ru" ? "Управление проектами" : "Project management"}</h1>
              <p className="mt-4 text-20 text-qidra-grayBlue">
                {locale === "ru"
                  ? "Черновики, публикация и обновление инвестиционных страниц с юридическим раскрытием."
                  : "Draft, publish and update compliant investment project pages."}
              </p>
            </div>
            <FeedbackButton
              feedback={{
                title: locale === "ru" ? "Черновик проекта создан" : "Project draft created",
                text:
                  locale === "ru"
                    ? "Проект добавлен как черновик. Заполните описание, юридические документы и условия перед публикацией."
                    : "The project was added as a draft. Complete the description, legal documents and terms before publishing.",
                buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
            >
              {locale === "ru" ? "Создать проект" : "Create project"}
            </FeedbackButton>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container-qidra grid gap-6 lg:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.slug} project={project} locale={locale} />
          ))}
        </div>
      </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
