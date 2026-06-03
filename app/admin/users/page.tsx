import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackButton } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { UserAvatar } from "@/components/UserAvatar";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";

const users = [
  { name: "Adam M.", email: "qidra.hub@gmail.com", role: "super_admin", status: { ru: "Активен", en: "Active" } },
  { name: "Participant Demo", email: "participant@example.com", role: "participant", status: { ru: "Email ожидает подтверждения", en: "Email pending" } },
  { name: "Compliance Manager", email: "kyc@example.com", role: "admin", status: { ru: "Ограниченный доступ", en: "Limited access" } }
];

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/users");

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
          <div className="mt-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="title-48 text-qidra-dark">{locale === "ru" ? "Пользователи" : "Users"}</h1>
              <p className="mt-4 text-20 text-qidra-grayBlue">
                {locale === "ru" ? "Управление участниками, администраторами и уровнями доступа менеджеров." : "Manage participants, admins and manager access levels."}
              </p>
            </div>
            <FeedbackButton
              feedback={{
                title: locale === "ru" ? "Приглашение отправлено" : "Invitation sent",
                text:
                  locale === "ru"
                    ? "Менеджер получит письмо со ссылкой для создания аккаунта и настройки доступа."
                    : "The manager will receive an email with a link to create an account and set up access.",
                buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              variant="dark"
            >
              {locale === "ru" ? "Пригласить менеджера" : "Invite manager"}
            </FeedbackButton>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container-qidra overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-qidra-grayLight text-14 font-medium text-qidra-grayBlue">
                <th className="py-4">{locale === "ru" ? "Пользователь" : "User"}</th>
                <th className="py-4">{locale === "ru" ? "Роль" : "Role"}</th>
                <th className="py-4">{locale === "ru" ? "Статус" : "Status"}</th>
                <th className="py-4">{locale === "ru" ? "Доступ" : "Access"}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.email} className="border-b border-qidra-grayLight">
                  <td className="py-5">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name} />
                      <div>
                        <p className="text-16 font-medium text-qidra-dark">{user.name}</p>
                        <p className="text-14 text-qidra-grayBlue">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-5 text-16 text-qidra-grayBlue">{user.role}</td>
                  <td className="py-5 text-16 text-qidra-grayBlue">{user.status[locale]}</td>
                  <td className="py-5">
                    <FeedbackButton
                      feedback={{
                        title: locale === "ru" ? "Профиль проверен" : "Profile reviewed",
                        text:
                          locale === "ru"
                            ? "Решение по доступу сохранено в журнале проверки пользователя."
                            : "The access decision was saved in the user review log.",
                        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                        tone: "success"
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {locale === "ru" ? "Проверить" : "Review"}
                    </FeedbackButton>
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
