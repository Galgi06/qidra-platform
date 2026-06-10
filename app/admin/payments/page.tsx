import Link from "next/link";
import type { ReactNode } from "react";
import { PaymentStatus, Prisma, TransactionType } from "@prisma/client";
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
  const params = await searchParams;
  const locale = await getLocale(params);
  await requireAdmin(locale, "/admin/payments");
  const statusFilter = parsePaymentStatus(searchParamString(params.status));
  const typeFilter = parseTransactionType(searchParamString(params.type));
  const query = searchParamString(params.q)?.trim() ?? "";
  const userIdFilter = searchParamString(params.userId)?.trim() ?? "";
  const realPaymentsWhere = realClientPaymentWhere();
  const paymentWhere: Prisma.WalletTransactionWhereInput = {
    AND: [
      realPaymentsWhere,
      {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(typeFilter ? { type: typeFilter } : {}),
        ...(userIdFilter ? { wallet: { is: { userId: userIdFilter } } } : {}),
        ...(query ? { OR: paymentSearchConditions(query) } : {})
      }
    ]
  };
  const [payments, totalCount, pendingCount, confirmedCount, rejectedCount, depositCount, withdrawalCount] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: paymentWhere,
      include: {
        paymentReview: true,
        wallet: {
          include: {
            user: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 80
    }),
    prisma.walletTransaction.count({ where: realPaymentsWhere }),
    prisma.walletTransaction.count({ where: { AND: [realPaymentsWhere, { status: PaymentStatus.PENDING }] } }),
    prisma.walletTransaction.count({ where: { AND: [realPaymentsWhere, { status: PaymentStatus.CONFIRMED }] } }),
    prisma.walletTransaction.count({ where: { AND: [realPaymentsWhere, { status: PaymentStatus.REJECTED }] } }),
    prisma.walletTransaction.count({ where: { AND: [realPaymentsWhere, { type: TransactionType.DEPOSIT }] } }),
    prisma.walletTransaction.count({ where: { AND: [realPaymentsWhere, { type: TransactionType.WITHDRAWAL }] } })
  ]);
  const stats = { confirmedCount, depositCount, pendingCount, rejectedCount, totalCount, withdrawalCount };

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
            <PaymentDashboard locale={locale} stats={stats} />
            <PaymentSearchForm locale={locale} query={query} statusFilter={statusFilter} typeFilter={typeFilter} userIdFilter={userIdFilter} />
            <PaymentFilters locale={locale} query={query} stats={stats} statusFilter={statusFilter} typeFilter={typeFilter} userIdFilter={userIdFilter} />
            {userIdFilter ? (
              <NotificationCard
                title={locale === "ru" ? "Фильтр по клиенту активен" : "Client filter is active"}
                text={
                  locale === "ru"
                    ? "Показаны операции только выбранного клиента. Чтобы увидеть все платежи, сбросьте фильтр."
                    : "Only operations for the selected client are shown. Reset the filter to see all payments."
                }
              />
            ) : null}
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
                      <div className="grid gap-3 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Клиент" : "Client"}</p>
                          <p className="mt-1 text-16 font-medium text-qidra-dark">{payment.wallet.user.name || (locale === "ru" ? "Без имени" : "No name")}</p>
                          <p className="mt-1 break-all text-13 text-qidra-grayBlue">{payment.wallet.user.email}</p>
                        </div>
                        <Link
                          className="inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-dark px-4 text-14 font-medium text-qidra-dark transition-colors hover:bg-qidra-dark hover:text-white"
                          href={withLocale(`/admin/users/${payment.wallet.user.id}?view=wallet`, locale)}
                        >
                          {locale === "ru" ? "Открыть досье" : "Open dossier"}
                        </Link>
                      </div>
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

function realClientPaymentWhere(): Prisma.WalletTransactionWhereInput {
  return {
    NOT: [
      {
        wallet: {
          is: {
            user: {
              is: {
                email: {
                  endsWith: "@qidra.local"
                }
              }
            }
          }
        }
      }
    ]
  };
}

type PaymentStats = {
  confirmedCount: number;
  depositCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
  withdrawalCount: number;
};

function PaymentDashboard({ locale, stats }: { locale: "ru" | "en"; stats: PaymentStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <PaymentStatCard label={locale === "ru" ? "Всего операций" : "Total operations"} value={stats.totalCount} />
      <PaymentStatCard label={locale === "ru" ? "На проверке" : "Pending review"} tone="accent" value={stats.pendingCount} />
      <PaymentStatCard label={locale === "ru" ? "Подтверждено" : "Confirmed"} tone="success" value={stats.confirmedCount} />
      <PaymentStatCard label={locale === "ru" ? "Отклонено" : "Rejected"} tone="danger" value={stats.rejectedCount} />
    </div>
  );
}

function PaymentStatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "danger" | "neutral" | "success"; value: number }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "danger" ? "text-qidra-red" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{formatCount(value)}</p>
    </article>
  );
}

