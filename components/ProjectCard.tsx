import type { Project } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";

export function ProjectCard({ project, locale }: { project: Project; locale: Locale }) {
  const progress = Math.round((project.fundedUsdt / project.targetUsdt) * 100);

  return (
    <article className="surface grid gap-6 p-5 shadow-qidra">
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-2">
          <ProjectStatusBadge status={project.status} locale={locale} />
          <h3 className="subtitle-28">{project.title[locale]}</h3>
        </div>
        <span className="rounded-full bg-qidra-accent8 px-3 py-1 text-12 font-medium text-qidra-accent">{project.structure}</span>
      </div>
      <p className="text-16 muted">{project.summary[locale]}</p>
      <div className="grid gap-2">
        <ProgressBar value={progress} />
        <div className="flex justify-between text-14 text-qidra-grayBlue">
          <span>{project.fundedUsdt.toLocaleString()} USDT</span>
          <span>{project.targetUsdt.toLocaleString()} USDT</span>
        </div>
      </div>
      <ButtonLink href={withLocale(`/projects/${project.slug}`, locale)} variant="outline">
        {locale === "ru" ? "Открыть проект" : "Open project"}
      </ButtonLink>
    </article>
  );
}
