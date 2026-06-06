import Link from "next/link";
import { notFound } from "next/navigation";
import { InvestmentStatus, KycStatus, PaymentStatus, Role, SupportThreadStatus, TransactionType } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { UserAvatar } from "@/components/UserAvatar";
import { AccessRecoveryForm } from "@/components/admin/AccessRecoveryForm";
import { RoleManagementForm } from "@/components/admin/RoleManagementForm";
import { UserBlockForm } from "@/components/admin/UserBlockForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAdmin } from "@/lib/access";
import { canAccessSupportDesk, canManageManagers } from "@/lib/auth";
import { countryName } from "@/lib/countries";
import { getLocale, t, type Locale, type SearchParams, withLocale } from "@/lib/i18n";
import { readKycDocuments, type KycDocumentKind } from "@/lib/kyc-documents";
import { prisma } from "@/lib/prisma";
import { projectSubmissionStatusLabel } from "@/lib/project-submission-status";
import { userBlockMode } from "@/lib/user-access";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams?: SearchParams;
}) {
  const [{ userId }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = await requireAdmin(locale, `/admin/users/${userId}`);
  const isRu = locale === "ru";
  const view = parseDossierView(searchParamString(searchParams?.view));
  const canAdjustBalance = session.user?.role === Role.SUPER_ADMIN;
  const canManageBlock = session.user?.role === Role.SUPER_ADMIN;
  const canManageRoles = canManageManagers(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined);
  const canSendAccessRecovery = canAccessSupportDesk(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      accounts: {
        select: {
          provider: true,
          type: true
        }
      },
      investorProfile: true,
      investments: {
        include: {
          project: true
        },
        orderBy: { createdAt: "desc" },
        take: 12
      },
      kycApplications: {
        orderBy: { createdAt: "desc" },
        take: 8
      },
      projectSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 8
      },
      supportThreads: {
        include: {
          assignedTo: {
            select: {
              email: true,
              name: true,
              role: true
            }
          },
          messages: {
            include: {
              sender: {
                select: {
                  email: true,
                  name: true,
                  role: true
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 4
          }
        },
        orderBy: { updatedAt: "desc" },
        take: 6
      },
      wallet: {
        include: {
          transactions: {
            include: {
              paymentReview: {
                include: {
                  reviewer: {
                    select: {
                      email: true,
                      name: true,
                      role: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: "desc" },
            take: 12
          }
        }
      },
      _count: {
        select: {
          accounts: true,
          investments: true,
          kycApplications: true,
          projectSubmissions: true,
          sessions: true,
          supportThreads: true
        }
      }
    }
  });

  if (!user) {
    notFound();
  }

  const entityIds = [
    user.id,
    ...user.kycApplications.map((item) => item.id),
    ...user.investments.map((item) => item.id),
    ...user.projectSubmissions.map((item) => item.id),
    ...(user.wallet?.transactions.map((item) => item.id) ?? []),
    ...user.supportThreads.map((item) => item.id)
  ];
  const auditLogs = await prisma.adminAuditLog.findMany({
    where: {
      OR: [{ actorId: user.id }, { entityId: { in: entityIds } }]
    },
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
    take: 14
  });
  const latestKyc = user.kycApplications[0];
  const displayName = user.name || user.email;
  const wallet = user.wallet;
  const adjustmentEndpoint = `/api/admin/users/${user.id}/adjustments?lang=${locale}`;
  const blockEndpoint = `/api/admin/users/${user.id}/block?lang=${locale}`;
  const roleEndpoint = `/api/admin/users/${user.id}/role?lang=${locale}`;
  const accessRecoveryEndpoint = `/api/admin/users/${user.id}/password-reset?lang=${locale}`;
  const pendingPaymentTransactions =
    wallet?.transactions.filter((transaction) => transaction.status === PaymentStatus.PENDING && (transaction.type === TransactionType.DEPOSIT || transaction.type === TransactionType.WITHDRAWAL)) ?? [];
  const hasApprovedKyc = user.kycApplications.some((application) => application.status === KycStatus.APPROVED);
  const approvedKycApplication = user.kycApplications.find((application) => application.status === KycStatus.APPROVED);
  const accessRecoveryDocumentLinks = approvedKycApplication
    ? kycDocumentLinkItems(approvedKycApplication.id, readKycDocuments(approvedKycApplication.documents), locale)
    : [];

  return (
    <>
      <Header locale={locale} path={`/admin/users/${user.id}`} />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: isRu ? "Пользователи" : "Users", href: withLocale("/admin/users", locale) },
                { label: displayName }
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
                <UserAvatar name={displayName} />
                <div className="min-w-0">
                  <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Карточка клиента" : "Client card"}</p>
                  <h1 className="mt-3 break-words title-48 text-qidra-dark">{displayName}</h1>
                  <p className="mt-3 break-all text-18 text-qidra-grayBlue">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={withLocale("/admin/users", locale)} size="sm" variant="outline">
                  {isRu ? "Все пользователи" : "All users"}
                </ButtonLink>
                <ButtonLink href={withLocale("/admin/support", locale)} size="sm">
                  {isRu ? "Коммуникации" : "Communications"}
                </ButtonLink>
              </div>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
              <MetricCard label={isRu ? "Роль" : "Role"} value={roleLabel(user.role, locale)} />
              <MetricCard label={isRu ? "Доступ" : "Access"} value={accessStatusLabel(user, locale)} tone={userBlockMode(user) === "active" ? "success" : "danger"} />
              <MetricCard label={isRu ? "Email" : "Email"} value={user.emailVerified ? (isRu ? "Подтверждён" : "Verified") : isRu ? "Не подтверждён" : "Not verified"} tone={user.emailVerified ? "success" : "warning"} />
              <MetricCard label="KYC" value={kycStatusLabel(latestKyc?.status, locale)} tone={latestKyc?.status === KycStatus.APPROVED ? "success" : latestKyc?.status === KycStatus.REJECTED ? "danger" : "warning"} />
              <MetricCard label={isRu ? "Доступный баланс" : "Available balance"} value={formatUsdt(wallet?.availableUsdt ?? 0)} tone="accent" />
              <MetricCard label={isRu ? "Заявки участия" : "Applications"} value={formatCount(user._count.investments)} />
              <MetricCard label={isRu ? "Свои проекты" : "Own projects"} value={formatCount(user._count.projectSubmissions)} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/users" locale={locale} />
            <DossierTabs activeView={view} locale={locale} userId={user.id} />

            {view === "overview" ? (
            <div className="grid gap-8 xl:grid-cols-[0.82fr_1.18fr]">
              <section className="grid content-start gap-6">
                <Panel title={isRu ? "Профиль участника" : "Participant profile"} description={isRu ? "Основные данные, которые участник отправляет для проверки." : "Core data submitted by the participant for review."}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoBlock label={isRu ? "Телефон" : "Phone"} value={formatPhone(user.investorProfile?.phoneDialCode, user.investorProfile?.phone)} locale={locale} />
                    <InfoBlock label={isRu ? "Дата рождения" : "Date of birth"} value={user.investorProfile?.dateOfBirth ? formatDate(user.investorProfile.dateOfBirth, locale) : null} locale={locale} />
                    <InfoBlock label={isRu ? "Страна" : "Country"} value={countryName(user.investorProfile?.country, locale)} locale={locale} />
                    <InfoBlock label={isRu ? "Город" : "City"} value={user.investorProfile?.city} locale={locale} />
                    <InfoBlock label={isRu ? "Гражданство" : "Citizenship"} value={countryName(user.investorProfile?.citizenship, locale)} locale={locale} />
                    <InfoBlock label={isRu ? "Адрес" : "Address"} value={user.investorProfile?.address} locale={locale} />
                  </div>
                </Panel>

                <Panel title={isRu ? "Доступ и авторизация" : "Access and authentication"} description={isRu ? "Роль, провайдеры входа и активные сессии." : "Role, sign-in providers and active sessions."}>
                  <div className="grid gap-4">
                    <InfoBlock label={isRu ? "Роль доступа" : "Access role"} value={roleLabel(user.role, locale)} locale={locale} />
                    <InfoBlock label={isRu ? "Статус доступа" : "Access status"} value={accessStatusLabel(user, locale)} locale={locale} />
                    <InfoBlock label={isRu ? "Дата регистрации" : "Registration date"} value={formatDateTime(user.createdAt, locale)} locale={locale} />
                    <InfoBlock label={isRu ? "Провайдеры входа" : "Sign-in providers"} value={authProviders(user.accounts, locale)} locale={locale} />
                    <InfoBlock label={isRu ? "Активные сессии" : "Active sessions"} value={formatCount(user._count.sessions)} locale={locale} />
                  </div>
                  {canManageRoles && user.id !== session.user?.id ? (
                    <div className="mt-5">
                      <RoleManagementForm currentRole={user.role} endpoint={roleEndpoint} locale={locale} />
                    </div>
                  ) : (
                    <NotificationCard
                      title={user.id === session.user?.id ? (isRu ? "Это ваш аккаунт" : "This is your account") : isRu ? "Роль только для просмотра" : "Role is view-only"}
                      text={
                        user.id === session.user?.id
                          ? isRu
                            ? "Изменение собственной роли заблокировано, чтобы не потерять административный доступ."
                            : "Changing your own role is blocked to avoid losing administrator access."
                          : isRu
                            ? "Назначать роли менеджеров и администраторов может только главный администратор."
                            : "Only a super administrator can assign manager and administrator roles."
                      }
                    />
                  )}
                  {canSendAccessRecovery ? (
                    <AccessRecoveryForm endpoint={accessRecoveryEndpoint} hasApprovedKyc={hasApprovedKyc} kycDocumentLinks={accessRecoveryDocumentLinks} locale={locale} />
                  ) : null}
                  <UserBlockForm canManageBlock={canManageBlock} endpoint={blockEndpoint} isOwnAccount={user.id === session.user?.id} locale={locale} user={user} />
                </Panel>
              </section>

              <section className="grid content-start gap-6">
                <Panel title={isRu ? "KYC и решения" : "KYC and decisions"} description={isRu ? "История анкет, статусов и комментариев проверяющих." : "History of profiles, statuses and reviewer notes."}>
                  {user.kycApplications.length ? (
                    <div className="grid gap-3">
                      {user.kycApplications.map((item) => (
                        <TimelineItem
                          key={item.id}
                          title={kycStatusLabel(item.status, locale)}
                          meta={`${formatDateTime(item.createdAt, locale)} · ${item.occupation || (isRu ? "профессия не указана" : "occupation not provided")}`}
                          tone={item.status === KycStatus.APPROVED ? "success" : item.status === KycStatus.REJECTED ? "danger" : "warning"}
                        >
                          <p className="text-14 text-qidra-grayBlue">
                            {isRu ? "Источник средств" : "Source of funds"}: {sourceLabel(item.sourceOfFunds, locale)}
                          </p>
                          {item.reviewerNote ? <p className="mt-2 text-14 text-qidra-grayBlue">{item.reviewerNote}</p> : null}
                          <KycDocumentLinks applicationId={item.id} documents={readKycDocuments(item.documents)} locale={locale} />
                        </TimelineItem>
                      ))}
                    </div>
                  ) : (
                    <NotificationCard title={isRu ? "Анкета не отправлена" : "KYC not submitted"} text={isRu ? "Участник пока не отправил профиль на проверку." : "The participant has not submitted a profile for review yet."} />
                  )}
                </Panel>

                <Panel title={isRu ? "Кошелёк и операции" : "Wallet and operations"} description={isRu ? "Баланс, личный адрес и последние операции." : "Balance, personal address and recent operations."}>
                  <div className="grid gap-4 md:grid-cols-3">
                    <InfoBlock label={isRu ? "Доступно" : "Available"} value={formatUsdt(wallet?.availableUsdt ?? 0)} locale={locale} />
                    <InfoBlock label={isRu ? "Зарезервировано" : "Reserved"} value={formatUsdt(wallet?.reservedUsdt ?? 0)} locale={locale} />
                    <InfoBlock label={isRu ? "На проверке" : "Pending"} value={formatUsdt(wallet?.pendingUsdt ?? 0)} locale={locale} />
                  </div>
                  <InfoBlock label={isRu ? "Личный USDT TRC20 адрес" : "Personal USDT TRC20 address"} value={wallet?.trc20Address} locale={locale} compact />
                  {wallet?.transactions.length ? (
                    <div className="grid gap-3">
                      {wallet.transactions.map((transaction) => (
                        <TimelineItem
                          key={transaction.id}
                          title={transactionTitle(transaction.type, locale)}
                          meta={transactionMeta(transaction.createdAt, transaction.status, transaction.txHash ?? transaction.destinationAddress, locale)}
                          tone={paymentTone(transaction.status, transaction.type)}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-14 text-qidra-grayBlue">{transaction.note || (isRu ? "Без комментария" : "No note")}</p>
                            <strong className="text-16 text-qidra-dark">{transactionAmount(transaction.type, transaction.amountUsdt)}</strong>
                          </div>
                          {transaction.paymentReview?.reviewer ? (
                            <p className="mt-2 text-12 text-qidra-grayBlue">
                              {isRu ? "Проверил" : "Reviewed by"}: {transaction.paymentReview.reviewer.name || transaction.paymentReview.reviewer.email}
                            </p>
                          ) : null}
                        </TimelineItem>
                      ))}
                    </div>
                  ) : (
                    <NotificationCard title={isRu ? "Операций нет" : "No operations"} text={isRu ? "Пополнения, выводы и участия появятся здесь после действий участника." : "Deposits, withdrawals and participations will appear here after participant actions."} />
                  )}
                </Panel>
              </section>
            </div>
            ) : null}

            {view === "kyc" ? (
              <Panel
                title={isRu ? "KYC, документы и восстановление доступа" : "KYC, documents and access recovery"}
                description={
                  isRu
                    ? "Здесь сотрудник сверяет первичные документы клиента, историю анкет и принимает решение по восстановлению доступа."
                    : "Staff can review original client documents, profile history and access recovery decisions here."
                }
              >
                {user.kycApplications.length ? (
                  <div className="grid gap-3">
                    {user.kycApplications.map((item) => (
                      <TimelineItem
                        key={item.id}
                        title={kycStatusLabel(item.status, locale)}
                        meta={`${formatDateTime(item.createdAt, locale)} · ${item.occupation || (isRu ? "профессия не указана" : "occupation not provided")}`}
                        tone={item.status === KycStatus.APPROVED ? "success" : item.status === KycStatus.REJECTED ? "danger" : "warning"}
                      >
                        <p className="text-14 text-qidra-grayBlue">
                          {isRu ? "Источник средств" : "Source of funds"}: {sourceLabel(item.sourceOfFunds, locale)}
                        </p>
                        {item.reviewerNote ? <p className="mt-2 text-14 text-qidra-grayBlue">{item.reviewerNote}</p> : null}
                        <KycDocumentLinks applicationId={item.id} documents={readKycDocuments(item.documents)} locale={locale} />
                      </TimelineItem>
                    ))}
                  </div>
                ) : (
                  <NotificationCard title={isRu ? "Анкета не отправлена" : "KYC not submitted"} text={isRu ? "Участник пока не отправил профиль на проверку." : "The participant has not submitted a profile for review yet."} />
                )}
                {canSendAccessRecovery ? (
                  <AccessRecoveryForm endpoint={accessRecoveryEndpoint} hasApprovedKyc={hasApprovedKyc} kycDocumentLinks={accessRecoveryDocumentLinks} locale={locale} />
                ) : null}
              </Panel>
            ) : null}

            {view === "overview" || view === "kyc" || view === "wallet" ? (
            <SafeAdjustmentsPanel
              canAdjustBalance={canAdjustBalance}
              endpoint={adjustmentEndpoint}
              kycApplications={user.kycApplications.map((application) => ({
                createdAt: application.createdAt,
                id: application.id,
                status: application.status
              }))}
              locale={locale}
              pendingPaymentTransactions={pendingPaymentTransactions.map((transaction) => ({
                amountUsdt: transaction.amountUsdt,
                createdAt: transaction.createdAt,
                id: transaction.id,
                reference: transaction.txHash ?? transaction.destinationAddress,
                type: transaction.type
              }))}
              walletAvailable={wallet?.availableUsdt}
            />
            ) : null}

            {view === "contracts" ? (
            <Panel title={isRu ? "Заявки на участие" : "Participation applications"} description={isRu ? "Все последние заявки участника по проектам." : "Recent participant applications across projects."}>
              {user.investments.length ? (
                <div className="overflow-x-auto rounded-qidra border border-qidra-grayLight bg-white">
                  <table className="w-full min-w-[900px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-qidra-grayLight text-14 font-medium text-qidra-grayBlue">
                        <th className="px-4 py-3">{isRu ? "Дата" : "Date"}</th>
                        <th className="px-4 py-3">{isRu ? "Проект" : "Project"}</th>
                        <th className="px-4 py-3">{isRu ? "Сумма" : "Amount"}</th>
                        <th className="px-4 py-3">{isRu ? "Резерв" : "Reserve"}</th>
                        <th className="px-4 py-3">{isRu ? "Статус" : "Status"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {user.investments.map((item) => (
                        <tr key={item.id} className="border-b border-qidra-grayLight last:border-b-0">
                          <td className="px-4 py-4 text-14 text-qidra-grayBlue">{formatDateTime(item.createdAt, locale)}</td>
                          <td className="px-4 py-4">
                            <Link className="text-16 font-medium text-qidra-dark hover:text-qidra-accent" href={withLocale(`/projects/${item.project.slug}`, locale)}>
                              {isRu ? item.project.titleRu : item.project.titleEn}
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-16 font-medium text-qidra-dark">{formatUsdt(item.amountUsdt)}</td>
                          <td className="px-4 py-4 text-16 text-qidra-grayBlue">{formatUsdt(item.reservedUsdt)}</td>
                          <td className="px-4 py-4">
                            <StatusPill label={investmentStatusLabel(item.status, locale)} tone={investmentTone(item.status)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <NotificationCard title={isRu ? "Заявок нет" : "No applications"} text={isRu ? "Участник ещё не подавал заявки на проекты." : "The participant has not applied to projects yet."} />
              )}
            </Panel>
            ) : null}

            {view === "projects" ? (
            <Panel title={isRu ? "Проекты клиента" : "Client projects"} description={isRu ? "Заявки участника на размещение собственных проектов." : "Participant submissions for listing their own projects."}>
              {user.projectSubmissions.length ? (
                <div className="grid gap-3">
                  {user.projectSubmissions.map((submission) => (
                    <TimelineItem
                      key={submission.id}
                      title={submission.title}
                      meta={`${formatDateTime(submission.createdAt, locale)} · ${projectSubmissionStatusLabel(submission.status, locale)}`}
                      tone={submission.status === "APPROVED" ? "success" : submission.status === "REJECTED" ? "danger" : "warning"}
                    >
                      <div className="grid gap-2 text-14 text-qidra-grayBlue md:grid-cols-2">
                        <p>{isRu ? "Отрасль" : "Sector"}: {submission.sector || (isRu ? "не указана" : "not set")}</p>
                        <p>{isRu ? "Локация" : "Location"}: {submission.location || (isRu ? "не указана" : "not set")}</p>
                        <p>{isRu ? "Структура" : "Structure"}: {submission.structure || (isRu ? "на проверке" : "to review")}</p>
                        <p>{isRu ? "Цель" : "Target"}: {submission.targetUsdt ? formatUsdt(submission.targetUsdt) : isRu ? "не указана" : "not set"}</p>
                      </div>
                      <p className="mt-3 text-14 text-qidra-grayBlue">{submission.summary}</p>
                    </TimelineItem>
                  ))}
                </div>
              ) : (
                <NotificationCard title={isRu ? "Проектов нет" : "No projects"} text={isRu ? "Участник ещё не отправлял свой проект на размещение." : "The participant has not submitted a project listing yet."} />
              )}
            </Panel>
            ) : null}

            {view === "support" ? (
              <Panel title={isRu ? "Коммуникации" : "Communications"} description={isRu ? "Последние личные диалоги с участником." : "Recent personal threads with the participant."}>
                {user.supportThreads.length ? (
                  <div className="grid gap-4">
                    {user.supportThreads.map((thread) => (
                      <article key={thread.id} className="rounded-qidra border border-qidra-grayLight bg-white p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-16 font-medium text-qidra-dark">{thread.subject || (isRu ? "Обращение участника" : "Participant request")}</p>
                            <p className="mt-1 text-12 text-qidra-grayBlue">
                              {isRu ? "Ответственный" : "Owner"}: {thread.assignedTo ? thread.assignedTo.name || thread.assignedTo.email : isRu ? "не назначен" : "unassigned"}
                            </p>
                          </div>
                          <StatusPill label={supportStatusLabel(thread.status, locale)} tone={supportTone(thread.status)} />
                        </div>
                        <div className="mt-4 grid gap-2">
                          {[...thread.messages].reverse().map((message) => (
                            <div key={message.id} className="rounded-qidra bg-qidra-grayLight p-3">
                              <p className="text-12 font-medium text-qidra-dark">
                                {message.sender ? message.sender.name || message.sender.email : "Qidra"} · {formatDateTime(message.createdAt, locale)}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-14 text-qidra-grayBlue">{message.body}</p>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <NotificationCard title={isRu ? "Диалогов нет" : "No threads"} text={isRu ? "Участник пока не писал в поддержку." : "The participant has not contacted support yet."} />
                )}
              </Panel>
            ) : null}

            {view === "audit" ? (
              <Panel title={isRu ? "Журнал по клиенту" : "Client audit"} description={isRu ? "Последние события, связанные с этим клиентом и его объектами." : "Recent events linked to this client and their records."}>
                {auditLogs.length ? (
                  <div className="grid gap-3">
                    {auditLogs.map((log) => (
                      <TimelineItem key={log.id} title={auditActionLabel(log.action, locale)} meta={`${formatDateTime(log.createdAt, locale)} · ${entityLabel(log.entityType, locale)}`} tone="neutral">
                        <p className="text-14 text-qidra-grayBlue">
                          {isRu ? "Инициатор" : "Actor"}: {log.actor ? log.actor.name || log.actor.email : isRu ? "Система" : "System"}
                        </p>
                        <p className="mt-1 break-all text-12 text-qidra-grayBlue">{log.entityId || "-"}</p>
                      </TimelineItem>
                    ))}
                  </div>
                ) : (
                  <NotificationCard title={isRu ? "Событий нет" : "No events"} text={isRu ? "Связанные события появятся после решений по KYC, платежам, заявкам или чату." : "Related events will appear after KYC, payment, application or chat decisions."} />
                )}
              </Panel>
            ) : null}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function SafeAdjustmentsPanel({
  canAdjustBalance,
  endpoint,
  kycApplications,
  locale,
  pendingPaymentTransactions,
  walletAvailable
}: {
  canAdjustBalance: boolean;
  endpoint: string;
  kycApplications: { createdAt: Date; id: string; status: KycStatus }[];
  locale: Locale;
  pendingPaymentTransactions: { amountUsdt: { toString(): string }; createdAt: Date; id: string; reference: string | null; type: TransactionType }[];
  walletAvailable?: { toString(): string };
}) {
  const isRu = locale === "ru";

  return (
    <Panel
      title={isRu ? "Безопасные корректировки" : "Safe adjustments"}
      description={
        isRu
          ? "Баланс, KYC и спорные платежи меняются только с причиной, ручным подтверждением и записью в журнал действий."
          : "Balance, KYC and disputed payment changes require a reason, manual confirmation and an audit entry."
      }
    >
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
          <div>
            <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Корректировка баланса" : "Balance adjustment"}</p>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {isRu ? `Доступно сейчас: ${formatUsdt(walletAvailable ?? 0)}` : `Current available: ${formatUsdt(walletAvailable ?? 0)}`}
            </p>
          </div>
          {canAdjustBalance ? (
            <FeedbackForm
              className="grid gap-3"
              endpoint={endpoint}
              feedback={{
                title: isRu ? "Баланс обновлён" : "Balance updated",
                text: isRu ? "Корректировка сохранена в карточке и журнале действий." : "The adjustment was saved in the client card and audit log.",
                buttonLabel: isRu ? "Понятно" : "Got it",
                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              popupPlacement="center"
              reloadOnSuccess
            >
              <input name="kind" type="hidden" value="balance" />
              <Select
                label={isRu ? "Действие" : "Action"}
                name="direction"
                options={[
                  { label: isRu ? "Увеличить доступный баланс" : "Increase available balance", value: "credit" },
                  { label: isRu ? "Уменьшить доступный баланс" : "Decrease available balance", value: "debit" }
                ]}
                required
              />
              <Input label={isRu ? "Сумма USDT" : "USDT amount"} min="0.000001" name="amountUsdt" placeholder="100" required step="0.000001" type="number" />
              <ReasonField
                label={isRu ? "Причина корректировки" : "Adjustment reason"}
                locale={locale}
                name="reason"
                placeholder={isRu ? "Например: исправление ошибочного ручного начисления после проверки документов" : "For example: correcting an erroneous manual credit after document review"}
              />
              <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
              <Button type="submit">{isRu ? "Сохранить корректировку" : "Save adjustment"}</Button>
            </FeedbackForm>
          ) : (
            <NotificationCard
              title={isRu ? "Только главный администратор" : "Super administrator only"}
              text={
                isRu
                  ? "Прямое изменение доступного баланса отключено для обычного администратора."
                  : "Direct available balance changes are disabled for regular administrators."
              }
            />
          )}
        </div>

        <div className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
          <div>
            <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Статус KYC" : "KYC status"}</p>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {isRu ? "Исправление статуса анкеты с обязательной причиной." : "Profile status correction with a required reason."}
            </p>
          </div>
          {kycApplications.length ? (
            <FeedbackForm
              className="grid gap-3"
              endpoint={endpoint}
              feedback={{
                title: isRu ? "Статус KYC обновлён" : "KYC status updated",
                text: isRu ? "Изменение сохранено и записано в журнал действий." : "The change was saved and written to the audit log.",
                buttonLabel: isRu ? "Понятно" : "Got it",
                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              popupPlacement="center"
              reloadOnSuccess
            >
              <input name="kind" type="hidden" value="kyc_status" />
              <Select
                label={isRu ? "Анкета" : "Profile"}
                name="applicationId"
                options={kycApplications.map((application) => ({
                  label: `${formatDateTime(application.createdAt, locale)} · ${kycStatusLabel(application.status, locale)}`,
                  value: application.id
                }))}
                required
              />
              <Select
                label={isRu ? "Новый статус" : "New status"}
                name="status"
                options={[
                  { label: kycStatusLabel(KycStatus.APPROVED, locale), value: KycStatus.APPROVED },
                  { label: kycStatusLabel(KycStatus.SUBMITTED, locale), value: KycStatus.SUBMITTED },
                  { label: kycStatusLabel(KycStatus.REJECTED, locale), value: KycStatus.REJECTED },
                  { label: kycStatusLabel(KycStatus.DRAFT, locale), value: KycStatus.DRAFT }
                ]}
                required
              />
              <ReasonField label={isRu ? "Причина изменения" : "Reason for change"} locale={locale} name="reason" placeholder={isRu ? "Например: статус исправлен после повторной проверки документов" : "For example: status corrected after a repeated document review"} />
              <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
              <Button type="submit">{isRu ? "Обновить KYC" : "Update KYC"}</Button>
            </FeedbackForm>
          ) : (
            <NotificationCard title={isRu ? "Анкет нет" : "No profiles"} text={isRu ? "У клиента пока нет KYC-анкет для корректировки." : "The client has no KYC profiles to adjust yet."} />
          )}
        </div>

        <div className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
          <div>
            <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Отклонение спорной операции" : "Reject disputed operation"}</p>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {isRu ? "Подтверждение пополнений остаётся только через автоматическую сверку." : "Deposit confirmation remains available only through automatic reconciliation."}
            </p>
          </div>
          {pendingPaymentTransactions.length ? (
            <FeedbackForm
              className="grid gap-3"
              endpoint={endpoint}
              feedback={{
                title: isRu ? "Операция отклонена" : "Operation rejected",
                text: isRu ? "Статус изменён с причиной и записью в журнале." : "The status was changed with a reason and an audit entry.",
                buttonLabel: isRu ? "Понятно" : "Got it",
                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                tone: "warning"
              }}
              popupPlacement="center"
              reloadOnSuccess
            >
              <input name="kind" type="hidden" value="payment_reject" />
              <Select
                label={isRu ? "Операция на проверке" : "Pending operation"}
                name="transactionId"
                options={pendingPaymentTransactions.map((transaction) => ({
                  label: `${transactionTitle(transaction.type, locale)} · ${formatUsdt(transaction.amountUsdt)} · ${formatDateTime(transaction.createdAt, locale)}`,
                  value: transaction.id
                }))}
                required
              />
              <ReasonField label={isRu ? "Причина отклонения" : "Rejection reason"} locale={locale} name="reason" placeholder={isRu ? "Например: transaction hash не относится к личному адресу клиента" : "For example: transaction hash does not belong to the client's personal address"} />
              <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
              <Button type="submit" variant="outline">
                {isRu ? "Отклонить операцию" : "Reject operation"}
              </Button>
            </FeedbackForm>
          ) : (
            <NotificationCard title={isRu ? "Спорных операций нет" : "No disputed operations"} text={isRu ? "У клиента нет ожидающих пополнений или выводов." : "The client has no pending deposits or withdrawals."} />
          )}
        </div>
      </div>
    </Panel>
  );
}

function ReasonField({ label, locale, name, placeholder }: { label: string; locale: Locale; name: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {label}
      <textarea
        className="min-h-28 rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
        maxLength={600}
        minLength={12}
        name={name}
        placeholder={placeholder}
        required
      />
      <span className="text-12 text-qidra-grayBlue">{locale === "ru" ? "Минимум 12 символов. Эта причина попадёт в журнал действий." : "Minimum 12 characters. This reason will be written to the audit log."}</span>
    </label>
  );
}

type Tone = "accent" | "danger" | "neutral" | "success" | "warning";
type DossierView = "audit" | "contracts" | "kyc" | "overview" | "projects" | "support" | "wallet";

function searchParamString(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDossierView(value: string | undefined): DossierView {
  if (value === "kyc" || value === "wallet" || value === "contracts" || value === "projects" || value === "support" || value === "audit") {
    return value;
  }

  return "overview";
}

function DossierTabs({ activeView, locale, userId }: { activeView: DossierView; locale: Locale; userId: string }) {
  const tabs: { label: string; view: DossierView }[] = [
    { label: locale === "ru" ? "Обзор" : "Overview", view: "overview" },
    { label: locale === "ru" ? "KYC и документы" : "KYC and documents", view: "kyc" },
    { label: locale === "ru" ? "Кошелёк" : "Wallet", view: "wallet" },
    { label: locale === "ru" ? "Контракты" : "Contracts", view: "contracts" },
    { label: locale === "ru" ? "Проекты" : "Projects", view: "projects" },
    { label: locale === "ru" ? "Чаты" : "Chats", view: "support" },
    { label: locale === "ru" ? "Журнал" : "Audit", view: "audit" }
  ];

  return (
    <nav className="flex flex-wrap gap-2 rounded-qidra border border-qidra-grayLight bg-white p-2">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          className={`inline-flex h-11 items-center rounded-qidra px-4 text-14 font-medium transition-colors ${
            activeView === tab.view ? "bg-qidra-dark text-white" : "text-qidra-grayBlue hover:bg-qidra-grayLight hover:text-qidra-dark"
          }`}
          href={withLocale(`/admin/users/${userId}${tab.view === "overview" ? "" : `?view=${tab.view}`}`, locale)}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function kycDocumentLinkItems(applicationId: string, documents: ReturnType<typeof readKycDocuments>, locale: Locale) {
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

function Panel({ children, description, title }: { children: React.ReactNode; description?: string; title: string }) {
  return (
    <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
      <div>
        <h2 className="text-[30px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h2>
        {description ? <p className="mt-2 text-16 text-qidra-grayBlue">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, tone = "neutral", value }: { label: string; tone?: Tone; value: string }) {
  const valueClass = toneClass(tone);

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 break-words text-[26px] font-medium leading-tight tracking-[0] ${valueClass}`}>{value}</p>
    </article>
  );
}

function InfoBlock({ compact = false, label, locale, value }: { compact?: boolean; label: string; locale: Locale; value: string | number | null | undefined }) {
  return (
    <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className={`mt-2 break-words font-medium text-qidra-dark ${compact ? "text-12" : "text-16"}`}>{value || (locale === "ru" ? "Не указано" : "Not provided")}</p>
    </div>
  );
}

function TimelineItem({ children, meta, title, tone = "neutral" }: { children?: React.ReactNode; meta?: string; title: string; tone?: Tone }) {
  return (
    <article className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={`text-16 font-medium ${toneClass(tone)}`}>{title}</p>
          {meta ? <p className="mt-1 text-12 text-qidra-grayBlue">{meta}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </article>
  );
}

function KycDocumentLinks({
  applicationId,
  documents,
  locale
}: {
  applicationId: string;
  documents: ReturnType<typeof readKycDocuments>;
  locale: Locale;
}) {
  const items: { kind: KycDocumentKind; label: string; name?: string }[] = [
    {
      kind: "identityDocument",
      label: locale === "ru" ? "Документ личности" : "Identity document",
      name: documents.identityDocument?.name
    },
    {
      kind: "addressProof",
      label: locale === "ru" ? "Подтверждение адреса" : "Address proof",
      name: documents.addressProof?.name
    }
  ];
  const availableItems = items.filter((item) => item.name);

  if (!availableItems.length) return null;

  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-2">
      {availableItems.map((item) => (
        <Link
          key={item.kind}
          className="rounded-qidra border border-qidra-grayLight bg-white px-3 py-2 text-13 font-medium text-qidra-dark transition-colors hover:border-qidra-accent hover:text-qidra-accent"
          href={`/api/admin/kyc/${applicationId}/documents/${item.kind}?lang=${locale}`}
          rel="noreferrer"
          target="_blank"
        >
          <span className="block">{item.label}</span>
          <span className="mt-1 block break-words text-qidra-grayBlue">{item.name}</span>
        </Link>
      ))}
    </div>
  );
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const bgClass =
    tone === "success"
      ? "bg-qidra-green text-white"
      : tone === "danger"
        ? "bg-qidra-red text-white"
        : tone === "accent"
          ? "bg-qidra-accent text-white"
          : tone === "warning"
            ? "bg-qidra-accent8 text-qidra-dark"
            : "bg-qidra-grayLight text-qidra-grayBlue";

  return <span className={`inline-flex rounded-full px-3 py-1 text-12 font-medium ${bgClass}`}>{label}</span>;
}

function toneClass(tone: Tone) {
  if (tone === "success") return "text-qidra-green";
  if (tone === "danger") return "text-qidra-red";
  if (tone === "accent") return "text-qidra-accent";
  if (tone === "warning") return "text-qidra-gold";
  return "text-qidra-dark";
}

function roleLabel(role: Role, locale: Locale) {
  if (role === Role.SUPER_ADMIN) return locale === "ru" ? "Главный админ" : "Super admin";
  if (role === Role.ADMIN) return locale === "ru" ? "Админ" : "Admin";
  if (role === Role.TECH_SUPPORT) return locale === "ru" ? "Менеджер техподдержки" : "Technical support manager";
  if (role === Role.SALES_MANAGER) return locale === "ru" ? "Менеджер отдела продаж" : "Sales manager";
  return locale === "ru" ? "Участник" : "Participant";
}

function accessStatusLabel(user: { blockedAt: Date | null; blockedUntil: Date | null }, locale: Locale) {
  const mode = userBlockMode(user);

  if (mode === "temporary") {
    const blockedUntil = user.blockedUntil ? formatDateTime(user.blockedUntil, locale) : locale === "ru" ? "срок не указан" : "end date not set";
    return locale === "ru" ? `Блок до ${blockedUntil}` : `Blocked until ${blockedUntil}`;
  }

  if (mode === "permanent") {
    return locale === "ru" ? "Заблокирован" : "Blocked";
  }

  return locale === "ru" ? "Активен" : "Active";
}

function kycStatusLabel(status: KycStatus | undefined, locale: Locale) {
  if (status === KycStatus.APPROVED) return locale === "ru" ? "Одобрен" : "Approved";
  if (status === KycStatus.SUBMITTED) return locale === "ru" ? "На проверке" : "In review";
  if (status === KycStatus.REJECTED) return locale === "ru" ? "Нужны правки" : "Needs updates";
  if (status === KycStatus.DRAFT) return locale === "ru" ? "Черновик" : "Draft";
  return locale === "ru" ? "Не отправлен" : "Not submitted";
}

function sourceLabel(value: string | null | undefined, locale: Locale) {
  if (!value) return locale === "ru" ? "Не указано" : "Not provided";
  if (value === "salary") return locale === "ru" ? "Зарплата" : "Salary";
  if (value === "business") return locale === "ru" ? "Бизнес" : "Business";
  if (value === "savings") return locale === "ru" ? "Накопления" : "Savings";
  if (value === "family") return locale === "ru" ? "Семья" : "Family";
  return value;
}

function authProviders(accounts: { provider: string; type: string }[], locale: Locale) {
  if (!accounts.length) return locale === "ru" ? "Email и пароль" : "Email and password";
  return accounts.map((account) => `${providerLabel(account.provider)} (${account.type})`).join(", ");
}

function providerLabel(provider: string) {
  if (provider === "google") return "Google";
  if (provider === "telegram") return "Telegram";
  if (provider === "credentials") return "Email";
  return provider;
}

function transactionTitle(type: TransactionType, locale: Locale) {
  if (type === TransactionType.WITHDRAWAL) return locale === "ru" ? "Вывод" : "Withdrawal";
  if (type === TransactionType.INVESTMENT) return locale === "ru" ? "Участие" : "Participation";
  if (type === TransactionType.RETURN) return locale === "ru" ? "Возврат" : "Return";
  if (type === TransactionType.ADJUSTMENT) return locale === "ru" ? "Корректировка" : "Adjustment";
  return locale === "ru" ? "Пополнение" : "Deposit";
}

function transactionAmount(type: TransactionType, amount: { toString(): string }) {
  if (type === TransactionType.ADJUSTMENT) {
    const numericAmount = Number(amount.toString());
    return `${numericAmount > 0 ? "+" : ""}${formatUsdt(amount)}`;
  }

  const sign = type === TransactionType.INVESTMENT || type === TransactionType.WITHDRAWAL ? "-" : "+";
  return `${sign}${formatUsdt(amount)}`;
}

function transactionMeta(date: Date, status: PaymentStatus, reference: string | null, locale: Locale) {
  return [formatDateTime(date, locale), paymentStatusLabel(status, locale), reference].filter(Boolean).join(" / ");
}

function paymentStatusLabel(status: PaymentStatus, locale: Locale) {
  if (status === PaymentStatus.CONFIRMED) return locale === "ru" ? "Подтверждено" : "Confirmed";
  if (status === PaymentStatus.REJECTED) return locale === "ru" ? "Отклонено" : "Rejected";
  return locale === "ru" ? "На проверке" : "Under review";
}

function paymentTone(status: PaymentStatus, type: TransactionType): Tone {
  if (status === PaymentStatus.REJECTED) return "danger";
  if (status !== PaymentStatus.CONFIRMED) return "warning";
  if (type === TransactionType.DEPOSIT || type === TransactionType.RETURN) return "success";
  return "neutral";
}

function investmentStatusLabel(status: InvestmentStatus, locale: Locale) {
  if (status === InvestmentStatus.CONFIRMED) return locale === "ru" ? "Подтверждено" : "Confirmed";
  if (status === InvestmentStatus.REJECTED) return locale === "ru" ? "Отклонено" : "Rejected";
  if (status === InvestmentStatus.CANCELLED) return locale === "ru" ? "Отменено" : "Cancelled";
  return locale === "ru" ? "На проверке" : "Pending";
}

function investmentTone(status: InvestmentStatus): Tone {
  if (status === InvestmentStatus.CONFIRMED) return "success";
  if (status === InvestmentStatus.REJECTED) return "danger";
  if (status === InvestmentStatus.CANCELLED) return "neutral";
  return "warning";
}

function supportStatusLabel(status: SupportThreadStatus, locale: Locale) {
  if (status === SupportThreadStatus.CLOSED) return locale === "ru" ? "Закрыт" : "Closed";
  if (status === SupportThreadStatus.PENDING) return locale === "ru" ? "Ожидает участника" : "Waiting participant";
  return locale === "ru" ? "Открыт" : "Open";
}

function supportTone(status: SupportThreadStatus): Tone {
  if (status === SupportThreadStatus.CLOSED) return "success";
  if (status === SupportThreadStatus.PENDING) return "neutral";
  return "accent";
}

function auditActionLabel(action: string, locale: Locale) {
  const labels: Record<string, Record<Locale, string>> = {
    "investment.confirm": { ru: "Заявка участия подтверждена", en: "Participation request confirmed" },
    "investment.reject": { ru: "Заявка участия отклонена", en: "Participation request rejected" },
    "investment.request.cancel": { ru: "Участник отменил заявку", en: "Participant cancelled request" },
    "investment.request.create": { ru: "Участник создал заявку", en: "Participant created request" },
    "investment.request.update": { ru: "Участник обновил заявку", en: "Participant updated request" },
    "kyc.approve": { ru: "Анкета одобрена", en: "KYC approved" },
    "kyc.reject": { ru: "Анкета отклонена", en: "KYC rejected" },
    "kyc.status.adjust": { ru: "Статус KYC изменён корректировкой", en: "KYC status adjusted" },
    "payment.deposit.confirm": { ru: "Пополнение подтверждено", en: "Deposit confirmed" },
    "payment.deposit.reject": { ru: "Пополнение отклонено", en: "Deposit rejected" },
    "payment.status.reject.adjust": { ru: "Операция отклонена корректировкой", en: "Operation rejected by adjustment" },
    "payment.trc20.auto_confirm": { ru: "Пополнение зачислено автоматически", en: "Deposit credited automatically" },
    "payment.withdrawal.confirm": { ru: "Вывод подтвержден", en: "Withdrawal confirmed" },
    "payment.withdrawal.reject": { ru: "Вывод отклонен", en: "Withdrawal rejected" },
    "payment.withdrawal.request": { ru: "Участник запросил вывод", en: "Participant requested withdrawal" },
    "project.create.from_submission": { ru: "Проект создан из заявки участника", en: "Project created from participant submission" },
    "project.submission.create": { ru: "Проект отправлен на размещение", en: "Project submitted for listing" },
    "project.submission.prepare": { ru: "Заявка подготовлена к публикации", en: "Submission prepared for publishing" },
    "project.submission.reject": { ru: "Заявка на размещение отклонена", en: "Listing submission rejected" },
    "project.submission.review": { ru: "Заявка на размещение взята в проверку", en: "Listing submission moved to review" },
    "support.message.manager": { ru: "Менеджер ответил в чате", en: "Manager replied in chat" },
    "support.message.user": { ru: "Участник написал в чат", en: "Participant messaged support" },
    "support.thread.update": { ru: "Диалог поддержки обновлён", en: "Support thread updated" },
    "user.staff.create": { ru: "Создан аккаунт сотрудника", en: "Staff account created" },
    "support.rating.user": { ru: "Участник оценил поддержку", en: "Participant rated support" },
    "user.block.permanent": { ru: "Пользователь заблокирован постоянно", en: "User permanently blocked" },
    "user.block.temporary": { ru: "Пользователь заблокирован временно", en: "User temporarily blocked" },
    "user.block.unblock": { ru: "Пользователь разблокирован", en: "User unblocked" },
    "user.password_reset.link_sent": { ru: "Ссылка восстановления доступа отправлена", en: "Access recovery link sent" },
    "user.role.update": { ru: "Роль пользователя изменена", en: "User role updated" },
    "wallet.adjustment.credit": { ru: "Баланс увеличен корректировкой", en: "Balance increased by adjustment" },
    "wallet.adjustment.debit": { ru: "Баланс уменьшен корректировкой", en: "Balance decreased by adjustment" }
  };

  return labels[action]?.[locale] ?? action;
}

function entityLabel(entityType: string, locale: Locale) {
  if (entityType === "InvestmentApplication") return locale === "ru" ? "Заявка участия" : "Participation application";
  if (entityType === "KycApplication") return "KYC";
  if (entityType === "Project") return locale === "ru" ? "Проект" : "Project";
  if (entityType === "ProjectSubmission") return locale === "ru" ? "Проект клиента" : "Client project";
  if (entityType === "WalletTransaction") return locale === "ru" ? "Операция кошелька" : "Wallet operation";
  if (entityType === "SupportThread") return locale === "ru" ? "Диалог" : "Thread";
  if (entityType === "User") return locale === "ru" ? "Пользователь" : "User";
  return entityType;
}

function formatUsdt(value: { toString(): string } | number) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
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

function formatPhone(dialCode?: string | null, phone?: string | null) {
  return [dialCode, phone].filter(Boolean).join(" ");
}
