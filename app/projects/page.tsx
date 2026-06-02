import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { projects } from "@/lib/content";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function ProjectsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);

  return (
    <>
      <Header locale={locale} path="/projects" />
      <main className="section">
        <div className="container-qidra grid gap-8">
          <Breadcrumbs items={[{ label: "Qidra", href: withLocale("/", locale) }, { label: locale === "ru" ? "Проекты" : "Projects" }]} />
          <div>
            <h1 className="title-48">{locale === "ru" ? "Каталог проектов" : "Project catalog"}</h1>
            <p className="mt-3 max-w-2xl text-18 text-qidra-grayBlue">
              {locale === "ru"
                ? "Выберите проект, изучите документы и создайте заявку после подтверждения условий."
                : "Choose a project, review documents, and create an application after accepting terms."}
            </p>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {projects.map((project) => (
              <ProjectCard key={project.slug} project={project} locale={locale} />
            ))}
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
