import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { companyMemberRoleLabel } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

const teamRoles = ["ADMIN", "EDITOR", "ANALYST"] as const;

export default async function CompanyTeamPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";
  const { membership } = await requireCompanyAccess(locale, "/company/team");
  const [members, invites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId: membership.organizationId },
      include: { user: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }]
    }),
    prisma.organizationInvite.findMany({
      where: { organizationId: membership.organizationId, acceptedAt: null },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return (
    <>
      <Header locale={locale} path="/company/team" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card p-6 sm:p-8">
              <p className="eyebrow">{isRu ? "Access model" : "Access model"}</p>
              <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">{isRu ? "Команда компании" : "Company team"}</h1>
              <p className="mt-4 max-w-4xl text-18 text-qidra-grayBlue">
                {isRu
                  ? "Многоучётность внутри компании: подключайте коллег, назначайте роли и управляйте доступом к лидам, документам и аналитике."
                  : "Multi-account access inside the company: invite colleagues, assign roles, and manage access to leads, documents, and analytics."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath="/company/team" locale={locale}>
            <div className="grid gap-8 xl:grid-cols-[0.86fr_1.14fr]">
              <FeedbackForm
                className="premium-card grid gap-5 p-6 sm:p-8"
                endpoint={`/api/company/team?lang=${locale}`}
                feedback={{
                  title: isRu ? "Команда обновлена" : "Team updated",
                  text: isRu ? "Участник добавлен или для него создано приглашение." : "The teammate was added or an invitation was created.",
                  buttonLabel: isRu ? "Понятно" : "Got it",
                  dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                  tone: "success"
                }}
                refreshOnSuccess
              >
                <Input label="Email" name="email" required type="email" />
                <Input label={isRu ? "Имя коллеги" : "Colleague name"} name="name" />
                <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                  <span>{isRu ? "Роль в компании" : "Role in the company"}</span>
                  <select className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" name="role">
                    {teamRoles.map((role) => (
                      <option key={role} value={role}>
                        {companyMemberRoleLabel(role, locale)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button className="w-full sm:w-auto" type="submit">
                  {isRu ? "Добавить в компанию" : "Add to company"}
                </Button>
              </FeedbackForm>

              <div className="grid content-start gap-5">
                <section className="premium-card p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Активные участники" : "Active teammates"}</h2>
                    <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-12 font-medium text-qidra-accent">{members.length}</span>
                  </div>
                  <div className="mt-6 grid gap-3">
                    {members.map((member) => (
                      <article key={member.id} className="rounded-[18px] bg-qidra-grayLight p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-17 font-medium text-qidra-dark">{member.user.name || member.user.email}</p>
                            <p className="mt-1 text-14 text-qidra-grayBlue">{member.user.email}</p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-12 font-medium text-qidra-accent">{companyMemberRoleLabel(member.role, locale)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                <section className="premium-card p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Ожидают принятия" : "Pending invitations"}</h2>
                    <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-12 font-medium text-qidra-accent">{invites.length}</span>
                  </div>
                  <div className="mt-6 grid gap-3">
                    {invites.length ? (
                      invites.map((invite) => (
                        <article key={invite.id} className="rounded-[18px] bg-qidra-grayLight p-5">
                          <p className="text-17 font-medium text-qidra-dark">{invite.name || invite.email}</p>
                          <p className="mt-1 text-14 text-qidra-grayBlue">{invite.email}</p>
                          <p className="mt-2 text-13 text-qidra-grayBlue">{companyMemberRoleLabel(invite.role, locale)}</p>
                          <p className="mt-1 text-13 text-qidra-grayBlue">
                            {isRu ? "Действует до" : "Valid until"}{" "}
                            {new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(invite.expiresAt)}
                          </p>
                          <a className="mt-3 inline-block text-14 font-medium text-qidra-accent hover:text-qidra-dark" href={withLocale(`/auth/sign-up?invite=${invite.token}`, locale)}>
                            {isRu ? "Открыть ссылку приглашения" : "Open invitation link"}
                          </a>
                          <div className="mt-4 flex flex-wrap gap-3">
                            <FeedbackForm
                              endpoint={`/api/company/team?lang=${locale}`}
                              feedback={{
                                title: isRu ? "Приглашение обновлено" : "Invitation refreshed",
                                text: isRu ? "Ссылка обновлена и письмо отправлено повторно." : "The link was refreshed and the email was sent again.",
                                buttonLabel: isRu ? "Понятно" : "Got it",
                                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                                tone: "success"
                              }}
                              refreshOnSuccess
                            >
                              <input name="action" type="hidden" value="resend" />
                              <input name="inviteId" type="hidden" value={invite.id} />
                              <Button type="submit" variant="outline">
                                {isRu ? "Отправить повторно" : "Resend"}
                              </Button>
                            </FeedbackForm>
                            <FeedbackForm
                              confirm={{
                                title: isRu ? "Отменить приглашение?" : "Cancel invitation?",
                                text: isRu ? "Ссылка перестанет работать, а сотрудник не сможет завершить регистрацию по текущему invite." : "The link will stop working and the teammate will no longer be able to register with this invite.",
                                confirmLabel: isRu ? "Отменить приглашение" : "Cancel invitation",
                                cancelLabel: isRu ? "Не отменять" : "Keep it",
                                tone: "warning"
                              }}
                              endpoint={`/api/company/team?lang=${locale}`}
                              feedback={{
                                title: isRu ? "Приглашение отменено" : "Invitation cancelled",
                                text: isRu ? "Ссылка приглашения отключена." : "The invitation link was disabled.",
                                buttonLabel: isRu ? "Понятно" : "Got it",
                                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                                tone: "success"
                              }}
                              refreshOnSuccess
                            >
                              <input name="action" type="hidden" value="cancel" />
                              <input name="inviteId" type="hidden" value={invite.id} />
                              <Button type="submit" variant="outline">
                                {isRu ? "Отменить" : "Cancel"}
                              </Button>
                            </FeedbackForm>
                          </div>
                        </article>
                      ))
                    ) : (
                      <NotificationCard
                        title={isRu ? "Нет активных приглашений" : "No active invitations"}
                        text={isRu ? "Новые приглашения для сотрудников появятся здесь." : "New staff invitations will appear here."}
                        tone="info"
                      />
                    )}
                  </div>
                </section>
              </div>
            </div>
          </CompanyWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
