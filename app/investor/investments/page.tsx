import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { projects } from "@/lib/content";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import Link from "next/link";

export default async function InvestmentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  await requireAuth(locale, "/investor/investments");

  return (
    <>
      <Header locale={locale} path="/investor/investments" />
      <main className="section">
        <div className="container-qidra grid gap-5">
          <h1 className="subtitle-28">{locale === "ru" ? "Моё участие" : "My participation"}</h1>
          <div className="surface overflow-hidden">
            <div className="grid grid-cols-4 gap-4 bg-qidra-grayLight p-4 text-14 font-medium">
              <span>{locale === "ru" ? "Проект" : "Project"}</span>
              <span>{locale === "ru" ? "Сумма" : "Amount"}</span>
              <span>{locale === "ru" ? "Статус" : "Status"}</span>
              <span>{locale === "ru" ? "Отчеты" : "Reports"}</span>
            </div>
            <div className="grid grid-cols-4 gap-4 p-4 text-14">
              <Link href={withLocale(`/projects/${projects[0].slug}`, locale)}>{projects[0].title[locale]}</Link>
              <span>0 USDT</span>
              <span>{locale === "ru" ? "Нет заявок" : "No applications"}</span>
              <span>{locale === "ru" ? "Будут опубликованы" : "To be published"}</span>
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
