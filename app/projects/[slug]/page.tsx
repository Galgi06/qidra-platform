import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectGallery } from "@/components/ProjectGallery";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { dictionary, getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { acceptsApplications, getProjectBySlug } from "@/lib/project-catalog";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: SearchParams }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const progress = Math.round((project.fundedUsdt / project.targetUsdt) * 100);
  const riskLabel = locale === "ru" ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;
  const isRu = locale === "ru";
  const canApply = acceptsApplications(project);

  return (
    <>
      <Header locale={locale} path={`/projects/${project.slug}`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <Breadcrumbs
              items={[
                { label: "Qidra", href: withLocale("/", locale) },
                { label: locale === "ru" ? "Проекты" : "Projects", href: withLocale("/projects", locale) },
                { label: project.title[locale] }
              ]}
            />
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div className="grid gap-6">
                <ProjectStatusBadge status={project.status} locale={locale} />
                <h1 className="max-w-5xl text-[44px] font-medium leading-[1.1] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                  {project.title[locale]}
                </h1>
                <p className="max-w-4xl text-20 text-qidra-grayBlue sm:text-[24px]">{project.description[locale]}</p>
              </div>
              <aside className="grid gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                <div className="grid gap-2">
                  <ProgressBar value={progress} />
                  <div className="flex justify-between text-14 text-qidra-grayBlue">
                    <span>{project.fundedUsdt.toLocaleString()} USDT</span>
                    <span>{project.targetUsdt.toLocaleString()} USDT</span>
                  </div>
                </div>
                <dl className="grid gap-3 text-14">
                  <ProjectFact label={isRu ? "Структура" : "Structure"} value={project.structure} />
                  <ProjectFact label={isRu ? "Локация" : "Location"} value={project.location} />
                  <ProjectFact label={isRu ? "Риск" : "Risk"} value={riskLabel} />
                  <ProjectFact label={isRu ? "Ожидаемый результат" : "Expected result"} value={project.expectedReturn[locale]} />
                  <ProjectFact label={isRu ? "Ориентир доходности" : "Return guidance"} value={project.expectedYield[locale]} />
                </dl>
                {canApply ? (
                  <ButtonLink href={withLocale(`/invest/${project.slug}`, locale)} className="h-14">
                    {isRu ? "Подать заявку" : "Create application"}
                  </ButtonLink>
                ) : (
                  <div className="rounded-qidra border border-qidra-grayMedium/40 bg-qidra-grayLight p-4 text-15 font-medium text-qidra-grayBlue">
                    {project.status === "funded"
                      ? isRu
                        ? "Сбор по проекту завершён. Новые заявки не принимаются."
                        : "The raise is complete. New applications are not accepted."
                      : isRu
                        ? "Проект сейчас недоступен для новых заявок."
                        : "The project is currently unavailable for new applications."}
                  </div>
                )}
                <p className="text-12 text-qidra-grayBlue">{dictionary[locale].common.noFixedYield}</p>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-12">
            <ProjectGallery title={project.title[locale]} locale={locale} />
            <div className="grid gap-6 lg:grid-cols-3">
              <InfoPanel
                title={isRu ? "Формат участия" : "Participation format"}
                text={
                  isRu
                    ? "Условия проекта раскрываются до подачи заявки, включая структуру договора и порядок взаимодействия сторон."
                    : "Project terms are disclosed before application, including contract structure and cooperation process."
                }
              />
              <InfoPanel
                title={isRu ? "Проверка проекта" : "Project review"}
                text={
                  isRu
                    ? "Юридическая, экономическая и шариатская экспертиза помогают участникам принимать решение на основе документов."
                    : "Legal, economic and Sharia review help participants make decisions based on documents."
                }
              />
              <InfoPanel
                title={isRu ? "Открытая отчётность" : "Open reporting"}
                text={
                  isRu
                    ? "После публикации проект сопровождается обновлениями, статусами и документами в профиле участника."
                    : "After publication, the project is supported with updates, statuses and documents in the participant profile."
                }
              />
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 lg:px-11 lg:pb-24" id="documents">
          <div className="mx-auto grid max-w-[1840px] gap-5">
            <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[44px]">
              {isRu ? "Документы проекта" : "Project documents"}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {project.documents.length ? (
                project.documents.map((document) => (
                  <DocumentItem key={document.href} title={document.title[locale]} href={document.href} meta={document.kind} actionLabel={isRu ? "Открыть" : "Open"} />
                ))
              ) : (
                <p className="text-16 text-qidra-grayBlue">{isRu ? "Документы появятся после подготовки проекта." : "Documents will appear after the project is prepared."}</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap justify-between gap-2 border-b border-qidra-grayMedium/20 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-qidra-grayBlue">{label}</dt>
      <dd className="max-w-full break-words text-right font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-[20px] bg-qidra-grayLight p-7 sm:p-8">
      <h3 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h3>
      <p className="mt-5 text-18 text-qidra-grayBlue">{text}</p>
    </article>
  );
}
