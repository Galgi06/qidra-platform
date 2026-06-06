import type { ReactNode } from "react";
import { KycStatus, Role, SupportThreadStatus } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { AccessRecoveryForm } from "@/components/admin/AccessRecoveryForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { requireSupportDesk } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const session = await requireSupportDesk(locale, "/admin/support");
  const statusFilter = parseSupportStatus(searchParamString(params.status));
  const isRu = locale === "ru";
  const [threads, managers, stats] = await Promise.all([
    prisma.supportThread.findMany({
      where: statusFilter ? { status: statusFilter } : {},
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: "desc" },
          take: 6
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            kycApplications: {
              orderBy: { createdAt: "desc" },
              select: { status: true },
              take: 5
            }
          }
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 100
    }),
    prisma.user.findMany({
      where: {
        role: { in: [Role.TECH_SUPPORT, Role.SALES_MANAGER, Role.ADMIN, Role.SUPER_ADMIN] }
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    }),
    buildSupportStats(locale)
  ]);

  return (
    <>
      <Header locale={locale} path="/admin/support" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: isRu ? "Коммуникации" : "Communications" }
              ]}
            />
            <div className="mt-8">
              <h1 className="title-48 text-qidra-dark">{isRu ? "Коммуникации с участниками" : "Participant communications"}</h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Личные обращения участников по профилю, платежам, проектам и документам. Менеджеры могут отвечать и брать диалог в работу."
                  : "Personal participant requests about profile, payments, projects and documents. Managers can reply and take ownership of a thread."}
              </p>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/support" locale={locale} role={session.user?.role} />
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label={isRu ? "Открытые" : "Open"} value={stats.openCount} tone="accent" />
              <StatCard label={isRu ? "Ожидают участника" : "Waiting participant"} value={stats.pendingCount} />
              <StatCard label={isRu ? "Закрытые" : "Closed"} value={stats.closedCount} tone="success" />
              <StatCard label={isRu ? "Средняя оценка" : "Average rating"} value={stats.averageRatingLabel} />
            </div>
            <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Качество работы менеджеров" : "Manager performance"}</h2>
                  <p className="mt-2 text-16 text-qidra-grayBlue">
                    {isRu
                      ? `Оценённых диалогов: ${stats.ratedCount}. Рейтинг появляется после закрытия обращения и оценки участником.`
                      : `Rated threads: ${stats.ratedCount}. Ratings appear after a participant rates a closed request.`}
                  </p>
                </div>
              </div>
              {stats.managerStats.length ? (
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {stats.managerStats.map((manager) => (
                    <article key={manager.id} className="rounded-[16px] bg-qidra-grayLight p-5">
                      <p className="text-16 font-medium text-qidra-dark">{manager.name}</p>
                      <p className="mt-1 text-13 text-qidra-grayBlue">{manager.role}</p>
                      <div className="mt-5 grid grid-cols-3 gap-3 text-14">
                        <ManagerMetric label={isRu ? "Диалоги" : "Threads"} value={manager.threadCount.toString()} />
                        <ManagerMetric label={isRu ? "Закрыто" : "Closed"} value={manager.closedCount.toString()} />
                        <ManagerMetric label={isRu ? "Оценка" : "Rating"} value={manager.averageRatingLabel} />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <NotificationCard
                  title={isRu ? "Статистики пока нет" : "No statistics yet"}
                  text={isRu ? "Назначьте менеджера на диалог и закройте обращение, после оценки участника данные появятся здесь." : "Assign a manager to a thread and close the request; after participant rating, data will appear here."}
                />
              )}
            </section>
            <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Команда коммуникаций" : "Communications team"}</h2>
                  <p className="mt-2 max-w-3xl text-16 text-qidra-grayBlue">
                    {isRu
                      ? "Менеджеры техподдержки работают с техническими обращениями, отдел продаж — с вопросами по проектам и участию. Роли выдаются в разделе пользователей."
                      : "Support managers handle technical requests; sales managers handle project and participation requests. Roles are assigned in the users section."}
                  </p>
                </div>
                <ButtonLink href={withLocale("/admin/users", locale)} variant="outline" size="sm">
                  {isRu ? "Управлять сотрудниками" : "Manage staff"}
                </ButtonLink>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <ManagerGroup
                  emptyText={isRu ? "Менеджеры техподдержки пока не назначены." : "No support managers assigned yet."}
                  locale={locale}
                  managers={managers.filter((manager) => manager.role === Role.TECH_SUPPORT)}
                  title={isRu ? "Техподдержка" : "Technical support"}
                />
                <ManagerGroup
                  emptyText={isRu ? "Менеджеры отдела продаж пока не назначены." : "No sales managers assigned yet."}
                  locale={locale}
                  managers={managers.filter((manager) => manager.role === Role.SALES_MANAGER)}
                  title={isRu ? "Отдел продаж" : "Sales department"}
                />
              </div>
            </section>
            <div className="flex flex-wrap gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
              <FilterPill active={!statusFilter} href={supportFilterHref(locale)}>
                {isRu ? "Все" : "All"} ({stats.totalCount})
              </FilterPill>
              <FilterPill active={statusFilter === SupportThreadStatus.OPEN} href={supportFilterHref(locale, SupportThreadStatus.OPEN)}>
                {isRu ? "Открытые" : "Open"} ({stats.openCount})
              </FilterPill>
              <FilterPill active={statusFilter === SupportThreadStatus.PENDING} href={supportFilterHref(locale, SupportThreadStatus.PENDING)}>
                {isRu ? "Ожидают участника" : "Waiting participant"} ({stats.pendingCount})
              </FilterPill>
              <FilterPill active={statusFilter === SupportThreadStatus.CLOSED} href={supportFilterHref(locale, SupportThreadStatus.CLOSED)}>
                {isRu ? "Закрытые" : "Closed"} ({stats.closedCount})
              </FilterPill>
            </div>

            {threads.length ? (
              <div className="grid gap-5">
                {threads.map((thread) => {
                  const messages = [...thread.messages].reverse();

                  return (
                    <article key={thread.id} className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <p className="text-14 font-medium uppercase text-qidra-accent">{thread.subject || (isRu ? "Обращение участника" : "Participant request")}</p>
                          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">
                            {thread.user.name || thread.user.email}
                          </h2>
                          <p className="mt-1 text-14 text-qidra-grayBlue">{thread.user.email}</p>
                          <p className="mt-3 text-14 text-qidra-grayBlue">
                            {isRu ? "Статус" : "Status"}: {supportStatusLabel(thread.status, locale)} · {isRu ? "Ответственный" : "Owner"}:{" "}
                            {thread.assignedTo ? thread.assignedTo.name || thread.assignedTo.email : isRu ? "не назначен" : "unassigned"}
                          </p>
                          {thread.rating ? (
                            <p className="mt-2 text-14 font-medium text-qidra-green">
                              {isRu ? "Оценка участника" : "Participant rating"}: {thread.rating}/5
                              {thread.ratingComment ? ` · ${thread.ratingComment}` : ""}
                            </p>
                          ) : null}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-12 font-medium text-white ${thread.status === SupportThreadStatus.CLOSED ? "bg-qidra-green" : thread.status === SupportThreadStatus.PENDING ? "bg-qidra-dark" : "bg-qidra-accent"}`}>
                          {supportStatusLabel(thread.status, locale)}
                        </span>
                      </div>

                      <div className="grid gap-3">
                        {messages.map((message) => (
                          <div key={message.id} className="rounded-qidra bg-qidra-grayLight p-4">
                            <div className="flex flex-wrap items-center gap-2 text-12 font-medium text-qidra-grayBlue">
                              <span className="text-qidra-dark">{message.sender ? message.sender.name || message.sender.email : "Qidra"}</span>
                              <span>{message.sender?.role ? roleLabel(message.sender.role, locale) : isRu ? "Система" : "System"}</span>
                              <span>{formatDateTime(message.createdAt, locale)}</span>
                            </div>
                            <p className="mt-2 whitespace-pre-wrap text-15 text-qidra-grayBlue">{message.body}</p>
                          </div>
                        ))}
                      </div>

                      <details className="rounded-qidra border border-qidra-grayLight bg-white p-4">
                        <summary className="cursor-pointer list-none text-16 font-medium text-qidra-dark">
                          {isRu ? "Помощь со входом" : "Sign-in assistance"}
                        </summary>
                        <AccessRecoveryForm
                          endpoint={`/api/admin/users/${thread.user.id}/password-reset?lang=${locale}`}
                          hasApprovedKyc={thread.user.kycApplications.some((application) => application.status === KycStatus.APPROVED)}
                          locale={locale}
                        />
                      </details>

                      <FeedbackForm
                        className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
                        endpoint={`/api/admin/support/${thread.id}/messages?lang=${locale}`}
                        feedback={{
                          title: isRu ? "Диалог обновлён" : "Thread updated",
                          text: isRu ? "Ответственный и статус сохранены в журнале действий." : "Owner and status were saved in the audit log.",
                          buttonLabel: isRu ? "Понятно" : "Got it",
                          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                          tone: "success"
                        }}
                        refreshOnSuccess
                      >
                        <input name="action" type="hidden" value="update" />
                        <Select
                          label={isRu ? "Ответственный менеджер" : "Responsible manager"}
                          name="assignedToId"
                          defaultValue={thread.assignedToId ?? ""}
                          options={[
                            { value: "", label: isRu ? "Не назначен" : "Unassigned" },
                            ...managers.map((manager) => ({
                              value: manager.id,
                              label: `${manager.name || manager.email} · ${roleLabel(manager.role, locale)}`
                            }))
                          ]}
                        />
                        <Select
                          label={isRu ? "Статус диалога" : "Thread status"}
                          name="status"
                          defaultValue={thread.status}
                          options={[
                            { value: SupportThreadStatus.OPEN, label: isRu ? "В работе" : "In progress" },
                            { value: SupportThreadStatus.PENDING, label: isRu ? "Ожидает участника" : "Waiting participant" },
                            { value: SupportThreadStatus.CLOSED, label: isRu ? "Вопрос решён" : "Resolved" }
                          ]}
                        />
                        <Button type="submit">{isRu ? "Сохранить" : "Save"}</Button>
                      </FeedbackForm>

                      <FeedbackForm
                        className="grid gap-4 border-t border-qidra-grayLight pt-5 lg:grid-cols-[1fr_auto] lg:items-end"
                        endpoint={`/api/admin/support/${thread.id}/messages?lang=${locale}`}
                        feedback={{
                          title: isRu ? "Ответ отправлен" : "Reply sent",
                          text: isRu ? "Диалог обновлён и сохранён в журнале действий." : "The thread was updated and recorded in the audit log.",
                          buttonLabel: isRu ? "Понятно" : "Got it",
                          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                          tone: "success"
                        }}
                        refreshOnSuccess
                        resetOnSubmit
                      >
                        <input name="action" type="hidden" value="reply" />
                        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                          {isRu ? "Ответ участнику" : "Reply to participant"}
                          <textarea
                            className="min-h-28 rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
                            maxLength={3000}
                            name="body"
                            placeholder={isRu ? "Напишите ответ" : "Write a reply"}
                            required
                          />
                        </label>
                        <Button type="submit">{isRu ? "Ответить" : "Reply"}</Button>
                      </FeedbackForm>
                    </article>
                  );
                })}
              </div>
            ) : (
              <NotificationCard
                title={isRu ? "Диалогов нет" : "No threads"}
                text={isRu ? "Когда участник напишет в поддержку, обращение появится здесь." : "When a participant messages support, the request will appear here."}
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function StatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "neutral" | "success"; value: number | string }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{value}</p>
    </article>
  );
}

function ManagerMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-12 text-qidra-grayBlue">{label}</p>
      <p className="mt-1 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}

function ManagerGroup({
  emptyText,
  locale,
  managers,
  title
}: {
  emptyText: string;
  locale: "ru" | "en";
  managers: { email: string; id: string; name: string | null; role: Role }[];
  title: string;
}) {
  return (
    <article className="rounded-[16px] bg-qidra-grayLight p-5">
      <h3 className="text-18 font-medium text-qidra-dark">{title}</h3>
      {managers.length ? (
        <div className="mt-4 grid gap-3">
          {managers.map((manager) => (
            <div key={manager.id} className="rounded-[12px] bg-white p-4">
              <p className="font-medium text-qidra-dark">{manager.name || manager.email}</p>
              <p className="mt-1 text-13 text-qidra-grayBlue">
                {manager.email} · {roleLabel(manager.role, locale)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-14 text-qidra-grayBlue">{emptyText}</p>
      )}
    </article>
  );
}

function FilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <a
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        active ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayLight bg-white text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
      }`}
      href={href}
    >
      {children}
    </a>
  );
}

async function buildSupportStats(locale: "ru" | "en") {
  const [totalCount, openCount, pendingCount, closedCount, ratingAggregate, managerRows] = await Promise.all([
    prisma.supportThread.count(),
    prisma.supportThread.count({ where: { status: SupportThreadStatus.OPEN } }),
    prisma.supportThread.count({ where: { status: SupportThreadStatus.PENDING } }),
    prisma.supportThread.count({ where: { status: SupportThreadStatus.CLOSED } }),
    prisma.supportThread.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { rating: { not: null } }
    }),
    prisma.supportThread.groupBy({
      by: ["assignedToId"],
      _avg: { rating: true },
      _count: { _all: true, rating: true },
      where: { assignedToId: { not: null } }
    })
  ]);
  const managerIds = managerRows.map((row) => row.assignedToId).filter((id): id is string => Boolean(id));
  const [managers, closedRows] = await Promise.all([
    managerIds.length
      ? prisma.user.findMany({
          where: { id: { in: managerIds } },
          select: { id: true, name: true, email: true, role: true }
        })
      : [],
    managerIds.length
      ? prisma.supportThread.groupBy({
          by: ["assignedToId"],
          _count: { _all: true },
          where: { assignedToId: { in: managerIds }, status: SupportThreadStatus.CLOSED }
        })
      : []
  ]);
  const managerMap = new Map(managers.map((manager) => [manager.id, manager]));
  const closedMap = new Map(closedRows.map((row) => [row.assignedToId, row._count._all]));
  const managerStats = managerRows
    .map((row) => {
      const managerId = row.assignedToId;
      const manager = managerId ? managerMap.get(managerId) : null;
      const averageRating = row._avg.rating;

      return {
        averageRatingLabel: averageRating ? averageRating.toFixed(1) : "—",
        closedCount: managerId ? closedMap.get(managerId) ?? 0 : 0,
        id: managerId ?? "unassigned",
        name: manager?.name || manager?.email || "Qidra",
        role: manager ? roleLabel(manager.role, locale) : "Qidra",
        threadCount: row._count._all
      };
    })
    .sort((a, b) => b.threadCount - a.threadCount);

  return {
    averageRatingLabel: ratingAggregate._avg.rating ? ratingAggregate._avg.rating.toFixed(1) : "—",
    closedCount,
    managerStats,
    openCount,
    pendingCount,
    ratedCount: ratingAggregate._count.rating,
    totalCount
  };
}

function parseSupportStatus(value: string | undefined) {
  const normalized = value?.toUpperCase();

  if (normalized === SupportThreadStatus.OPEN) return SupportThreadStatus.OPEN;
  if (normalized === SupportThreadStatus.PENDING) return SupportThreadStatus.PENDING;
  if (normalized === SupportThreadStatus.CLOSED) return SupportThreadStatus.CLOSED;
  return undefined;
}

function supportFilterHref(locale: "ru" | "en", status?: SupportThreadStatus) {
  const params = new URLSearchParams({ lang: locale });

  if (status) params.set("status", status.toLowerCase());
  return `/admin/support?${params.toString()}`;
}

function roleLabel(role: string, locale: "ru" | "en") {
  if (role === "SUPER_ADMIN") return locale === "ru" ? "Главный админ" : "Super admin";
  if (role === "ADMIN") return locale === "ru" ? "Админ" : "Admin";
  if (role === "TECH_SUPPORT") return locale === "ru" ? "Техподдержка" : "Support";
  if (role === "SALES_MANAGER") return locale === "ru" ? "Отдел продаж" : "Sales";
  return locale === "ru" ? "Участник" : "Participant";
}

function supportStatusLabel(status: string, locale: "ru" | "en") {
  if (status === SupportThreadStatus.CLOSED) return locale === "ru" ? "Закрыт" : "Closed";
  if (status === SupportThreadStatus.PENDING) return locale === "ru" ? "Ожидает участника" : "Waiting participant";
  return locale === "ru" ? "Открыт" : "Open";
}

function formatDateTime(date: Date, locale: "ru" | "en") {
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
