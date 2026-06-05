import Link from "next/link";
import type { ReactNode } from "react";
import { Prisma } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type Locale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const actionLabels: Record<string, Record<Locale, string>> = {
  "kyc.approve": { ru: "Анкета одобрена", en: "KYC approved" },
  "kyc.reject": { ru: "Анкета отклонена", en: "KYC rejected" },
  "investment.confirm": { ru: "Заявка участия подтверждена", en: "Participation request confirmed" },
  "investment.reject": { ru: "Заявка участия отклонена", en: "Participation request rejected" },
  "investment.request.cancel": { ru: "Участник отменил заявку", en: "Participant cancelled request" },
  "investment.request.create": { ru: "Участник создал заявку", en: "Participant created request" },
  "investment.request.update": { ru: "Участник обновил заявку", en: "Participant updated request" },
  "payment.deposit.confirm": { ru: "Пополнение подтверждено", en: "Deposit confirmed" },
  "payment.deposit.reject": { ru: "Пополнение отклонено", en: "Deposit rejected" },
  "payment.deposit.user_confirmed": { ru: "Пополнение подтверждено автоматически", en: "Deposit confirmed automatically" },
  "payment.withdrawal.confirm": { ru: "Вывод подтвержден", en: "Withdrawal confirmed" },
  "payment.withdrawal.reject": { ru: "Вывод отклонен", en: "Withdrawal rejected" },
  "payment.withdrawal.request": { ru: "Участник запросил вывод", en: "Participant requested withdrawal" },
  "payment.trongrid.confirm": { ru: "Пополнение подтверждено автоматически", en: "Deposit confirmed automatically" },
  "payment.trc20.auto_confirm": { ru: "Пополнение зачислено автоматически", en: "Deposit credited automatically" },
  "payment.trc20.claim_rejected": { ru: "Заявка пополнения отклонена синхронизацией", en: "Deposit claim rejected by sync" },
  "payment.trc20.pending_confirmed": { ru: "Пополнение подтверждено синхронизацией", en: "Deposit confirmed by sync" },
  "project.create": { ru: "Проект создан", en: "Project created" },
  "project.document.create": { ru: "Документ проекта добавлен", en: "Project document added" },
  "project.status.update": { ru: "Статус проекта изменен", en: "Project status updated" },
  "user.role.update": { ru: "Роль пользователя изменена", en: "User role updated" }
};

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  await requireAdmin(locale, "/admin/audit");
  const categoryFilter = parseAuditCategory(searchParamString(params.category));
  const auditWhere = auditCategoryWhere(categoryFilter);
  const [logs, totalCount, paymentCount, investmentCount, kycCount, projectCount, userCount, systemCount] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where: auditWhere,
      include: {
        actor: {
          select: {
            email: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 160
    }),
    prisma.adminAuditLog.count(),
    prisma.adminAuditLog.count({ where: auditCategoryWhere("payment") }),
    prisma.adminAuditLog.count({ where: auditCategoryWhere("investment") }),
    prisma.adminAuditLog.count({ where: auditCategoryWhere("kyc") }),
    prisma.adminAuditLog.count({ where: auditCategoryWhere("project") }),
    prisma.adminAuditLog.count({ where: auditCategoryWhere("user") }),
    prisma.adminAuditLog.count({ where: auditCategoryWhere("system") })
  ]);
  const stats = { investmentCount, kycCount, paymentCount, projectCount, systemCount, totalCount, userCount };

  return (
    <>
      <Header locale={locale} path="/admin/audit" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: locale === "ru" ? "Журнал действий" : "Audit log" }
              ]}
            />
            <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Журнал действий" : "Audit log"}</h1>
            <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
              {locale === "ru"
                ? "История административных решений по KYC, проектам, заявкам, платежам и ролям доступа."
                : "Administrative decision history for KYC, projects, participation requests, payments and access roles."}
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/audit" locale={locale} />
            <AuditDashboard locale={locale} stats={stats} />
            <AuditFilters categoryFilter={categoryFilter} locale={locale} stats={stats} />

            {logs.length ? (
              <div className="overflow-x-auto rounded-qidra border border-qidra-grayLight bg-white">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-qidra-grayLight text-14 font-medium text-qidra-grayBlue">
                      <th className="px-5 py-4">{locale === "ru" ? "Дата" : "Date"}</th>
                      <th className="px-5 py-4">{locale === "ru" ? "Действие" : "Action"}</th>
                      <th className="px-5 py-4">{locale === "ru" ? "Инициатор" : "Actor"}</th>
                      <th className="px-5 py-4">{locale === "ru" ? "Объект" : "Entity"}</th>
                      <th className="px-5 py-4">{locale === "ru" ? "Детали" : "Details"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b border-qidra-grayLight last:border-0">
                        <td className="px-5 py-5 align-top text-14 text-qidra-grayBlue">{formatDateTime(log.createdAt, locale)}</td>
                        <td className="px-5 py-5 align-top">
                          <p className="text-16 font-medium text-qidra-dark">{actionLabel(log.action, locale)}</p>
                          <p className="mt-1 text-12 text-qidra-grayBlue">{actionCode(log.action)}</p>
                        </td>
                        <td className="px-5 py-5 align-top">
                          <p className="text-16 font-medium text-qidra-dark">{actorName(log.actor, locale)}</p>
                          <p className="mt-1 text-12 text-qidra-grayBlue">{actorRoleLabel(log.actor?.role, locale)}</p>
                        </td>
                        <td className="px-5 py-5 align-top">
                          <p className="text-16 font-medium text-qidra-dark">{entityLabel(log.entityType, locale)}</p>
                          <p className="mt-1 max-w-[220px] break-all text-12 text-qidra-grayBlue">{log.entityId || "-"}</p>
                        </td>
                        <td className="px-5 py-5 align-top">
                          <PayloadPreview payload={log.payload} locale={locale} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NotificationCard
                title={locale === "ru" ? "Записи не найдены" : "No audit records found"}
                text={
                  categoryFilter
                    ? locale === "ru"
                      ? "Для выбранной категории пока нет событий. Измените фильтр или вернитесь ко всему журналу."
                      : "There are no events for the selected category yet. Change the filter or return to the full log."
                    : locale === "ru"
                      ? "Новые записи появятся после административных решений, автоматических сверок и изменений проектов."
                      : "New entries will appear after administrative decisions, automatic reconciliations and project changes."
                }
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

type AuditCategory = "investment" | "kyc" | "payment" | "project" | "system" | "user";

type AuditStats = {
  investmentCount: number;
  kycCount: number;
  paymentCount: number;
  projectCount: number;
  systemCount: number;
  totalCount: number;
  userCount: number;
};

function AuditDashboard({ locale, stats }: { locale: Locale; stats: AuditStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <AuditStatCard label={locale === "ru" ? "Всего событий" : "Total events"} value={stats.totalCount} />
      <AuditStatCard label={locale === "ru" ? "Платежи" : "Payments"} tone="accent" value={stats.paymentCount} />
      <AuditStatCard label={locale === "ru" ? "Заявки" : "Applications"} value={stats.investmentCount} />
      <AuditStatCard label={locale === "ru" ? "KYC" : "KYC"} value={stats.kycCount} />
      <AuditStatCard label={locale === "ru" ? "Система" : "System"} tone="success" value={stats.systemCount} />
    </div>
  );
}

function AuditStatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "neutral" | "success"; value: number }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{formatCount(value)}</p>
    </article>
  );
}

