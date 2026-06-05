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
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/audit");
  const logs = await prisma.adminAuditLog.findMany({
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
    take: 120
  });

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
          <div className="container-qidra">
            <AdminTabs activePath="/admin/audit" locale={locale} />

            <div className="mt-8">
              {logs.length ? (
                <div className="overflow-x-auto rounded-qidra border border-qidra-grayLight bg-white">
                  <table className="w-full min-w-[1080px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-qidra-grayLight text-14 font-medium text-qidra-grayBlue">
                        <th className="px-5 py-4">{locale === "ru" ? "Дата" : "Date"}</th>
                        <th className="px-5 py-4">{locale === "ru" ? "Действие" : "Action"}</th>
                        <th className="px-5 py-4">{locale === "ru" ? "Администратор" : "Administrator"}</th>
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
                            <p className="mt-1 text-12 text-qidra-grayBlue">{log.actor?.role || (locale === "ru" ? "Автоматически" : "Automatic")}</p>
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
                  title={locale === "ru" ? "Журнал пока пуст" : "Audit log is empty"}
                  text={
                    locale === "ru"
                      ? "Новые записи появятся после административных решений, автоматических сверок и изменений проектов."
                      : "New entries will appear after administrative decisions, automatic reconciliations and project changes."
                  }
                />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
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
          <p className="text-12 font-medium text-qidra-grayBlue">{key}</p>
          <p className="mt-1 max-w-[360px] break-words text-14 text-qidra-dark">{formatPayloadValue(value)}</p>
        </div>
      ))}
    </div>
  );
}

function payloadEntries(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.entries(payload as Record<string, unknown>).slice(0, 5);
}

function formatPayloadValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function actionLabel(action: string, locale: Locale) {
  return actionLabels[action]?.[locale] || action.replace(/\./g, " ");
}

function actionCode(action: string) {
  return action.replace("trongrid", "auto");
}

function actorName(actor: { email: string; name: string | null } | null, locale: Locale) {
  if (!actor) return locale === "ru" ? "Система" : "System";
  return actor.name || actor.email;
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
