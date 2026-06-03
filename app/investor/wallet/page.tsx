import { Footer } from "@/components/Footer";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { WalletOperationItem } from "@/components/WalletOperationItem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function WalletPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor/wallet");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 12
      }
    }
  });
  const availableUsdt = wallet?.availableUsdt ?? 0;
  const pendingUsdt = wallet?.pendingUsdt ?? 0;

  return (
    <>
      <Header locale={locale} path="/investor/wallet" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Кабинет участника" : "Participant cabinet"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Кошелек USDT TRC20" : "USDT TRC20 wallet"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Создавайте заявки на пополнение и отслеживайте статус операций после сверки платежа."
                  : "Create deposit requests and track operation statuses after payment reconciliation."}
              </p>
            </div>
            <Tabs
              items={[
                { label: isRu ? "Обзор" : "Overview", href: withLocale("/investor", locale) },
                { label: isRu ? "Проверка" : "Review", href: withLocale("/investor/kyc", locale) },
                { label: isRu ? "Кошелек" : "Wallet", href: withLocale("/investor/wallet", locale), active: true },
                { label: isRu ? "Участие" : "Participation", href: withLocale("/investor/investments", locale) }
              ]}
            />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-5 md:grid-cols-3">
              <BalanceCard label={isRu ? "Доступный баланс" : "Available balance"} value={formatUsdt(availableUsdt)} tone="dark" />
              <BalanceCard label={isRu ? "На проверке" : "Under review"} value={formatUsdt(pendingUsdt)} tone="accent" />
              <BalanceCard label={isRu ? "Сеть" : "Network"} value="USDT TRC20" tone="light" />
            </div>

            <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
              <FeedbackForm
                className="grid content-start gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8"
                endpoint={`/api/wallet/deposits?lang=${locale}`}
                feedback={{
                  title: isRu ? "Заявка на пополнение создана" : "Deposit request created",
                  text:
                    isRu
                      ? "Transaction hash принят. Сумма появится в доступном балансе после проверки платежа."
                      : "The transaction hash was received. The amount will move to available balance after payment review.",
                  buttonLabel: isRu ? "Понятно" : "Got it",
                  dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                  tone: "success"
                }}
                resetOnSubmit
              >
                <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Создать пополнение" : "Create deposit"}</h2>
                <NotificationCard
                  title={isRu ? "Перед отправкой" : "Before submitting"}
                  text={isRu ? "Проверьте сумму и transaction hash. После отправки операция появится на проверке." : "Check the amount and transaction hash. After submission, the operation will appear under review."}
                />
                <Input label="Transaction hash" name="txHash" placeholder="TRC20 transaction hash" required />
                <Input label="Amount USDT" name="amount" inputMode="decimal" placeholder="1000" required />
                <Button type="submit">{isRu ? "Создать заявку" : "Create request"}</Button>
              </FeedbackForm>

              <section className="grid content-start gap-4">
                <div>
                  <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "История операций" : "Transaction history"}</h2>
                  <p className="mt-2 text-16 text-qidra-grayBlue">{isRu ? "Последние заявки и статусы платежей." : "Recent requests and payment statuses."}</p>
                </div>
                {wallet?.transactions.length ? (
                  <div className="grid gap-3">
                    {wallet.transactions.map((transaction) => (
                      <WalletOperationItem
                        key={transaction.id}
                        title={transactionTitle(transaction.type, locale)}
                        meta={`${formatDate(transaction.createdAt, locale)} · ${transaction.txHash ?? ""}`}
                        amount={`+${formatUsdt(transaction.amountUsdt)}`}
                        tone={paymentTone(transaction.status)}
                      />
                    ))}
                  </div>
                ) : (
                  <NotificationCard
                    title={isRu ? "Операций пока нет" : "No operations yet"}
                    text={isRu ? "После отправки transaction hash заявка появится в истории." : "After submitting a transaction hash, the request will appear in history."}
                  />
                )}
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function BalanceCard({ label, value, tone }: { label: string; value: string; tone: "accent" | "dark" | "light" }) {
  const color = tone === "dark" ? "bg-qidra-dark text-white" : tone === "accent" ? "bg-[#2418f2] text-white" : "bg-white text-qidra-dark";

  return (
    <article className={`rounded-[20px] p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] ${color}`}>
      <p className={`text-14 font-medium ${tone === "light" ? "text-qidra-grayBlue" : "text-white/72"}`}>{label}</p>
      <p className="mt-4 text-[30px] font-medium leading-tight tracking-[0]">{value}</p>
    </article>
  );
}

function paymentTone(status: string) {
  if (status === "CONFIRMED") return "success";
  if (status === "REJECTED") return "error";
  return "pending";
}

function transactionTitle(type: string, locale: "ru" | "en") {
  if (type === "WITHDRAWAL") return locale === "ru" ? "Вывод" : "Withdrawal";
  if (type === "INVESTMENT") return locale === "ru" ? "Участие" : "Participation";
  if (type === "RETURN") return locale === "ru" ? "Возврат" : "Return";
  if (type === "ADJUSTMENT") return locale === "ru" ? "Корректировка" : "Adjustment";
  return locale === "ru" ? "Пополнение" : "Deposit";
}

function formatUsdt(value: { toString(): string } | number) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
