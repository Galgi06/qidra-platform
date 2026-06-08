import { acceptsApplications, type CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ProjectStatusBadge } from "@/components/ui/ProjectStatusBadge";

export function ProjectCard({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const progress = Math.min(100, Math.round((project.fundedUsdt / Math.max(project.targetUsdt, 1)) * 100));
  const canApply = acceptsApplications(project);
  const isRu = locale === "ru";
  const riskLabel = isRu ? { Moderate: "Средний", High: "Высокий" }[project.riskLevel] ?? project.riskLevel : project.riskLevel;
  const availability = projectAvailability(project, locale);

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
      {project.initiator ? (
        <a
          className="w-fit rounded-full bg-white px-4 py-2 text-14 font-medium text-qidra-dark shadow-[0_0_0_1px_rgba(18,20,23,0.08)] transition-colors hover:text-qidra-accent"
          href={withLocale(`/profiles/${project.initiator.id}`, locale)}
        >
          {isRu ? "Инициатор" : "Initiator"}: {project.initiator.name || (isRu ? "Участник Qidra" : "Qidra participant")}
        </a>
      ) : null}
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
      <details className="group rounded-[14px] bg-white p-4 text-15 text-qidra-grayBlue shadow-[0_0_0_1px_rgba(18,20,23,0.06)]">
        <summary className="cursor-pointer list-none font-medium text-qidra-dark">
          <span className="inline-flex items-center gap-2">
            {isRu ? "Описание проекта и условия" : "Project description and terms"}
            <span className="text-qidra-accent transition-transform group-open:rotate-45">+</span>
          </span>
        </summary>
        <div className="mt-4 grid gap-4">
          <p>{project.description[locale]}</p>
          <dl className="grid gap-3 sm:grid-cols-2">
            <ProjectInfo label={isRu ? "Целевой объём" : "Target"} value={`${project.targetUsdt.toLocaleString()} USDT`} />
            <ProjectInfo label={isRu ? "Модель" : "Model"} value={project.structure} />
            <ProjectInfo label={isRu ? "Стадия" : "Stage"} value={project.lifecycle.stage[locale]} />
            <ProjectInfo label={isRu ? "Период сбора" : "Raise period"} value={formatDateRange(project.lifecycle.fundraisingStartAt, project.lifecycle.fundraisingEndAt, locale)} />
            <ProjectInfo label={isRu ? "План запуска" : "Planned launch"} value={formatDate(project.lifecycle.plannedLaunchAt, locale)} />
            <ProjectInfo label={isRu ? "Первые выплаты" : "First distributions"} value={formatDate(project.lifecycle.plannedDividendAt, locale)} />
            <ProjectInfo label={isRu ? "График выплат" : "Distribution schedule"} value={project.lifecycle.payoutFrequency[locale]} />
            <ProjectInfo label={isRu ? "Срок участия" : "Participation term"} value={project.lifecycle.participationTerm[locale]} />
            <ProjectInfo
              label={isRu ? "Ожидаемый результат" : "Expected result"}
              value={project.expectedReturn[locale]}
            />
            <ProjectInfo label={isRu ? "Ориентир доходности" : "Return guidance"} value={project.expectedYield[locale]} />
          </dl>
          <div className="rounded-[10px] bg-qidra-grayLight px-3 py-2 text-14">
            <p className="font-medium text-qidra-dark">{isRu ? "Что сделано сейчас" : "Current progress"}</p>
            <p className="mt-1">{project.lifecycle.currentProgress[locale]}</p>
          </div>
          {project.documents.length ? (
            <div className="grid gap-2">
              <p className="text-13 font-medium uppercase text-qidra-grayBlue">{isRu ? "Документы для ознакомления" : "Documents to review"}</p>
              <div className="grid gap-2">
                {project.documents.slice(0, 3).map((document) => (
                  <a
                    key={document.href}
                    className="flex items-center justify-between gap-3 rounded-[10px] bg-qidra-grayLight px-3 py-2 text-14 font-medium text-qidra-dark transition-colors hover:text-qidra-accent"
                    href={document.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>{document.title[locale]}</span>
                    <span className="text-qidra-accent">{isRu ? "Открыть" : "Open"}</span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-[10px] bg-qidra-grayLight px-3 py-2 text-14">
              {isRu ? "Документы появятся после завершения подготовки проекта." : "Documents will appear after project preparation is complete."}
            </p>
          )}
        </div>
      </details>
      <div className="grid gap-2">
        <ProgressBar value={progress} />
        <div className="flex justify-between text-14 text-qidra-grayBlue">
          <span>{isRu ? "Заявлено" : "Submitted"}: {project.fundedUsdt.toLocaleString()} USDT</span>
          <span>{isRu ? "Цель" : "Target"}: {project.targetUsdt.toLocaleString()} USDT</span>
        </div>
      </div>
      <div className={`rounded-[14px] px-4 py-3 text-14 shadow-[0_0_0_1px_rgba(18,20,23,0.06)] ${availability.className}`}>
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

function ProjectInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-13 text-qidra-grayBlue">{label}</dt>
      <dd className="mt-1 font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return locale === "ru" ? "Уточняется" : "To be confirmed";
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formatDateRange(start: string | null, end: string | null, locale: Locale) {
  if (!start && !end) return locale === "ru" ? "Уточняется" : "To be confirmed";
  if (start && end) return `${formatDate(start, locale)} - ${formatDate(end, locale)}`;
  return formatDate(start ?? end, locale);
}