function AuditFilters({ categoryFilter, locale, stats }: { categoryFilter?: AuditCategory; locale: Locale; stats: AuditStats }) {
  return (
    <div className="grid gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Категория события" : "Event category"}</p>
      <div className="flex flex-wrap gap-2">
        <AuditFilterPill active={!categoryFilter} href={auditFilterHref(locale)}>
          {locale === "ru" ? "Все" : "All"} ({formatCount(stats.totalCount)})
        </AuditFilterPill>
        <AuditFilterPill active={categoryFilter === "payment"} href={auditFilterHref(locale, "payment")}>
          {locale === "ru" ? "Платежи" : "Payments"} ({formatCount(stats.paymentCount)})
        </AuditFilterPill>
        <AuditFilterPill active={categoryFilter === "investment"} href={auditFilterHref(locale, "investment")}>
          {locale === "ru" ? "Участие" : "Participation"} ({formatCount(stats.investmentCount)})
        </AuditFilterPill>
        <AuditFilterPill active={categoryFilter === "kyc"} href={auditFilterHref(locale, "kyc")}>
          KYC ({formatCount(stats.kycCount)})
        </AuditFilterPill>
        <AuditFilterPill active={categoryFilter === "project"} href={auditFilterHref(locale, "project")}>
          {locale === "ru" ? "Проекты" : "Projects"} ({formatCount(stats.projectCount)})
        </AuditFilterPill>
        <AuditFilterPill active={categoryFilter === "user"} href={auditFilterHref(locale, "user")}>
          {locale === "ru" ? "Пользователи" : "Users"} ({formatCount(stats.userCount)})
        </AuditFilterPill>
        <AuditFilterPill active={categoryFilter === "system"} href={auditFilterHref(locale, "system")}>
          {locale === "ru" ? "Система" : "System"} ({formatCount(stats.systemCount)})
        </AuditFilterPill>
      </div>
    </div>
  );
}

function AuditFilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
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

function PayloadPreview({ payload, locale }: { payload: unknown; locale: Locale }) {
  const entries = payloadEntries(payload);

  if (!entries.length) {
    return <span className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Нет деталей" : "No details"}</span>;
  }

  return (
    <div className="grid gap-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-qidra bg-qidra-grayLight px-3 py-2">
          <p className="text-12 font-medium text-qidra-grayBlue">{payloadKeyLabel(key, locale)}</p>
          <p className="mt-1 max-w-[360px] break-words text-14 text-qidra-dark">{formatPayloadValue(key, value, locale)}</p>
        </div>
      ))}
    </div>
  );
}

function payloadEntries(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.entries(payload as Record<string, unknown>).slice(0, 6);
}

function payloadKeyLabel(key: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    amountUsdt: { ru: "Сумма", en: "Amount" },
    destinationAddress: { ru: "Адрес получателя", en: "Recipient address" },
    from: { ru: "Было", en: "From" },
    fromAddress: { ru: "Адрес отправителя", en: "Sender address" },
    note: { ru: "Комментарий", en: "Note" },
    projectFundedUsdt: { ru: "Собрано по проекту", en: "Project funded" },
    projectId: { ru: "ID проекта", en: "Project ID" },
    reservedDeltaUsdt: { ru: "Изменение резерва", en: "Reserve change" },
    slug: { ru: "Slug", en: "Slug" },
    status: { ru: "Статус", en: "Status" },
    to: { ru: "Стало", en: "To" },
    toAddress: { ru: "Адрес зачисления", en: "Recipient address" },
    txHash: { ru: "Transaction hash", en: "Transaction hash" },
    type: { ru: "Тип операции", en: "Operation type" }
  };

  return labels[key]?.[locale] || key;
}

function formatPayloadValue(key: string, value: unknown, locale: Locale) {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "string" || typeof value === "number") {
    if (key.toLowerCase().includes("usdt") && isFiniteNumberLike(value)) {
      return formatUsdtValue(value);
    }

    return enumValueLabel(String(value), locale);
  }

  if (typeof value === "boolean") return value ? (locale === "ru" ? "Да" : "Yes") : locale === "ru" ? "Нет" : "No";
  return JSON.stringify(value);
}

function actionLabel(action: string, locale: Locale) {
  return actionLabels[action]?.[locale] || action.replace(/\./g, " ");
}

function actionCode(action: string) {
  return action.replace("trongrid", "trc20");
}

