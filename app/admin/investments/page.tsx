import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackButton } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";

const requests = [
  { id: "INV-1004", investor: "Investor Demo", project: "Qidra Real Estate Income", amount: "5,000 USDT", status: "pending" },
  { id: "INV-1003", investor: "A. Karim", project: "Trade Participation", amount: "12,000 USDT", status: "confirmed" },
  { id: "INV-1002", investor: "Noura Capital", project: "Qidra Real Estate Income", amount: "25,000 USDT", status: "rejected" }
] as const;

export default async function AdminInvestmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/investments");

  return (
    <>
      <Header locale={locale} path="/admin/investments" />
      <main>
      <section className="section bg-qidra-grayLight">
        <div className="container-qidra">
          <Breadcrumbs
            items={[
              { label: t(locale, "nav.home"), href: withLocale("/", locale) },
              { label: "Admin", href: withLocale("/admin", locale) },
              { label: locale === "ru" ? "Заявки" : "Applications" }
            ]}
          />
          <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Инвестиционные заявки" : "Investment applications"}</h1>
          <p className="mt-4 text-20 text-qidra-grayBlue">
            {locale === "ru"
              ? "Подтверждайте заявки только после проверки средств, KYC и принятия договорных условий."
              : "Approve only after funds, KYC and contract acceptance are checked."}
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container-qidra grid gap-4">
          {requests.map((request) => (
            <div key={request.id} className="surface grid gap-4 p-6 lg:grid-cols-[0.7fr_1fr_1fr_0.8fr_auto] lg:items-center">
              <p className="text-16 font-medium text-qidra-dark">{request.id}</p>
              <p className="text-16 text-qidra-grayBlue">{request.investor}</p>
              <p className="text-16 text-qidra-grayBlue">{request.project}</p>
              <p className="text-16 font-medium text-qidra-dark">{request.amount}</p>
              <div className="flex items-center gap-3">
                <ProjectStatusBadge status={request.status} locale={locale} />
                <FeedbackButton
                  feedback={{
                    title: locale === "ru" ? "Заявка открыта" : "Application opened",
                    text:
                      locale === "ru"
                        ? "Карточка заявки готова к проверке средств, KYC и договорных условий."
                        : "The application card is ready for funds, KYC and contract review.",
                    buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                    dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                    tone: "info"
                  }}
                  size="sm"
                  variant="outline"
                >
                  {locale === "ru" ? "Открыть" : "Open"}
                </FeedbackButton>
              </div>
            </div>
          ))}
        </div>
      </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
