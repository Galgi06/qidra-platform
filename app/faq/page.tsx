import { Accordion } from "@/components/Accordion";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { getSiteContent } from "@/lib/site-content";

export default async function FaqPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const content = await getSiteContent();

  return (
    <>
      <Header locale={locale} path="/faq" />
      <main className="section">
        <div className="container-qidra grid gap-8">
          <h1 className="title-48">FAQ</h1>
          <Accordion items={content.faqItems.map((item) => ({ question: item.question[locale], answer: item.answer[locale] }))} />
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
