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
import { acceptsApplications, getProjectBySlug, type CatalogProject } from "@/lib/project-catalog";
import {
  AM_CAPITAL_MANAGER_FEE_PERCENT,
  type IncomeSourceValue,
  type RealEstateDocumentAsset,
  incomeSourceLabel,
  isAmCapitalPropertyFundProject,
  propertyStatusLabel,
  propertyTypeLabel,
  realEstateAssetCategoryLabel,
  realEstateAssetDisplayName
} from "@/lib/real-estate";

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
  const locationAddress = buildProjectLocationAddress(project, isRu);
  const locationGoogleMapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationAddress)}`;
  const locationEmbedHref = `https://www.google.com/maps?q=${encodeURIComponent(locationAddress)}&z=15&output=embed`;
  const projectTermLabel = realEstate?.projectTermMonths ? (isRu ? `${realEstate.projectTermMonths} мес.` : `${realEstate.projectTermMonths} months`) : project.lifecycle.participationTerm[locale];
  const incomeSources = realEstate?.incomeSources?.map((item: IncomeSourceValue) => incomeSourceLabel(item, locale)).join(", ");
  const publicDocuments = buildPublicDocuments(project, locale);
  const isAmCapitalProject = isAmCapitalPropertyFundProject({
    initiatorName: project.initiator?.name,
    managerName: realEstate?.managerName,
    organizationDisplayName: project.organization?.displayName,
    organizationLegalName: project.organization?.legalName,
    partnerName: realEstate?.partnerName,
    sector: project.sector
  });
  const managerFeePercent = isAmCapitalProject ? realEstate?.managerFeePercent ?? AM_CAPITAL_MANAGER_FEE_PERCENT : realEstate?.managerFeePercent;
  const managerFeeValue = formatManagerFee(managerFeePercent, locale, isAmCapitalProject);
  const firstDistributionsValue = isAmCapitalProject
    ? isRu
      ? "После полного финансирования объекта и завершения инвестиционного процесса."
      : "After the asset is fully funded and the investment process is completed."
    : formatDate(project.lifecycle.plannedDividendAt, locale);

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
                  {isAmCapitalProject ? <ProjectFact label={isRu ? "Комиссия управляющего" : "Manager fee"} value={managerFeeValue} /> : null}
                  <ProjectFact label={isRu ? "Период сбора" : "Raise period"} value={formatDateRange(project.lifecycle.fundraisingStartAt, project.lifecycle.fundraisingEndAt, locale)} />
                  <ProjectFact label={isRu ? "План запуска" : "Planned launch"} value={formatDate(project.lifecycle.plannedLaunchAt, locale)} />
                  <ProjectFact label={isRu ? "Первые выплаты" : "First distributions"} value={firstDistributionsValue} />
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
                  <HighlightItem
                    label={isRu ? "Комиссия управляющего" : "Manager fee"}
                    value={managerFeePercent ? managerFeeValue : isRu ? "По условиям проекта" : "Per project terms"}
                  />
                </div>
              </InfoPanel>
              <InfoPanel title={isRu ? "Финансовая структура" : "Financial structure"} text="">
                <div className="grid gap-4 md:grid-cols-2">
                  <HighlightItem label={isRu ? "Стоимость объекта" : "Asset value"} value={realEstate?.totalAssetValue ? `${realEstate.totalAssetValue.toLocaleString()} ${realEstate.currency || "USD"}` : `${project.targetUsdt.toLocaleString()} USDT`} />
                  <HighlightItem label={isRu ? "Целевой объём привлечения" : "Target raise"} value={`${(realEstate?.targetRaise || project.targetUsdt).toLocaleString()} ${realEstate?.fundraisingCurrency || "USD"}`} />
                  <HighlightItem label={isRu ? "Уже привлечено" : "Raised"} value={`${(realEstate?.gatheredAmount || project.fundedUsdt).toLocaleString()} ${realEstate?.fundraisingCurrency || "USD"}`} />
                  <HighlightItem label={isRu ? "Осталось привлечь" : "Remaining"} value={`${(realEstate?.remainingAmount || Math.max(project.targetUsdt - project.fundedUsdt, 0)).toLocaleString()} ${realEstate?.fundraisingCurrency || "USD"}`} />
                  <HighlightItem label={isRu ? "Минимальный вход" : "Minimum participation"} value={realEstate?.minimumParticipation ? `${realEstate.minimumParticipation.toLocaleString()} ${realEstate.fundraisingCurrency || "USD"}` : "100 USDT"} />
                  <HighlightItem label={isRu ? "Комиссия управляющего" : "Manager fee"} value={managerFeePercent ? managerFeeValue : isRu ? "Не указано" : "Not set"} />
                </div>
              </InfoPanel>
            </div>
            {isAmCapitalProject ? (
              <InfoPanel title={isRu ? "ВАЖНО ЗНАТЬ" : "Important to know"} text="">
                <BulletList
                  items={
                    isRu
                      ? [
                          "Выплаты начинаются после полного финансирования объекта.",
                          "Выплаты производятся ежемесячно.",
                          "Минимальный срок удержания участия — 12 месяцев.",
                          "Окна выхода открываются в июне и декабре.",
                          "Доходность не гарантируется.",
                          "Возврат капитала по первому требованию невозможен."
                        ]
                      : [
                          "Distributions start after the asset is fully funded.",
                          "Distributions are made monthly.",
                          "The minimum holding period is 12 months.",
                          "Exit windows open in June and December.",
                          "Returns are not guaranteed.",
                          "Capital repayment on first demand is not possible."
                        ]
                  }
                />
              </InfoPanel>
            ) : null}
            <InfoPanel title={isRu ? "About property" : "About property"} text={realEstate?.descriptionFull || project.description[locale]} />
            <LocationPanel
              address={locationAddress}
              embedHref={locationEmbedHref}
              googleMapsHref={locationGoogleMapsHref}
              locale={locale}
              projectTitle={project.title[locale]}
            />
            {isAmCapitalProject ? (
              <InfoPanel title={isRu ? "УСЛОВИЯ ВЫХОДА" : "Exit terms"} text="">
                <BulletList
                  items={
                    isRu
                      ? [
                          "Минимальный срок участия: 12 месяцев.",
                          "После завершения минимального срока удержания можно подать заявку на выход.",
                          "Окна выхода открываются два раза в год: июнь и декабрь.",
                          "Можно продать всю долю либо её часть.",
                          "Стоимость выхода определяется рыночной стоимостью объекта на дату выхода.",
                          "Стоимость доли может быть выше или ниже первоначальной суммы участия.",
                          "Выход зависит от наличия покупателя или замещающего участника.",
                          "Гарантированный обратный выкуп отсутствует."
                        ]
                      : [
                          "Minimum participation term: 12 months.",
                          "After the minimum holding period, an exit request may be submitted.",
                          "Exit windows open twice a year: June and December.",
                          "It is possible to sell the full share or only part of it.",
                          "Exit pricing is based on the market value of the asset on the exit date.",
                          "The share value may be above or below the original participation amount.",
                          "Exit depends on the availability of a buyer or replacement participant.",
                          "There is no guaranteed buyback."
                        ]
                  }
                />
              </InfoPanel>
            ) : null}
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
            <SectionHeading>
              {isRu ? "Документы проекта" : "Project documents"}
            </SectionHeading>
            <div className="grid gap-3 lg:grid-cols-2">
              {publicDocuments.length ? (
                publicDocuments.map((document) => (
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

function buildPublicDocuments(project: CatalogProject, locale: "ru" | "en") {
  const projectDocuments = project.documents.map((document) => ({
    href: document.href,
    kind: document.kind,
    title: document.title
  }));
  const realEstateDocuments =
    project.realEstate?.documents
      ?.filter((document: RealEstateDocumentAsset) => document.category !== "gallery" && document.category !== "render")
      .map((document: RealEstateDocumentAsset, index: number) => ({
        href: document.href,
        kind: realEstateAssetCategoryLabel(document.category, locale),
        title: {
          ru: realEstateAssetDisplayName(document, "ru", index),
          en: realEstateAssetDisplayName(document, "en", index)
        }
      })) ?? [];

  const deduped = new Map<string, { href: string; kind: string; title: { ru: string; en: string } }>();

  for (const document of [...projectDocuments, ...realEstateDocuments]) {
    const key = `${document.title.ru.toLowerCase()}::${document.kind.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, document);
    }
  }

  return Array.from(deduped.values());
}

function ProjectFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap justify-between gap-2 border-b border-qidra-grayMedium/20 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-qidra-grayBlue">{label}</dt>
      <dd className="max-w-full break-words text-right font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 text-[16px] leading-7 text-qidra-grayBlue">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden="true" className="mt-[10px] size-2 shrink-0 rounded-full bg-qidra-accent" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function InfoPanel({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <article className="rounded-[20px] bg-qidra-grayLight p-7 sm:p-8">
      <h3 className="text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[28px]">{title}</h3>
      {text ? <p className="mt-4 text-[17px] leading-7 text-qidra-grayBlue">{text}</p> : null}
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

function formatManagerFee(value: number | undefined, locale: "ru" | "en", emphasizeOneTime: boolean) {
  if (!value) {
    return locale === "ru" ? "Не указано" : "Not set";
  }

  if (emphasizeOneTime) {
    return locale === "ru" ? `${value}% (единоразово)` : `${value}% (one-time)`;
  }

  return `${value}%`;
}

function LegalPanel({ locale }: { locale: "ru" | "en" }) {
  const isRu = locale === "ru";
  return (
    <section className="rounded-[20px] border border-qidra-grayLight bg-white p-7 sm:p-8">
      <h2 className="text-[24px] font-medium leading-tight text-qidra-dark sm:text-[28px]">{isRu ? "Важная информация" : "Important information"}</h2>
      <p className="mt-4 text-[16px] leading-7 text-qidra-grayBlue">
        {isRu
          ? "Qidra является информационной и технологической платформой для взаимодействия предпринимателей и инвесторов. Qidra не принимает средства пользователей, не управляет инвестиционным капиталом, не является стороной договора между инвестором и предпринимателем и не гарантирует доходность либо возврат капитала. Все договорные отношения возникают напрямую между инвестором и предпринимателем, разместившим проект на платформе. Инвестиции связаны с рисками."
          : "Qidra is an informational and technology platform connecting entrepreneurs and investors. Qidra does not receive user funds, manage investment capital, act as a contractual counterparty between investor and entrepreneur, or guarantee returns or capital repayment. All contractual relations arise directly between the investor and the entrepreneur listing the project. Investments involve risk."}
      </p>
    </section>
  );
}

function LocationPanel({
  address,
  embedHref,
  googleMapsHref,
  locale,
  projectTitle
}: {
  address: string;
  embedHref: string;
  googleMapsHref: string;
  locale: "ru" | "en";
  projectTitle: string;
}) {
  const isRu = locale === "ru";

  return (
    <article className="rounded-[20px] bg-qidra-grayLight p-7 sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] xl:items-start">
        <div className="grid gap-4">
          <h3 className="text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[28px]">{isRu ? "Локация" : "Location"}</h3>
          <p className="text-[17px] leading-7 text-qidra-grayBlue">
            {isRu
              ? "Адрес объекта и район раскрываются в карточке проекта. Если интерактивная карта не загрузится на вашем устройстве, используйте кнопку перехода в Google Maps."
              : "The asset address and district are disclosed in the project card. If the interactive map does not load on your device, use the Google Maps button."}
          </p>
          <div className="rounded-qidra bg-white p-5">
            <p className="text-13 uppercase tracking-[0.12em] text-qidra-accent">{isRu ? "Адрес объекта" : "Property address"}</p>
            <p className="mt-3 text-[18px] font-medium leading-7 text-qidra-dark">{address}</p>
          </div>
          <ButtonLink href={googleMapsHref} target="_blank" rel="noreferrer" variant="outline" className="w-full sm:w-fit">
            {isRu ? "Открыть локацию в Google Maps" : "Open location in Google Maps"}
          </ButtonLink>
        </div>
        <div className="overflow-hidden rounded-[20px] border border-qidra-grayMedium/30 bg-white shadow-[0_0_0_1px_rgba(18,20,23,0.04)]">
          <div className="relative aspect-[16/10] bg-qidra-grayLight">
            <iframe
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              src={embedHref}
              title={`${projectTitle} map`}
            />
          </div>
          <div className="border-t border-qidra-grayMedium/20 px-5 py-4 text-[14px] leading-6 text-qidra-grayBlue">
            {isRu
              ? "Если карта не отображается из-за ограничений браузера или внешнего сервиса, используйте кнопку открытия локации выше."
              : "If the map is unavailable because of browser restrictions or the external service, use the location button above."}
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[36px]">{children}</h2>;
}

function buildProjectLocationAddress(project: CatalogProject, isRu: boolean) {
  const realEstate = project.realEstate;
  const parts = [realEstate?.titleComplex, realEstate?.district, realEstate?.address, realEstate?.city, realEstate?.country].filter(
    (value): value is string => Boolean(value && value.trim())
  );

  if (parts.length) {
    return parts.join(", ");
  }

  return isRu ? "Hadley Heights, JVC, Al Barsha South Fourth, Dubai, UAE" : "Hadley Heights, JVC, Al Barsha South Fourth, Dubai, UAE";
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
