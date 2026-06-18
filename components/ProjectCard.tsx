import Image from "next/image";
import { acceptsApplications, type CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";
import { propertyStatusLabel, propertyTypeLabel } from "@/lib/real-estate";

export function ProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const progress = Math.min(100, Math.round((project.fundedUsdt / Math.max(project.targetUsdt, 1)) * 100));
  const canApply = acceptsApplications(project);
  const isRu = locale === "ru";
  const realEstate = project.realEstate;
  const coverImage = realEstate?.coverImage || project.coverImage || "/assets/hero/qidra-hero-blue.png";
  const minimumParticipation = realEstate?.minimumParticipation;
  const locationValue = realEstate ? [realEstate.city, realEstate.country].filter(Boolean).join(", ") : project.location;
  const detailHref = withLocale(`/projects/${project.slug}`, locale);
  const documentHref = `${detailHref}#documents`;
  const summary = project.summary[locale] || project.description[locale];
  const previewFacts = realEstate
    ? [
        { label: isRu ? "Город" : "City", value: realEstate.city || (isRu ? "Не указан" : "Not set") },
        { label: isRu ? "Район" : "District", value: realEstate.district || realEstate.titleComplex || (isRu ? "Не указан" : "Not set") },
        { label: isRu ? "Тип недвижимости" : "Property type", value: propertyTypeLabel(realEstate.propertyType, locale) },
        { label: isRu ? "Статус объекта" : "Property status", value: propertyStatusLabel(realEstate.objectStatus, locale) },
        {
          label: isRu ? "Целевой объём" : "Target raise",
          value: `${(realEstate.targetRaise || project.targetUsdt).toLocaleString()} ${realEstate.fundraisingCurrency || realEstate.currency || "USD"}`
        },
        {
          label: isRu ? "Минимальная сумма" : "Minimum amount",
          value: minimumParticipation ? `${minimumParticipation.toLocaleString()} ${realEstate.fundraisingCurrency || realEstate.currency || "USD"}` : "100 USDT"
        }
      ]
    : [
        { label: isRu ? "Локация" : "Location", value: locationValue || (isRu ? "Не указана" : "Not set") },
        { label: isRu ? "Структура" : "Structure", value: project.structure },
        { label: isRu ? "Целевой объём" : "Target raise", value: `${project.targetUsdt.toLocaleString()} USDT` },
        { label: isRu ? "Статус" : "Status", value: project.status }
      ];

  const visibleFacts = previewFacts.slice(0, 6);

  return (
    <article className="premium-card overflow-hidden transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex h-full flex-col lg:grid lg:h-[360px] lg:grid-cols-[minmax(280px,38%)_minmax(0,1fr)]">
        <a className="relative block h-[240px] overflow-hidden lg:h-full" href={detailHref}>
          <Image
            alt={project.title[locale]}
            className="object-cover"
            fill
            sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 30vw, 100vw"
            src={coverImage}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,24,39,0.12)_0%,rgba(17,24,39,0.56)_100%)]" />
        </a>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <ProjectStatusBadge status={project.status} locale={locale} />
            <span className="max-w-full truncate rounded-full bg-qidra-accent8 px-3 py-1.5 text-13 font-semibold text-qidra-accent shadow-[inset_0_0_0_1px_rgba(79,70,229,0.14)]">
              {project.structure}
            </span>
          </div>

          <div className="mt-4 min-h-0 min-w-0">
            {realEstate?.objectName ? <p className="truncate text-14 font-medium text-qidra-accent">{realEstate.objectName}</p> : null}
            <a className="mt-2 block" href={detailHref}>
              <h3 className="line-clamp-2 max-h-[4.2rem] max-w-full overflow-hidden text-[24px] font-medium leading-[1.18] tracking-[0] text-qidra-dark sm:text-[28px]">
                {project.title[locale]}
              </h3>
            </a>
            <p className="mt-3 line-clamp-3 max-h-[4.5rem] max-w-full overflow-hidden text-[16px] leading-6 text-qidra-grayBlue">{summary}</p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3 text-13 xl:grid-cols-3">
            {visibleFacts.map((fact) => (
              <div key={`${fact.label}-${fact.value}`} className="min-w-0 overflow-hidden rounded-qidra bg-qidra-grayLight px-3 py-2.5">
                <dt className="truncate text-qidra-grayBlue">{fact.label}</dt>
                <dd className="mt-1 truncate font-medium text-qidra-dark" title={fact.value}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5">
            <ProgressBar value={progress} />
            <div className="mt-2 flex justify-between gap-3 text-13 text-qidra-grayBlue">
              <span className="truncate">
                {isRu ? "Собрано" : "Raised"}: {project.fundedUsdt.toLocaleString()} USDT
              </span>
              <span className="truncate text-right">
                {isRu ? "Цель" : "Target"}: {project.targetUsdt.toLocaleString()} USDT
              </span>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap gap-3 pt-5">
            <ButtonLink href={detailHref} variant="dark" className="w-full sm:w-fit sm:min-w-40">
              {isRu ? "Подробнее" : "Details"}
            </ButtonLink>
            <ButtonLink href={documentHref} variant="outline" className="w-full sm:w-fit sm:min-w-36">
              {isRu ? "Документы" : "Documents"}
            </ButtonLink>
            {!canApply ? (
              <span className="inline-flex items-center rounded-full bg-qidra-grayLight px-3 py-2 text-13 font-medium text-qidra-grayBlue">
                {isRu ? "Новые заявки закрыты" : "Applications closed"}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
