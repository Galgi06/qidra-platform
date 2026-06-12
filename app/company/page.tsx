import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { companyHomeNextStep, companyLeadStatusLabel, companyMemberRoleLabel, companyStatusLabel } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

export default async function CompanyPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";
  const { membership, session } = await requireCompanyAccess(locale, "/company");
  const organization = membership.organization;
  const userId = session.user?.id ?? "";
  const [submissionCount, activeProjects, memberCount, leadCount, newLeadCount, documentCount] = await Promise.all([
    prisma.projectSubmission.count({ where: { organizationId: organization.id } }),
    prisma.project.count({ where: { organizationId: organization.id } }),
    prisma.organizationMember.count({ where: { organizationId: organization.id } }),
    prisma.organizationLead.count({ where: { organizationId: organization.id } }),
    prisma.organizationLead.count({ where: { organizationId: organization.id, status: "NEW" } }),
    prisma.organizationDocument.count({ where: { organizationId: organization.id } })
  ]);
  const nextStep = companyHomeNextStep(organization.status, locale);

  return (
    <>
      <Header locale={locale} path="/company" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="eyebrow">{isRu ? "Кабинет компании" : "Company workspace"}</p>
                <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">{organization.displayName}</h1>
                <p className="mt-3 max-w-4xl text-18 text-qidra-grayBlue">
                  {organization.valueProposition ||
                    (isRu
                      ? "Управляйте профилем компании, публикуйте продукты и собирайте входящие лиды через платформу Qidra."
                      : "Manage your company profile, publish products, and collect inbound leads through the Qidra platform.")}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={withLocale(nextStep.href, locale)} className="h-12 min-w-44">
                  {nextStep.buttonLabel}
                </ButtonLink>
                <ButtonLink href={withLocale(`/companies/${organization.publicSlug}`, locale)} variant="outline" className="h-12 min-w-44">
                  {isRu ? "Открыть публичную страницу" : "Open public page"}
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath="/company" locale={locale}>
            <div className="grid gap-8">
              <div className="grid gap-5 md:grid-cols-4">
                <MetricCard label={isRu ? "Статус компании" : "Company status"} value={companyStatusLabel(organization.status, locale)} />
                <MetricCard label={isRu ? "Роль пользователя" : "Your role"} value={companyMemberRoleLabel(membership.role, locale)} />
                <MetricCard label={isRu ? "Новых лидов" : "New leads"} value={newLeadCount.toString()} />
                <MetricCard label={isRu ? "Публичных проектов" : "Public projects"} value={activeProjects.toString()} />
              </div>

              <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr]">
                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{nextStep.title}</h2>
                  <p className="mt-4 max-w-3xl text-18 text-qidra-grayBlue">{nextStep.text}</p>
                  <div className="mt-8 grid gap-0">
                    <ActionRow
                      href={withLocale("/company/profile", locale)}
                      label={companyStatusLabel(organization.status, locale)}
                      text={isRu ? "Позиционирование компании, представитель, контакты, документы и маркетинговый текст." : "Company positioning, representative, contacts, documents, and marketing copy."}
                      title={isRu ? "Профиль компании" : "Company profile"}
                    />
                    <ActionRow
                      href={withLocale("/company/documents", locale)}
                      label={documentCount.toString()}
                      text={isRu ? "Загружайте регистрационные документы, product sheets, compliance-файлы и материалы для модерации." : "Upload registration docs, product sheets, compliance files, and moderation materials."}
                      title={isRu ? "Документы компании" : "Company documents"}
                    />
                    <ActionRow
                      href={withLocale("/investor/projects/new", locale)}
                      label={isRu ? "Создать" : "Create"}
                      text={isRu ? "Создайте проект, объект или продукт от имени компании и отправьте его на модерацию." : "Create a project, property, or product on behalf of the company and send it for moderation."}
                      title={isRu ? "Листинги и продукты" : "Listings and products"}
                    />
                    <ActionRow
                      href={withLocale("/company/leads", locale)}
                      label={companyLeadStatusLabel("NEW", locale)}
                      text={isRu ? "Отдельный inbox для входящих обращений из публичных карточек и инвестиционных заявок." : "Dedicated inbox for inbound interest from public cards and investment applications."}
                      title={isRu ? "Leads inbox" : "Leads inbox"}
                    />
                    <ActionRow
                      href={withLocale("/company/team", locale)}
                      label={memberCount.toString()}
                      text={isRu ? "Подключайте коллег, распределяйте роли owner/admin/editor/analyst и масштабируйте B2B-команду." : "Add colleagues, assign owner/admin/editor/analyst roles, and scale the B2B team."}
                      title={isRu ? "Команда компании" : "Company team"}
                    />
                    <ActionRow
                      href={withLocale("/company/analytics", locale)}
                      label={leadCount.toString()}
                      last
                      text={isRu ? "Смотрите просмотры страниц компании и проектов, а также how many views turn into leads." : "Review company and project page views, plus how many views turn into leads."}
                      title={isRu ? "Аналитика компании" : "Company analytics"}
                    />
                  </div>
                </section>

                <aside className="grid content-start gap-5">
                  <NotificationCard
                    title={isRu ? "B2B-роль платформы" : "B2B role on the platform"}
                    text={
                      isRu
                        ? "Qidra помогает компаниям представить продукт рынку, собрать входящие обращения и направить потенциального клиента напрямую к компании."
                        : "Qidra helps companies present an offering to the market, collect inbound interest, and route the potential client directly to the company."
                    }
                    tone="info"
                  />
                  <section className="premium-card p-6 sm:p-8">
                    <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Структура команды" : "Team structure"}</h2>
                    <div className="mt-5 grid gap-3 text-16 text-qidra-grayBlue">
                      <InfoRow label={isRu ? "Юридическое название" : "Legal name"} value={organization.legalName} />
                      <InfoRow label={isRu ? "Страна" : "Country"} value={organization.country || (isRu ? "Не указана" : "Not set")} />
                      <InfoRow label={isRu ? "Представитель" : "Representative"} value={organization.representativeName || session.user?.name || (isRu ? "Не указан" : "Not set")} />
                      <InfoRow label={isRu ? "Участников команды" : "Team members"} value={memberCount.toString()} />
                      <InfoRow label={isRu ? "Загружено документов" : "Documents uploaded"} value={documentCount.toString()} />
                      <InfoRow label={isRu ? "Всего лидов" : "Total leads"} value={leadCount.toString()} />
                    </div>
                  </section>
                </aside>
              </div>
            </div>
          </CompanyWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="mt-3 text-[28px] font-medium leading-none text-qidra-dark">{value}</p>
    </div>
  );
}

function ActionRow({ href, label, last = false, text, title }: { href: string; label: string; last?: boolean; text: string; title: string }) {
  return (
    <a className={`grid gap-2 py-5 ${last ? "" : "border-b border-qidra-grayLight"}`} href={href}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-18 font-medium text-qidra-dark">{title}</p>
        <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-12 font-medium text-qidra-accent">{label}</span>
      </div>
      <p className="text-14 text-qidra-grayBlue">{text}</p>
    </a>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-13 text-qidra-grayBlue">{label}</p>
      <p className="mt-1 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}
