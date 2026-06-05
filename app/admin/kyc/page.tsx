import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { readKycDocuments, type KycDocumentKind, type KycFileMeta } from "@/lib/kyc-documents";
import { prisma } from "@/lib/prisma";

export default async function AdminKycPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/kyc");
  const applications = await prisma.kycApplication.findMany({
    include: {
      user: {
        include: {
          investorProfile: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <>
      <Header locale={locale} path="/admin/kyc" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: "KYC" }
              ]}
            />
            <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Управление KYC" : "KYC management"}</h1>
            <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
              {locale === "ru"
                ? "Очередь проверки с понятным разделением одобрения, отказа и дополнительного запроса."
                : "Review queue with clear separation between approval, rejection and additional requests."}
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-4">
            <AdminTabs activePath="/admin/kyc" locale={locale} />
            {applications.length ? (
              applications.map((item) => {
                const profile = item.user.investorProfile;
                const documents = readKycDocuments(item.documents);

                return (
                  <div key={item.id} className="surface grid gap-6 p-6">
                    <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Участник" : "Participant"}</p>
                        <h2 className="mt-1 text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{item.user.name || item.user.email}</h2>
                        <p className="mt-2 text-16 text-qidra-grayBlue">{item.user.email}</p>
                      </div>
                      <div className="grid gap-2 md:justify-items-end">
                        <ProjectStatusBadge status={statusToBadge(item.status)} locale={locale} />
                        <p className="text-14 text-qidra-grayBlue">
                          {locale === "ru" ? "Отправлено" : "Submitted"}: {formatDateTime(item.createdAt, locale)}
                        </p>
                        {item.reviewedAt ? (
                          <p className="text-14 text-qidra-grayBlue">
                            {locale === "ru" ? "Проверено" : "Reviewed"}: {formatDateTime(item.reviewedAt, locale)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <InfoBlock label={locale === "ru" ? "Телефон" : "Phone"} value={profile?.phone} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "Дата рождения" : "Date of birth"} value={profile?.dateOfBirth ? formatDate(profile.dateOfBirth, locale) : null} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "Страна и город" : "Country and city"} value={formatLocation(profile?.country, profile?.city, locale)} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "Гражданство" : "Citizenship"} value={profile?.citizenship} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "Адрес" : "Address"} value={profile?.address} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "Профессия" : "Occupation"} value={item.occupation} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "Источник средств" : "Source of funds"} value={sourceLabel(item.sourceOfFunds, locale)} locale={locale} />
                      <InfoBlock label={locale === "ru" ? "ID заявки" : "Application ID"} value={item.id} locale={locale} compact />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <DocumentBlock
                        applicationId={item.id}
                        document={documents.identityDocument}
                        kind="identityDocument"
                        label={locale === "ru" ? "Документ личности" : "Identity document"}
                        locale={locale}
                      />
                      <DocumentBlock
                        applicationId={item.id}
                        document={documents.addressProof}
                        kind="addressProof"
                        label={locale === "ru" ? "Подтверждение адреса" : "Proof of address"}
                        locale={locale}
                      />
                    </div>

                    {documents.submittedAt ? (
                      <p className="text-14 text-qidra-grayBlue">
                        {locale === "ru" ? "Метаданные документов обновлены" : "Document metadata updated"}: {formatIsoDateTime(documents.submittedAt, locale)}
                      </p>
                    ) : null}

                    {item.reviewerNote ? (
                      <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                        <p className="text-14 font-medium text-qidra-dark">{locale === "ru" ? "Комментарий проверяющего" : "Reviewer note"}</p>
                        <p className="mt-2 text-16 text-qidra-grayBlue">{item.reviewerNote}</p>
                      </div>
                    ) : null}

                    {item.status === "SUBMITTED" ? <KycActionForm endpoint={`/api/admin/kyc/${item.id}?lang=${locale}`} locale={locale} /> : null}
                  </div>
                );
              })
            ) : (
              <NotificationCard
                title={locale === "ru" ? "Очередь пуста" : "Queue is empty"}
                text={locale === "ru" ? "Новые анкеты участников появятся здесь после отправки формы KYC." : "New participant profiles will appear here after the KYC form is submitted."}
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function KycActionForm({ endpoint, locale }: { endpoint: string; locale: "ru" | "en" }) {
  return (
    <FeedbackForm
      className="grid gap-4 border-t border-qidra-grayLight pt-5"
      endpoint={endpoint}
      feedback={{
        title: locale === "ru" ? "Решение сохранено" : "Decision saved",
        text: locale === "ru" ? "Статус анкеты обновлён, участник увидит результат в профиле участника." : "The profile status was updated, and the participant will see the result in the participant profile.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      popupPlacement="center"
      refreshOnSuccess
    >
      <label className="grid gap-2 text-14 font-medium text-qidra-dark">
        {locale === "ru" ? "Комментарий для участника" : "Note for participant"}
        <textarea
          className="min-h-24 rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
          maxLength={500}
          name="note"
          placeholder={locale === "ru" ? "Например: укажите, что нужно исправить при отказе" : "For example: explain what should be corrected on rejection"}
        />
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button name="action" size="sm" type="submit" value="approve">
          {locale === "ru" ? "Одобрить анкету" : "Approve profile"}
        </Button>
        <Button name="action" size="sm" type="submit" value="reject" variant="outline">
          {locale === "ru" ? "Отклонить анкету" : "Reject profile"}
        </Button>
      </div>
    </FeedbackForm>
  );
}

function InfoBlock({ label, value, locale, compact = false }: { label: string; value: string | null | undefined; locale: "ru" | "en"; compact?: boolean }) {
  return (
    <div className="rounded-qidra border border-qidra-grayLight bg-white p-4">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className={`mt-2 break-words font-medium text-qidra-dark ${compact ? "text-12" : "text-16"}`}>{value || (locale === "ru" ? "Не указано" : "Not provided")}</p>
    </div>
  );
}

function DocumentBlock({
  applicationId,
  document,
  kind,
  label,
  locale
}: {
  applicationId: string;
  document: KycFileMeta | undefined;
  kind: KycDocumentKind;
  label: string;
  locale: "ru" | "en";
}) {
  if (!document) {
    return (
      <div className="rounded-qidra border border-dashed border-qidra-grayMedium p-4">
        <p className="text-14 text-qidra-grayBlue">{label}</p>
        <p className="mt-2 text-16 font-medium text-qidra-dark">{locale === "ru" ? "Файл не приложен" : "File not attached"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="mt-2 break-words text-16 font-medium text-qidra-dark">{document.name}</p>
      <p className="mt-1 text-14 text-qidra-grayBlue">
        {document.type} / {formatFileSize(document.size, locale)}
      </p>
      {document.storagePath ? (
        <a
          className="mt-4 inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-dark bg-qidra-dark px-4 text-14 font-medium text-white transition-colors hover:bg-qidra-grayBlueDark"
          href={`/api/admin/kyc/${applicationId}/documents/${kind}?lang=${locale}`}
          rel="noreferrer"
          target="_blank"
        >
          {locale === "ru" ? "Открыть документ" : "Open document"}
        </a>
      ) : (
        <p className="mt-3 text-14 text-qidra-grayBlue">{locale === "ru" ? "Файл был отправлен до включения хранения. Попросите участника обновить документ." : "This file was submitted before storage was enabled. Ask the participant to upload it again."}</p>
      )}
    </div>
  );
}

function statusToBadge(status: string): BadgeStatus {
  if (status === "APPROVED") return "approved";
  if (status === "REJECTED") return "rejected";
  if (status === "SUBMITTED") return "pending";
  return "review";
}

function sourceLabel(source: string | null, locale: "ru" | "en") {
  const labels = {
    salary: { ru: "Доход от работы", en: "Salary" },
    business: { ru: "Бизнес", en: "Business" },
    savings: { ru: "Личные накопления", en: "Personal savings" },
    family: { ru: "Семейные средства", en: "Family funds" },
    other: { ru: "Другое", en: "Other" }
  } as const;

  if (!source || !(source in labels)) return locale === "ru" ? "Не указано" : "Not provided";
  return labels[source as keyof typeof labels][locale];
}

function formatLocation(country: string | null | undefined, city: string | null | undefined, locale: "ru" | "en") {
  const value = [country, city].filter(Boolean).join(", ");
  return value || (locale === "ru" ? "Не указано" : "Not provided");
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatDateTime(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatIsoDateTime(value: string, locale: "ru" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return formatDateTime(date, locale);
}

function formatFileSize(size: number, locale: "ru" | "en") {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    maximumFractionDigits: 1,
    style: "unit",
    unit: "megabyte"
  }).format(size / 1024 / 1024);
}
