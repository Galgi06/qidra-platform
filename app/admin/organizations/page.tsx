import Link from "next/link";
import { OrganizationStatus } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/access";
import { companyMemberRoleLabel, companyStatusLabel } from "@/lib/organizations";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const organizationStatuses: OrganizationStatus[] = ["DRAFT", "REVIEW", "APPROVED", "REJECTED"];

export default async function AdminOrganizationsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const isRu = locale === "ru";
  await requireAdmin(locale, "/admin/organizations");
  const statusQuery = Array.isArray(params?.status) ? params?.status[0] : params?.status;
  const statusFilter = organizationStatuses.find((status) => status.toLowerCase() === statusQuery?.toLowerCase());

  const [organizations, stats] = await Promise.all([
    prisma.organization.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        founder: { select: { email: true, id: true, name: true } },
        members: {
          include: {
            user: { select: { email: true, id: true, name: true } }
          },
          orderBy: { createdAt: "asc" }
        },
        _count: {
          select: {
            projects: true,
            projectSubmissions: true,
            documents: true
          }
        }
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    }),
    prisma.organization.groupBy({ by: ["status"], _count: { _all: true } })
  ]);

  return (
    <>
      <Header locale={locale} path="/admin/organizations" />
      <main className="premium-page">
        <section className="section">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: "Qidra", href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: isRu ? "Компании" : "Companies" }
              ]}
            />
            <div className="mt-8">
              <p className="section-kicker">{isRu ? "Модерация компаний" : "Company moderation"}</p>
              <h1 className="title-48 text-qidra-dark">{isRu ? "Профили компаний" : "Company profiles"}</h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Очередь профилей компаний, их ownership и публичные страницы."
                  : "Queue of company profiles, ownership and public pages."}
              </p>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/organizations" locale={locale} />
            <div className="flex flex-wrap gap-3">
              <FilterButton active={!statusFilter} href={withLocale("/admin/organizations", locale)} label={`${isRu ? "Все" : "All"} (${totalCount(stats)})`} />
              {organizationStatuses.map((status) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  href={withLocale(`/admin/organizations?status=${status.toLowerCase()}`, locale)}
                  label={`${companyStatusLabel(status, locale)} (${statusCount(stats, status)})`}
                />
              ))}
            </div>
            {organizations.length ? (
              <div className="grid gap-5">
                {organizations.map((organization) => {
                  const owner = organization.members.find((member) => member.role === "OWNER") ?? organization.members[0] ?? null;

                  return (
                    <article key={organization.id} className="premium-card grid gap-5 p-6 sm:p-8">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-14 text-qidra-grayBlue">{organization.publicSlug}</p>
                          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{organization.displayName}</h2>
                          <p className="mt-2 text-16 text-qidra-grayBlue">{organization.legalName}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <span className="rounded-full bg-qidra-grayLight px-4 py-2 text-13 font-medium text-qidra-accent">{companyStatusLabel(organization.status, locale)}</span>
                          <ButtonLink href={withLocale(`/companies/${organization.publicSlug}`, locale)} size="sm" variant="outline">
                            {isRu ? "Публичная страница" : "Public page"}
                          </ButtonLink>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <Fact label={isRu ? "Контактный email" : "Contact email"} value={organization.contactEmail || "—"} />
                        <Fact label={isRu ? "Основной владелец" : "Primary owner"} value={owner?.user.email || organization.founder.email || "—"} />
                        <Fact label={isRu ? "Участников команды" : "Team members"} value={organization.members.length.toString()} />
                        <Fact label={isRu ? "Документов" : "Documents"} value={organization._count.documents.toString()} />
                        <Fact label={isRu ? "Проектов" : "Projects"} value={organization._count.projects.toString()} />
                        <Fact label={isRu ? "Листингов" : "Listings"} value={organization._count.projectSubmissions.toString()} />
                        <Fact label={isRu ? "Founder" : "Founder"} value={organization.founder.email} />
                        <Fact label={isRu ? "Последнее обновление" : "Last updated"} value={formatDate(organization.updatedAt, locale)} />
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {organization.members.map((member) => (
                          <div key={member.id} className="rounded-[18px] bg-qidra-grayLight p-4">
                            <p className="text-13 text-qidra-grayBlue">{companyMemberRoleLabel(member.role, locale)}</p>
                            <p className="mt-2 text-15 font-medium text-qidra-dark">{member.user.name || (isRu ? "Без имени" : "No name")}</p>
                            <p className="mt-1 text-14 text-qidra-grayBlue">{member.user.email}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <OrganizationStatusForm action="approve" locale={locale} organizationId={organization.id} />
                        <OrganizationStatusForm action="reject" locale={locale} organizationId={organization.id} />
                        <OrganizationStatusForm action="review" locale={locale} organizationId={organization.id} />
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <NotificationCard
                title={isRu ? "Компаний не найдено" : "No companies found"}
                text={isRu ? "Измените фильтр по статусу." : "Change the status filter."}
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function OrganizationStatusForm({ action, locale, organizationId }: { action: "approve" | "reject" | "review"; locale: "ru" | "en"; organizationId: string }) {
  const isRu = locale === "ru";
  const labels = {
    approve: isRu ? "Одобрить" : "Approve",
    reject: isRu ? "Нужны правки" : "Needs updates",
    review: isRu ? "Вернуть в проверку" : "Move to review"
  } as const;

  return (
    <FeedbackForm
      className="contents"
      endpoint={`/api/admin/organizations/${organizationId}?lang=${locale}`}
      feedback={{
        title: isRu ? "Статус обновлён" : "Status updated",
        text: isRu ? "Статус профиля компании сохранён." : "The company profile status was saved.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      reloadOnSuccess
    >
      <input name="action" type="hidden" value={action} />
      <Button type="submit" variant={action === "approve" ? "dark" : "outline"} size="sm">
        {labels[action]}
      </Button>
    </FeedbackForm>
  );
}

function FilterButton({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        active ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayLight bg-white text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-qidra-grayLight p-4">
      <p className="text-13 text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-15 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}

function formatDate(value: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

function totalCount(stats: { _count: { _all: number }; status: OrganizationStatus }[]) {
  return stats.reduce((sum, item) => sum + item._count._all, 0);
}

function statusCount(stats: { _count: { _all: number }; status: OrganizationStatus }[], status: OrganizationStatus) {
  return stats.find((item) => item.status === status)?._count._all ?? 0;
}
