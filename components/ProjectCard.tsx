import type { CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";

export function ProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const progress = Math.round((project.fundedUsdt / project.targetUsdt) * 100);
  const isRu = locale === "ru";
  const riskLabel = isRu ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;

  return (
    <article className="grid min-h-[360px] gap-7 rounded-[20px] bg-qidra-grayLight p-7 shadow-[0_0_0_1px_rgba(18,20,23,0.06)] sm:p-9">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="grid gap-2">
          <ProjectStatusBadge status={project.status} locale={locale} />
          <h3 className="text-[30px] font-medium leading-[1.15] tracking-[0] text-qidra-dark sm:text-[36px]">{project.title[locale]}</h3>
        </div>
        <span className="w-fit rounded-full bg-white px-4 py-2 text-14 font-medium text-qidra-accent shadow-[0_0_0_1px_rgba(86,87,246,0.16)]">{project.structure}</span>
      </div>
      <p className="max-w-3xl text-18 text-qidra-grayBlue">{project.summary[locale]}</p>
      <dl className="grid gap-3 text-14 text-qidra-grayBlue sm:grid-cols-3">
        <div className="rounded-[12px] bg-white p-4">
          <dt>{isRu ? "Локация" : "Location"}</dt>
          <dd className="mt-1 font-medium text-qidra-dark">{project.location}</dd>
        </div>
        <div className="rounded-[12px] bg-white p-4">
          <dt>{isRu ? "Риск" : "Risk"}</dt>
          <dd className="mt-1 font-medium text-qidra-dark">{riskLabel}</dd>
        </div>
        <div className="rounded-[12px] bg-white p-4">
          <dt>{isRu ? "Документы" : "Documents"}</dt>
          <dd className="mt-1 font-medium text-qidra-dark">{project.documents.length || (isRu ? "Скоро" : "Soon")}</dd>
        </div>
      </dl>
      <div className="grid gap-2">
        <ProgressBar value={progress} />
        <div className="flex justify-between text-14 text-qidra-grayBlue">
          <span>{isRu ? "Заявлено" : "Submitted"}: {project.fundedUsdt.toLocaleString()} USDT</span>
          <span>{isRu ? "Цель" : "Target"}: {project.targetUsdt.toLocaleString()} USDT</span>
        </div>
      </div>
      <ButtonLink href={withLocale(`/projects/${project.slug}`, locale)} variant="dark" className="mt-auto w-full sm:w-fit sm:min-w-56">
        {isRu ? "Открыть проект" : "Open project"}
      </ButtonLink>
    </article>
  );
}
