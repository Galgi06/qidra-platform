import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";

const applications = [
  {
    investor: "Investor Demo",
    level: { ru: "Физическое лицо", en: "Individual" },
    risk: { ru: "Стандартный", en: "Standard" },
    status: "pending"
  },
  {
    investor: "Noura Capital",
    level: { ru: "Юридическое лицо", en: "Entity" },
    risk: { ru: "Расширенная проверка", en: "Enhanced due diligence" },
    status: "review"
  },
  {
    investor: "A. Karim",
    level: { ru: "Физическое лицо", en: "Individual" },
    risk: { ru: "Стандартный", en: "Standard" },
    status: "approved"
  }
] as const;

export default async function AdminKycPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/kyc");

  return (
    <>
      <Header locale={locale} path="/admin/kyc" />
      <main>
      <section className="section bg-qidra-grayLight">
        <div className="container-qidra">
          <Breadcrumbs
            items={[
              { label: t(locale, "nav.home"), href: withLocale("/", locale) },
              { label: "Admin", href: withLocale("/admin", locale) },
              { label: "KYC" }
            ]}
          />
          <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Управление KYC" : "KYC management"}</h1>
          <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
            {locale === "ru"
              ? "Очередь ручной проверки с понятным разделением одобрения, отказа и дополнительной проверки."
              : "Manual verification queue with clear separation between approval, rejection and additional review."}
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container-qidra grid gap-4">
          {applications.map((item) => (
            <div key={item.investor} className="surface grid gap-4 p-6 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
              <div>
                <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Инвестор" : "Investor"}</p>
                <p className="mt-1 text-18 font-medium text-qidra-dark">{item.investor}</p>
              </div>
              <div>
                <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Тип профиля" : "Profile type"}</p>
                <p className="mt-1 text-18 text-qidra-grayBlue">{item.level[locale]}</p>
              </div>
              <div>
                <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Риск" : "Risk"}</p>
                <p className="mt-1 text-18 text-qidra-grayBlue">{item.risk[locale]}</p>
              </div>
              <ProjectStatusBadge status={item.status} locale={locale} />
            </div>
          ))}
        </div>
      </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
