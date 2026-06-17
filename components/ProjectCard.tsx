import Image from "next/image";
import { acceptsApplications, type CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { incomeSourceLabel, propertyStatusLabel, propertyTypeLabel } from "@/lib/real-estate";

export function ProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  if (project.realEstate) {
    return <RealEstateProjectCard locale={locale} project={project} />;
  }

  return <StandardProjectCard locale={locale} project={project} />;
}

function RealEstateProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const isRu = locale === "ru";
  const realEstate = project.realEstate!;
  const canApply = acceptsApplications(project);
  const participationCurrency = "USDT";
  const incomeSource = realEstate.incomeSources?.map((value) => incomeSourceLabel(value, locale)).join(", ") || (isRu ? "По модели проекта" : "Per project model");
  const investorShare = realEstate.investorSharePercent ?? (realEstate.managerSharePercent ? 100 - realEstate.managerSharePercent : undefined);
  const remaining = realEstate.remainingAmount ?? Math.max((realEstate.targetRaise || project.targetUsdt) - (realEstate.gatheredAmount || project.fundedUsdt), 0);
  const fundingPercent = resolveFundingPercent(realEstate, project);
  const investorCount = realEstate.investorCount;
  const overviewItems = [
    realEstate.city ? { label: isRu ? "Город" : "City", value: realEstate.city } : null,
    realEstate.district ? { label: isRu ? "Район" : "District", value: realEstate.district } : null,
    realEstate.propertyType ? { label: isRu ? "Тип недвижимости" : "Property type", value: propertyTypeLabel(realEstate.propertyType, locale) } : null,
    realEstate.objectStatus ? { label: isRu ? "Статус объекта" : "Property status", value: propertyStatusLabel(realEstate.objectStatus, locale) } : null,
    realEstate.managerName ? { label: isRu ? "Управляющий партнёр" : "Managing partner", value: realEstate.managerName } : null,
    { label: isRu ? "Бренд / направление" : "Brand / vehicle", value: realEstate.partnerName || "AM Capital Property Fund" },
    { label: isRu ? "Целевой объём" : "Target raise", value: `${(realEstate.targetRaise || project.targetUsdt).toLocaleString()} ${participationCurrency}` },
    realEstate.minimumParticipation ? { label: isRu ? "Минимальная сумма участия" : "Minimum participation", value: `${realEstate.minimumParticipation.toLocaleString()} ${participationCurrency}` } : null,
    { label: isRu ? "Собрано средств" : "Raised", value: `${(realEstate.gatheredAmount || project.fundedUsdt).toLocaleString()} ${participationCurrency}` },
    { label: isRu ? "Осталось привлечь" : "Remaining", value: `${remaining.toLocaleString()} ${participationCurrency}` },
    { label: isRu ? "Процент финансирования" : "Funding percent", value: `${fundingPercent}%` },
    investorCount !== undefined ? { label: isRu ? "Количество инвесторов" : "Investor count", value: investorCount.toLocaleString() } : null,
    realEstate.projectTermMonths ? { label: isRu ? "Срок проекта" : "Project term", value: isRu ? `${realEstate.projectTermMonths} мес.` : `${realEstate.projectTermMonths} months` } : null,
    { label: isRu ? "Валюта участия" : "Participation currency", value: participationCurrency },
    { label: isRu ? "Модель участия" : "Participation model", value: project.structure },
    investorShare !== undefined ? { label: isRu ? "Доля инвесторов" : "Investor share", value: `${investorShare}%` } : null,
    realEstate.managerSharePercent !== undefined ? { label: isRu ? "Доля управляющего партнёра" : "Managing partner share", value: `${realEstate.managerSharePercent}%` } : null,
    realEstate.managerFeePercent !== undefined ? { label: isRu ? "Единоразовая комиссия управляющего" : "One-time management fee", value: `${realEstate.managerFeePercent}%` } : null,
    realEstate.incomeSources?.length ? { label: isRu ? "Источник дохода" : "Income source", value: incomeSource } : null
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="overflow-hidden rounded-[28px] border border-qidra-grayMedium/15 bg-white shadow-[0_30px_80px_rgba(18,20,23,0.08)]">
      <div className="grid xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div className="relative min-h-[300px] overflow-hidden bg-qidra-dark sm:min-h-[360px]">
          <Image
            alt={realEstate.objectName || project.title[locale]}
            src={realEstate.coverImage || project.coverImage || "/assets/hero/qidra-hero-blue.png"}
            fill
            sizes="(min-width: 1280px) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,30,41,0.05)_0%,rgba(11,30,41,0.82)_100%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <ProjectStatusBadge status={project.status} locale={locale} />
              <span className="rounded-full bg-white/12 px-4 py-2 text-13 font-semibold text-white backdrop-blur">{project.structure}</span>
            </div>
            <div className="max-w-2xl">
              <p className="text-14 font-medium uppercase tracking-[0.18em] text-white/72">{isRu ? "Недвижимость" : "Real estate"}</p>
              <h3 className="mt-3 text-[32px] font-medium leading-[1.05] text-white sm:text-[42px]">{realEstate.objectName || project.title[locale]}</h3>
              {realEstate.titleComplex ? <p className="mt-3 text-17 text-white/82">{realEstate.titleComplex}</p> : null}
              {[realEstate.city, realEstate.district, realEstate.propertyType ? propertyTypeLabel(realEstate.propertyType, locale) : null].filter(Boolean).length ? (
                <p className="mt-4 text-15 text-white/78">
                  {[realEstate.city, realEstate.district, realEstate.propertyType ? propertyTypeLabel(realEstate.propertyType, locale) : null].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8">
          <div className="grid gap-3">
            <p className="text-14 font-medium uppercase tracking-[0.18em] text-qidra-accent">{project.title[locale]}</p>
            <p className="text-18 leading-8 text-qidra-grayBlue">{realEstate.descriptionShort || project.summary[locale]}</p>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            {overviewItems.map((item) => (
              <MetricTile key={item.label} label={item.label} value={item.value} />
            ))}
          </dl>

          <div className="grid gap-3 rounded-[22px] bg-qidra-grayLight p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-15 font-medium text-qidra-dark">{isRu ? "Прогресс сбора" : "Raise progress"}</p>
              <p className="text-14 text-qidra-grayBlue">{fundingPercent}%</p>
            </div>
            <ProgressBar value={fundingPercent} />
            <div className="grid gap-2 text-14 text-qidra-grayBlue sm:grid-cols-3">
              <span>{isRu ? "Собрано" : "Raised"}: <strong className="font-medium text-qidra-dark">{(realEstate.gatheredAmount || project.fundedUsdt).toLocaleString()} {participationCurrency}</strong></span>
              <span>{isRu ? "Целевой объём" : "Target"}: <strong className="font-medium text-qidra-dark">{(realEstate.targetRaise || project.targetUsdt).toLocaleString()} {participationCurrency}</strong></span>
              <span>{isRu ? "Осталось" : "Remaining"}: <strong className="font-medium text-qidra-dark">{remaining.toLocaleString()} {participationCurrency}</strong></span>
            </div>
          </div>

          <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-4 text-14 leading-6 text-amber-950">
            {isRu
              ? "Выход из проекта не является мгновенным. Средства связаны с объектом недвижимости и возвращаются только согласно условиям проекта и договора."
              : "Project exit is not immediate. Funds remain tied to the real estate asset and return only under the project terms and contract."}
          </div>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href={withLocale(`/projects/${project.slug}`, locale)} variant="dark" className="min-w-44 flex-1">
              {isRu ? "Подробнее" : "Details"}
            </ButtonLink>
            <ButtonLink href={canApply ? withLocale(`/invest/${project.slug}`, locale) : withLocale(`/projects/${project.slug}`, locale)} variant="outline" className="min-w-56 flex-1">
              {isRu ? "Оставить заявку" : "Leave application"}
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}

function StandardProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const progress = Math.min(100, Math.round((project.fundedUsdt / Math.max(project.targetUsdt, 1)) * 100));
  const canApply = acceptsApplications(project);
  const isRu = locale === "ru";
  const riskLabel = isRu ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;
  const availability = projectAvailability(project, locale);

  return (
    <article className="premium-card grid min-h-[360px] gap-7 overflow-hidden p-7 transition-transform duration-150 hover:-translate-y-0.5 sm:p-9">
      {project.coverImage ? (
        <div className="relative -mx-7 -mt-7 min-h-[220px] overflow-hidden sm:-mx-9 sm:-mt-9">
          <Image alt={project.title[locale]} src={project.coverImage} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.14)_0%,rgba(17,24,39,0.74)_100%)]" />
          <div className="relative z-10 flex h-full items-end p-7 sm:p-9">
            <div>
              <ProjectStatusBadge status={project.status} locale={locale} />
              <h3 className="mt-2 text-[30px] font-medium leading-[1.15] tracking-[0] text-white sm:text-[36px]">{project.title[locale]}</h3>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          {!project.coverImage ? <ProjectStatusBadge status={project.status} locale={locale} /> : null}
          {!project.coverImage ? <h3 className="text-[30px] font-medium leading-[1.15] tracking-[0] text-qidra-dark sm:text-[36px]">{project.title[locale]}</h3> : null}
        </div>
        <span className="w-fit rounded-full bg-qidra-accent8 px-4 py-2 text-14 font-semibold text-qidra-accent shadow-[inset_0_0_0_1px_rgba(79,70,229,0.14)]">{project.structure}</span>
      </div>
      <p className="max-w-3xl text-18 text-qidra-grayBlue">{project.summary[locale]}</p>
      {project.initiator ? (
        <a
          className="w-fit rounded-full bg-qidra-grayLight px-4 py-2 text-14 font-semibold text-qidra-dark shadow-[inset_0_0_0_1px_rgba(18,20,23,0.08)] transition-colors hover:text-qidra-accent"
          href={withLocale(`/profiles/${project.initiator.id}`, locale)}
        >
          {isRu ? "Инициатор" : "Initiator"}: {project.initiator.name || (isRu ? "Участник Qidra" : "Qidra participant")}
        </a>
      ) : null}
      {project.organization ? (
        <a
          className="w-fit rounded-full bg-qidra-accent8 px-4 py-2 text-14 font-semibold text-qidra-accent shadow-[inset_0_0_0_1px_rgba(79,70,229,0.14)] transition-colors hover:text-qidra-dark"
          href={withLocale(`/companies/${project.organization.publicSlug}`, locale)}
        >
          {isRu ? "Компания" : "Company"}: {project.organization.displayName}
        </a>
      ) : null}
      <dl className="grid gap-3 text-14 text-qidra-grayBlue sm:grid-cols-3">
        <div className="rounded-qidra bg-qidra-grayLight p-4">
          <dt>{isRu ? "Локация" : "Location"}</dt>
          <dd className="mt-1 font-medium text-qidra-dark">{project.location}</dd>
        </div>
        <div className="rounded-qidra bg-qidra-grayLight p-4">
          <dt>{isRu ? "Риск" : "Risk"}</dt>
          <dd className="mt-1 font-medium text-qidra-dark">{riskLabel}</dd>
        </div>
        <div className="rounded-qidra bg-qidra-grayLight p-4">
          <dt>
            <a className="transition-colors hover:text-qidra-accent" href={`${withLocale(`/projects/${project.slug}`, locale)}#documents`}>
              {isRu ? "Документы" : "Documents"}
            </a>
          </dt>
          <dd className="mt-1 font-medium text-qidra-dark">
            <a className="transition-colors hover:text-qidra-accent" href={`${withLocale(`/projects/${project.slug}`, locale)}#documents`}>
              {project.documents.length || (isRu ? "Скоро" : "Soon")}
            </a>
          </dd>
        </div>
      </dl>
      <div className="grid gap-2">
        <ProgressBar value={progress} />
        <div className="flex justify-between text-14 text-qidra-grayBlue">
          <span>{isRu ? "Заявлено" : "Submitted"}: {project.fundedUsdt.toLocaleString()} USDT</span>
          <span>{isRu ? "Цель" : "Target"}: {project.targetUsdt.toLocaleString()} USDT</span>
        </div>
      </div>
      <div className={`rounded-qidra px-4 py-3 text-14 shadow-[inset_0_0_0_1px_rgba(18,20,23,0.06)] ${availability.className}`}>
        <p className="font-medium">{availability.title}</p>
        <p className="mt-1 opacity-80">{availability.text}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-3">
        <ButtonLink href={withLocale(`/projects/${project.slug}`, locale)} variant="dark" className="w-full sm:w-fit sm:min-w-56">
          {canApply ? (isRu ? "Изучить проект" : "Review project") : (isRu ? "Карточка проекта" : "Project profile")}
        </ButtonLink>
        <ButtonLink href={`${withLocale(`/projects/${project.slug}`, locale)}#documents`} variant="outline" className="w-full sm:w-fit sm:min-w-44">
          {isRu ? "Документы" : "Documents"}
        </ButtonLink>
      </div>
    </article>
  );
}

function projectAvailability(project: CatalogProject, locale: Locale) {
  const isRu = locale === "ru";

  if (acceptsApplications(project)) {
    return {
      className: "bg-emerald-50 text-emerald-900",
      title: isRu ? "Сбор открыт" : "Open for applications",
      text: isRu
        ? "Можно изучить документы и отправить заявку в пределах свободного баланса."
        : "You can review the documents and apply within your available balance."
    };
  }

  if (project.status === "funded") {
    return {
      className: "bg-white text-qidra-dark",
      title: isRu ? "Сбор завершён" : "Raise completed",
      text: isRu
        ? "Новые заявки не принимаются. Карточка и документы доступны только для ознакомления."
        : "New applications are closed. The profile and documents remain available for review."
    };
  }

  if (project.status === "paused") {
    return {
      className: "bg-amber-50 text-amber-900",
      title: isRu ? "Проект на паузе" : "Project paused",
      text: isRu
        ? "Новые заявки временно недоступны до решения команды Qidra."
        : "New applications are temporarily unavailable until the Qidra team reopens the project."
    };
  }

  return {
    className: "bg-white text-qidra-dark",
    title: isRu ? "Заявки недоступны" : "Applications unavailable",
    text: isRu
      ? "Проект можно просматривать, но участие откроется только после публикации активного статуса."
      : "The project can be reviewed, but participation opens only after an active status is published."
  };
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-qidra-grayLight p-4">
      <dt className="text-13 text-qidra-grayBlue">{label}</dt>
      <dd className="mt-2 text-16 font-medium leading-snug text-qidra-dark">{value}</dd>
    </div>
  );
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
