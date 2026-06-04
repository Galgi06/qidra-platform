import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { WalletOperationItem } from "@/components/WalletOperationItem";
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
          <div className="container-qidra grid gap-8 lg:grid-cols-[1fr_0.46fr]">
            <div className="grid gap-4">
              {payments.length ? (
                payments.map((payment) => (
                  <article key={payment.id} className="grid gap-4 rounded-qidra bg-white p-4 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
                    <WalletOperationItem
                      title={operationTitle(payment.type, locale)}
                      meta={`${payment.wallet.user.name || payment.wallet.user.email} · ${payment.txHash ?? ""}`}
                      amount={`+${formatUsdt(payment.amountUsdt)}`}
                      tone={paymentTone(payment.status)}
                    />
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
                          <TronGridCheckForm endpoint={`/api/admin/payments/${payment.id}/trongrid?lang=${locale}`} locale={locale} />
                          <PaymentActionForm action="confirm" endpoint={`/api/admin/payments/${payment.id}?lang=${locale}`} locale={locale} />
                          <PaymentActionForm action="reject" endpoint={`/api/admin/payments/${payment.id}?lang=${locale}`} locale={locale} />
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
              <NotificationCard
                title={locale === "ru" ? "Чеклист подтверждения" : "Confirmation checklist"}
                text={
                  locale === "ru"
                    ? "Сверьте сеть, сумму и transaction hash перед сменой статуса. Подтверждение переводит сумму в доступный баланс участника."
                    : "Match network, amount and transaction hash before changing status. Confirmation moves the amount to the participant's available balance."
                }
              />
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
        title: locale === "ru" ? "Платеж подтвержден TronGrid" : "Payment confirmed by TronGrid",
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
        {locale === "ru" ? "Проверить TronGrid" : "Check TronGrid"}
      </button>
    </FeedbackForm>
  );
}

function PaymentActionForm({ action, endpoint, locale }: { action: "confirm" | "reject"; endpoint: string; locale: "ru" | "en" }) {
  const confirm = action === "confirm";

  return (
    <FeedbackForm
      className="contents"
      endpoint={endpoint}
      feedback={{
        title: confirm ? (locale === "ru" ? "Платеж подтвержден" : "Payment confirmed") : locale === "ru" ? "Платеж отклонен" : "Payment rejected",
        text: confirm
          ? locale === "ru"
            ? "Сумма переведена в доступный баланс участника."
            : "The amount was moved to the participant's available balance."
          : locale === "ru"
            ? "Сумма снята с ожидающего баланса участника."
            : "The amount was removed from the participant's pending balance.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: confirm ? "success" : "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value={action} />
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
