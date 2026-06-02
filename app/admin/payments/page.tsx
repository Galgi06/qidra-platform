import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackButton } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { WalletOperationItem } from "@/components/WalletOperationItem";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";

const payments = [
  {
    title: { ru: "Ручное пополнение", en: "Manual deposit" },
    meta: { ru: "Investor Demo · TX ожидает проверки", en: "Investor Demo · TX pending verification" },
    amount: "+5,000 USDT",
    tone: "pending"
  },
  {
    title: { ru: "Ручное пополнение", en: "Manual deposit" },
    meta: { ru: "A. Karim · Подтверждено администратором", en: "A. Karim · Confirmed by admin" },
    amount: "+12,000 USDT",
    tone: "success"
  },
  {
    title: { ru: "Отклоненное пополнение", en: "Rejected deposit" },
    meta: { ru: "Некорректный transaction hash", en: "Invalid transaction hash" },
    amount: "2,000 USDT",
    tone: "error"
  }
] as const;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/payments");

  return (
    <>
      <Header locale={locale} path="/admin/payments" />
      <main>
      <section className="section bg-qidra-grayLight">
        <div className="container-qidra">
          <Breadcrumbs
            items={[
              { label: t(locale, "nav.home"), href: withLocale("/", locale) },
              { label: "Admin", href: withLocale("/admin", locale) },
              { label: locale === "ru" ? "Платежи" : "Payments" }
            ]}
          />
          <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Подтверждение USDT-платежей" : "USDT payment confirmations"}</h1>
          <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
            {locale === "ru"
              ? "Первый релиз использует ручную TRC20-проверку. Баланс не пополняется автоматически без подтверждения администратора."
              : "The first release uses manual TRC20 verification. No automatic balance credit is performed without admin confirmation."}
          </p>
        </div>
      </section>
      <section className="section">
        <div className="container-qidra grid gap-8 lg:grid-cols-[1fr_0.8fr]">
          <div className="grid gap-4">
            {payments.map((payment) => (
              <WalletOperationItem
                key={`${payment.title.en}-${payment.meta.en}`}
                title={payment.title[locale]}
                meta={payment.meta[locale]}
                amount={payment.amount}
                tone={payment.tone}
              />
            ))}
          </div>
          <div className="space-y-4">
            <NotificationCard
              title={locale === "ru" ? "Чеклист подтверждения" : "Confirmation checklist"}
              text={
                locale === "ru"
                  ? "Сверьте сеть, адрес кошелька, сумму, transaction hash и заявку инвестора перед сменой статуса."
                  : "Match network, wallet address, amount, transaction hash and investor request before changing status."
              }
            />
            <FeedbackButton
              className="w-full"
              feedback={{
                title: locale === "ru" ? "Платеж подтвержден" : "Payment confirmed",
                text:
                  locale === "ru"
                    ? "Статус выбранного пополнения обновлен. Баланс инвестора можно начислять после финальной сверки."
                    : "The selected deposit status was updated. The investor balance can be credited after final reconciliation.",
                buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
            >
              {locale === "ru" ? "Подтвердить выбранный платеж" : "Confirm selected payment"}
            </FeedbackButton>
            <FeedbackButton
              className="w-full"
              feedback={{
                title: locale === "ru" ? "Платеж отклонен" : "Payment rejected",
                text:
                  locale === "ru"
                    ? "Статус выбранного пополнения обновлен. Инвестору нужно отправить корректный transaction hash."
                    : "The selected deposit status was updated. The investor should submit a valid transaction hash.",
                buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                tone: "warning"
              }}
              variant="outline"
            >
              {locale === "ru" ? "Отклонить платеж" : "Reject payment"}
            </FeedbackButton>
          </div>
        </div>
      </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