function PaymentSearchForm({
  locale,
  query,
  statusFilter,
  typeFilter,
  userIdFilter
}: {
  locale: "ru" | "en";
  query: string;
  statusFilter?: PaymentStatus;
  typeFilter?: TransactionType;
  userIdFilter: string;
}) {
  return (
    <form action="/admin/payments" className="grid gap-3 rounded-qidra border border-qidra-grayLight bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
      <input name="lang" type="hidden" value={locale} />
      {statusFilter ? <input name="status" type="hidden" value={statusFilter.toLowerCase()} /> : null}
      {typeFilter ? <input name="type" type="hidden" value={typeFilter.toLowerCase()} /> : null}
      {userIdFilter ? <input name="userId" type="hidden" value={userIdFilter} /> : null}
      <label className="grid gap-2 text-14 font-medium text-qidra-dark">
        {locale === "ru" ? "Поиск операции или клиента" : "Search operation or client"}
        <input
          className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
          defaultValue={query}
          name="q"
          placeholder={locale === "ru" ? "Email, имя, transaction hash, TRC20 адрес или комментарий" : "Email, name, transaction hash, TRC20 address or note"}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{locale === "ru" ? "Найти" : "Search"}</Button>
        {query || userIdFilter ? (
          <Link
            className="inline-flex h-12 items-center justify-center rounded-qidra border border-qidra-grayMedium px-5 text-16 font-medium text-qidra-dark transition-colors hover:border-qidra-dark"
            href={paymentFilterHref(locale, statusFilter, typeFilter)}
          >
            {locale === "ru" ? "Сбросить поиск" : "Reset search"}
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function PaymentFilters({
  locale,
  query,
  stats,
  statusFilter,
  typeFilter,
  userIdFilter
}: {
  locale: "ru" | "en";
  query: string;
  stats: PaymentStats;
  statusFilter?: PaymentStatus;
  typeFilter?: TransactionType;
  userIdFilter: string;
}) {
  return (
    <div className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <div className="grid gap-2">
        <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Статус" : "Status"}</p>
        <div className="flex flex-wrap gap-2">
          <PaymentFilterPill active={!statusFilter} href={paymentFilterHref(locale, undefined, typeFilter, query, userIdFilter)}>
            {locale === "ru" ? "Все" : "All"} ({formatCount(stats.totalCount)})
          </PaymentFilterPill>
          <PaymentFilterPill active={statusFilter === PaymentStatus.PENDING} href={paymentFilterHref(locale, PaymentStatus.PENDING, typeFilter, query, userIdFilter)}>
            {locale === "ru" ? "На проверке" : "Pending"} ({formatCount(stats.pendingCount)})
          </PaymentFilterPill>
          <PaymentFilterPill active={statusFilter === PaymentStatus.CONFIRMED} href={paymentFilterHref(locale, PaymentStatus.CONFIRMED, typeFilter, query, userIdFilter)}>
            {locale === "ru" ? "Подтверждено" : "Confirmed"} ({formatCount(stats.confirmedCount)})
          </PaymentFilterPill>
          <PaymentFilterPill active={statusFilter === PaymentStatus.REJECTED} href={paymentFilterHref(locale, PaymentStatus.REJECTED, typeFilter, query, userIdFilter)}>
            {locale === "ru" ? "Отклонено" : "Rejected"} ({formatCount(stats.rejectedCount)})
          </PaymentFilterPill>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Тип операции" : "Operation type"}</p>
        <div className="flex flex-wrap gap-2">
          <PaymentFilterPill active={!typeFilter} href={paymentFilterHref(locale, statusFilter, undefined, query, userIdFilter)}>
            {locale === "ru" ? "Все операции" : "All operations"} ({formatCount(stats.totalCount)})
          </PaymentFilterPill>
          <PaymentFilterPill active={typeFilter === TransactionType.DEPOSIT} href={paymentFilterHref(locale, statusFilter, TransactionType.DEPOSIT, query, userIdFilter)}>
            {locale === "ru" ? "Пополнения" : "Deposits"} ({formatCount(stats.depositCount)})
          </PaymentFilterPill>
          <PaymentFilterPill active={typeFilter === TransactionType.WITHDRAWAL} href={paymentFilterHref(locale, statusFilter, TransactionType.WITHDRAWAL, query, userIdFilter)}>
            {locale === "ru" ? "Выводы" : "Withdrawals"} ({formatCount(stats.withdrawalCount)})
          </PaymentFilterPill>
        </div>
      </div>
    </div>
  );
}

function PaymentFilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        active ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayLight bg-white text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
      }`}
      href={href}
    >
      {children}
    </Link>
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

function searchParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePaymentStatus(value: string | undefined) {
  const normalized = value?.toUpperCase();

  if (normalized === PaymentStatus.PENDING) return PaymentStatus.PENDING;
  if (normalized === PaymentStatus.CONFIRMED) return PaymentStatus.CONFIRMED;
  if (normalized === PaymentStatus.REJECTED) return PaymentStatus.REJECTED;
  return undefined;
}

function parseTransactionType(value: string | undefined) {
  const normalized = value?.toUpperCase();

  if (normalized === TransactionType.DEPOSIT) return TransactionType.DEPOSIT;
  if (normalized === TransactionType.WITHDRAWAL) return TransactionType.WITHDRAWAL;
  if (normalized === TransactionType.INVESTMENT) return TransactionType.INVESTMENT;
  if (normalized === TransactionType.RETURN) return TransactionType.RETURN;
  if (normalized === TransactionType.ADJUSTMENT) return TransactionType.ADJUSTMENT;
  return undefined;
}

function paymentSearchConditions(query: string): Prisma.WalletTransactionWhereInput[] {
  const contains = { contains: query, mode: Prisma.QueryMode.insensitive };

  return [
    { id: contains },
    { txHash: contains },
    { destinationAddress: contains },
    { note: contains },
    {
      wallet: {
        is: {
          OR: [
            { trc20Address: contains },
            { user: { is: { email: contains } } },
            { user: { is: { name: contains } } }
          ]
        }
      }
    }
  ];
}

function paymentFilterHref(locale: "ru" | "en", status?: PaymentStatus, type?: TransactionType, query?: string, userId?: string) {
  const params = new URLSearchParams({ lang: locale });

  if (status) params.set("status", status.toLowerCase());
  if (type) params.set("type", type.toLowerCase());
  if (query) params.set("q", query);
  if (userId) params.set("userId", userId);

  return `/admin/payments?${params.toString()}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
