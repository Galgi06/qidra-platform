import { notFound } from "next/navigation";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { projects } from "@/lib/content";
import { getLocale, type SearchParams } from "@/lib/i18n";

export default async function ProjectDocumentsPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: SearchParams }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();

  return (
    <>
      <Header locale={locale} path={`/projects/${project.slug}/documents`} />
      <main className="section">
        <div className="container-qidra grid gap-6">
          <h1 className="title-48">{locale === "ru" ? "Документы" : "Documents"}</h1>
          <div className="grid gap-3 lg:grid-cols-2">
            {project.documents.map((document) => (
              <DocumentItem key={document.href} title={document.title[locale]} href={document.href} meta={document.kind} />
            ))}
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
