import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectGallery } from "@/components/ProjectGallery";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { recordOrganizationEvent } from "@/lib/company-workspace";
import { dictionary, getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { authOptions } from "@/lib/next-auth";
import { acceptsApplications, getProjectBySlug, type CatalogProject } from "@/lib/project-catalog";
import { incomeSourceLabel, propertyStatusLabel, propertyTypeLabel } from "@/lib/real-estate";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null;
  const project = await getProjectBySlug(slug);
  if (!project) notFound();

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
      <main>{project.realEstate ? <RealEstateProjectPage locale={locale} project={project} /> : <StandardProjectPage locale={locale} project={project} />}</main>
      <Footer locale={locale} />
    </>
  );
}

function RealEstateProjectPage({ project, locale }: { project: CatalogProject; locale: "ru" | "en" }) {
  const isRu = locale === "ru";
  const realEstate = project.realEstate!;
  const canApply = acceptsApplications(project);
  const participationCurrency = "USDT";
  const currency = realEstate.currency || "USD";
  const totalAssetValue = realEstate.totalAssetValue ?? project.targetUsdt;
  const targetRaise = realEstate.targetRaise ?? project.targetUsdt;
  const gatheredAmount = realEstate.gatheredAmount ?? project.fundedUsdt;
  const remainingAmount = realEstate.remainingAmount ?? Math.max(targetRaise - gatheredAmount, 0);
  const investorShare = realEstate.investorSharePercent ?? (realEstate.managerSharePercent ? 100 - realEstate.managerSharePercent : undefined);
  const incomeSources = realEstate.incomeSources?.map((item) => incomeSourceLabel(item, locale)).join(", ") || (isRu ? "По структуре проекта" : "Per project structure");
  const projectTermLabel = realEstate.projectTermMonths ? (isRu ? `${realEstate.projectTermMonths} мес.` : `${realEstate.projectTermMonths} months`) : (isRu ? "Уточняется" : "To be confirmed");
  const locationLine = [realEstate.country, realEstate.city, realEstate.district].filter(Boolean).join(", ");
  const addressLine = [realEstate.address].filter(Boolean).join(", ");
  const fundingPercent = resolveFundingPercent(realEstate, project);
  const investorCount = realEstate.investorCount;
  const appraisedValue = realEstate.appraisedValue;
  const discountPercent = resolveDiscountPercent(totalAssetValue, appraisedValue);
  const upsideAmount = resolveUpsideAmount(totalAssetValue, appraisedValue);
  const standardDocuments = [
    ...project.documents.map((document) => ({
      href: document.href,
      name: document.title[locale],
      size: undefined as number | undefined,
      type: document.kind
    })),
    ...(realEstate.documents || [])
      .filter((document) => document.category === "document")
      .map((document) => ({
        href: document.href,
        name: document.name,
        size: document.size,
        type: document.type || document.category
      }))
  ];

  return (
    <>
      <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
        <div className="mx-auto grid max-w-[1840px] gap-8">
          <Breadcrumbs
            items={[
              { label: "Qidra", href: withLocale("/", locale) },
              { label: isRu ? "Проекты" : "Projects", href: withLocale("/projects", locale) },
              { label: project.title[locale] }
            ]}
          />

          <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_40px_90px_rgba(18,20,23,0.08)]">
            <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[minmax(0,1.1fr)_420px] xl:p-10">
              <div className="grid gap-6">
                <div className="flex flex-wrap items-center gap-3">
                  <ProjectStatusBadge status={project.status} locale={locale} />
                  <span className="rounded-full bg-qidra-accent8 px-4 py-2 text-13 font-semibold text-qidra-accent">{project.structure}</span>
                </div>
                <div className="grid gap-3">
                  <p className="text-14 font-medium uppercase tracking-[0.18em] text-qidra-accent">{project.title[locale]}</p>
                  <h1 className="max-w-5xl text-[42px] font-medium leading-[1.02] tracking-[0] text-qidra-dark sm:text-[58px] xl:text-[72px]">
                    {realEstate.objectName || project.title[locale]}
                  </h1>
                  {realEstate.titleComplex ? <p className="text-[22px] text-qidra-grayBlue sm:text-[28px]">{realEstate.titleComplex}</p> : null}
                </div>
                <div className="grid gap-3 text-17 text-qidra-grayBlue sm:grid-cols-2 xl:grid-cols-3">
                  <HeroFact label={isRu ? "Страна" : "Country"} value={realEstate.country || (isRu ? "Не указано" : "Not set")} />
                  <HeroFact label={isRu ? "Город" : "City"} value={realEstate.city || (isRu ? "Не указано" : "Not set")} />
                  <HeroFact label={isRu ? "Район" : "District"} value={realEstate.district || (isRu ? "Не указано" : "Not set")} />
                  <HeroFact label={isRu ? "Статус объекта" : "Property status"} value={propertyStatusLabel(realEstate.objectStatus, locale)} />
                  <HeroFact label={isRu ? "Целевой объём" : "Target raise"} value={`${targetRaise.toLocaleString()} ${participationCurrency}`} />
                  <HeroFact label={isRu ? "Минимальная сумма участия" : "Minimum participation"} value={`${(realEstate.minimumParticipation || 0).toLocaleString()} ${participationCurrency}`} />
                  <HeroFact label={isRu ? "Финансирование объекта" : "Asset funding"} value={`${fundingPercent}%`} />
                </div>
                <p className="max-w-4xl text-19 leading-8 text-qidra-grayBlue">{realEstate.descriptionShort || project.summary[locale]}</p>
              </div>

              <aside className="grid gap-5 rounded-[28px] bg-qidra-dark p-6 text-white sm:p-8">
                <div className="grid gap-3">
                  <p className="text-13 uppercase tracking-[0.18em] text-white/62">{isRu ? "Статус размещения" : "Listing status"}</p>
                  <div className="grid gap-2">
                    <ProgressBar value={fundingPercent} />
                    <div className="flex justify-between text-14 text-white/76">
                      <span>{isRu ? "Собрано" : "Raised"}: {gatheredAmount.toLocaleString()} {participationCurrency}</span>
                      <span>{isRu ? "Цель" : "Target"}: {targetRaise.toLocaleString()} {participationCurrency}</span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <AsideMetric label={isRu ? "Название комплекса" : "Complex"} value={realEstate.titleComplex || (isRu ? "Не указано" : "Not set")} />
                  <AsideMetric label={isRu ? "Тип недвижимости" : "Property type"} value={propertyTypeLabel(realEstate.propertyType, locale)} />
                  <AsideMetric label={isRu ? "Источник дохода" : "Income source"} value={incomeSources} />
                  <AsideMetric label={isRu ? "Срок проекта" : "Project term"} value={projectTermLabel} />
                  <AsideMetric label={isRu ? "Финансирование объекта" : "Asset funding"} value={`${fundingPercent}%`} />
                  <AsideMetric label={isRu ? "Количество инвесторов" : "Investor count"} value={investorCount !== undefined ? investorCount.toLocaleString() : (isRu ? "Не указано" : "Not set")} />
                </div>

                <ButtonLink href={canApply ? withLocale(`/invest/${project.slug}`, locale) : withLocale(`/projects/${project.slug}`, locale)} className="h-14">
                  {isRu ? "Оставить заявку" : "Leave application"}
                </ButtonLink>
                <p className="text-12 leading-6 text-white/70">{dictionary[locale].common.noFixedYield}</p>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
        <div className="mx-auto grid max-w-[1840px] gap-12">
          <MetricsSection
            locale={locale}
            items={[
              { label: isRu ? "Полная стоимость объекта" : "Total asset value", value: `${totalAssetValue.toLocaleString()} ${currency}` },
              ...(appraisedValue ? [{ label: isRu ? "Оценочная стоимость объекта" : "Appraised value", value: `${appraisedValue.toLocaleString()} ${currency}` }] : []),
              { label: isRu ? "Целевой объём привлечения" : "Target raise", value: `${targetRaise.toLocaleString()} ${participationCurrency}` },
              { label: isRu ? "Собрано средств" : "Raised", value: `${gatheredAmount.toLocaleString()} ${participationCurrency}` },
              { label: isRu ? "Осталось привлечь" : "Remaining to raise", value: `${remainingAmount.toLocaleString()} ${participationCurrency}` },
              { label: isRu ? "Процент финансирования" : "Funding percent", value: `${fundingPercent}%` },
              { label: isRu ? "Количество инвесторов" : "Investor count", value: investorCount !== undefined ? investorCount.toLocaleString() : (isRu ? "Не указано" : "Not set") },
              { label: isRu ? "Минимальная сумма участия" : "Minimum participation", value: `${(realEstate.minimumParticipation || 0).toLocaleString()} ${participationCurrency}` },
              { label: isRu ? "Срок проекта" : "Project term", value: projectTermLabel },
              { label: isRu ? "План запуска проекта" : "Planned project launch", value: formatDate(project.lifecycle.plannedLaunchAt, locale) },
              { label: isRu ? "График выплат" : "Distribution schedule", value: isRu ? "Ежемесячно" : "Monthly" },
              { label: isRu ? "Валюта участия" : "Participation currency", value: participationCurrency },
              { label: isRu ? "Источник дохода" : "Income source", value: incomeSources },
              { label: isRu ? "Модель участия" : "Participation model", value: project.structure },
              { label: isRu ? "Доля инвесторов" : "Investor share", value: investorShare !== undefined ? `${investorShare}%` : (isRu ? "Не указано" : "Not set") },
              { label: isRu ? "Доля управляющего" : "Manager share", value: realEstate.managerSharePercent !== undefined ? `${realEstate.managerSharePercent}%` : (isRu ? "Не указано" : "Not set") },
              { label: isRu ? "Комиссия управляющего" : "Manager fee", value: realEstate.managerFeePercent !== undefined ? `${realEstate.managerFeePercent}%` : (isRu ? "Не указано" : "Not set") }
            ]}
          />

          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <InfoPanel title={isRu ? "Статистика объекта" : "Asset statistics"}>
              <div className="grid gap-4 md:grid-cols-2">
                <HighlightCard label={isRu ? "Стоимость объекта" : "Asset purchase value"} value={`${totalAssetValue.toLocaleString()} ${currency}`} />
                <HighlightCard label={isRu ? "Оценочная стоимость объекта" : "Appraised value"} value={appraisedValue ? `${appraisedValue.toLocaleString()} ${realEstate.currency || currency}` : (isRu ? "Не указано" : "Not set")} />
                <HighlightCard label={isRu ? "Процент финансирования" : "Funding percent"} value={`${fundingPercent}%`} />
                <HighlightCard label={isRu ? "Количество инвесторов" : "Investor count"} value={investorCount !== undefined ? investorCount.toLocaleString() : (isRu ? "Не указано" : "Not set")} />
                <HighlightCard label={isRu ? "Собрано средств" : "Raised"} value={`${gatheredAmount.toLocaleString()} ${participationCurrency}`} />
                <HighlightCard label={isRu ? "Осталось привлечь" : "Remaining to raise"} value={`${remainingAmount.toLocaleString()} ${participationCurrency}`} />
              </div>
            </InfoPanel>

            <InfoPanel title={isRu ? "Финансирование объекта" : "Asset funding"}>
              <div className="grid gap-5">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-14 uppercase tracking-[0.16em] text-qidra-grayBlue">{isRu ? "Финансирование объекта" : "Asset funding"}</p>
                    <p className="mt-2 text-[54px] font-medium leading-none text-qidra-dark">{fundingPercent}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-14 uppercase tracking-[0.16em] text-qidra-grayBlue">{isRu ? "Количество инвесторов" : "Investor count"}</p>
                    <p className="mt-2 text-[28px] font-medium leading-none text-qidra-dark">{investorCount !== undefined ? investorCount.toLocaleString() : "—"}</p>
                  </div>
                </div>
                <ProgressBar value={fundingPercent} />
                <div className="grid gap-3 text-15 text-qidra-grayBlue sm:grid-cols-2">
                  <p>{isRu ? "Собрано средств" : "Raised"}: <strong className="font-medium text-qidra-dark">{gatheredAmount.toLocaleString()} {currency}</strong></p>
                  <p>{isRu ? "Осталось привлечь" : "Remaining"}: <strong className="font-medium text-qidra-dark">{remainingAmount.toLocaleString()} {currency}</strong></p>
                </div>
              </div>
            </InfoPanel>
          </section>

          {(appraisedValue || discountPercent !== null || upsideAmount !== null) ? (
            <InfoPanel title={isRu ? "Инвестиционные преимущества" : "Investment advantages"}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <HighlightCard label={isRu ? "Стоимость объекта" : "Purchase value"} value={`${totalAssetValue.toLocaleString()} ${currency}`} />
                <HighlightCard label={isRu ? "Оценочная стоимость" : "Appraised value"} value={appraisedValue ? `${appraisedValue.toLocaleString()} ${currency}` : (isRu ? "Не указано" : "Not set")} />
                <HighlightCard label={isRu ? "Потенциальный дисконт" : "Potential discount"} value={discountPercent !== null ? `${discountPercent}%` : (isRu ? "Не рассчитан" : "Not calculated")} />
                <HighlightCard label={isRu ? "Потенциальный запас роста" : "Potential upside"} value={upsideAmount !== null ? `${upsideAmount.toLocaleString()} ${currency}` : (isRu ? "Не рассчитан" : "Not calculated")} />
              </div>
            </InfoPanel>
          ) : null}

          <InfoPanel title={isRu ? "Об объекте" : "About the asset"}>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <RichTextContent text={realEstate.descriptionFull || project.description[locale]} />
              <div className="grid gap-3">
                {realEstate.titleComplex ? <LocationFact label={isRu ? "Название комплекса" : "Complex"} value={realEstate.titleComplex} /> : null}
                {realEstate.developer ? <LocationFact label={isRu ? "Девелопер" : "Developer"} value={realEstate.developer} /> : null}
                {realEstate.propertyType ? <LocationFact label={isRu ? "Тип недвижимости" : "Property type"} value={propertyTypeLabel(realEstate.propertyType, locale)} /> : null}
                {realEstate.objectStatus ? <LocationFact label={isRu ? "Статус объекта" : "Property status"} value={propertyStatusLabel(realEstate.objectStatus, locale)} /> : null}
                {realEstate.country ? <LocationFact label={isRu ? "Страна" : "Country"} value={realEstate.country} /> : null}
                {realEstate.city ? <LocationFact label={isRu ? "Город" : "City"} value={realEstate.city} /> : null}
                {realEstate.district ? <LocationFact label={isRu ? "Район" : "District"} value={realEstate.district} /> : null}
                {realEstate.address ? <LocationFact label={isRu ? "Адрес" : "Address"} value={realEstate.address} /> : null}
              </div>
            </div>
          </InfoPanel>

          <ProjectGallery project={project} locale={locale} />

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <InfoPanel title={isRu ? "Документы" : "Documents"}>
              {standardDocuments.length ? (
                <div className="grid gap-3">
                  {standardDocuments.map((document) => (
                    <DocumentItem
                      key={`${document.href}-${document.name}`}
                      title={document.name}
                      href={document.href}
                      meta={documentMeta(document.type, document.size, locale)}
                      actionLabel={isRu ? "Скачать" : "Download"}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-16 text-qidra-grayBlue">{isRu ? "Документы объекта будут опубликованы после подготовки комплекта." : "Property documents will appear after the package is published."}</p>
              )}
            </InfoPanel>

            <InfoPanel title={isRu ? "Локация" : "Location"}>
              <div className="grid gap-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <LocationFact label={isRu ? "Страна" : "Country"} value={realEstate.country || (isRu ? "Не указано" : "Not set")} />
                  <LocationFact label={isRu ? "Город" : "City"} value={realEstate.city || (isRu ? "Не указано" : "Not set")} />
                  <LocationFact label={isRu ? "Район" : "District"} value={realEstate.district || (isRu ? "Не указано" : "Not set")} />
                  <LocationFact label={isRu ? "Адрес объекта" : "Property address"} value={realEstate.address || (isRu ? "Не указано" : "Not set")} />
                </div>
                {addressLine ? (
                  <div className="overflow-hidden rounded-[20px] border border-qidra-grayMedium/20">
                    <iframe
                      className="h-[320px] w-full"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps?q=${encodeURIComponent([realEstate.address, locationLine].filter(Boolean).join(", "))}&output=embed`}
                      title={isRu ? "Карта объекта" : "Property map"}
                    />
                  </div>
                ) : null}
              </div>
            </InfoPanel>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <InfoPanel title={isRu ? "Инвестиционная структура" : "Investment structure"}>
              <div className="grid gap-4">
                <StructureRow label={isRu ? "Инвесторы получают" : "Investors receive"} value={investorShare !== undefined ? `${investorShare}% ${isRu ? "чистой прибыли" : "of net profit"}` : (isRu ? "По условиям проекта" : "Per project terms")} />
                <StructureRow label={isRu ? "Управляющий партнёр получает" : "Managing partner receives"} value={realEstate.managerSharePercent !== undefined ? `${realEstate.managerSharePercent}% ${isRu ? "чистой прибыли" : "of net profit"}` : (isRu ? "По условиям проекта" : "Per project terms")} />
                <StructureRow label={isRu ? "Комиссия управляющего" : "Manager fee"} value={realEstate.managerFeePercent !== undefined ? `${realEstate.managerFeePercent}% ${isRu ? "единоразово" : "one-time"}` : (isRu ? "Не указано" : "Not set")} />
                <StructureRow label={isRu ? "Модель участия" : "Participation model"} value={project.structure} />
                <StructureRow label={isRu ? "Источник дохода" : "Income source"} value={incomeSources} />
                <StructureRow label={isRu ? "Ориентир доходности" : "Return guidance"} value={project.expectedYield[locale]} />
                <p className="rounded-[18px] bg-qidra-grayLight px-4 py-3 text-15 leading-7 text-qidra-grayBlue">
                  {isRu ? "Доходность и возврат капитала не гарантируются." : "Returns and capital repayment are not guaranteed."}
                </p>
              </div>
            </InfoPanel>

            <LegalPanel locale={locale} />
          </section>

          <InfoPanel title={isRu ? "Условия выплат" : "Distribution conditions"}>
            <div className="grid gap-4 text-16 leading-8 text-qidra-grayBlue">
              <p>{isRu ? "Выплаты начинаются после полного финансирования объекта и завершения инвестиционного процесса." : "Distributions begin after the asset is fully funded and the investment process is completed."}</p>
              <p>{isRu ? "График выплат: ежемесячно." : "Distribution schedule: monthly."}</p>
              <p>{isRu ? "Доход распределяется после получения фактического арендного дохода и удержания применимых расходов." : "Income is distributed after the actual rental income is received and applicable expenses are deducted."}</p>
              <p>{isRu ? "Доходность не гарантируется." : "Returns are not guaranteed."}</p>
            </div>
          </InfoPanel>

          <InfoPanel title={isRu ? "Условия выхода из проекта" : "Project exit conditions"}>
            <RealEstateExitTermsContent locale={locale} />
          </InfoPanel>
        </div>
      </section>
    </>
  );
}

function StandardProjectPage({ project, locale }: { project: CatalogProject; locale: "ru" | "en" }) {
  const progress = Math.round((project.fundedUsdt / project.targetUsdt) * 100);
  const riskLabel = locale === "ru" ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;
  const isRu = locale === "ru";
  const canApply = acceptsApplications(project);

  return (
    <>
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
              <p className="max-w-4xl text-20 text-qidra-grayBlue sm:text-[24px]">{project.description[locale]}</p>
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
                <ProjectFact label={isRu ? "Локация" : "Location"} value={project.location} />
                <ProjectFact label={isRu ? "Риск" : "Risk"} value={riskLabel} />
                <ProjectFact label={isRu ? "Статус" : "Status"} value={project.lifecycle.stage[locale]} />
                <ProjectFact label={isRu ? "Период сбора" : "Raise period"} value={formatDateRange(project.lifecycle.fundraisingStartAt, project.lifecycle.fundraisingEndAt, locale)} />
                <ProjectFact label={isRu ? "План запуска" : "Planned launch"} value={formatDate(project.lifecycle.plannedLaunchAt, locale)} />
                <ProjectFact label={isRu ? "Первые выплаты" : "First distributions"} value={formatDate(project.lifecycle.plannedDividendAt, locale)} />
                <ProjectFact label={isRu ? "График выплат" : "Distribution schedule"} value={project.lifecycle.payoutFrequency[locale]} />
                <ProjectFact label={isRu ? "Срок проекта" : "Project term"} value={project.lifecycle.participationTerm[locale]} />
              </dl>
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
          <LegalPanel locale={locale} />
        </div>
      </section>

      <section className="px-5 pb-16 sm:px-8 lg:px-11 lg:pb-24" id="documents">
        <div className="mx-auto grid max-w-[1840px] gap-5">
          <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[44px]">
            {isRu ? "Документы проекта" : "Project documents"}
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {project.documents.length ? (
              project.documents.map((document) => (
                <DocumentItem key={`${document.href}-${document.kind}`} title={document.title[locale]} href={document.href} meta={document.kind} actionLabel={isRu ? "Скачать" : "Download"} />
              ))
            ) : (
              <p className="text-16 text-qidra-grayBlue">{isRu ? "Документы появятся после подготовки проекта." : "Documents will appear after the project is prepared."}</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function MetricsSection({ items, locale }: { items: { label: string; value: string }[]; locale: "ru" | "en" }) {
  return (
    <section className="grid gap-5">
      <div>
        <h2 className="text-[34px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[42px]">
          {locale === "ru" ? "Инвестиционные показатели" : "Investment metrics"}
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.label} className="rounded-[22px] bg-qidra-grayLight p-5">
            <p className="text-13 uppercase tracking-[0.15em] text-qidra-grayBlue">{item.label}</p>
            <p className="mt-3 text-[22px] font-medium leading-tight text-qidra-dark">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function InfoPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(18,20,23,0.06)] sm:p-8">
      <h2 className="text-[30px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[36px]">{title}</h2>
      <div>{children}</div>
    </section>
  );
}

function RichTextContent({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-5 text-17 leading-8 text-qidra-grayBlue">
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
        const listItems = lines.filter((line) => /^[-*•]\s+/.test(line));
        const isList = listItems.length === lines.length;

        if (isList) {
          return (
            <ul key={index} className="grid gap-3 pl-5">
              {lines.map((line) => (
                <li key={line}>{line.replace(/^[-*•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }

        return <p key={index}>{block}</p>;
      })}
    </div>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-qidra-grayLight px-4 py-3">
      <p className="text-13 uppercase tracking-[0.14em] text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-16 font-medium leading-snug text-qidra-dark">{value}</p>
    </div>
  );
}

function AsideMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-white/12 pb-3 last:border-b-0 last:pb-0">
      <p className="text-13 uppercase tracking-[0.16em] text-white/58">{label}</p>
      <p className="mt-2 text-16 font-medium leading-snug text-white">{value}</p>
    </div>
  );
}

function StructureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-[18px] bg-qidra-grayLight px-4 py-4">
      <p className="text-15 text-qidra-grayBlue">{label}</p>
      <p className="max-w-[380px] text-right text-16 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}

function LocationFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-qidra-grayLight px-4 py-3">
      <p className="text-13 uppercase tracking-[0.14em] text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-16 font-medium leading-snug text-qidra-dark">{value}</p>
    </div>
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

function LegalPanel({ locale }: { locale: "ru" | "en" }) {
  const isRu = locale === "ru";
  return (
    <section className="grid gap-5 rounded-[28px] border border-qidra-grayMedium/20 bg-white p-6 sm:p-8">
      <h2 className="text-[30px] font-medium leading-tight text-qidra-dark sm:text-[36px]">{isRu ? "Юридический блок" : "Legal notice"}</h2>
      <div className="grid gap-4 text-16 leading-8 text-qidra-grayBlue">
        <p>
          {isRu
            ? "Qidra является информационной и технологической платформой для взаимодействия предпринимателей и инвесторов."
            : "Qidra is an informational and technology platform for interaction between entrepreneurs and investors."}
        </p>
        <p>
          {isRu
            ? "Qidra не принимает средства инвесторов, не управляет инвестиционным капиталом, не является стороной договора между инвестором и предпринимателем и не гарантирует доходность либо возврат капитала."
            : "Qidra does not receive investor funds, does not manage investment capital, is not a party to the contract between the investor and the entrepreneur, and does not guarantee returns or repayment of capital."}
        </p>
        <p>
          {isRu
            ? "Все договорные отношения возникают напрямую между инвестором и предпринимателем, разместившим проект."
            : "All contractual relations arise directly between the investor and the entrepreneur who listed the project."}
        </p>
      </div>
    </section>
  );
}

function RealEstateExitTermsContent({ locale }: { locale: "ru" | "en" }) {
  const isRu = locale === "ru";

  return (
    <div className="grid gap-4 text-16 leading-8 text-qidra-grayBlue">
      <p>{isRu ? "Минимальный период удержания участия: 12 месяцев." : "Minimum holding period: 12 months."}</p>
      <p>{isRu ? "До завершения 12-месячного периода участник не может требовать выхода из проекта." : "Before the end of the 12-month holding period, the participant cannot request to exit the project."}</p>
      <p>{isRu ? "После завершения 12 месяцев участник может подать заявку на выход." : "After 12 months, the participant may submit an exit request."}</p>
      <p>{isRu ? "Окна выхода открываются два раза в год: июнь и декабрь." : "Exit windows open twice per year: June and December."}</p>
      <p>{isRu ? "Участник может продать всю долю или часть доли." : "A participant may sell all or part of the share."}</p>
      <p>{isRu ? "Продажа доли осуществляется по текущей рыночной цене на момент окна выхода." : "The share is sold at the current market price at the time of the exit window."}</p>
      <p>{isRu ? "Цена выхода не привязана к первоначальной сумме участия." : "The exit price is not tied to the original participation amount."}</p>
      <p>{isRu ? "Если стоимость объекта выросла, стоимость доли может быть выше первоначального участия." : "If the asset value has increased, the share value may be above the original participation amount."}</p>
      <p>{isRu ? "Если стоимость объекта снизилась, стоимость доли может быть ниже первоначального участия." : "If the asset value has decreased, the share value may be below the original participation amount."}</p>
      <p>{isRu ? "Выход зависит от наличия покупателя / замещающего участника." : "Exit depends on the availability of a buyer / replacement participant."}</p>
      <p>{isRu ? "Гарантированного обратного выкупа нет." : "There is no guaranteed buyback."}</p>
      <p>{isRu ? "Возврат капитала по первому требованию невозможен." : "Capital return on first demand is not possible."}</p>
    </div>
  );
}

function documentMeta(type: string | undefined, size: number | undefined, locale: "ru" | "en") {
  const parts = [];
  if (type) parts.push(type.toUpperCase());
  if (size) parts.push(formatFileSize(size, locale));
  return parts.join(" · ");
}

function formatFileSize(size: number, locale: "ru" | "en") {
  const units = locale === "ru" ? ["Б", "КБ", "МБ", "ГБ"] : ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

function resolveFundingPercent(realEstate: NonNullable<CatalogProject["realEstate"]>, project: CatalogProject) {
  if (realEstate.statsMode === "manual" && realEstate.fundingPercent !== undefined) {
    return Math.max(0, Math.min(100, Math.round(realEstate.fundingPercent)));
  }

  const costBasis = realEstate.totalAssetValue || realEstate.targetRaise || project.targetUsdt;
  const raised = realEstate.gatheredAmount ?? project.fundedUsdt;
  if (!costBasis) return 0;
  return Math.max(0, Math.min(100, Math.round((raised / costBasis) * 100)));
}

function resolveDiscountPercent(totalAssetValue: number, appraisedValue?: number) {
  if (!appraisedValue || appraisedValue <= 0 || totalAssetValue <= 0 || appraisedValue <= totalAssetValue) return null;
  return Math.round(((appraisedValue - totalAssetValue) / appraisedValue) * 100);
}

function resolveUpsideAmount(totalAssetValue: number, appraisedValue?: number) {
  if (!appraisedValue || appraisedValue <= totalAssetValue) return null;
  return appraisedValue - totalAssetValue;
}

function HighlightCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-[18px] bg-qidra-grayLight p-4">
      <p className="text-13 uppercase tracking-[0.14em] text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-[22px] font-medium leading-tight text-qidra-dark">{value}</p>
    </article>
  );
}
