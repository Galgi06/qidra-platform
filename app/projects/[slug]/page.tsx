import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectGallery } from "@/components/ProjectGallery";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { projects } from "@/lib/content";
import { dictionary, getLocale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: SearchParams }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  const progress = Math.round((project.fundedUsdt / project.targetUsdt) * 100);
  const riskLabel = locale === "ru" ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;

  return (
    <>
      <Header locale={locale} path={`/projects/${project.slug}`} />
      <main className="section">
        <div className="container-qidra grid gap-8">
          <Breadcrumbs
            items={[
              { label: "Qidra", href: withLocale("/", locale) },
              { label: locale === "ru" ? "Проекты" : "Projects", href: withLocale("/projects", locale) },
              { label: project.title[locale] }
            ]}
          />
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-5">
              <ProjectStatusBadge status={project.status} locale={locale} />
              <h1 className="title-48">{project.title[locale]}</h1>
              <p className="text-18 text-qidra-grayBlue">{project.description[locale]}</p>
              <ProjectGallery title={project.title[locale]} />
            </div>
            <aside className="surface grid content-start gap-5 p-6 shadow-qidra">
              <div className="grid gap-2">
                <ProgressBar value={progress} />
                <div className="flex justify-between text-14 text-qidra-grayBlue">
                  <span>{project.fundedUsdt.toLocaleString()} USDT</span>
                  <span>{project.targetUsdt.toLocaleString()} USDT</span>
                </div>
              </div>
              <dl className="grid gap-3 text-14">
                <div className="flex justify-between gap-4">
                  <dt className="text-qidra-grayBlue">{locale === "ru" ? "Структура" : "Structure"}</dt>
                  <dd>{project.structure}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-qidra-grayBlue">{locale === "ru" ? "Локация" : "Location"}</dt>
                  <dd>{project.location}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-qidra-grayBlue">{locale === "ru" ? "Риск" : "Risk"}</dt>
                  <dd>{riskLabel}</dd>
                </div>
              </dl>
              <ButtonLink href={withLocale(`/invest/${project.slug}`, locale)}>{locale === "ru" ? "Подать заявку" : "Create application"}</ButtonLink>
              <p className="text-12 text-qidra-grayBlue">{dictionary[locale].common.noFixedYield}</p>
            </aside>
          </div>
          <section className="grid gap-4">
            <h2 className="subtitle-28">{locale === "ru" ? "Документы проекта" : "Project documents"}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {project.documents.length ? (
                project.documents.map((document) => <DocumentItem key={document.href} title={document.title[locale]} href={document.href} meta={document.kind} />)
              ) : (
                <p className="text-16 text-qidra-grayBlue">{locale === "ru" ? "Документы появятся после подготовки проекта." : "Documents will appear after the project is prepared."}</p>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
