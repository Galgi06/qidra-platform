import { Accordion } from "@/components/Accordion";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { faqItems } from "@/lib/content";
import { getLocale, type SearchParams } from "@/lib/i18n";

export default async function FaqPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);

  return (
    <>
      <Header locale={locale} path="/faq" />
      <main className="section">
        <div className="container-qidra grid gap-8">
          <h1 className="title-48">FAQ</h1>
          <Accordion items={faqItems.map((item) => ({ question: item.q[locale], answer: item.a[locale] }))} />
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
