import Link from "next/link";
import type { ReactNode } from "react";
import { KycStatus, Prisma, Role } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { UserAvatar } from "@/components/UserAvatar";
import { CreateStaffAccountForm } from "@/components/admin/CreateStaffAccountForm";
import { RoleManagementForm } from "@/components/admin/RoleManagementForm";
import { requireAdmin } from "@/lib/access";
import { canManageManagers } from "@/lib/auth";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { userBlockMode } from "@/lib/user-access";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const session = await requireAdmin(locale, "/admin/users");
  const canManageRoles = canManageManagers(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "TECH_SUPPORT" | "SALES_MANAGER" | "guest" | undefined);
  const roleFilter = parseRole(searchParamString(params.role));
  const kycFilter = parseKycFilter(searchParamString(params.kyc));
  const query = searchParamString(params.q)?.trim() ?? "";
  const users = await prisma.user.findMany({
    include: {
      investorProfile: true,
      wallet: true,
      kycApplications: {
        orderBy: { createdAt: "desc" },
        take: 1
      },
      _count: {
        select: {
          investments: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });
  const stats = buildUserStats(users);
  const filteredUsers = users.filter((user) => {
    const latestKycStatus = user.kycApplications[0]?.status;
    const roleMatches = roleFilter ? user.role === roleFilter : true;
    const kycMatches = kycFilter ? (kycFilter === "NOT_SUBMITTED" ? !latestKycStatus : latestKycStatus === kycFilter) : true;
    const normalizedQuery = query.toLowerCase();
    const queryMatches = normalizedQuery
      ? [
          user.email,
          user.name,
          user.investorProfile?.phone,
          user.investorProfile?.phoneDialCode,
          user.investorProfile?.country,
          user.investorProfile?.city,
          user.investorProfile?.citizenship,
          user.investorProfile?.address,
          user.kycApplications[0]?.sourceOfFunds,
          user.kycApplications[0]?.occupation
        ].some((value) => value?.toLowerCase().includes(normalizedQuery))
      : true;

    return roleMatches && kycMatches && queryMatches;
  });

  return (
    <>
      <Header locale={locale} path="/admin/users" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: locale === "ru" ? "Пользователи" : "Users" }
              ]}
            />
            <div className="mt-8">
              <h1 className="title-48 text-qidra-dark">{locale === "ru" ? "Пользователи" : "Users"}</h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {locale === "ru"
                  ? "Реальные аккаунты платформы, статусы профиля, баланс и роли доступа."
                  : "Real platform accounts, profile statuses, balances and access roles."}
              </p>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/users" locale={locale} />
            <UsersDashboard locale={locale} stats={stats} />
            {canManageRoles ? <CreateStaffAccountForm locale={locale} /> : null}
            <UserSearchForm kycFilter={kycFilter} locale={locale} query={query} resultCount={filteredUsers.length} roleFilter={roleFilter} />
            <UsersFilters kycFilter={kycFilter} locale={locale} query={query} roleFilter={roleFilter} stats={stats} />
            {filteredUsers.length ? (
              <div className="overflow-x-auto rounded-qidra bg-white p-2 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-qidra-grayLight text-14 font-medium text-qidra-grayBlue">
                      <th className="py-4 pl-4">{locale === "ru" ? "Пользователь" : "User"}</th>
                      <th className="py-4">{locale === "ru" ? "Роль" : "Role"}</th>
                      <th className="py-4">{locale === "ru" ? "Профиль" : "Profile"}</th>
                      <th className="py-4">{locale === "ru" ? "Баланс" : "Balance"}</th>
                      <th className="py-4">{locale === "ru" ? "Заявки" : "Applications"}</th>
                      <th className="py-4">{locale === "ru" ? "Досье клиента" : "Client dossier"}</th>
                      <th className="py-4">{locale === "ru" ? "Роль и доступ" : "Role and access"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.email} className="border-b border-qidra-grayLight last:border-b-0">
                        <td className="py-5 pl-4 pr-6">
                          <div className="flex items-center gap-3">
                            <UserAvatar name={user.name || user.email} />
                            <div>
                              <p className="text-16 font-medium text-qidra-dark">{user.name || (locale === "ru" ? "Без имени" : "No name")}</p>
                              <p className="text-14 text-qidra-grayBlue">{user.email}</p>
                              {userBlockMode(user) !== "active" ? <p className="mt-1 text-12 font-medium text-qidra-red">{accessStatusLabel(user, locale)}</p> : null}
                              <p className="mt-1 text-12 text-qidra-grayBlue">{formatDate(user.createdAt, locale)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 pr-6 text-16 text-qidra-grayBlue">{roleLabel(user.role, locale)}</td>
                        <td className="py-5 pr-6 text-16 text-qidra-grayBlue">{profileStatus(user.kycApplications[0]?.status, locale)}</td>
                        <td className="py-5 pr-6 text-16 font-medium text-qidra-dark">{formatUsdt(user.wallet?.availableUsdt ?? 0)}</td>
                        <td className="py-5 pr-6 text-16 text-qidra-grayBlue">{user._count.investments}</td>
                        <td className="py-5 pr-6">
                          <Link
                            className="inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-dark px-4 text-14 font-medium text-qidra-dark transition-colors hover:bg-qidra-dark hover:text-white"
                            href={withLocale(`/admin/users/${user.id}`, locale)}
                          >
                            {locale === "ru" ? "Открыть досье" : "Open dossier"}
                          </Link>
                        </td>
                        <td className="py-5">
                          {canManageRoles && user.id !== session.user?.id ? (
                            <RoleManagementForm compact currentRole={user.role} endpoint={`/api/admin/users/${user.id}/role?lang=${locale}`} locale={locale} />
                          ) : (
                            <span className="text-14 text-qidra-grayBlue">
                              {user.id === session.user?.id ? (locale === "ru" ? "Ваш аккаунт" : "Your account") : locale === "ru" ? "Только просмотр" : "View only"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <NotificationCard
                title={locale === "ru" ? "Пользователи не найдены" : "No users found"}
                text={locale === "ru" ? "Измените фильтры по роли или статусу профиля." : "Change the role or profile status filters."}
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

type AdminUserListItem = Prisma.UserGetPayload<{
  include: {
    wallet: true;
    investorProfile: true;
    kycApplications: {
      orderBy: {
        createdAt: "desc";
      };
      take: 1;
    };
    _count: {
      select: {
        investments: true;
      };
    };
  };
}>;
type KycFilter = KycStatus | "NOT_SUBMITTED";

type UserStats = {
  adminCount: number;
  approvedKycCount: number;
  investorCount: number;
  notSubmittedKycCount: number;
  pendingKycCount: number;
  rejectedKycCount: number;
  salesManagerCount: number;
  superAdminCount: number;
  techSupportCount: number;
  totalCount: number;
};

function UsersDashboard({ locale, stats }: { locale: "ru" | "en"; stats: UserStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <UserStatCard label={locale === "ru" ? "Всего аккаунтов" : "Total accounts"} value={stats.totalCount} />
      <UserStatCard label={locale === "ru" ? "Участники" : "Participants"} value={stats.investorCount} />
      <UserStatCard label={locale === "ru" ? "Админы" : "Admins"} tone="accent" value={stats.adminCount + stats.superAdminCount} />
      <UserStatCard label={locale === "ru" ? "Менеджеры" : "Managers"} tone="accent" value={stats.techSupportCount + stats.salesManagerCount} />
      <UserStatCard label={locale === "ru" ? "KYC на проверке" : "KYC pending"} tone="accent" value={stats.pendingKycCount} />
      <UserStatCard label={locale === "ru" ? "KYC одобрен" : "KYC approved"} tone="success" value={stats.approvedKycCount} />
    </div>
  );
}

function UserStatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "neutral" | "success"; value: number }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{formatCount(value)}</p>
    </article>
  );
}

function UserSearchForm({
  kycFilter,
  locale,
  query,
  resultCount,
  roleFilter
}: {
  kycFilter?: KycFilter;
  locale: "ru" | "en";
  query: string;
  resultCount: number;
  roleFilter?: Role;
}) {
  return (
    <form action="/admin/users" className="grid gap-3 rounded-qidra border border-qidra-grayLight bg-white p-4 md:grid-cols-[1fr_auto] md:items-end">
      <input name="lang" type="hidden" value={locale} />
      {roleFilter ? <input name="role" type="hidden" value={roleFilter.toLowerCase()} /> : null}
      {kycFilter ? <input name="kyc" type="hidden" value={kycFilter.toLowerCase()} /> : null}
      <label className="grid gap-2 text-14 font-medium text-qidra-dark">
        {locale === "ru" ? "Быстрый поиск клиента" : "Quick client search"}
        <input
          className="h-12 rounded-qidra border border-transparent bg-qidra-grayLight px-4 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
          defaultValue={query}
          name="q"
          placeholder={locale === "ru" ? "Email, имя, телефон, страна, город или профессия" : "Email, name, phone, country, city or occupation"}
          type="search"
        />
        <span className="text-13 font-normal text-qidra-grayBlue">
          {query
            ? locale === "ru"
              ? `Найдено клиентов: ${formatCount(resultCount)}`
              : `Clients found: ${formatCount(resultCount)}`
            : locale === "ru"
              ? "Поиск работает по профилю, KYC-данным, телефону и email."
              : "Search covers profile, KYC data, phone and email."}
        </span>
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        {query ? (
          <Link
            className="inline-flex h-12 items-center justify-center rounded-qidra border border-qidra-grayMedium px-5 text-16 font-medium text-qidra-dark transition-colors hover:border-qidra-dark"
            href={usersFilterHref(locale, roleFilter, kycFilter)}
          >
            {locale === "ru" ? "Сбросить" : "Clear"}
          </Link>
        ) : null}
        <button className="inline-flex h-12 items-center justify-center rounded-qidra bg-qidra-dark px-5 text-16 font-medium text-white transition-colors hover:bg-qidra-accent" type="submit">
          {locale === "ru" ? "Найти клиента" : "Find client"}
        </button>
      </div>
    </form>
  );
}

function UsersFilters({ kycFilter, locale, query, roleFilter, stats }: { kycFilter?: KycFilter; locale: "ru" | "en"; query: string; roleFilter?: Role; stats: UserStats }) {
  return (
    <div className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <div className="grid gap-2">
        <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Роль" : "Role"}</p>
        <div className="flex flex-wrap gap-2">
          <UserFilterPill active={!roleFilter} href={usersFilterHref(locale, undefined, kycFilter, query)}>
            {locale === "ru" ? "Все" : "All"} ({formatCount(stats.totalCount)})
          </UserFilterPill>
          <UserFilterPill active={roleFilter === Role.INVESTOR} href={usersFilterHref(locale, Role.INVESTOR, kycFilter, query)}>
            {locale === "ru" ? "Участники" : "Participants"} ({formatCount(stats.investorCount)})
          </UserFilterPill>
          <UserFilterPill active={roleFilter === Role.TECH_SUPPORT} href={usersFilterHref(locale, Role.TECH_SUPPORT, kycFilter, query)}>
            {locale === "ru" ? "Техподдержка" : "Support"} ({formatCount(stats.techSupportCount)})
          </UserFilterPill>
          <UserFilterPill active={roleFilter === Role.SALES_MANAGER} href={usersFilterHref(locale, Role.SALES_MANAGER, kycFilter, query)}>
            {locale === "ru" ? "Отдел продаж" : "Sales"} ({formatCount(stats.salesManagerCount)})
          </UserFilterPill>
          <UserFilterPill active={roleFilter === Role.ADMIN} href={usersFilterHref(locale, Role.ADMIN, kycFilter, query)}>
            {locale === "ru" ? "Админы" : "Admins"} ({formatCount(stats.adminCount)})
          </UserFilterPill>
          <UserFilterPill active={roleFilter === Role.SUPER_ADMIN} href={usersFilterHref(locale, Role.SUPER_ADMIN, kycFilter, query)}>
            {locale === "ru" ? "Главные админы" : "Super admins"} ({formatCount(stats.superAdminCount)})
          </UserFilterPill>
        </div>
      </div>
      <div className="grid gap-2">
        <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Профиль" : "Profile"}</p>
        <div className="flex flex-wrap gap-2">
          <UserFilterPill active={!kycFilter} href={usersFilterHref(locale, roleFilter, undefined, query)}>
            {locale === "ru" ? "Все статусы" : "All statuses"} ({formatCount(stats.totalCount)})
          </UserFilterPill>
          <UserFilterPill active={kycFilter === "NOT_SUBMITTED"} href={usersFilterHref(locale, roleFilter, "NOT_SUBMITTED", query)}>
            {locale === "ru" ? "Не отправлен" : "Not submitted"} ({formatCount(stats.notSubmittedKycCount)})
          </UserFilterPill>
          <UserFilterPill active={kycFilter === KycStatus.SUBMITTED} href={usersFilterHref(locale, roleFilter, KycStatus.SUBMITTED, query)}>
            {locale === "ru" ? "На проверке" : "In review"} ({formatCount(stats.pendingKycCount)})
          </UserFilterPill>
          <UserFilterPill active={kycFilter === KycStatus.APPROVED} href={usersFilterHref(locale, roleFilter, KycStatus.APPROVED, query)}>
            {locale === "ru" ? "Одобрен" : "Approved"} ({formatCount(stats.approvedKycCount)})
          </UserFilterPill>
          <UserFilterPill active={kycFilter === KycStatus.REJECTED} href={usersFilterHref(locale, roleFilter, KycStatus.REJECTED, query)}>
            {locale === "ru" ? "Нужны правки" : "Needs updates"} ({formatCount(stats.rejectedKycCount)})
          </UserFilterPill>
        </div>
      </div>
    </div>
  );
}

function UserFilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
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

function roleLabel(role: string, locale: "ru" | "en") {
  if (role === "SUPER_ADMIN") return locale === "ru" ? "Главный админ" : "Super admin";
  if (role === "ADMIN") return locale === "ru" ? "Админ" : "Admin";
  if (role === "TECH_SUPPORT") return locale === "ru" ? "Менеджер техподдержки" : "Technical support manager";
  if (role === "SALES_MANAGER") return locale === "ru" ? "Менеджер отдела продаж" : "Sales manager";
  return locale === "ru" ? "Участник" : "Participant";
}

function profileStatus(status: string | undefined, locale: "ru" | "en") {
  if (status === "APPROVED") return locale === "ru" ? "Одобрен" : "Approved";
  if (status === "SUBMITTED") return locale === "ru" ? "На проверке" : "In review";
  if (status === "REJECTED") return locale === "ru" ? "Нужны правки" : "Needs updates";
  return locale === "ru" ? "Не отправлен" : "Not submitted";
}

function accessStatusLabel(user: { blockedAt: Date | null; blockedUntil: Date | null }, locale: "ru" | "en") {
  const mode = userBlockMode(user);

  if (mode === "temporary") {
    const blockedUntil = user.blockedUntil ? formatDate(user.blockedUntil, locale) : locale === "ru" ? "срок не указан" : "end date not set";
    return locale === "ru" ? `Временная блокировка до ${blockedUntil}` : `Temporarily blocked until ${blockedUntil}`;
  }

  if (mode === "permanent") {
    return locale === "ru" ? "Постоянная блокировка" : "Permanently blocked";
  }

  return locale === "ru" ? "Активен" : "Active";
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

function buildUserStats(users: AdminUserListItem[]): UserStats {
  return users.reduce<UserStats>(
    (stats, user) => {
      const kycStatus = user.kycApplications[0]?.status;

      stats.totalCount += 1;
      if (user.role === Role.INVESTOR) stats.investorCount += 1;
      if (user.role === Role.TECH_SUPPORT) stats.techSupportCount += 1;
      if (user.role === Role.SALES_MANAGER) stats.salesManagerCount += 1;
      if (user.role === Role.ADMIN) stats.adminCount += 1;
      if (user.role === Role.SUPER_ADMIN) stats.superAdminCount += 1;
      if (!kycStatus) stats.notSubmittedKycCount += 1;
      if (kycStatus === KycStatus.SUBMITTED) stats.pendingKycCount += 1;
      if (kycStatus === KycStatus.APPROVED) stats.approvedKycCount += 1;
      if (kycStatus === KycStatus.REJECTED) stats.rejectedKycCount += 1;

      return stats;
    },
    {
      adminCount: 0,
      approvedKycCount: 0,
      investorCount: 0,
      notSubmittedKycCount: 0,
      pendingKycCount: 0,
      rejectedKycCount: 0,
      salesManagerCount: 0,
      superAdminCount: 0,
      techSupportCount: 0,
      totalCount: 0
    }
  );
}

function searchParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseRole(value: string | undefined) {
  const normalized = value?.toUpperCase();

  if (normalized === Role.INVESTOR) return Role.INVESTOR;
  if (normalized === Role.TECH_SUPPORT) return Role.TECH_SUPPORT;
  if (normalized === Role.SALES_MANAGER) return Role.SALES_MANAGER;
  if (normalized === Role.ADMIN) return Role.ADMIN;
  if (normalized === Role.SUPER_ADMIN) return Role.SUPER_ADMIN;
  return undefined;
}

function parseKycFilter(value: string | undefined): KycFilter | undefined {
  const normalized = value?.toUpperCase();

  if (normalized === "NOT_SUBMITTED") return "NOT_SUBMITTED";
  if (normalized === KycStatus.SUBMITTED) return KycStatus.SUBMITTED;
  if (normalized === KycStatus.APPROVED) return KycStatus.APPROVED;
  if (normalized === KycStatus.REJECTED) return KycStatus.REJECTED;
  return undefined;
}

function usersFilterHref(locale: "ru" | "en", role?: Role, kyc?: KycFilter, query?: string) {
  const params = new URLSearchParams({ lang: locale });

  if (role) params.set("role", role.toLowerCase());
  if (kyc) params.set("kyc", kyc.toLowerCase());
  if (query) params.set("q", query);

  return `/admin/users?${params.toString()}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
