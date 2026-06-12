import Link from "next/link";
import { notFound } from "next/navigation";
import { DividendPaymentStatus, InvestmentStatus, KycStatus, PaymentStatus, Role, SupportThreadStatus, TransactionType } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { UserAvatar } from "@/components/UserAvatar";
import { AccessRecoveryForm } from "@/components/admin/AccessRecoveryForm";
import { ParticipantProfileEditForm } from "@/components/admin/ParticipantProfileEditForm";
import { RoleManagementForm } from "@/components/admin/RoleManagementForm";
import { UserBlockForm } from "@/components/admin/UserBlockForm";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireSupportDesk } from "@/lib/access";
import { canAccessSupportDesk, canEditParticipantCards, canManageManagers } from "@/lib/auth";
import { countryName, countryOptions, dialCodeOptions, normalizeCountryCode } from "@/lib/countries";
import { getLocale, t, type Locale, type SearchParams, withLocale } from "@/lib/i18n";
import { readKycDocuments, type KycDocumentKind } from "@/lib/kyc-documents";
import { prisma } from "@/lib/prisma";
import { projectSubmissionStatusLabel } from "@/lib/project-submission-status";
import { isImportedPlaceholderEmail, participantEmailHint } from "@/lib/user-email";
import { userBlockMode } from "@/lib/user-access";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [routeParams, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const { userId } = routeParams;
  const locale = await getLocale(resolvedSearchParams);
  const session = await requireSupportDesk(locale, `/admin/users/${userId}`);
  const isRu = locale === "ru";
  const view = parseDossierView(searchParamString(resolvedSearchParams.view));
  const walletTypeFilter = parseWalletType(searchParamString(resolvedSearchParams.walletType));
  const walletStatusFilter = parseWalletStatus(searchParamString(resolvedSearchParams.walletStatus));
  const canAdjustBalance = session.user?.role === Role.SUPER_ADMIN;
  const canManageBlock = session.user?.role === Role.SUPER_ADMIN;
  const canManageRoles = canManageManagers(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined);
  const canEditParticipantCard = canEditParticipantCards(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "guest" | undefined);
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
          dividendPayments: {
            include: {
              period: {
                include: {
                  project: {
                    select: {
                      titleEn: true,
                      titleRu: true
                    }
                  }
                }
              }
            },
            orderBy: { createdAt: "desc" }
          },
          project: {
            include: {
              documents: true,
              reports: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 50
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
            orderBy: { createdAt: "desc" }
          }
        },
        orderBy: { updatedAt: "desc" }
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
            take: 80
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
  const participantProfileEndpoint = `/api/admin/users/${user.id}/profile?lang=${locale}`;
  const permanentDeleteEndpoint = `/api/admin/users/${user.id}/delete?lang=${locale}`;
  const participantProfileDefaults = {
    address: user.investorProfile?.address ?? "",
    citizenship: normalizeCountryCode(user.investorProfile?.citizenship),
    city: user.investorProfile?.city ?? "",
    country: normalizeCountryCode(user.investorProfile?.country),
    dateOfBirth: user.investorProfile?.dateOfBirth?.toISOString().slice(0, 10) ?? "",
    email: user.email,
    name: user.name ?? "",
    occupation: latestKyc?.occupation ?? "",
    phone: user.investorProfile?.phone ?? "",
    phoneDialCode: user.investorProfile?.phoneDialCode ?? "",
    sourceOfFunds: latestKyc?.sourceOfFunds ?? ""
  };
  const pendingPaymentTransactions =
    wallet?.transactions.filter((transaction) => transaction.status === PaymentStatus.PENDING && (transaction.type === TransactionType.DEPOSIT || transaction.type === TransactionType.WITHDRAWAL)) ?? [];
  const hasApprovedKyc = user.kycApplications.some((application) => application.status === KycStatus.APPROVED);
  const approvedKycApplication = user.kycApplications.find((application) => application.status === KycStatus.APPROVED);
  const accessRecoveryDocumentLinks = approvedKycApplication
    ? kycDocumentLinkItems(approvedKycApplication.id, readKycDocuments(approvedKycApplication.documents), locale)
    : [];
  const confirmedContractUsdt = sumUsdt(user.investments.filter((item) => item.status === InvestmentStatus.CONFIRMED).map((item) => item.amountUsdt));
  const pendingContractUsdt = sumUsdt(user.investments.filter((item) => item.status === InvestmentStatus.PENDING).map((item) => item.amountUsdt));
  const confirmedContractApplications = user.investments.filter((item) => item.status === InvestmentStatus.CONFIRMED);
  const dividendPayments = user.investments.flatMap((item) => item.dividendPayments);
  const dividendAccruedUsdt = sumUsdt(dividendPayments.filter((item) => item.status !== DividendPaymentStatus.CANCELLED).map((item) => item.amountUsdt));
  const dividendPaidUsdt = sumUsdt(dividendPayments.filter((item) => item.status === DividendPaymentStatus.PAID).map((item) => item.amountUsdt));
  const walletTransactions = wallet?.transactions ?? [];
  const filteredWalletTransactions = walletTransactions.filter((transaction) => {
    const typeMatches = walletTypeFilter ? transaction.type === walletTypeFilter : true;
    const statusMatches = walletStatusFilter ? transaction.status === walletStatusFilter : true;

    return typeMatches && statusMatches;
  });
  const canDeleteUser =
    user.id !== session.user?.id &&
    (session.user?.role === Role.SUPER_ADMIN || (session.user?.role === Role.ADMIN && user.role === Role.INVESTOR));

  return (
    <>
      <Header locale={locale} path={`/admin/users/${user.id}`} />
      <main className="premium-page">
        <section className="section">
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
                  <p className="section-kicker">{isRu ? "Карточка клиента" : "Client card"}</p>
                  <h1 className="mt-3 break-words title-48 text-qidra-dark">{displayName}</h1>
                  <p className={`mt-3 break-all text-18 font-medium ${isImportedPlaceholderEmail(user.email) ? "text-qidra-gold" : "text-qidra-dark"}`}>{user.email}</p>
                  <p className="mt-2 text-14 text-qidra-grayBlue">{participantEmailHint(user.email, locale)}</p>
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
            <div className="mt-10 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <section className="premium-card p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-12 font-semibold uppercase tracking-[0.04em] text-qidra-accent">{isRu ? "Финансовая сводка" : "Financial summary"}</p>
                    <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Всего инвестировано" : "Total invested"}</h2>
                  </div>
                  <p className="rounded-qidra bg-qidra-dark px-4 py-3 text-[24px] font-medium leading-none text-white">{formatUsdt(confirmedContractUsdt)}</p>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard label={isRu ? "Свободно" : "Available"} value={formatUsdt(wallet?.availableUsdt ?? 0)} tone="accent" />
                  <MetricCard label={isRu ? "На проверке" : "Pending"} value={formatUsdt(wallet?.pendingUsdt ?? 0)} />
                  <MetricCard label={isRu ? "Заявки на проверке" : "Pending applications"} value={formatUsdt(pendingContractUsdt)} tone="warning" />
                  <MetricCard label={isRu ? "Начислено дивидендов" : "Dividends accrued"} value={formatUsdt(dividendAccruedUsdt)} tone="success" />
                </div>
              </section>

              <section className="premium-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-12 font-semibold uppercase tracking-[0.04em] text-qidra-accent">{isRu ? "Контракты" : "Contracts"}</p>
                    <h2 className="mt-2 text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Где размещены средства" : "Where funds are placed"}</h2>
                  </div>
                  <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-13 font-medium text-qidra-grayBlue">{formatCount(confirmedContractApplications.length)}</span>
                </div>
                {confirmedContractApplications.length ? (
                  <div className="mt-5 grid gap-3">
                    {confirmedContractApplications.slice(0, 4).map((application) => (
                      <ContractPositionCard key={application.id} application={application} locale={locale} />
                    ))}
                    {confirmedContractApplications.length > 4 ? (
                      <Link className="text-13 font-medium text-qidra-accent hover:text-qidra-dark" href={withLocale(`/admin/users/${user.id}?view=contracts`, locale)}>
                        {isRu ? `Показать все: ${confirmedContractApplications.length}` : `Show all: ${confirmedContractApplications.length}`}
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <NotificationCard title={isRu ? "Активных контрактов нет" : "No active contracts"} text={isRu ? "Подтверждённые суммы по проектам появятся здесь после активации." : "Confirmed project allocations will appear here after activation."} />
                )}
              </section>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard label={isRu ? "Роль" : "Role"} value={roleLabel(user.role, locale)} />
              <MetricCard label={isRu ? "Доступ" : "Access"} value={accessStatusLabel(user, locale)} tone={userBlockMode(user) === "active" ? "success" : "danger"} />
              <MetricCard label={isRu ? "Email" : "Email"} value={user.emailVerified ? (isRu ? "Подтверждён" : "Verified") : isRu ? "Не подтверждён" : "Not verified"} tone={user.emailVerified ? "success" : "warning"} />
              <MetricCard label="KYC" value={kycStatusLabel(latestKyc?.status, locale)} tone={latestKyc?.status === KycStatus.APPROVED ? "success" : latestKyc?.status === KycStatus.REJECTED ? "danger" : "warning"} />
              <MetricCard label={isRu ? "Заявки участия" : "Applications"} value={formatCount(user._count.investments)} />
              <MetricCard label={isRu ? "Свои проекты" : "Own projects"} value={formatCount(user._count.projectSubmissions)} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/users" locale={locale} role={session.user?.role} />
            <DossierTabs activeView={view} locale={locale} userId={user.id} />

            {view === "overview" ? (
              <div className="grid gap-6">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
                  <Panel title={isRu ? "Профиль участника" : "Participant profile"} description={isRu ? "Основные данные, которые участник отправляет для проверки." : "Core data submitted by the participant for review."}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoBlock label={isRu ? "Телефон" : "Phone"} value={formatPhone(user.investorProfile?.phoneDialCode, user.investorProfile?.phone)} locale={locale} />
                      <InfoBlock label={isRu ? "Дата рождения" : "Date of birth"} value={user.investorProfile?.dateOfBirth ? formatDate(user.investorProfile.dateOfBirth, locale) : null} locale={locale} />
                      <InfoBlock label={isRu ? "Страна" : "Country"} value={countryName(user.investorProfile?.country, locale)} locale={locale} />
                      <InfoBlock label={isRu ? "Город" : "City"} value={user.investorProfile?.city} locale={locale} />
                      <InfoBlock label={isRu ? "Гражданство" : "Citizenship"} value={countryName(user.investorProfile?.citizenship, locale)} locale={locale} />
                      <InfoBlock label={isRu ? "Адрес" : "Address"} value={user.investorProfile?.address} locale={locale} />
                    </div>
                    {canEditParticipantCard && user.role === Role.INVESTOR ? (
                      <div className="premium-panel p-5">
                        <ParticipantProfileEditForm
                          countryOptions={countryOptions(locale)}
                          defaults={participantProfileDefaults}
                          dialCodeOptions={dialCodeOptions(locale)}
                          endpoint={participantProfileEndpoint}
                          locale={locale}
                        />
                      </div>
                    ) : (
                      <NotificationCard
                        title={isRu ? "Карточка только для просмотра" : "Card is view-only"}
                        text={
                          isRu
                            ? "Полная правка email и данных участника доступна главному администратору, администратору и менеджеру техподдержки. Роль назначается в блоке доступа."
                            : "Full email and participant data updates are available to super admins, admins and technical support managers. The role is assigned in the access block."
                        }
                      />
                    )}
                  </Panel>

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
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)]">
                  <Panel title={isRu ? "Кошелёк и операции" : "Wallet and operations"} description={isRu ? "Баланс, личный адрес и последние операции." : "Balance, personal address and recent operations."}>
                    <div className="grid gap-4 md:grid-cols-3">
                      <InfoBlock label={isRu ? "Доступно" : "Available"} value={formatUsdt(wallet?.availableUsdt ?? 0)} locale={locale} />
                      <InfoBlock label={isRu ? "Зарезервировано" : "Reserved"} value={formatUsdt(wallet?.reservedUsdt ?? 0)} locale={locale} />
                      <InfoBlock label={isRu ? "На проверке" : "Pending"} value={formatUsdt(wallet?.pendingUsdt ?? 0)} locale={locale} />
                    </div>
                    <InfoBlock label={isRu ? "Личный USDT TRC20 адрес" : "Personal USDT TRC20 address"} value={wallet?.trc20Address} locale={locale} compact />
                    {wallet?.transactions.length ? (
                      <div className="grid gap-3">
                        {wallet.transactions.slice(0, 8).map((transaction) => (
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

                  <Panel title={isRu ? "Доступ и авторизация" : "Access and authentication"} description={isRu ? "Роль, провайдеры входа, восстановление и блокировка." : "Role, sign-in providers, recovery and access blocking."}>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <InfoBlock label={isRu ? "Роль доступа" : "Access role"} value={roleLabel(user.role, locale)} locale={locale} />
                      <InfoBlock label={isRu ? "Статус доступа" : "Access status"} value={accessStatusLabel(user, locale)} locale={locale} />
                      <InfoBlock label={isRu ? "Дата регистрации" : "Registration date"} value={formatDateTime(user.createdAt, locale)} locale={locale} />
                      <InfoBlock label={isRu ? "Провайдеры входа" : "Sign-in providers"} value={authProviders(user.accounts, locale)} locale={locale} />
                      <InfoBlock label={isRu ? "Активные сессии" : "Active sessions"} value={formatCount(user._count.sessions)} locale={locale} />
                    </div>
                    {canManageRoles && user.id !== session.user?.id ? (
                      <div className="premium-panel p-5">
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
                      <div className="premium-panel p-5">
                        <AccessRecoveryForm endpoint={accessRecoveryEndpoint} hasApprovedKyc={hasApprovedKyc} kycDocumentLinks={accessRecoveryDocumentLinks} locale={locale} />
                      </div>
                    ) : null}
                    <div className="premium-panel p-5">
                      <UserBlockForm canManageBlock={canManageBlock} endpoint={blockEndpoint} isOwnAccount={user.id === session.user?.id} locale={locale} user={user} />
                    </div>
                  </Panel>
                </div>
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

            {view === "wallet" ? (
              <WalletDossierPanel
                allTransactions={walletTransactions}
                locale={locale}
                transactions={filteredWalletTransactions}
                userId={user.id}
                wallet={wallet}
                walletStatusFilter={walletStatusFilter}
                walletTypeFilter={walletTypeFilter}
              />
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

            {view === "overview" ? (
                <PermanentUserDeletePanel
                  canDeleteUser={canDeleteUser}
                  endpoint={permanentDeleteEndpoint}
                  locale={locale}
                  targetEmail={user.email}
                targetRole={user.role}
              />
            ) : null}

            {view === "contracts" ? (
            <Panel
              title={isRu ? "Партнёрские контракты клиента" : "Client partnership contracts"}
              description={
                isRu
                  ? "Здесь видна вся история участия клиента: активированные контракты, заявки на проверке, суммы, документы проекта и связанные операции кошелька."
                  : "This view shows the client's participation history: active contracts, pending applications, amounts, project documents and linked wallet operations."
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <InfoBlock label={isRu ? "Активировано в проектах" : "Activated in projects"} value={formatUsdt(confirmedContractUsdt)} locale={locale} />
                <InfoBlock label={isRu ? "Заявки на проверке" : "Pending applications"} value={formatUsdt(pendingContractUsdt)} locale={locale} />
                <InfoBlock label={isRu ? "Начислено дивидендов" : "Dividends accrued"} value={formatUsdt(dividendAccruedUsdt)} locale={locale} />
                <InfoBlock label={isRu ? "Выплачено дивидендов" : "Dividends paid"} value={formatUsdt(dividendPaidUsdt)} locale={locale} />
                <InfoBlock label={isRu ? "Всего контрактов и заявок" : "Total contracts and applications"} value={formatCount(user.investments.length)} locale={locale} />
              </div>
              {user.investments.length ? (
                <div className="grid gap-4">
                  {user.investments.map((item) => (
                    <ContractDossierCard
                      key={item.id}
                      application={item}
                      locale={locale}
                      transactions={walletTransactions.filter((transaction) => contractRelatedTransaction(transaction, item.id))}
                    />
                  ))}
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
      <div className="grid items-start gap-6 xl:grid-cols-3">
        <div className="premium-panel grid content-start gap-5 p-5">
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

        <div className="premium-panel grid content-start gap-5 p-5">
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
            <FeedbackForm
              className="grid gap-3"
              endpoint={endpoint}
              feedback={{
                title: isRu ? "KYC-решение создано" : "KYC decision created",
                text: isRu ? "Ручное решение сохранено и записано в журнал действий." : "The manual decision was saved and written to the audit log.",
                buttonLabel: isRu ? "Понятно" : "Got it",
                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              popupPlacement="center"
              reloadOnSuccess
            >
              <NotificationCard
                title={isRu ? "Анкет нет" : "No profiles"}
                text={
                  isRu
                    ? "Можно создать ручное KYC-решение только после внутренней сверки документов клиента. Причина попадёт в журнал действий."
                    : "You can create a manual KYC decision only after internal document verification. The reason will be written to the audit log."
                }
                tone="warning"
              />
              <input name="kind" type="hidden" value="kyc_manual_create" />
              <Select
                label={isRu ? "Ручной статус" : "Manual status"}
                name="status"
                options={[
                  { label: kycStatusLabel(KycStatus.APPROVED, locale), value: KycStatus.APPROVED },
                  { label: kycStatusLabel(KycStatus.REJECTED, locale), value: KycStatus.REJECTED }
                ]}
                required
              />
              <ReasonField
                label={isRu ? "Основание решения" : "Decision reason"}
                locale={locale}
                name="reason"
                placeholder={isRu ? "Например: документы сверены с исходным dossier Al Amana Gold" : "For example: documents matched against the original Al Amana Gold dossier"}
              />
              <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
              <Button type="submit">{isRu ? "Создать KYC-решение" : "Create KYC decision"}</Button>
            </FeedbackForm>
          )}
        </div>

        <div className="premium-panel grid content-start gap-5 p-5">
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

function PermanentUserDeletePanel({
  canDeleteUser,
  endpoint,
  locale,
  targetEmail,
  targetRole
}: {
  canDeleteUser: boolean;
  endpoint: string;
  locale: Locale;
  targetEmail: string;
  targetRole: Role;
}) {
  const isRu = locale === "ru";

  return (
    <Panel
      title={isRu ? "Полное удаление пользователя" : "Permanent user deletion"}
      description={
        isRu
          ? "Опасное действие администратора: удаляет пользователя, его баланс, историю, заявки, связанные платежи и пересчитывает суммы проектов."
          : "Dangerous administrator action: deletes the user, balances, history, applications, linked payments and recalculates project totals."
      }
    >
      {canDeleteUser ? (
        <FeedbackForm
          className="grid gap-4 rounded-[14px] border border-qidra-red/30 bg-qidra-red/5 p-5"
          confirm={{
            cancelLabel: isRu ? "Отмена" : "Cancel",
            confirmLabel: isRu ? "Да, удалить безвозвратно" : "Yes, delete permanently",
            text: isRu
              ? "После этого шага пользователь будет полностью удалён из системы вместе с балансом, историей, заявками и связанными финансовыми записями. Эти данные перестанут участвовать в общей аналитике."
              : "After this step, the user will be fully removed from the system together with balances, history, applications and linked financial records. Those records will stop affecting aggregate analytics.",
            title: isRu ? "Последнее предупреждение" : "Final warning",
            tone: "warning"
          }}
          endpoint={endpoint}
          feedback={{
            title: isRu ? "Пользователь удалён" : "User deleted",
            text: isRu ? "Карточка, история и финансовые записи удалены. Суммы проектов пересчитаны." : "The card, history and financial records were removed. Project totals were recalculated.",
            buttonLabel: isRu ? "Понятно" : "Got it",
            dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
            tone: "warning"
          }}
          popupPlacement="center"
        >
          <NotificationCard
            title={isRu ? "Это действие нельзя отменить" : "This cannot be undone"}
            text={
              isRu
                ? targetRole === Role.INVESTOR
                  ? "Используйте только когда аккаунт участника нужно убрать из системы полностью вместе с балансом и историей. Для обычной остановки доступа лучше применять блокировку."
                  : "Используйте только когда аккаунт нужно убрать из системы полностью вместе с балансом и историей. Для обычной остановки доступа лучше применять блокировку."
                : targetRole === Role.INVESTOR
                  ? "Use this only when a participant account must be removed from the system entirely together with balances and history. For normal access removal, use blocking instead."
                  : "Use this only when the account must be removed from the system entirely together with balances and history. For normal access removal, use blocking instead."
            }
            tone="warning"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={isRu ? "Email удаляемого пользователя" : "User email to delete"} name="email" placeholder={targetEmail} required type="email" />
            <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="DELETE" placeholder="DELETE" required />
          </div>
          <ReasonField
            label={isRu ? "Причина полного удаления" : "Permanent deletion reason"}
            locale={locale}
            name="reason"
            placeholder={isRu ? "Например: удаление тестового аккаунта, баланса и всей ошибочной финансовой истории перед запуском" : "For example: removing a test account, balance and incorrect financial history before launch"}
          />
          <Button className="border-qidra-red bg-qidra-red hover:bg-qidra-red/90" type="submit" variant="dark">
            {isRu ? "Удалить пользователя полностью" : "Delete user permanently"}
          </Button>
        </FeedbackForm>
      ) : (
        <NotificationCard
          title={isRu ? "Удаление недоступно" : "Deletion unavailable"}
          text={
            targetRole === Role.SUPER_ADMIN
              ? isRu
                ? "Нельзя использовать полное удаление для собственного аккаунта главного администратора."
                : "Permanent deletion cannot be used for the current super administrator account."
              : isRu
                ? "Полное удаление доступно только главному администратору и не применяется к собственному аккаунту."
                : "Permanent deletion is only available to the super administrator and cannot be used on your own account."
          }
        />
      )}
    </Panel>
  );
}

function WalletDossierPanel({
  allTransactions,
  locale,
  transactions,
  userId,
  wallet,
  walletStatusFilter,
  walletTypeFilter
}: {
  allTransactions: ClientWalletTransaction[];
  locale: Locale;
  transactions: ClientWalletTransaction[];
  userId: string;
  wallet:
    | {
        availableUsdt: { toString(): string };
        pendingUsdt: { toString(): string };
        reservedUsdt: { toString(): string };
        trc20Address: string | null;
      }
    | null;
  walletStatusFilter: PaymentStatus | undefined;
  walletTypeFilter: TransactionType | undefined;
}) {
  const isRu = locale === "ru";
  const confirmedDepositsUsdt = sumUsdt(
    allTransactions.filter((transaction) => transaction.type === TransactionType.DEPOSIT && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt)
  );
  const confirmedWithdrawalsUsdt = sumUsdt(
    allTransactions.filter((transaction) => transaction.type === TransactionType.WITHDRAWAL && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt)
  );
  const confirmedInvestmentsUsdt = sumUsdt(
    allTransactions.filter((transaction) => transaction.type === TransactionType.INVESTMENT && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt)
  );
  const confirmedReturnsUsdt = sumUsdt(
    allTransactions.filter((transaction) => transaction.type === TransactionType.RETURN && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt)
  );

  return (
    <Panel
      title={isRu ? "Кошелёк, платежи и сверка операций" : "Wallet, payments and operation reconciliation"}
      description={
        isRu
          ? "Финансовая история клиента: пополнения, выводы, участия, начисления, корректировки и спорные операции."
          : "Client financial history: deposits, withdrawals, participations, accruals, adjustments and disputed operations."
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label={isRu ? "Свободный баланс" : "Available balance"} value={formatUsdt(wallet?.availableUsdt ?? 0)} locale={locale} />
        <InfoBlock label={isRu ? "Зарезервировано" : "Reserved"} value={formatUsdt(wallet?.reservedUsdt ?? 0)} locale={locale} />
        <InfoBlock label={isRu ? "Переводы на проверке" : "Transfers in review"} value={formatUsdt(wallet?.pendingUsdt ?? 0)} locale={locale} />
        <InfoBlock label={isRu ? "Всего операций" : "Total operations"} value={formatCount(allTransactions.length)} locale={locale} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label={isRu ? "Зачислено подтверждённых" : "Confirmed credited"} value={formatUsdt(confirmedDepositsUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Выведено подтверждённых" : "Confirmed withdrawn"} value={formatUsdt(confirmedWithdrawalsUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Активировано в проектах" : "Activated in projects"} value={formatUsdt(confirmedInvestmentsUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Начислено возвратов" : "Returns accrued"} value={formatUsdt(confirmedReturnsUsdt)} locale={locale} />
      </div>

      <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
        <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Личный USDT TRC20 адрес клиента" : "Client personal USDT TRC20 address"}</p>
        <code className="mt-2 block break-all rounded-qidra bg-white px-3 py-2 text-12 text-qidra-dark">
          {wallet?.trc20Address || (isRu ? "Адрес ещё не выдан" : "Address has not been issued yet")}
        </code>
      </div>

      <WalletTransactionFilters locale={locale} userId={userId} walletStatusFilter={walletStatusFilter} walletTypeFilter={walletTypeFilter} />

      {transactions.length ? (
        <div className="grid gap-3">
          {transactions.map((transaction) => (
            <WalletDossierOperation key={transaction.id} locale={locale} transaction={transaction} userId={userId} />
          ))}
        </div>
      ) : (
        <NotificationCard
          title={isRu ? "Операции не найдены" : "No operations found"}
          text={isRu ? "Измените фильтр по типу или статусу операции." : "Change the operation type or status filter."}
        />
      )}
    </Panel>
  );
}

function WalletTransactionFilters({
  locale,
  userId,
  walletStatusFilter,
  walletTypeFilter
}: {
  locale: Locale;
  userId: string;
  walletStatusFilter: PaymentStatus | undefined;
  walletTypeFilter: TransactionType | undefined;
}) {
  const isRu = locale === "ru";
  const typeItems: { label: string; value?: TransactionType }[] = [
    { label: isRu ? "Все типы" : "All types" },
    { label: isRu ? "Пополнения" : "Deposits", value: TransactionType.DEPOSIT },
    { label: isRu ? "Выводы" : "Withdrawals", value: TransactionType.WITHDRAWAL },
    { label: isRu ? "Участия" : "Participations", value: TransactionType.INVESTMENT },
    { label: isRu ? "Начисления" : "Accruals", value: TransactionType.RETURN },
    { label: isRu ? "Корректировки" : "Adjustments", value: TransactionType.ADJUSTMENT }
  ];
  const statusItems: { label: string; value?: PaymentStatus }[] = [
    { label: isRu ? "Все статусы" : "All statuses" },
    { label: paymentStatusLabel(PaymentStatus.PENDING, locale), value: PaymentStatus.PENDING },
    { label: paymentStatusLabel(PaymentStatus.CONFIRMED, locale), value: PaymentStatus.CONFIRMED },
    { label: paymentStatusLabel(PaymentStatus.REJECTED, locale), value: PaymentStatus.REJECTED }
  ];

  return (
    <div className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <div>
        <p className="text-16 font-semibold text-qidra-dark">{isRu ? "Фильтры операций" : "Operation filters"}</p>
        <p className="mt-1 text-13 text-qidra-grayBlue">
          {isRu ? "Быстро отделите пополнения, выводы, участия, начисления и спорные операции." : "Quickly isolate deposits, withdrawals, participations, accruals and disputed operations."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {typeItems.map((item) => (
          <Link
            key={item.value ?? "all-types"}
            className={`inline-flex h-10 items-center rounded-qidra px-3 text-13 font-medium transition-colors ${
              walletTypeFilter === item.value ? "bg-qidra-dark text-white" : "border border-qidra-grayLight text-qidra-grayBlue hover:border-qidra-dark hover:text-qidra-dark"
            }`}
            href={walletFilterHref(userId, locale, item.value, walletStatusFilter)}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {statusItems.map((item) => (
          <Link
            key={item.value ?? "all-statuses"}
            className={`inline-flex h-10 items-center rounded-qidra px-3 text-13 font-medium transition-colors ${
              walletStatusFilter === item.value ? "bg-qidra-accent text-white" : "border border-qidra-grayLight text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
            }`}
            href={walletFilterHref(userId, locale, walletTypeFilter, item.value)}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function WalletDossierOperation({ locale, transaction, userId }: { locale: Locale; transaction: ClientWalletTransaction; userId: string }) {
  const isRu = locale === "ru";
  const adminPaymentsHref = withLocale(`/admin/payments?type=${transaction.type}&status=${transaction.status}&userId=${userId}`, locale);

  return (
    <article className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-18 font-semibold text-qidra-dark">{transactionTitle(transaction.type, locale)}</p>
          <p className="mt-1 text-13 text-qidra-grayBlue">{formatDateTime(transaction.createdAt, locale)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={paymentStatusLabel(transaction.status, locale)} tone={paymentTone(transaction.status, transaction.type)} />
          <strong className="text-18 text-qidra-dark">{transactionAmount(transaction.type, transaction.amountUsdt)}</strong>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <InfoBlock compact label="Transaction hash" value={transaction.txHash} locale={locale} />
        <InfoBlock compact label={isRu ? "Адрес получателя/назначения" : "Recipient/destination address"} value={transaction.destinationAddress} locale={locale} />
      </div>
      {transaction.note ? (
        <div className="rounded-qidra border border-qidra-grayLight bg-white p-3">
          <p className="text-13 font-medium text-qidra-dark">{isRu ? "Комментарий операции" : "Operation note"}</p>
          <p className="mt-1 break-words text-13 text-qidra-grayBlue">{transaction.note}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 border-t border-qidra-grayLight pt-4">
        <ButtonLink href={adminPaymentsHref} size="sm" variant="outline">
          {isRu ? "Открыть в платежах" : "Open in payments"}
        </ButtonLink>
        {transaction.status === PaymentStatus.PENDING && transaction.type === TransactionType.DEPOSIT ? (
          <TronGridDossierCheckForm endpoint={`/api/admin/payments/${transaction.id}/trongrid?lang=${locale}`} locale={locale} />
        ) : null}
      </div>
    </article>
  );
}

function TronGridDossierCheckForm({ endpoint, locale }: { endpoint: string; locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <FeedbackForm
      endpoint={endpoint}
      feedback={{
        title: isRu ? "Платёж проверен" : "Payment checked",
        text: isRu ? "Qidra сверила transaction hash, сеть, сумму и личный адрес клиента." : "Qidra checked the transaction hash, network, amount and client personal address.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      popupPlacement="center"
      refreshOnSuccess
    >
      <Button size="sm" type="submit">
        {isRu ? "Проверить через TronGrid" : "Check via TronGrid"}
      </Button>
    </FeedbackForm>
  );
}

type ContractApplication = {
  adminNote: string | null;
  amountUsdt: { toString(): string };
  contractAcceptedAt: Date | null;
  createdAt: Date;
  dividendPayments: {
    amountUsdt: { toString(): string };
    createdAt: Date;
    eligibleDays: number;
    id: string;
    paidAt: Date | null;
    period: {
      periodEnd: Date;
      periodLabel: string;
      periodStart: Date;
      status: string;
    };
    status: DividendPaymentStatus;
  }[];
  id: string;
  project: {
    documents: { fileUrl: string; id: string; titleEn: string; titleRu: string }[];
    expectedReturnEn: string | null;
    expectedReturnRu: string | null;
    expectedYieldEn: string | null;
    expectedYieldRu: string | null;
    fundedUsdt: { toString(): string };
    location: string | null;
    reports: { fileUrl: string; id: string; period: string; publishedAt: Date | null; titleEn: string; titleRu: string }[];
    riskLevel: string | null;
    slug: string;
    status: string;
    structure: string;
    targetUsdt: { toString(): string };
    titleEn: string;
    titleRu: string;
  };
  reservedUsdt: { toString(): string };
  status: InvestmentStatus;
  termsAcceptedAt: Date | null;
  updatedAt: Date;
};

type ClientWalletTransaction = {
  amountUsdt: { toString(): string };
  createdAt: Date;
  destinationAddress: string | null;
  id: string;
  note: string | null;
  status: PaymentStatus;
  txHash: string | null;
  type: TransactionType;
};

function ContractDossierCard({
  application,
  locale,
  transactions
}: {
  application: ContractApplication;
  locale: Locale;
  transactions: ClientWalletTransaction[];
}) {
  const isRu = locale === "ru";
  const projectTitle = isRu ? application.project.titleRu : application.project.titleEn;
  const linkedWithdrawals = transactions.filter((transaction) => transaction.type === TransactionType.WITHDRAWAL && transaction.status === PaymentStatus.CONFIRMED);
  const accruedUsdt = sumUsdt(application.dividendPayments.filter((payment) => payment.status !== DividendPaymentStatus.CANCELLED).map((payment) => payment.amountUsdt));
  const paidUsdt = sumUsdt(application.dividendPayments.filter((payment) => payment.status === DividendPaymentStatus.PAID).map((payment) => payment.amountUsdt));
  const withdrawnUsdt = sumUsdt(linkedWithdrawals.map((transaction) => transaction.amountUsdt));
  const entryDate = application.contractAcceptedAt ?? application.termsAcceptedAt ?? application.createdAt;

  return (
    <article className="grid gap-5 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-12 font-medium uppercase text-qidra-accent">{isRu ? "Партнёрский контракт" : "Partnership contract"}</p>
          <h3 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{projectTitle}</h3>
          <p className="mt-2 text-13 text-qidra-grayBlue">
            {isRu ? "ID заявки" : "Application ID"}: <span className="break-all">{application.id}</span>
          </p>
        </div>
        <StatusPill label={investmentStatusLabel(application.status, locale)} tone={investmentTone(application.status)} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock label={isRu ? "Сумма участия" : "Participation amount"} value={formatUsdt(application.amountUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Резерв заявки" : "Application reserve"} value={formatUsdt(application.reservedUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Начислено по контракту" : "Accrued by contract"} value={formatUsdt(accruedUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Выплачено по контракту" : "Paid by contract"} value={formatUsdt(paidUsdt)} locale={locale} />
        <InfoBlock label={isRu ? "Выведено по контракту" : "Withdrawn by contract"} value={formatUsdt(withdrawnUsdt)} locale={locale} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoBlock
          label={application.status === InvestmentStatus.CONFIRMED ? (isRu ? "Дата входа" : "Entry date") : isRu ? "Дата заявки" : "Application date"}
          value={formatDateTime(application.status === InvestmentStatus.CONFIRMED ? entryDate : application.createdAt, locale)}
          locale={locale}
        />
        <InfoBlock label={isRu ? "Активация договора" : "Contract activation"} value={application.contractAcceptedAt ? formatDateTime(application.contractAcceptedAt, locale) : null} locale={locale} />
        <InfoBlock label={isRu ? "Структура" : "Structure"} value={application.project.structure} locale={locale} />
        <InfoBlock label={isRu ? "Риск" : "Risk"} value={application.project.riskLevel} locale={locale} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <InfoBlock
          label={isRu ? "Ожидаемый результат проекта" : "Expected project result"}
          value={(isRu ? application.project.expectedReturnRu : application.project.expectedReturnEn) || (isRu ? "Уточняется по условиям проекта" : "Clarified by project terms")}
          locale={locale}
        />
        <InfoBlock
          label={isRu ? "Ориентир доходности" : "Return guidance"}
          value={(isRu ? application.project.expectedYieldRu : application.project.expectedYieldEn) || (isRu ? "Не фиксируется и не гарантируется" : "Not fixed or guaranteed")}
          locale={locale}
        />
      </div>

      {application.adminNote ? (
        <div className="rounded-qidra border border-qidra-grayLight bg-white p-4">
          <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Комментарий администратора" : "Administrator note"}</p>
          <p className="mt-2 whitespace-pre-wrap text-14 text-qidra-grayBlue">{application.adminNote}</p>
        </div>
      ) : null}

      <div className="rounded-qidra border border-qidra-grayLight bg-white p-4">
        <p className="text-16 font-semibold text-qidra-dark">{isRu ? "Дивидендные начисления" : "Dividend accruals"}</p>
        {application.dividendPayments.length ? (
          <div className="mt-3 grid gap-2">
            {application.dividendPayments.map((payment) => (
              <div key={payment.id} className="grid gap-2 rounded-qidra bg-qidra-grayLight p-3 text-13 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <div>
                  <p className="font-medium text-qidra-dark">{payment.period.periodLabel}</p>
                  <p className="mt-1 text-qidra-grayBlue">
                    {formatDate(payment.period.periodStart, locale)} - {formatDate(payment.period.periodEnd, locale)}
                  </p>
                </div>
                <p className="text-qidra-grayBlue">
                  {isRu ? "Дней" : "Days"}: <span className="font-medium text-qidra-dark">{payment.eligibleDays}</span>
                </p>
                <p className="font-medium text-qidra-accent">{dividendPaymentStatusLabel(payment.status, locale)}</p>
                <p className="font-medium text-qidra-dark">{formatUsdt(payment.amountUsdt)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-14 text-qidra-grayBlue">{isRu ? "По этому контракту начислений пока нет." : "No accruals for this contract yet."}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-qidra border border-qidra-grayLight bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-16 font-semibold text-qidra-dark">{isRu ? "Документы проекта" : "Project documents"}</p>
            <Link className="text-13 font-medium text-qidra-accent hover:text-qidra-dark" href={withLocale(`/projects/${application.project.slug}/documents`, locale)}>
              {isRu ? "Открыть раздел" : "Open section"}
            </Link>
          </div>
          {application.project.documents.length ? (
            <div className="mt-3 grid gap-2">
              {application.project.documents.slice(0, 6).map((document) => (
                <a
                  key={document.id}
                  className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight px-3 py-2 text-13 font-medium text-qidra-dark transition-colors hover:border-qidra-accent hover:text-qidra-accent"
                  href={document.fileUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  {isRu ? document.titleRu : document.titleEn}
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-14 text-qidra-grayBlue">{isRu ? "Публичные документы по проекту пока не добавлены." : "Public project documents have not been added yet."}</p>
          )}
        </div>

        <div className="rounded-qidra border border-qidra-grayLight bg-white p-4">
          <p className="text-16 font-semibold text-qidra-dark">{isRu ? "Связанные операции кошелька" : "Linked wallet operations"}</p>
          {transactions.length ? (
            <div className="mt-3 grid gap-2">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="rounded-qidra bg-qidra-grayLight p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-14 font-medium text-qidra-dark">{transactionTitle(transaction.type, locale)}</p>
                      <p className="mt-1 break-all text-12 text-qidra-grayBlue">{transactionMeta(transaction.createdAt, transaction.status, transaction.txHash ?? transaction.destinationAddress, locale)}</p>
                    </div>
                    <strong className="text-14 text-qidra-dark">{transactionAmount(transaction.type, transaction.amountUsdt)}</strong>
                  </div>
                  {transaction.note ? <p className="mt-2 break-words text-12 text-qidra-grayBlue">{transaction.note}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-14 text-qidra-grayBlue">
              {isRu
                ? "Связанные операции появятся после активации, начислений или вывода именно по этому контракту."
                : "Linked operations will appear after activation, accruals or withdrawals for this specific contract."}
            </p>
          )}
        </div>
      </div>
    </article>
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

function parseWalletType(value: string | undefined) {
  if (
    value === TransactionType.ADJUSTMENT ||
    value === TransactionType.DEPOSIT ||
    value === TransactionType.INVESTMENT ||
    value === TransactionType.RETURN ||
    value === TransactionType.WITHDRAWAL
  ) {
    return value;
  }

  return undefined;
}

function parseWalletStatus(value: string | undefined) {
  if (value === PaymentStatus.CONFIRMED || value === PaymentStatus.PENDING || value === PaymentStatus.REJECTED) {
    return value;
  }

  return undefined;
}

function walletFilterHref(userId: string, locale: Locale, type?: TransactionType, status?: PaymentStatus) {
  const params = new URLSearchParams({ view: "wallet" });
  if (type) params.set("walletType", type);
  if (status) params.set("walletStatus", status);

  return withLocale(`/admin/users/${userId}?${params.toString()}`, locale);
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
    <nav className="premium-card flex flex-wrap gap-2 p-2">
      {tabs.map((tab) => (
        <Link
          key={tab.view}
          className={`inline-flex h-11 items-center rounded-qidra px-4 text-14 font-medium transition-colors ${
            activeView === tab.view ? "bg-qidra-dark text-white shadow-[0_10px_24px_rgba(18,20,23,0.14)]" : "text-qidra-grayBlue hover:bg-qidra-grayLight hover:text-qidra-dark"
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
    <section className="premium-card grid content-start gap-6 p-6 sm:p-8">
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h2>
        {description ? <p className="mt-2 max-w-[760px] text-16 leading-relaxed text-qidra-grayBlue">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ContractPositionCard({ application, locale }: { application: ContractApplication; locale: Locale }) {
  const isRu = locale === "ru";
  const projectTitle = isRu ? application.project.titleRu : application.project.titleEn;
  const entryDate = application.contractAcceptedAt ?? application.termsAcceptedAt ?? application.createdAt;

  return (
    <article className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-15 font-semibold leading-snug text-qidra-dark">{projectTitle}</p>
          <p className="mt-1 text-12 font-medium text-qidra-grayBlue">
            {isRu ? "Дата входа" : "Entry date"}: {formatDate(entryDate, locale)}
          </p>
        </div>
        <strong className="shrink-0 rounded-full bg-white px-3 py-1 text-14 font-semibold text-qidra-accent">{formatUsdt(application.amountUsdt)}</strong>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-12 font-medium text-qidra-grayBlue">
        <span className="rounded-full bg-white px-3 py-1">{application.project.structure}</span>
        <span className="rounded-full bg-white px-3 py-1">{projectStatusLabel(application.project.status, locale)}</span>
      </div>
    </article>
  );
}

function projectStatusLabel(status: string, locale: Locale) {
  const labels: Record<string, { en: string; ru: string }> = {
    ACTIVE: { ru: "Активен", en: "Active" },
    CLOSED: { ru: "Закрыт", en: "Closed" },
    DRAFT: { ru: "Черновик", en: "Draft" },
    FUNDED: { ru: "Собран", en: "Funded" },
    PAUSED: { ru: "Пауза", en: "Paused" },
    REVIEW: { ru: "На проверке", en: "Review" }
  };

  return labels[status]?.[locale] ?? status;
}

function MetricCard({ label, tone = "neutral", value }: { label: string; tone?: Tone; value: string }) {
  const valueClass = toneClass(tone);

  return (
    <article className="premium-card min-h-[104px] p-4 shadow-[0_10px_26px_rgba(18,20,23,0.04)]">
      <p className="text-12 font-semibold uppercase leading-tight tracking-[0.02em] text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 break-words text-[18px] font-semibold leading-tight tracking-[0] ${valueClass}`}>{value}</p>
    </article>
  );
}

function InfoBlock({ compact = false, label, locale, value }: { compact?: boolean; label: string; locale: Locale; value: string | number | null | undefined }) {
  return (
    <div className="min-h-[96px] rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <p className="text-13 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-2 break-words font-medium leading-snug text-qidra-dark ${compact ? "text-13" : "text-15"}`}>
        {value || (locale === "ru" ? "Не указано" : "Not provided")}
      </p>
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

function dividendPaymentStatusLabel(status: DividendPaymentStatus, locale: Locale) {
  if (status === DividendPaymentStatus.PAID) return locale === "ru" ? "Выплачено" : "Paid";
  if (status === DividendPaymentStatus.APPROVED) return locale === "ru" ? "Утверждено" : "Approved";
  if (status === DividendPaymentStatus.CANCELLED) return locale === "ru" ? "Отменено" : "Cancelled";
  return locale === "ru" ? "Рассчитано" : "Calculated";
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
    "investment.activate": { ru: "Партнёрский контракт активирован автоматически", en: "Partnership contract activated automatically" },
    "investment.activate.from_pending": { ru: "Заявка на участие активирована из резерва", en: "Participation request activated from reserve" },
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
    "user.password_reset.identity_mismatch": { ru: "Восстановление доступа отклонено: документы не совпали", en: "Access recovery rejected: documents did not match" },
    "user.password_reset.link_sent": { ru: "Ссылка восстановления доступа отправлена", en: "Access recovery link sent" },
    "user.delete.permanent": { ru: "Пользователь удалён полностью", en: "User permanently deleted" },
    "user.profile.update": { ru: "Карточка участника обновлена", en: "Participant card updated" },
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

function contractRelatedTransaction(transaction: ClientWalletTransaction, applicationId: string) {
  return Boolean(transaction.note?.includes(applicationId));
}

function sumUsdt(values: { toString(): string }[]) {
  return values.reduce<number>((total, value) => total + Number(value.toString()), 0);
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
