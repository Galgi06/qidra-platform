import type { CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { ProjectCoverImage } from "@/components/ProjectCoverImage";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";

export function ProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const progress = Math.min(100, Math.round((project.fundedUsdt / Math.max(project.targetUsdt, 1)) * 100));
  const isRu = locale === "ru";
  const realEstate = project.realEstate;
  const coverImage = realEstate?.coverImage || project.coverImage || "/assets/hero/qidra-hero-blue.png";
  const minimumParticipation = realEstate?.minimumParticipation;
  const detailHref = withLocale(`/projects/${project.slug}`, locale);
  const documentHref = `${detailHref}#documents`;
  const summary = project.summary[locale] || project.description[locale];
  const objectTitle = realEstate?.objectName || project.title[locale];
  const previewFacts = realEstate
    ? [
        { label: isRu ? "Город" : "City", value: realEstate.city || (isRu ? "Не указан" : "Not set") },
        { label: isRu ? "Район" : "District", value: realEstate.district || realEstate.titleComplex || (isRu ? "Не указан" : "Not set") },
        {
          label: isRu ? "Целевой объём" : "Target raise",
          value: `${(realEstate.targetRaise || project.targetUsdt).toLocaleString()} ${realEstate.fundraisingCurrency || "USDT"}`
        },
        {
          label: isRu ? "Минимальная сумма" : "Minimum amount",
          value: minimumParticipation ? `${minimumParticipation.toLocaleString()} ${realEstate.fundraisingCurrency || "USDT"}` : "100 USDT"
        }
      ]
    : [
        { label: isRu ? "Локация" : "Location", value: project.location || (isRu ? "Не указана" : "Not set") },
        { label: isRu ? "Структура" : "Structure", value: project.structure },
        { label: isRu ? "Целевой объём" : "Target raise", value: `${project.targetUsdt.toLocaleString()} USDT` },
        { label: isRu ? "Статус" : "Status", value: project.status }
      ];
  const visibleFacts = previewFacts.slice(0, 4);

  return (
    <article className="group data-surface overflow-hidden transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_64px_rgba(17,26,29,0.11)]">
      <div className="flex h-full flex-col lg:grid lg:min-h-[410px] lg:grid-cols-[42%_58%]">
        <a className="relative block h-[260px] overflow-hidden bg-qidra-forest lg:h-full" href={detailHref}>
          <ProjectCoverImage alt={project.title[locale]} src={coverImage} />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,63,54,0.04)_20%,rgba(10,24,23,0.78)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
            <p className="text-12 font-semibold uppercase tracking-[0.08em] text-white/70">{isRu ? "Проект Qidra" : "Qidra project"}</p>
            <p className="mt-2 line-clamp-2 text-18 font-medium leading-snug">{project.location || objectTitle}</p>
          </div>
        </a>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <ProjectStatusBadge status={project.status} locale={locale} />
            <span className="max-w-full truncate rounded-full border border-qidra-gold/20 bg-[#f7f2e7] px-3 py-1.5 text-12 font-semibold text-[#7f632b]">
              {project.structure}
            </span>
          </div>

          <div className="mt-4 min-h-0 min-w-0">
            <a className="mt-2 block" href={detailHref}>
              <h3 className="line-clamp-2 max-h-[4.6rem] max-w-full overflow-hidden text-[26px] font-medium leading-[1.12] tracking-[-0.025em] text-qidra-dark sm:text-[30px]">
                {objectTitle}
              </h3>
            </a>
            <p className="mt-3 line-clamp-2 max-h-[3rem] max-w-full overflow-hidden text-[15px] leading-6 text-qidra-grayBlue">{summary}</p>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-2.5 text-13">
            {visibleFacts.map((fact) => (
              <div key={`${fact.label}-${fact.value}`} className="min-w-0 overflow-hidden rounded-qidra border border-qidra-dark/5 bg-qidra-grayLight px-3 py-2.5">
                <dt className="truncate whitespace-nowrap text-qidra-grayBlue">{fact.label}</dt>
                <dd className="mt-1 truncate whitespace-nowrap font-medium text-qidra-dark" title={fact.value}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 border-t border-qidra-dark/8 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3 text-12 font-semibold text-qidra-dark">
              <span>{isRu ? "Финансирование" : "Funding"}</span>
              <span>{progress}%</span>
            </div>
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
              {isRu ? "Документы и риски" : "Documents & risks"}
            </ButtonLink>
          </div>
        </div>
      </div>
    </article>
  );
}