function actorName(actor: { email: string; name: string | null } | null, locale: Locale) {
  if (!actor) return locale === "ru" ? "Система" : "System";
  return actor.name || actor.email;
}

function actorRoleLabel(role: string | undefined, locale: Locale) {
  if (role === "SUPER_ADMIN") return locale === "ru" ? "Главный администратор" : "Super administrator";
  if (role === "ADMIN") return locale === "ru" ? "Администратор" : "Administrator";
  if (role === "INVESTOR") return locale === "ru" ? "Участник" : "Participant";
  return locale === "ru" ? "Система" : "System";
}

function entityLabel(entityType: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    InvestmentApplication: { ru: "Заявка участия", en: "Participation request" },
    KycApplication: { ru: "KYC", en: "KYC" },
    Project: { ru: "Проект", en: "Project" },
    ProjectDocument: { ru: "Документ проекта", en: "Project document" },
    User: { ru: "Пользователь", en: "User" },
    WalletTransaction: { ru: "Операция кошелька", en: "Wallet operation" },
    investment: { ru: "Заявка участия", en: "Participation request" },
    kyc: { ru: "KYC", en: "KYC" },
    payment: { ru: "Платеж", en: "Payment" },
    project: { ru: "Проект", en: "Project" },
    user: { ru: "Пользователь", en: "User" },
    walletTransaction: { ru: "Операция кошелька", en: "Wallet operation" }
  };

  return labels[entityType]?.[locale] || entityType;
}

function formatDateTime(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function searchParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseAuditCategory(value: string | undefined): AuditCategory | undefined {
  if (value === "investment") return "investment";
  if (value === "kyc") return "kyc";
  if (value === "payment") return "payment";
  if (value === "project") return "project";
  if (value === "system") return "system";
  if (value === "user") return "user";
  return undefined;
}

function auditCategoryWhere(category?: AuditCategory): Prisma.AdminAuditLogWhereInput {
  if (!category) return {};
  if (category === "system") return { actorId: null };

  return {
    action: {
      startsWith: `${category}.`
    }
  };
}

function auditFilterHref(locale: Locale, category?: AuditCategory) {
  const params = new URLSearchParams({ lang: locale });

  if (category) params.set("category", category);

  return `/admin/audit?${params.toString()}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdtValue(value: string | number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(Number(value))} USDT`;
}

function isFiniteNumberLike(value: string | number) {
  return Number.isFinite(Number(value));
}

function enumValueLabel(value: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    ACTIVE: { ru: "Опубликован", en: "Active" },
    ADMIN: { ru: "Администратор", en: "Administrator" },
    ADJUSTMENT: { ru: "Корректировка", en: "Adjustment" },
    APPROVED: { ru: "Одобрено", en: "Approved" },
    CANCELLED: { ru: "Отменено", en: "Cancelled" },
    CLOSED: { ru: "Закрыт", en: "Closed" },
    CONFIRMED: { ru: "Подтверждено", en: "Confirmed" },
    DEPOSIT: { ru: "Пополнение", en: "Deposit" },
    DRAFT: { ru: "Черновик", en: "Draft" },
    FUNDED: { ru: "Собран", en: "Funded" },
    INVESTMENT: { ru: "Участие", en: "Participation" },
    INVESTOR: { ru: "Участник", en: "Participant" },
    PAUSED: { ru: "Пауза", en: "Paused" },
    PENDING: { ru: "На проверке", en: "Pending" },
    REJECTED: { ru: "Отклонено", en: "Rejected" },
    RETURN: { ru: "Возврат", en: "Return" },
    REVIEW: { ru: "Проверка", en: "Review" },
    SUBMITTED: { ru: "На проверке", en: "Submitted" },
    SUPER_ADMIN: { ru: "Главный администратор", en: "Super administrator" },
    WITHDRAWAL: { ru: "Вывод", en: "Withdrawal" }
  };

  return labels[value]?.[locale] || value;
}
