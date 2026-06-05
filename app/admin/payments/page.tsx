import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { WalletOperationItem } from "@/components/WalletOperationItem";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/payments");
  const payments = await prisma.walletTransaction.findMany({
    include: {
      paymentReview: true,
      wallet: {
        include: {
          user: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

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
            <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Сверка USDT-платежей" : "USDT payment reconciliation"}</h1>
            <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
              {locale === "ru"
                ? "Сверяйте сеть, сумму и transaction hash перед обновлением статуса операции участника."
                : "Match the network, amount and transaction hash before updating the participant operation status."}
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/payments" locale={locale} />
            <div className="grid gap-8 lg:grid-cols-[1fr_0.46fr]">
              <div className="grid gap-4">
                {payments.length ? (
                  payments.map((payment) => (
                    <article key={payment.id} className="grid gap-4 rounded-qidra bg-white p-4 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
                      <WalletOperationItem
                        title={operationTitle(payment.type, locale)}
                        meta={operationMeta(payment.wallet.user.name || payment.wallet.user.email, payment.type, payment.txHash, payment.destinationAddress)}
                        amount={formatOperationAmount(payment.type, payment.amountUsdt)}
                        tone={paymentTone(payment.status)}
                      />
                      {payment.type === "DEPOSIT" ? (
                        <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                          <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Личный адрес участника" : "Participant personal address"}</p>
                          <code className="mt-2 block break-all rounded-qidra bg-white px-3 py-2 text-12 text-qidra-dark">
                            {payment.wallet.trc20Address || (locale === "ru" ? "Адрес ещё не выдан" : "Address not issued yet")}
                          </code>
                        </div>
                      ) : null}
                      {payment.type === "WITHDRAWAL" ? (
                        <div className="grid gap-3 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                          <div>
                            <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Адрес получателя" : "Recipient address"}</p>
                            <code className="mt-2 block break-all rounded-qidra bg-white px-3 py-2 text-12 text-qidra-dark">
                              {payment.destinationAddress || (locale === "ru" ? "Адрес не указан" : "Address not provided")}
                            </code>
                          </div>
                          {payment.txHash ? (
                            <div>
                              <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Hash отправки" : "Outgoing hash"}</p>
                              <code className="mt-2 block break-all rounded-qidra bg-white px-3 py-2 text-12 text-qidra-dark">{payment.txHash}</code>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="grid gap-3 border-t border-qidra-grayLight pt-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Дата" : "Date"}</p>
                          <p className="mt-1 text-16 font-medium text-qidra-dark">{formatDate(payment.createdAt, locale)}</p>
                          {payment.paymentReview?.reviewedAt ? (
                            <p className="mt-1 text-12 text-qidra-grayBlue">
                              {locale === "ru" ? "Проверено" : "Reviewed"}: {formatDate(payment.paymentReview.reviewedAt, locale)}
                            </p>
                          ) : null}
                        </div>
                        {payment.status === "PENDING" ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            {payment.type === "DEPOSIT" ? <TronGridCheckForm endpoint={`/api/admin/payments/${payment.id}/trongrid?lang=${locale}`} locale={locale} /> : null}
                            {payment.type !== "DEPOSIT" ? <PaymentActionForm action="confirm" endpoint={`/api/admin/payments/${payment.id}?lang=${locale}`} locale={locale} type={payment.type} /> : null}
                            <PaymentActionForm action="reject" endpoint={`/api/admin/payments/${payment.id}?lang=${locale}`} locale={locale} type={payment.type} />
                          </div>
                        ) : (
                          <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-12 font-medium text-qidra-grayBlue">
                            {statusLabel(payment.status, locale)}
                          </span>
                        )}
                      </div>
                    </article>
                  ))
                ) : (
                  <NotificationCard
                    title={locale === "ru" ? "Платежей пока нет" : "No payments yet"}
                    text={locale === "ru" ? "Новые операции появятся здесь после отправки transaction hash участником." : "New operations will appear here after a participant submits a transaction hash."}
                  />
                )}
              </div>
              <div className="space-y-4">
                <FeedbackForm
                  className="grid gap-3 rounded-qidra bg-qidra-grayLight p-4"
                  endpoint={`/api/admin/payments/sync-trc20?lang=${locale}`}
                  feedback={{
                    title: locale === "ru" ? "Входящие переводы синхронизированы" : "Incoming transfers synced",
                    text:
                      locale === "ru"
                        ? "Система проверила личные USDT TRC20-адреса участников и зачислила новые подтверждённые переводы."
                        : "The system scanned participant personal USDT TRC20 addresses and credited new confirmed transfers.",
                    buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                    dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                    tone: "success"
                  }}
                  popupPlacement="center"
                  refreshOnSuccess
                >
                  <input name="limitPerWallet" type="hidden" value="100" />
                  <div>
                    <p className="text-16 font-medium text-qidra-dark">{locale === "ru" ? "Автосверка входящих" : "Incoming auto-reconciliation"}</p>
                    <p className="mt-2 text-14 text-qidra-grayBlue">
                      {locale === "ru"
                        ? "Проверяет подтверждённые USDT TRC20-переводы на личные адреса участников и зачисляет только новые операции."
                        : "Scans confirmed USDT TRC20 transfers to participant personal addresses and credits only new operations."}
                    </p>
                  </div>
                  <Button type="submit">{locale === "ru" ? "Синхронизировать входящие" : "Sync incoming transfers"}</Button>
                </FeedbackForm>
                <NotificationCard
                  title={locale === "ru" ? "Чеклист подтверждения" : "Confirmation checklist"}
                  text={
                    locale === "ru"
                      ? "Для пополнений используйте автоматическую проверку платежа. Для выводов вносите hash отправки: Qidra сверит сеть, сумму, получателя и кошелек отправителя."
                      : "Use automatic payment verification for deposits. For withdrawals, enter the outgoing hash: Qidra will match the network, amount, recipient and sender wallet."
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function TronGridCheckForm({ endpoint, locale }: { endpoint: string; locale: "ru" | "en" }) {
  return (
    <FeedbackForm
      className="contents"
      endpoint={endpoint}
      feedback={{
        title: locale === "ru" ? "Платеж подтвержден" : "Payment confirmed",
        text: locale === "ru" ? "Hash, адрес и сумма совпали. Баланс участника обновлён." : "Hash, address and amount matched. The participant balance was updated.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      refreshOnSuccess
    >
      <button
        className="inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-accent bg-white px-4 text-14 font-medium text-qidra-accent transition-colors hover:bg-qidra-accent hover:text-white"
        type="submit"
      >
        {locale === "ru" ? "Проверить перевод" : "Verify transfer"}
      </button>
    </FeedbackForm>
  );
}

function PaymentActionForm({ action, endpoint, locale, type }: { action: "confirm" | "reject"; endpoint: string; locale: "ru" | "en"; type: string }) {
  const confirm = action === "confirm";
  const withdrawal = type === "WITHDRAWAL";

  return (
    <FeedbackForm
      className={confirm && withdrawal ? "grid gap-2 sm:min-w-[320px]" : "contents"}
      endpoint={endpoint}
      feedback={{
        title: paymentActionTitle(confirm, withdrawal, locale),
        text: confirm
          ? withdrawal
            ? locale === "ru"
              ? "Сумма окончательно списана с ожидающего баланса участника."
              : "The amount was permanently deducted from the participant's pending balance."
            : locale === "ru"
              ? "Сумма переведена в доступный баланс участника."
              : "The amount was moved to the participant's available balance."
          : locale === "ru"
            ? withdrawal
              ? "Сумма возвращена в доступный баланс участника."
              : "Сумма снята с ожидающего баланса участника."
            : withdrawal
              ? "The amount was returned to the participant's available balance."
              : "The amount was removed from the participant's pending balance.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: confirm ? "success" : "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value={action} />
      {confirm && withdrawal ? (
        <Input
          label={locale === "ru" ? "Hash отправки" : "Outgoing hash"}
          name="txHash"
          pattern="[a-fA-F0-9]{64}"
          placeholder={locale === "ru" ? "64 символа TRON transaction hash" : "64-character TRON transaction hash"}
          required
        />
      ) : null}
      <ButtonLike confirm={confirm} locale={locale} />
    </FeedbackForm>
  );
}

function ButtonLike({ confirm, locale }: { confirm: boolean; locale: "ru" | "en" }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        confirm
          ? "border-qidra-accent bg-qidra-accent text-white hover:bg-qidra-accent80"
          : "border-qidra-grayMedium bg-transparent text-qidra-dark hover:border-qidra-red hover:text-qidra-red"
      }`}
      type="submit"
    >
      {confirm ? (locale === "ru" ? "Подтвердить" : "Confirm") : locale === "ru" ? "Отклонить" : "Reject"}
    </button>
  );
}

function operationTitle(type: string, locale: "ru" | "en") {
  if (type === "WITHDRAWAL") return locale === "ru" ? "Вывод" : "Withdrawal";
  if (type === "INVESTMENT") return locale === "ru" ? "Участие" : "Participation";
  if (type === "RETURN") return locale === "ru" ? "Возврат" : "Return";
  if (type === "ADJUSTMENT") return locale === "ru" ? "Корректировка" : "Adjustment";
  return locale === "ru" ? "Пополнение" : "Deposit";
}

function statusLabel(status: string, locale: "ru" | "en") {
  if (status === "CONFIRMED") return locale === "ru" ? "Подтверждено" : "Confirmed";
  if (status === "REJECTED") return locale === "ru" ? "Отклонено" : "Rejected";
  return locale === "ru" ? "На проверке" : "Pending";
}

function paymentTone(status: string) {
  if (status === "CONFIRMED") return "success";
  if (status === "REJECTED") return "error";
  return "pending";
}

function paymentActionTitle(confirm: boolean, withdrawal: boolean, locale: "ru" | "en") {
  if (confirm && withdrawal) return locale === "ru" ? "Вывод подтвержден" : "Withdrawal confirmed";
  if (!confirm && withdrawal) return locale === "ru" ? "Вывод отклонен" : "Withdrawal rejected";
  if (confirm) return locale === "ru" ? "Платеж подтвержден" : "Payment confirmed";
  return locale === "ru" ? "Платеж отклонен" : "Payment rejected";
}

function operationMeta(userLabel: string, type: string, txHash: string | null, destinationAddress: string | null) {
  const reference = type === "WITHDRAWAL" ? destinationAddress : txHash;
  return [userLabel, reference].filter(Boolean).join(" · ");
}

function formatOperationAmount(type: string, value: { toString(): string }) {
  const sign = type === "WITHDRAWAL" || type === "INVESTMENT" ? "-" : "+";
  return `${sign}${formatUsdt(value)}`;
}

function formatUsdt(value: { toString(): string }) {
  const amount = Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
