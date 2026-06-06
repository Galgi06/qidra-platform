import Link from "next/link";
import { AdminTabs } from "@/components/AdminTabs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAdmin } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { normalizeProjectSubmissionStatus, projectSubmissionStatusLabel, projectSubmissionStatuses } from "@/lib/project-submission-status";

type SubmissionDocument = {
  name: string;
  size: number;
  storagePath: string;
  type: string;
};

export default async function AdminProjectSubmissionsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  await requireAdmin(locale, "/admin/project-submissions");
  const isRu = locale === "ru";
  const statusFilter = normalizeProjectSubmissionStatus(Array.isArray(params?.status) ? params?.status[0] : params?.status);
  const [submissions, stats] = await Promise.all([
    prisma.projectSubmission.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      include: {
        project: { select: { id: true, slug: true, titleRu: true } },
        user: { select: { email: true, id: true, name: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.projectSubmission.groupBy({ by: ["status"], _count: { _all: true } })
  ]);

  return (
    <>
      <Header locale={locale} path="/admin/project-submissions" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: "Qidra", href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: isRu ? "Заявки на размещение" : "Project listings" }
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.42fr] lg:items-start">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Размещение проектов" : "Project listings"}</p>
                <h1 className="mt-4 title-48 text-qidra-dark">{isRu ? "Входящие проекты" : "Incoming projects"}</h1>
                <p className="mt-5 max-w-3xl text-20 text-qidra-grayBlue">
                  {isRu
                    ? "Здесь видны проекты, которые участники отправили на первичную проверку перед публикацией в каталоге."
                    : "Projects submitted by participants for initial review before catalog publication appear here."}
                </p>
              </div>
              <NotificationCard
                title={isRu ? "Следующий этап" : "Next step"}
                text={
                  isRu
                    ? "После просмотра документов админ переводит заявку в проверку, отклоняет или разрешает листинг проекта в каталоге."
                    : "After reviewing documents, an admin moves the submission into review, rejects it or approves project listing in the catalog."
                }
                tone="info"
              />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra">
            <AdminTabs activePath="/admin/project-submissions" locale={locale} />
            <div className="mt-8 flex flex-wrap gap-3">
              <FilterButton active={!statusFilter} href={withLocale("/admin/project-submissions", locale)} label={`${isRu ? "Все" : "All"} (${totalCount(stats)})`} />
              {projectSubmissionStatuses.map((status) => (
                <FilterButton
                  key={status}
                  active={statusFilter === status}
                  href={withLocale(`/admin/project-submissions?status=${status.toLowerCase()}`, locale)}
                  label={`${projectSubmissionStatusLabel(status, locale)} (${statusCount(stats, status)})`}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-5">
              {submissions.length ? (
                submissions.map((submission) => {
                  const documents = readSubmissionDocuments(submission.documents);

                  return (
                    <article key={submission.id} className="surface grid gap-6 bg-white p-6 sm:p-8">
                      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
                        <div>
                          <p className="text-14 font-medium uppercase text-qidra-accent">{projectSubmissionStatusLabel(submission.status, locale)}</p>
                          <h2 className="mt-2 text-[30px] font-medium leading-tight tracking-[0] text-qidra-dark">{submission.title}</h2>
                          <p className="mt-2 text-16 text-qidra-grayBlue">
                            {submission.user.name || submission.user.email} / {formatDate(submission.createdAt, locale)}
                          </p>
                        </div>
                        <ButtonLink href={withLocale(`/admin/users/${submission.user.id}`, locale)} variant="outline" size="sm">
                          {isRu ? "Открыть клиента" : "Open client"}
                        </ButtonLink>
                      </div>
                      {submission.project ? (
                        <NotificationCard
                          title={isRu ? "Проект создан для каталога" : "Catalog project created"}
                          text={
                            isRu
                              ? `Заявка связана с проектом: ${submission.project.titleRu}. Дальше управляйте статусом проекта: сбор открыт, пауза, сбор завершён или закрыт.`
                              : `The submission is linked to project: ${submission.project.titleRu}. Continue managing status: open raise, paused, funded or closed.`
                          }
                          tone="success"
                        />
                      ) : null}
                      <dl className="grid gap-3 text-14 text-qidra-grayBlue md:grid-cols-4">
                        <Fact label={isRu ? "Отрасль" : "Sector"} value={submission.sector || (isRu ? "Не указано" : "Not set")} />
                        <Fact label={isRu ? "Локация" : "Location"} value={submission.location || (isRu ? "Не указано" : "Not set")} />
                        <Fact label={isRu ? "Структура" : "Structure"} value={submission.structure || (isRu ? "На проверке" : "To review")} />
                        <Fact label={isRu ? "Цель" : "Target"} value={submission.targetUsdt ? `${Number(submission.targetUsdt.toString()).toLocaleString()} USDT` : isRu ? "Не указано" : "Not set"} />
                      </dl>
                      <div>
                        <h3 className="text-18 font-medium text-qidra-dark">{isRu ? "Описание участника" : "Participant description"}</h3>
                        <p className="mt-3 whitespace-pre-line text-16 text-qidra-grayBlue">{submission.summary}</p>
                      </div>
                      {submission.adminNote ? (
                        <div className="rounded-[12px] bg-qidra-grayLight p-4">
                          <h3 className="text-16 font-medium text-qidra-dark">{isRu ? "Последняя заметка администратора" : "Latest admin note"}</h3>
                          <p className="mt-2 text-14 text-qidra-grayBlue">{submission.adminNote}</p>
                        </div>
                      ) : null}
                      <div>
                        <h3 className="text-18 font-medium text-qidra-dark">{isRu ? "Документы" : "Documents"}</h3>
                        {documents.length ? (
                          <div className="mt-3 grid gap-2 md:grid-cols-2">
                            {documents.map((document, index) => (
                              <Link
                                key={document.storagePath}
                                className="rounded-[12px] bg-qidra-grayLight p-4 transition-colors hover:text-qidra-accent"
                                href={`/api/admin/project-submissions/${submission.id}/documents/${index}?lang=${locale}`}
                                rel="noreferrer"
                                target="_blank"
                              >
                                <p className="font-medium text-qidra-dark">{document.name}</p>
                                <p className="mt-1 text-13 text-qidra-grayBlue">{formatFileSize(document.size)} / {document.type}</p>
                                <p className="mt-2 text-13 font-medium text-qidra-accent">{isRu ? "Открыть документ" : "Open document"}</p>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-3 text-16 text-qidra-grayBlue">{isRu ? "Документы не приложены." : "No documents attached."}</p>
                        )}
                      </div>
                      <SubmissionActions
                        documentsCount={documents.length}
                        locale={locale}
                        submission={{
                          adminNote: submission.adminNote,
                          expectedReturn: submission.expectedReturn,
                          id: submission.id,
                          location: submission.location,
                          projectId: submission.projectId,
                          projectSlug: submission.project?.slug,
                          status: submission.status,
                          structure: submission.structure,
                          summary: submission.summary,
                          targetUsdt: submission.targetUsdt?.toString() ?? "",
                          title: submission.title
                        }}
                      />
                    </article>
                  );
                })
              ) : (
                <NotificationCard title={isRu ? "Заявок пока нет" : "No submissions yet"} text={isRu ? "Когда участник отправит свой проект, он появится здесь." : "When a participant submits a project, it will appear here."} />
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function FilterButton({ active, href, label }: { active: boolean; href: string; label: string }) {
  return (
    <Link
      className={`rounded-full border px-4 py-2 text-14 font-medium ${
        active ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayMedium/40 bg-white text-qidra-grayBlue"
      }`}
      href={href}
    >
      {label}
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-qidra-grayLight p-4">
      <dt>{label}</dt>
      <dd className="mt-1 font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function statusCount(stats: { status: string; _count: { _all: number } }[], status: string) {
  return stats.find((item) => item.status === status)?._count._all ?? 0;
}

function totalCount(stats: { _count: { _all: number } }[]) {
  return stats.reduce((sum, item) => sum + item._count._all, 0);
}

function readSubmissionDocuments(value: unknown): SubmissionDocument[] {
  if (!value || typeof value !== "object" || !("files" in value)) return [];
  const files = (value as { files?: unknown }).files;
  return Array.isArray(files) ? files.filter(isSubmissionDocument) : [];
}

function isSubmissionDocument(value: unknown): value is SubmissionDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<SubmissionDocument>;
  return typeof document.name === "string" && typeof document.storagePath === "string" && typeof document.size === "number" && typeof document.type === "string";
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium" }).format(date);
}

function SubmissionActions({
  documentsCount,
  locale,
  submission
}: {
  documentsCount: number;
  locale: "ru" | "en";
  submission: {
    adminNote: string | null;
    expectedReturn: string | null;
    id: string;
    location: string | null;
    projectId: string | null;
    projectSlug?: string;
    status: string;
    structure: string | null;
    summary: string;
    targetUsdt: string;
    title: string;
  };
}) {
  const isRu = locale === "ru";
  const endpoint = `/api/admin/project-submissions/${submission.id}?lang=${locale}`;
  const canReview = submission.status === "SUBMITTED";
  const canReject = submission.status !== "REJECTED" && submission.status !== "APPROVED";
  const canPrepare = submission.status !== "APPROVED" && submission.status !== "REJECTED" && !submission.projectId;
  const preparedSlug = slugFromTitle(submission.title);
  const summary = compactText(submission.summary, 240);
  const structure = submission.structure === "Musharaka" ? "Musharaka" : "Mudaraba";

  return (
    <section className="grid gap-5 border-t border-qidra-grayLight pt-6">
      <div>
        <h3 className="text-20 font-medium text-qidra-dark">{isRu ? "Решение по заявке" : "Submission decision"}</h3>
        <p className="mt-2 text-14 text-qidra-grayBlue">
          {isRu
            ? "Каждое действие требует причину и автоматически попадает в журнал действий."
            : "Every action requires a reason and is automatically written to the audit log."}
        </p>
      </div>

      {submission.projectId && submission.projectSlug ? (
        <ButtonLink href={withLocale(`/admin/projects`, locale)} variant="outline" className="w-full sm:w-fit">
          {isRu ? "Открыть управление проектами" : "Open project management"}
        </ButtonLink>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {canReview ? (
          <FeedbackForm
            className="grid gap-3 rounded-[14px] bg-qidra-grayLight p-4"
            endpoint={endpoint}
            feedback={{
              title: isRu ? "Заявка взята в проверку" : "Submission moved to review",
              text: isRu ? "Статус обновлён и действие записано в журнал." : "The status was updated and written to the audit log.",
              buttonLabel: isRu ? "Понятно" : "Got it",
              dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
              tone: "success"
            }}
            refreshOnSuccess
          >
            <input name="action" type="hidden" value="review" />
            <ReasonField defaultValue={submission.adminNote ?? ""} label={isRu ? "Причина начала проверки" : "Review reason"} name="note" />
            <Button className="w-full sm:w-fit" size="sm" type="submit">
              {isRu ? "Взять в проверку" : "Move to review"}
            </Button>
          </FeedbackForm>
        ) : null}

        {canReject ? (
          <FeedbackForm
            className="grid gap-3 rounded-[14px] bg-qidra-grayLight p-4"
            endpoint={endpoint}
            feedback={{
              title: isRu ? "Заявка отклонена" : "Submission rejected",
              text: isRu ? "Причина сохранена в карточке заявки и журнале действий." : "The reason was saved in the submission card and audit log.",
              buttonLabel: isRu ? "Понятно" : "Got it",
              dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
              tone: "warning"
            }}
            refreshOnSuccess
          >
            <input name="action" type="hidden" value="reject" />
            <ReasonField label={isRu ? "Причина отклонения" : "Rejection reason"} name="note" required />
            <Button className="w-full sm:w-fit" size="sm" type="submit" variant="outline">
              {isRu ? "Отклонить заявку" : "Reject submission"}
            </Button>
          </FeedbackForm>
        ) : null}
      </div>

      {canPrepare ? (
        <details className="rounded-[14px] bg-white p-4 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]" open={submission.status === "REVIEW"}>
          <summary className="cursor-pointer list-none text-18 font-medium text-qidra-dark">
            {isRu ? "Финальное решение: разрешить листинг" : "Final decision: approve listing"}
          </summary>
          <FeedbackForm
            className="mt-5 grid gap-4"
            endpoint={endpoint}
            feedback={{
              title: isRu ? "Проект создан для каталога" : "Catalog project created",
              text:
                isRu
                  ? "Заявка одобрена, проект создан в админке. Статус проекта можно менять в управлении проектами."
                  : "The submission was approved and a project was created in admin. Project status can be changed in project management.",
              buttonLabel: isRu ? "Понятно" : "Got it",
              dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
              tone: "success"
            }}
            refreshOnSuccess
          >
            <input name="action" type="hidden" value="prepare" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Input label={isRu ? "Название RU" : "Title RU"} name="titleRu" defaultValue={submission.title} required />
              <Input label={isRu ? "Название EN" : "Title EN"} name="titleEn" defaultValue={submission.title} required />
              <Input label="Slug" name="slug" defaultValue={preparedSlug} required />
              <Input label={isRu ? "Цель USDT" : "Target USDT"} name="targetUsdt" defaultValue={decimalInput(submission.targetUsdt)} inputMode="decimal" required />
              <Select
                label={isRu ? "Структура" : "Structure"}
                name="structure"
                defaultValue={structure}
                options={[
                  { value: "Mudaraba", label: "Mudaraba" },
                  { value: "Musharaka", label: "Musharaka" }
                ]}
              />
              <Select
                label={isRu ? "Статус после листинга" : "Status after listing"}
                name="status"
                defaultValue="ACTIVE"
                options={[
                  { value: "ACTIVE", label: isRu ? "Сбор открыт / опубликован" : "Published / raise open" },
                  { value: "REVIEW", label: isRu ? "Проверен, готовится к публикации" : "Reviewed, preparing to publish" },
                  { value: "PAUSED", label: isRu ? "Пауза" : "Paused" },
                  { value: "DRAFT", label: isRu ? "Черновик / не опубликован" : "Draft / not published" }
                ]}
              />
              <Input label={isRu ? "Локация" : "Location"} name="location" defaultValue={submission.location ?? "UAE"} required />
              <Input label={isRu ? "Риск" : "Risk"} name="riskLevel" defaultValue="Moderate" required />
              <Input label={isRu ? "Кратко RU" : "Summary RU"} name="summaryRu" defaultValue={summary} required />
              <Input label={isRu ? "Кратко EN" : "Summary EN"} name="summaryEn" defaultValue={summary} required />
            </div>
            <DescriptionField label={isRu ? "Описание RU" : "Description RU"} name="descriptionRu" defaultValue={submission.summary} />
            <DescriptionField label={isRu ? "Описание EN" : "Description EN"} name="descriptionEn" defaultValue={submission.summary} />
            <ReasonField
              label={isRu ? "Причина подготовки проекта" : "Preparation reason"}
              name="note"
              defaultValue={
                isRu
                  ? `Документы заявки проверены (${documentsCount}). Проект можно готовить к публикации.`
                  : `Submission documents reviewed (${documentsCount}). Project can be prepared for publishing.`
              }
            />
            <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" placeholder="CONFIRM" required />
            <p className="text-13 text-qidra-grayBlue">
              {isRu
                ? "Если проект готов к каталогу, выберите «Сбор открыт». После создания в управлении проектами доступны статусы: сбор открыт, пауза, сбор завершён и закрыт. Загруженные участником документы остаются в заявке; публичные документы добавьте отдельно."
                : "If the project is ready for the catalog, choose Published. After creation, project management can set open raise, paused, funded and closed statuses. Participant documents remain in the submission; add public documents separately."}
            </p>
            <Button className="w-full sm:w-fit" type="submit">
              {isRu ? "Разрешить листинг и создать проект" : "Approve listing and create project"}
            </Button>
          </FeedbackForm>
        </details>
      ) : null}
    </section>
  );
}

function ReasonField({ defaultValue = "", label, name, required = true }: { defaultValue?: string; label: string; name: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {label}
      <textarea
        className="min-h-[96px] rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
        defaultValue={defaultValue}
        maxLength={800}
        minLength={12}
        name={name}
        required={required}
      />
    </label>
  );
}

function DescriptionField({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {label}
      <textarea
        className="min-h-[180px] rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
        defaultValue={defaultValue}
        maxLength={5000}
        minLength={20}
        name={name}
        required
      />
    </label>
  );
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1).trim()}…` : normalized;
}

function slugFromTitle(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || `project-${Date.now()}`;
}

function decimalInput(value: string) {
  if (!value) return "";
  return value.includes(".") ? value.replace(/\.?0+$/, "") : value;
}
