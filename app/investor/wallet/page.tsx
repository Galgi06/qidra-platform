import { Footer } from "@/components/Footer";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { WalletOperationItem } from "@/components/WalletOperationItem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams } from "@/lib/i18n";

export default async function WalletPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  await requireAuth(locale, "/investor/wallet");

  return (
    <>
      <Header locale={locale} path="/investor/wallet" />
      <main className="section">
        <div className="container-qidra grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <FeedbackForm
            className="surface grid content-start gap-5 p-6 shadow-qidra"
            feedback={{
              title: locale === "ru" ? "Заявка на пополнение создана" : "Deposit request created",
              text:
                locale === "ru"
                  ? "Transaction hash принят. Баланс обновится после проверки данных платежа."
                  : "The transaction hash was received. The balance will update after the payment details are reviewed.",
              buttonLabel: locale === "ru" ? "Понятно" : "Got it",
              dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
              tone: "success"
            }}
            resetOnSubmit
          >
            <h1 className="subtitle-28">{locale === "ru" ? "Кошелек USDT TRC20" : "USDT TRC20 wallet"}</h1>
            <NotificationCard
              title={locale === "ru" ? "Статус пополнения" : "Deposit status"}
              text={locale === "ru" ? "Баланс обновляется после проверки transaction hash." : "Balance updates after the transaction hash is reviewed."}
            />
            <Input label="Transaction hash" name="txHash" placeholder="0x..." required />
            <Input label="Amount USDT" name="amount" inputMode="decimal" placeholder="1000" required />
            <Button type="submit">{locale === "ru" ? "Создать заявку на пополнение" : "Create deposit request"}</Button>
          </FeedbackForm>
          <section className="grid content-start gap-3">
            <h2 className="subtitle-28">{locale === "ru" ? "История операций" : "Transaction history"}</h2>
            <WalletOperationItem title={locale === "ru" ? "Пополнение" : "Deposit"} amount="1000 USDT" status={locale === "ru" ? "На проверке" : "Pending"} />
          </section>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
