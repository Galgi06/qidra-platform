import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { getProjectBySlug } from "@/lib/project-catalog";

export const dynamic = "force-dynamic";

export default async function ProjectDocumentsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const isRu = locale === "ru";

  return (
    <>
      <Header locale={locale} path={`/projects/${project.slug}/documents`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-6">
            <Breadcrumbs
              items={[
                { label: "Qidra", href: withLocale("/", locale) },
                { label: isRu ? "Проекты" : "Projects", href: withLocale("/projects", locale) },
                { label: project.title[locale], href: withLocale(`/projects/${project.slug}`, locale) },
                { label: isRu ? "Документы" : "Documents" }
              ]}
            />
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Материалы проекта" : "Project materials"}</p>
              <h1 className="mt-3 max-w-5xl text-[44px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[58px]">
                {isRu ? "Документы проекта" : "Project documents"}
              </h1>
              <p className="mt-4 max-w-4xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Ознакомьтесь с опубликованными материалами перед подачей заявки на участие."
                  : "Review published materials before submitting a participation application."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-5">
            <div className="grid gap-3 lg:grid-cols-2">
              {project.documents.length ? (
                project.documents.map((document) => (
                  <DocumentItem key={document.href} title={document.title[locale]} href={document.href} meta={document.kind} actionLabel={isRu ? "Открыть" : "Open"} />
                ))
              ) : (
                <div className="rounded-[20px] bg-qidra-grayLight p-6 text-16 text-qidra-grayBlue sm:p-8">
                  {isRu ? "Документы появятся после завершения подготовки проекта." : "Documents will appear after project preparation is complete."}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
