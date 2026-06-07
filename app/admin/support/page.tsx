import type { ReactNode } from "react";
import { KycStatus, Prisma, Role, SupportQueue, SupportThreadStatus } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { AccessRecoveryForm } from "@/components/admin/AccessRecoveryForm";
import { QuickReplyTemplates } from "@/components/support/QuickReplyTemplates";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { requireSupportDesk } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { readKycDocuments } from "@/lib/kyc-documents";
import { prisma } from "@/lib/prisma";

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const session = await requireSupportDesk(locale, "/admin/support");
  const statusFilter = parseSupportStatus(searchParamString(params.status));
  const queueFilter = parseSupportQueue(searchParamString(params.queue));
  const ownerFilter = parseOwnerFilter(searchParamString(params.owner));
  const query = searchParamString(params.q)?.trim() ?? "";
  const isRu = locale === "ru";
  const supportWhere = buildSupportWhere({
    ownerFilter,
    query,
    queueFilter,
    sessionRole: session.user?.role,
    sessionUserId: session.user?.id,
    statusFilter
  });
  const [threads, managers, stats] = await Promise.all([
    prisma.supportThread.findMany({
      where: supportWhere,
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
              select: { documents: true, id: true, status: true },
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
            <SupportSearchForm locale={locale} ownerFilter={ownerFilter} query={query} queueFilter={queueFilter} statusFilter={statusFilter} />
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
            {session.user?.role === Role.ADMIN || session.user?.role === Role.SUPER_ADMIN ? <BroadcastNotificationPanel locale={locale} /> : null}
            <div className="flex flex-wrap gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
              <FilterPill active={!statusFilter} href={supportFilterHref(locale, undefined, queueFilter, ownerFilter, query)}>
                {isRu ? "Все" : "All"} ({stats.totalCount})
              </FilterPill>
              <FilterPill active={statusFilter === SupportThreadStatus.OPEN} href={supportFilterHref(locale, SupportThreadStatus.OPEN, queueFilter, ownerFilter, query)}>
                {isRu ? "Открытые" : "Open"} ({stats.openCount})
              </FilterPill>
              <FilterPill active={statusFilter === SupportThreadStatus.PENDING} href={supportFilterHref(locale, SupportThreadStatus.PENDING, queueFilter, ownerFilter, query)}>
                {isRu ? "Ожидают участника" : "Waiting participant"} ({stats.pendingCount})
              </FilterPill>
              <FilterPill active={statusFilter === SupportThreadStatus.CLOSED} href={supportFilterHref(locale, SupportThreadStatus.CLOSED, queueFilter, ownerFilter, query)}>
                {isRu ? "Закрытые" : "Closed"} ({stats.closedCount})
              </FilterPill>
            </div>
            <div className="flex flex-wrap gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
              <FilterPill active={!queueFilter} href={supportFilterHref(locale, statusFilter, undefined, ownerFilter, query)}>
                {isRu ? "Все направления" : "All queues"}
              </FilterPill>
              <FilterPill active={queueFilter === "tech"} href={supportFilterHref(locale, statusFilter, "tech", ownerFilter, query)}>
                {isRu ? "Техподдержка" : "Technical support"}
              </FilterPill>
              <FilterPill active={queueFilter === "sales"} href={supportFilterHref(locale, statusFilter, "sales", ownerFilter, query)}>
                {isRu ? "Отдел продаж" : "Sales"}
              </FilterPill>
              <FilterPill active={queueFilter === "unassigned"} href={supportFilterHref(locale, statusFilter, "unassigned", ownerFilter, query)}>
                {isRu ? "Без ответственного" : "Unassigned"}
              </FilterPill>
              <FilterPill active={ownerFilter === "mine"} href={supportFilterHref(locale, statusFilter, queueFilter, "mine", query)}>
                {isRu ? "Мои обращения" : "My threads"}
              </FilterPill>
            </div>

            {threads.length ? (
              <div className="grid gap-5">
                {threads.map((thread) => {
                  const messages = [...thread.messages].reverse();
                  const approvedKycApplication = thread.user.kycApplications.find((application) => application.status === KycStatus.APPROVED);
                  const accessRecoveryDocumentLinks = approvedKycApplication
                    ? kycDocumentLinkItems(approvedKycApplication.id, readKycDocuments(approvedKycApplication.documents), locale)
                    : [];
                  const replyFormId = `support-reply-form-${thread.id}`;

                  return (
                    <article key={thread.id} className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <p className="text-14 font-medium uppercase text-qidra-accent">{thread.subject || (isRu ? "Обращение участника" : "Participant request")}</p>
                          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">
                            {thread.user.name || thread.user.email}
                          </h2>
                          <p className="mt-1 text-14 text-qidra-grayBlue">{thread.user.email}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <ButtonLink href={withLocale(`/admin/users/${thread.user.id}?view=overview`, locale)} variant="outline" size="sm">
                              {isRu ? "Открыть досье клиента" : "Open client dossier"}
                            </ButtonLink>
                            <ButtonLink href={withLocale(`/admin/users/${thread.user.id}?view=support`, locale)} variant="outline" size="sm">
                              {isRu ? "История чатов" : "Chat history"}
                            </ButtonLink>
                          </div>
                          <p className="mt-3 text-14 text-qidra-grayBlue">
                            {isRu ? "Статус" : "Status"}: {supportStatusLabel(thread.status, locale)} · {isRu ? "Ответственный" : "Owner"}:{" "}
                            {thread.assignedTo ? thread.assignedTo.name || thread.assignedTo.email : isRu ? "не назначен" : "unassigned"}
                          </p>
                          <p className="mt-2 text-14 font-medium text-qidra-dark">
                            {isRu ? "Направление" : "Department"}: {supportQueueLabel(thread.queue, locale)}
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
                          kycDocumentLinks={accessRecoveryDocumentLinks}
                          locale={locale}
                        />
                      </details>

                      <FeedbackForm
                        className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
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
                          label={isRu ? "Направление" : "Department"}
                          name="queue"
                          defaultValue={thread.queue}
                          options={[
                            { value: SupportQueue.TECH_SUPPORT, label: isRu ? "Техподдержка" : "Technical support" },
                            { value: SupportQueue.SALES, label: isRu ? "Отдел продаж / проекты" : "Sales / projects" }
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
                        className="grid gap-5 border-t border-qidra-grayLight pt-6"
                        endpoint={`/api/admin/support/${thread.id}/messages?lang=${locale}`}
                        feedback={{
                          title: isRu ? "Ответ отправлен" : "Reply sent",
                          text: isRu ? "Диалог обновлён и сохранён в журнале действий." : "The thread was updated and recorded in the audit log.",
                          buttonLabel: isRu ? "Понятно" : "Got it",
                          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                          tone: "success"
                        }}
                        formId={replyFormId}
                        reloadOnSuccess
                        resetOnSubmit
                      >
                        <input name="action" type="hidden" value="reply" />
                        <QuickReplyTemplates locale={locale} textareaId={`support-reply-${thread.id}`} />
                        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                          {isRu ? "Ответ участнику" : "Reply to participant"}
                          <textarea
                            id={`support-reply-${thread.id}`}
                            className="min-h-56 w-full resize-y rounded-qidra border border-transparent bg-qidra-grayLight px-5 py-4 text-16 leading-relaxed outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
                            form={replyFormId}
                            maxLength={3000}
                            name="body"
                            placeholder={isRu ? "Напишите полный ответ участнику. Можно использовать шаблон выше или ввести текст вручную." : "Write a full reply to the participant. You can use a template above or type a custom answer."}
                            required
                          />
                        </label>
                        <div className="flex justify-end">
                          <Button className="w-full sm:w-fit" form={replyFormId} name="action" type="submit" value="reply">
                            {isRu ? "Отправить ответ участнику" : "Send reply to participant"}
                          </Button>
                        </div>
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

function BroadcastNotificationPanel({ locale }: { locale: "ru" | "en" }) {
  const isRu = locale === "ru";

  return (
    <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Рассылка в личные кабинеты" : "Participant account broadcast"}</h2>
        <p className="mt-2 max-w-3xl text-16 text-qidra-grayBlue">
          {isRu
            ? "Администратор может отправить уведомление всем участникам или одному участнику по email. Сообщение появится в колокольчике и сохранится в журнале действий."
            : "An administrator can send a notification to all participants or to one participant by email. The message appears in the bell and is recorded in the audit log."}
        </p>
      </div>
      <FeedbackForm
        className="mt-6 grid gap-4 lg:grid-cols-2"
        endpoint={`/api/admin/notifications?lang=${locale}`}
        feedback={{
          title: isRu ? "Рассылка отправлена" : "Broadcast sent",
          text: isRu ? "Сообщение добавлено в личные кабинеты участников." : "The message was added to participant accounts.",
          buttonLabel: isRu ? "Понятно" : "Got it",
          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
          tone: "success"
        }}
        refreshOnSuccess
        resetOnSubmit
      >
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Получатели" : "Recipients"}
          <select
            className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors focus:border-qidra-accent"
            defaultValue="all_participants"
            name="scope"
          >
            <option value="all_participants">{isRu ? "Все участники" : "All participants"}</option>
            <option value="single_user">{isRu ? "Один участник по email" : "Single participant by email"}</option>
          </select>
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          Email
          <input
            className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            name="recipientEmail"
            placeholder={isRu ? "Заполните только для одного участника" : "Fill only for a single participant"}
            type="email"
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Заголовок RU" : "Title RU"}
          <input
            className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            maxLength={140}
            name="titleRu"
            placeholder={isRu ? "Например: обновление по платформе" : "For example: platform update"}
            required
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Заголовок EN" : "Title EN"}
          <input
            className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            maxLength={140}
            name="titleEn"
            placeholder={isRu ? "Можно оставить пустым" : "Optional"}
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark lg:col-span-2">
          {isRu ? "Текст RU" : "Message RU"}
          <textarea
            className="min-h-28 rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            maxLength={3000}
            name="bodyRu"
            placeholder={isRu ? "Текст уведомления для личного кабинета" : "Notification text for the account"}
            required
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark lg:col-span-2">
          {isRu ? "Текст EN" : "Message EN"}
          <textarea
            className="min-h-24 rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            maxLength={3000}
            name="bodyEn"
            placeholder={isRu ? "Можно оставить пустым" : "Optional"}
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Ссылка внутри кабинета" : "Account link"}
          <input
            className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            name="href"
            placeholder="/investor/support"
          />
        </label>
        <div className="flex items-end">
          <Button type="submit">{isRu ? "Отправить уведомление" : "Send notification"}</Button>
        </div>
      </FeedbackForm>
    </section>
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

function SupportSearchForm({
  locale,
  ownerFilter,
  query,
  queueFilter,
  statusFilter
}: {
  locale: "ru" | "en";
  ownerFilter?: SupportOwnerFilter;
  query: string;
  queueFilter?: SupportQueueFilter;
  statusFilter?: SupportThreadStatus;
}) {
  const isRu = locale === "ru";
  const resetHref = supportFilterHref(locale, statusFilter, queueFilter, ownerFilter);

  return (
    <form action="/admin/support" className="grid gap-4 rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] md:grid-cols-[1fr_auto_auto] md:items-end">
      <input name="lang" type="hidden" value={locale} />
      {statusFilter ? <input name="status" type="hidden" value={statusFilter.toLowerCase()} /> : null}
      {queueFilter ? <input name="queue" type="hidden" value={queueFilter} /> : null}
      {ownerFilter ? <input name="owner" type="hidden" value={ownerFilter} /> : null}
      <label className="grid gap-2 text-14 font-medium text-qidra-dark">
        {isRu ? "Поиск обращения или клиента" : "Search request or client"}
        <input
          className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
          defaultValue={query}
          name="q"
          placeholder={isRu ? "Email, имя, тема или текст сообщения" : "Email, name, subject or message text"}
          type="search"
        />
      </label>
      <Button type="submit">{isRu ? "Найти" : "Search"}</Button>
      <ButtonLink href={resetHref} variant="outline">
        {isRu ? "Сбросить" : "Reset"}
      </ButtonLink>
    </form>
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

type SupportQueueFilter = "sales" | "tech" | "unassigned";
type SupportOwnerFilter = "mine";

function parseSupportQueue(value: string | undefined): SupportQueueFilter | undefined {
  if (value === "sales" || value === "tech" || value === "unassigned") return value;
  return undefined;
}

function parseOwnerFilter(value: string | undefined): SupportOwnerFilter | undefined {
  return value === "mine" ? "mine" : undefined;
}

function buildSupportWhere({
  ownerFilter,
  query,
  queueFilter,
  sessionRole,
  sessionUserId,
  statusFilter
}: {
  ownerFilter?: SupportOwnerFilter;
  query: string;
  queueFilter?: SupportQueueFilter;
  sessionRole?: string;
  sessionUserId?: string;
  statusFilter?: SupportThreadStatus;
}) {
  const and: Prisma.SupportThreadWhereInput[] = [];

  if (statusFilter) {
    and.push({ status: statusFilter });
  }

  if (query) {
    const contains = { contains: query, mode: Prisma.QueryMode.insensitive };

    and.push({
      OR: [
        { id: contains },
        { subject: contains },
        { user: { is: { email: contains } } },
        { user: { is: { name: contains } } },
        { messages: { some: { body: contains } } }
      ]
    });
  }

  if (queueFilter === "tech") {
    and.push({ queue: SupportQueue.TECH_SUPPORT });
  }

  if (queueFilter === "sales") {
    and.push({ queue: SupportQueue.SALES });
  }

  if (queueFilter === "unassigned") {
    and.push({ assignedToId: null });
  }

  if (ownerFilter === "mine" && sessionUserId) {
    and.push({ assignedToId: sessionUserId });
  }

  if (sessionRole === Role.TECH_SUPPORT && sessionUserId) {
    and.push({
      OR: [{ assignedToId: sessionUserId }, { queue: SupportQueue.TECH_SUPPORT }]
    });
  }

  if (sessionRole === Role.SALES_MANAGER && sessionUserId) {
    and.push({
      OR: [{ assignedToId: sessionUserId }, { queue: SupportQueue.SALES }]
    });
  }

  return and.length ? { AND: and } : {};
}

function supportFilterHref(locale: "ru" | "en", status?: SupportThreadStatus, queue?: SupportQueueFilter, owner?: SupportOwnerFilter, query?: string) {
  const params = new URLSearchParams({ lang: locale });

  if (status) params.set("status", status.toLowerCase());
  if (queue) params.set("queue", queue);
  if (owner) params.set("owner", owner);
  if (query) params.set("q", query);
  return `/admin/support?${params.toString()}`;
}

function kycDocumentLinkItems(applicationId: string, documents: ReturnType<typeof readKycDocuments>, locale: "ru" | "en") {
  return [
    {
      href: `/api/admin/kyc/${applicationId}/documents/identityDocument?lang=${locale}`,
      label: locale === "ru" ? "Документ личности" : "Identity document",
      name: documents.identityDocument?.name
    },
    {
      href: `/api/admin/kyc/${applicationId}/documents/addressProof?lang=${locale}`,
      label: locale === "ru" ? "Подтверждение адреса" : "Address proof",
      name: documents.addressProof?.name
    }
  ].filter((item): item is { href: string; label: string; name: string } => Boolean(item.name));
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

function supportQueueLabel(queue: string, locale: "ru" | "en") {
  if (queue === SupportQueue.SALES) return locale === "ru" ? "Отдел продаж / проекты" : "Sales / projects";
  return locale === "ru" ? "Техподдержка" : "Technical support";
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
