import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectGallery } from "@/components/ProjectGallery";
import { ButtonLink } from "@/components/ui/Button";
import { recordOrganizationEvent } from "@/lib/company-workspace";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { dictionary, getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { authOptions } from "@/lib/next-auth";
import { acceptsApplications, getProjectBySlug } from "@/lib/project-catalog";
import { incomeSourceLabel, propertyStatusLabel, propertyTypeLabel } from "@/lib/real-estate";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const progress = Math.round((project.fundedUsdt / project.targetUsdt) * 100);
  const riskLabel = locale === "ru" ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;
  const isRu = locale === "ru";
  const canApply = acceptsApplications(project);
  const realEstate = project.realEstate;
  const locationLabel = realEstate ? [realEstate.country, realEstate.city].filter(Boolean).join(", ") : project.location;
  const projectTermLabel = realEstate?.projectTermMonths ? (isRu ? `${realEstate.projectTermMonths} мес.` : `${realEstate.projectTermMonths} months`) : project.lifecycle.participationTerm[locale];
  const incomeSources = realEstate?.incomeSources?.map((item) => incomeSourceLabel(item, locale)).join(", ");

  if (project.organization?.id) {
    await recordOrganizationEvent({
      organizationId: project.organization.id,
      path: `/projects/${project.slug}`,
      projectId: project.id,
      type: "PROJECT_PAGE_VIEW",
      userId: session?.user?.id
    });
  }

  return (
    <>
      <Header locale={locale} path={`/projects/${project.slug}`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <Breadcrumbs
              items={[
                { label: "Qidra", href: withLocale("/", locale) },
                { label: locale === "ru" ? "Проекты" : "Projects", href: withLocale("/projects", locale) },
                { label: project.title[locale] }
              ]}
            />
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div className="grid gap-6">
                <ProjectStatusBadge status={project.status} locale={locale} />
                <h1 className="max-w-5xl text-[44px] font-medium leading-[1.1] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                  {project.title[locale]}
                </h1>
                {realEstate?.objectName ? <p className="text-18 font-medium text-qidra-accent">{realEstate.objectName}</p> : null}
                <p className="max-w-4xl text-20 text-qidra-grayBlue sm:text-[24px]">{realEstate?.descriptionShort || project.description[locale]}</p>
              </div>
              <aside className="grid gap-4 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                <div className="grid gap-2">
                  <ProgressBar value={progress} />
                  <div className="flex justify-between text-14 text-qidra-grayBlue">
                    <span>{project.fundedUsdt.toLocaleString()} USDT</span>
                    <span>{project.targetUsdt.toLocaleString()} USDT</span>
                  </div>
                </div>
                <dl className="grid gap-3 text-14">
                  <ProjectFact label={isRu ? "Структура" : "Structure"} value={project.structure} />
                  <ProjectFact label={isRu ? "Локация" : "Location"} value={locationLabel} />
                  <ProjectFact label={isRu ? "Риск" : "Risk"} value={riskLabel} />
                  <ProjectFact label={isRu ? "Статус" : "Status"} value={realEstate ? propertyStatusLabel(realEstate.objectStatus, locale) : project.lifecycle.stage[locale]} />
                  {realEstate ? <ProjectFact label={isRu ? "Тип недвижимости" : "Property type"} value={propertyTypeLabel(realEstate.propertyType, locale)} /> : null}
                  {realEstate?.minimumParticipation ? <ProjectFact label={isRu ? "Минимальный вход" : "Minimum participation"} value={`${realEstate.minimumParticipation.toLocaleString()} ${realEstate.fundraisingCurrency || realEstate.currency || "USD"}`} /> : null}
                  <ProjectFact label={isRu ? "Период сбора" : "Raise period"} value={formatDateRange(project.lifecycle.fundraisingStartAt, project.lifecycle.fundraisingEndAt, locale)} />
                  <ProjectFact label={isRu ? "План запуска" : "Planned launch"} value={formatDate(project.lifecycle.plannedLaunchAt, locale)} />
                  <ProjectFact label={isRu ? "Первые выплаты" : "First distributions"} value={formatDate(project.lifecycle.plannedDividendAt, locale)} />
                  <ProjectFact label={isRu ? "График выплат" : "Distribution schedule"} value={project.lifecycle.payoutFrequency[locale]} />
                  <ProjectFact label={isRu ? "Срок проекта" : "Project term"} value={projectTermLabel} />
                  <ProjectFact label={isRu ? "Ожидаемый результат" : "Expected result"} value={project.expectedReturn[locale]} />
                  <ProjectFact label={isRu ? "Ориентир доходности" : "Return guidance"} value={project.expectedYield[locale]} />
                  {incomeSources ? <ProjectFact label={isRu ? "Источник дохода" : "Income source"} value={incomeSources} /> : null}
                </dl>
                {project.initiator ? (
                  <a
                    className="rounded-qidra border border-qidra-grayMedium/40 bg-qidra-grayLight p-4 text-15 text-qidra-grayBlue transition-colors hover:border-qidra-accent/50 hover:text-qidra-dark"
                    href={withLocale(`/profiles/${project.initiator.id}`, locale)}
                  >
                    <span className="block text-13 uppercase text-qidra-accent">{isRu ? "Инициатор проекта" : "Project initiator"}</span>
                    <span className="mt-1 block text-18 font-medium text-qidra-dark">{project.initiator.name || (isRu ? "Участник Qidra" : "Qidra participant")}</span>
                    <span className="mt-1 block">
                      {[project.initiator.country, project.initiator.city].filter(Boolean).join(", ") || (isRu ? "Профиль участника" : "Participant profile")}
                    </span>
                  </a>
                ) : null}
                {project.organization ? (
                  <a
                    className="rounded-qidra border border-qidra-grayMedium/40 bg-qidra-grayLight p-4 text-15 text-qidra-grayBlue transition-colors hover:border-qidra-accent/50 hover:text-qidra-dark"
                    href={withLocale(`/companies/${project.organization.publicSlug}`, locale)}
                  >
                    <span className="block text-13 uppercase text-qidra-accent">{isRu ? "Компания-инициатор" : "Company initiator"}</span>
                    <span className="mt-1 block text-18 font-medium text-qidra-dark">{project.organization.displayName}</span>
                    <span className="mt-1 block">{isRu ? "Открыть профиль компании" : "Open company profile"}</span>
                  </a>
                ) : null}
                {canApply ? (
                  <ButtonLink href={withLocale(`/invest/${project.slug}`, locale)} className="h-14">
                    {isRu ? "Подать заявку" : "Create application"}
                  </ButtonLink>
                ) : (
                  <div className="rounded-qidra border border-qidra-grayMedium/40 bg-qidra-grayLight p-4 text-15 font-medium text-qidra-grayBlue">
                    {project.status === "funded"
                      ? isRu
                        ? "Сбор по проекту завершён. Новые заявки не принимаются."
                        : "The raise is complete. New applications are not accepted."
                      : isRu
                        ? "Проект сейчас недоступен для новых заявок."
                        : "The project is currently unavailable for new applications."}
                  </div>
                )}
                <p className="text-12 text-qidra-grayBlue">{dictionary[locale].common.noFixedYield}</p>
              </aside>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-12">
            <ProjectGallery project={project} locale={locale} />
            <div className="grid gap-6 lg:grid-cols-2">
              <InfoPanel title={isRu ? "Investment highlights" : "Investment highlights"} text="">
                <div className="grid gap-4 md:grid-cols-2">
                  <HighlightItem label={isRu ? "Тип недвижимости" : "Property type"} value={realEstate ? propertyTypeLabel(realEstate.propertyType, locale) : project.lifecycle.stage[locale]} />
                  <HighlightItem label={isRu ? "Локация" : "Location"} value={locationLabel} />
                  <HighlightItem label={isRu ? "Минимальный вход" : "Minimum participation"} value={realEstate?.minimumParticipation ? `${realEstate.minimumParticipation.toLocaleString()} ${realEstate.fundraisingCurrency || realEstate.currency || "USD"}` : "100 USDT"} />
                  <HighlightItem label={isRu ? "Срок проекта" : "Project term"} value={projectTermLabel} />
                  <HighlightItem label={isRu ? "Источник дохода" : "Income source"} value={incomeSources || project.expectedReturn[locale]} />
                  <HighlightItem label={isRu ? "Модель" : "Model"} value={project.structure} />
                  <HighlightItem label={isRu ? "Распределение прибыли" : "Profit split"} value={realEstate?.managerSharePercent ? `${100 - realEstate.managerSharePercent}% / ${realEstate.managerSharePercent}%` : project.expectedYield[locale]} />
                  <HighlightItem label={isRu ? "Комиссия управляющего" : "Manager fee"} value={realEstate?.managerFeePercent ? `${realEstate.managerFeePercent}%` : isRu ? "По условиям проекта" : "Per project terms"} />
                </div>
              </InfoPanel>
              <InfoPanel title={isRu ? "Финансовая структура" : "Financial structure"} text="">
                <div className="grid gap-4 md:grid-cols-2">
                  <HighlightItem label={isRu ? "Стоимость объекта" : "Asset value"} value={realEstate?.totalAssetValue ? `${realEstate.totalAssetValue.toLocaleString()} ${realEstate.currency || "USD"}` : `${project.targetUsdt.toLocaleString()} USDT`} />
                  <HighlightItem label={isRu ? "Целевой объём привлечения" : "Target raise"} value={`${(realEstate?.targetRaise || project.targetUsdt).toLocaleString()} ${realEstate?.fundraisingCurrency || "USD"}`} />
                  <HighlightItem label={isRu ? "Уже привлечено" : "Raised"} value={`${(realEstate?.gatheredAmount || project.fundedUsdt).toLocaleString()} ${realEstate?.fundraisingCurrency || "USD"}`} />
                  <HighlightItem label={isRu ? "Осталось привлечь" : "Remaining"} value={`${(realEstate?.remainingAmount || Math.max(project.targetUsdt - project.fundedUsdt, 0)).toLocaleString()} ${realEstate?.fundraisingCurrency || "USD"}`} />
                  <HighlightItem label={isRu ? "Минимальный вход" : "Minimum participation"} value={realEstate?.minimumParticipation ? `${realEstate.minimumParticipation.toLocaleString()} ${realEstate.fundraisingCurrency || "USD"}` : "100 USDT"} />
                  <HighlightItem label={isRu ? "Комиссия управляющего" : "Manager fee"} value={realEstate?.managerFeePercent ? `${realEstate.managerFeePercent}%` : isRu ? "Не указано" : "Not set"} />
                </div>
              </InfoPanel>
            </div>
            <InfoPanel title={isRu ? "About property" : "About property"} text={realEstate?.descriptionFull || project.description[locale]} />
            <div className="grid gap-6 lg:grid-cols-3">
              <InfoPanel
                title={isRu ? "Формат участия" : "Participation format"}
                text={
                  isRu
                    ? "Условия проекта раскрываются до подачи заявки, включая структуру договора и порядок взаимодействия сторон."
                    : "Project terms are disclosed before application, including contract structure and cooperation process."
                }
              />
              <InfoPanel
                title={isRu ? "Проверка проекта" : "Project review"}
                text={
                  isRu
                    ? "Юридическая, экономическая и шариатская экспертиза помогают участникам принимать решение на основе документов."
                    : "Legal, economic and Sharia review help participants make decisions based on documents."
                }
              />
              <InfoPanel
                title={isRu ? "Открытая отчётность" : "Open reporting"}
                text={
                  isRu
                    ? "После публикации проект сопровождается обновлениями, статусами и документами в профиле участника."
                    : "After publication, the project is supported with updates, statuses and documents in the participant profile."
                }
              />
            </div>
            <LegalPanel locale={locale} />
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8 lg:px-11 lg:pb-24" id="documents">
          <div className="mx-auto grid max-w-[1840px] gap-5">
            <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[44px]">
              {isRu ? "Документы проекта" : "Project documents"}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {project.documents.length || realEstate?.documents?.length ? (
                [...project.documents, ...(realEstate?.documents?.map((document) => ({
                  href: document.href,
                  kind: document.category,
                  title: { ru: document.name, en: document.name }
                })) || [])].map((document) => (
                  <DocumentItem key={`${document.href}-${document.kind}`} title={document.title[locale]} href={document.href} meta={document.kind} actionLabel={isRu ? "Скачать" : "Download"} />
                ))
              ) : (
                <p className="text-16 text-qidra-grayBlue">{isRu ? "Документы появятся после подготовки проекта." : "Documents will appear after the project is prepared."}</p>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap justify-between gap-2 border-b border-qidra-grayMedium/20 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-qidra-grayBlue">{label}</dt>
      <dd className="max-w-full break-words text-right font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function InfoPanel({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <article className="rounded-[20px] bg-qidra-grayLight p-7 sm:p-8">
      <h3 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h3>
      {text ? <p className="mt-5 text-18 text-qidra-grayBlue">{text}</p> : null}
      {children ? <div className={text ? "mt-5" : "mt-5"}>{children}</div> : null}
    </article>
  );
}

function HighlightItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-qidra bg-white p-4">
      <p className="text-13 text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-16 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}

function LegalPanel({ locale }: { locale: "ru" | "en" }) {
  const isRu = locale === "ru";
  return (
    <section className="rounded-[20px] border border-qidra-grayLight bg-white p-7 sm:p-8">
      <h2 className="text-[28px] font-medium leading-tight text-qidra-dark">{isRu ? "Важная информация" : "Important information"}</h2>
      <p className="mt-4 text-16 leading-7 text-qidra-grayBlue">
        {isRu
          ? "Qidra является информационной и технологической платформой для взаимодействия предпринимателей и инвесторов. Qidra не принимает средства пользователей, не управляет инвестиционным капиталом, не является стороной договора между инвестором и предпринимателем и не гарантирует доходность либо возврат капитала. Все договорные отношения возникают напрямую между инвестором и предпринимателем, разместившим проект на платформе. Инвестиции связаны с рисками."
          : "Qidra is an informational and technology platform connecting entrepreneurs and investors. Qidra does not receive user funds, manage investment capital, act as a contractual counterparty between investor and entrepreneur, or guarantee returns or capital repayment. All contractual relations arise directly between the investor and the entrepreneur listing the project. Investments involve risk."}
      </p>
    </section>
  );
}

function formatDate(value: string | null, locale: "ru" | "en") {
  if (!value) return locale === "ru" ? "Уточняется" : "To be confirmed";
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateRange(start: string | null, end: string | null, locale: "ru" | "en") {
  if (!start && !end) return locale === "ru" ? "Уточняется" : "To be confirmed";
  if (start && end) return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
  return formatDate(start ?? end, locale);
}
