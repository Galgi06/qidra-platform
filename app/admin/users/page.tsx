import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { UserAvatar } from "@/components/UserAvatar";
import { requireAdmin } from "@/lib/access";
import { canManageManagers } from "@/lib/auth";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const session = await requireAdmin(locale, "/admin/users");
  const canManageRoles = canManageManagers(session.user?.role as "ADMIN" | "SUPER_ADMIN" | "guest" | undefined);
  const users = await prisma.user.findMany({
    include: {
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
    take: 100
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
          <div className="container-qidra overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-qidra-grayLight text-14 font-medium text-qidra-grayBlue">
                  <th className="py-4">{locale === "ru" ? "Пользователь" : "User"}</th>
                  <th className="py-4">{locale === "ru" ? "Роль" : "Role"}</th>
                  <th className="py-4">{locale === "ru" ? "Профиль" : "Profile"}</th>
                  <th className="py-4">{locale === "ru" ? "Баланс" : "Balance"}</th>
                  <th className="py-4">{locale === "ru" ? "Заявки" : "Applications"}</th>
                  <th className="py-4">{locale === "ru" ? "Доступ" : "Access"}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.email} className="border-b border-qidra-grayLight">
                    <td className="py-5 pr-6">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={user.name || user.email} />
                        <div>
                          <p className="text-16 font-medium text-qidra-dark">{user.name || (locale === "ru" ? "Без имени" : "No name")}</p>
                          <p className="text-14 text-qidra-grayBlue">{user.email}</p>
                          <p className="mt-1 text-12 text-qidra-grayBlue">{formatDate(user.createdAt, locale)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 pr-6 text-16 text-qidra-grayBlue">{roleLabel(user.role, locale)}</td>
                    <td className="py-5 pr-6 text-16 text-qidra-grayBlue">{profileStatus(user.kycApplications[0]?.status, locale)}</td>
                    <td className="py-5 pr-6 text-16 font-medium text-qidra-dark">{formatUsdt(user.wallet?.availableUsdt ?? 0)}</td>
                    <td className="py-5 pr-6 text-16 text-qidra-grayBlue">{user._count.investments}</td>
                    <td className="py-5">
                      {canManageRoles && user.id !== session.user?.id ? (
                        <RoleForm currentRole={user.role} endpoint={`/api/admin/users/${user.id}/role?lang=${locale}`} locale={locale} />
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
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function RoleForm({ currentRole, endpoint, locale }: { currentRole: string; endpoint: string; locale: "ru" | "en" }) {
  return (
    <FeedbackForm
      className="flex min-w-[260px] items-end gap-2"
      endpoint={endpoint}
      feedback={{
        title: locale === "ru" ? "Роль обновлена" : "Role updated",
        text: locale === "ru" ? "Доступ пользователя обновлён и сохранён в журнале." : "The user's access was updated and saved in the audit log.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      refreshOnSuccess
    >
      <Select
        aria-label={locale === "ru" ? "Роль пользователя" : "User role"}
        className="h-10 text-14"
        label={locale === "ru" ? "Роль" : "Role"}
        name="role"
        defaultValue={currentRole}
        options={[
          { value: "INVESTOR", label: locale === "ru" ? "Участник" : "Participant" },
          { value: "ADMIN", label: locale === "ru" ? "Админ" : "Admin" },
          { value: "SUPER_ADMIN", label: locale === "ru" ? "Главный админ" : "Super admin" }
        ]}
      />
      <Button size="sm" type="submit">
        {locale === "ru" ? "Сохранить" : "Save"}
      </Button>
    </FeedbackForm>
  );
}

function roleLabel(role: string, locale: "ru" | "en") {
  if (role === "SUPER_ADMIN") return locale === "ru" ? "Главный админ" : "Super admin";
  if (role === "ADMIN") return locale === "ru" ? "Админ" : "Admin";
  return locale === "ru" ? "Участник" : "Participant";
}

function profileStatus(status: string | undefined, locale: "ru" | "en") {
  if (status === "APPROVED") return locale === "ru" ? "Одобрен" : "Approved";
  if (status === "SUBMITTED") return locale === "ru" ? "На проверке" : "In review";
  if (status === "REJECTED") return locale === "ru" ? "Нужны правки" : "Needs updates";
  return locale === "ru" ? "Не отправлен" : "Not submitted";
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
