import Link from "next/link";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
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
      include: { user: { select: { email: true, id: true, name: true } } },
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
                    ? "После просмотра документов админ сможет перевести заявку в проверку, отклонить или подготовить проект к публикации."
                    : "After reviewing documents, an admin can move the submission into review, reject it or prepare it for publication."
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
