import { notFound } from "next/navigation";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { legalPages } from "@/lib/content";
import { dictionary, getLocale, type SearchParams } from "@/lib/i18n";

export default async function LegalPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: SearchParams }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const page = legalPages.find((item) => item.slug === slug);
  if (!page) notFound();

  return (
    <>
      <Header locale={locale} path={`/legal/${page.slug}`} />
      <main className="section">
        <div className="container-qidra grid max-w-3xl gap-7">
          <h1 className="title-48">{page.title[locale]}</h1>
          <p className="text-18 text-qidra-grayBlue">{page.body[locale]}</p>
          <NotificationCard title={locale === "ru" ? "Риск" : "Risk"} text={dictionary[locale].common.noFixedYield} />
          {page.asset ? <DocumentItem title={page.title[locale]} href={page.asset} meta={locale === "ru" ? "Оригинальный файл" : "Original file"} /> : null}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
