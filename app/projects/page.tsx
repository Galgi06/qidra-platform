import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { projects } from "@/lib/content";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function ProjectsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";

  return (
    <>
      <Header locale={locale} path="/projects" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
          <Breadcrumbs items={[{ label: "Qidra", href: withLocale("/", locale) }, { label: locale === "ru" ? "Проекты" : "Projects" }]} />
            <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Каталог Qidra" : "Qidra catalog"}</p>
                <h1 className="mt-4 text-[44px] font-medium leading-[1.1] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                  {isRu ? "Международные проекты" : "International projects"}
                </h1>
                <p className="mt-5 max-w-4xl text-20 text-qidra-grayBlue sm:text-[24px]">
                  {isRu
                    ? "Выберите направление, изучите документы и условия сотрудничества, затем отправьте заявку на участие."
                    : "Choose a sector, review documents and cooperation terms, then submit a participation application."}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
                <CatalogStat value={projects.length.toString()} label={isRu ? "проекта" : "projects"} />
                <CatalogStat value="2" label={isRu ? "структуры" : "structures"} />
                <CatalogStat value="UAE" label={isRu ? "юрисдикция" : "jurisdiction"} />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {[isRu ? "Все проекты" : "All projects", "Mudaraba", "Musharaka", isRu ? "С документами" : "With documents"].map((item, index) => (
                <span
                  key={item}
                  className={`rounded-full border px-4 py-2 text-14 font-medium ${
                    index === 0 ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayMedium/40 bg-white text-qidra-grayBlue"
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-6">
            <div className="grid gap-5 lg:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.slug} project={project} locale={locale} />
              ))}
            </div>
            <p className="max-w-4xl text-14 text-qidra-grayBlue">
              {isRu
                ? "Qidra не обещает фиксированную доходность. Любое участие требует самостоятельного изучения документов, условий и рисков проекта."
                : "Qidra does not promise fixed returns. Any participation requires independent review of project documents, terms and risks."}
            </p>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function CatalogStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[16px] bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-[28px] font-medium leading-none text-qidra-dark">{value}</p>
      <p className="mt-2 text-14 text-qidra-grayBlue">{label}</p>
    </div>
  );
}
