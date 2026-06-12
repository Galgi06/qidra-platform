import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { companyLeadStatusLabel } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";

const leadStatuses = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"] as const;

export default async function CompanyLeadsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";
  const { membership } = await requireCompanyAccess(locale, "/company/leads");
  const leads = await prisma.organizationLead.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      project: { select: { slug: true, titleEn: true, titleRu: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return (
    <>
      <Header locale={locale} path="/company/leads" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card p-6 sm:p-8">
              <p className="eyebrow">{isRu ? "Pipeline" : "Pipeline"}</p>
              <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">{isRu ? "Company leads inbox" : "Company leads inbox"}</h1>
              <p className="mt-4 max-w-4xl text-18 text-qidra-grayBlue">
                {isRu
                  ? "Отдельный inbox компании для обращений, пришедших через публичные проекты и карточки компании на платформе."
                  : "A dedicated company inbox for inbound interest coming through public projects and company pages on the platform."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath="/company/leads" locale={locale}>
            <div className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-4">
                {leadStatuses.map((status) => (
                  <MetricCard key={status} label={companyLeadStatusLabel(status, locale)} value={leads.filter((lead) => lead.status === status).length.toString()} />
                ))}
              </div>
              {leads.length ? (
                <div className="grid gap-4">
                  {leads.map((lead) => (
                    <FeedbackForm
                      key={lead.id}
                      className="premium-card grid gap-4 p-6 sm:p-8"
                      endpoint={`/api/company/leads?lang=${locale}`}
                      feedback={{
                        title: isRu ? "Лид обновлён" : "Lead updated",
                        text: isRu ? "Статус обращения сохранён." : "The lead status was saved.",
                        buttonLabel: isRu ? "Понятно" : "Got it",
                        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                        tone: "success"
                      }}
                      refreshOnSuccess
                    >
                      <input name="leadId" type="hidden" value={lead.id} />
                      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-[24px] font-medium leading-tight text-qidra-dark">{lead.leadName || lead.leadEmail || (isRu ? "Новый контакт" : "New contact")}</h2>
                            <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-12 font-medium text-qidra-accent">{companyLeadStatusLabel(lead.status, locale)}</span>
                          </div>
                          <p className="text-14 text-qidra-grayBlue">
                            {lead.project ? `${isRu ? "Проект" : "Project"}: ${locale === "ru" ? lead.project.titleRu : lead.project.titleEn}` : isRu ? "Обращение без привязки к проекту" : "Lead without a linked project"}
                          </p>
                          <div className="grid gap-2 text-15 text-qidra-grayBlue sm:grid-cols-2">
                            <InfoRow label={isRu ? "Источник" : "Source"} value={lead.source} />
                            <InfoRow label="Email" value={lead.leadEmail || "—"} />
                            <InfoRow label={isRu ? "Телефон" : "Phone"} value={lead.leadPhone || "—"} />
                            <InfoRow label={isRu ? "Страна" : "Country"} value={lead.leadCountry || "—"} />
                            <InfoRow label="WhatsApp" value={lead.leadWhatsapp || "—"} />
                            <InfoRow label={isRu ? "Сумма интереса" : "Requested amount"} value={lead.requestedAmountUsdt ? `${lead.requestedAmountUsdt.toString()} USDT` : "—"} />
                            <InfoRow label={isRu ? "Поступил" : "Created"} value={new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(lead.createdAt)} />
                          </div>
                        </div>
                        <div className="grid gap-3">
                          <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                            <span>{isRu ? "Статус" : "Status"}</span>
                            <select className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" defaultValue={lead.status} name="status">
                              {leadStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {companyLeadStatusLabel(status, locale)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                            <span>{isRu ? "Примечание по лиду" : "Lead note"}</span>
                            <textarea className="field-shell min-h-[120px] rounded-qidra px-4 py-3 text-16 outline-none" defaultValue={lead.note || ""} name="note" />
                          </label>
                          <Button className="w-full sm:w-auto" type="submit">
                            {isRu ? "Сохранить статус" : "Save status"}
                          </Button>
                        </div>
                      </div>
                    </FeedbackForm>
                  ))}
                </div>
              ) : (
                <NotificationCard
                  title={isRu ? "Лидов пока нет" : "No leads yet"}
                  text={
                    isRu
                      ? "Когда инвесторы оставят заявки по проектам компании, они появятся здесь отдельным inbox-потоком."
                      : "Once investors submit applications for company projects, they will appear here as a dedicated inbox stream."
                  }
                  tone="info"
                />
              )}
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-12 text-qidra-grayBlue">{label}</p>
      <p className="mt-1 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}
