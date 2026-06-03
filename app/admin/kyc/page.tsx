import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
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
            {applications.length ? (
              applications.map((item) => (
                <div key={item.id} className="surface grid gap-4 p-6 md:grid-cols-[1.1fr_1fr_1fr_auto] md:items-center">
                  <div>
                    <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Участник" : "Participant"}</p>
                    <p className="mt-1 text-18 font-medium text-qidra-dark">{item.user.name || item.user.email}</p>
                    <p className="mt-1 text-14 text-qidra-grayBlue">{formatDate(item.createdAt, locale)}</p>
                  </div>
                  <div>
                    <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Локация" : "Location"}</p>
                    <p className="mt-1 text-18 text-qidra-grayBlue">{formatLocation(item.user.investorProfile?.country, item.user.investorProfile?.city, locale)}</p>
                  </div>
                  <div>
                    <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Профессия и средства" : "Occupation and funds"}</p>
                    <p className="mt-1 text-18 text-qidra-grayBlue">{item.occupation || (locale === "ru" ? "Не указано" : "Not provided")}</p>
                    <p className="mt-1 text-14 text-qidra-grayBlue">{sourceLabel(item.sourceOfFunds, locale)}</p>
                  </div>
                  <div className="grid gap-3">
                    <ProjectStatusBadge status={statusToBadge(item.status)} locale={locale} />
                    {item.status === "SUBMITTED" ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <KycActionForm action="approve" endpoint={`/api/admin/kyc/${item.id}?lang=${locale}`} locale={locale} />
                        <KycActionForm action="reject" endpoint={`/api/admin/kyc/${item.id}?lang=${locale}`} locale={locale} />
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
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

function KycActionForm({ action, endpoint, locale }: { action: "approve" | "reject"; endpoint: string; locale: "ru" | "en" }) {
  const approve = action === "approve";

  return (
    <FeedbackForm
      className="contents"
      endpoint={endpoint}
      feedback={{
        title: approve ? (locale === "ru" ? "Анкета одобрена" : "Profile approved") : locale === "ru" ? "Анкета отклонена" : "Profile rejected",
        text: approve
          ? locale === "ru"
            ? "Участник теперь может подавать заявки на участие."
            : "The participant can now submit participation applications."
          : locale === "ru"
            ? "Участник увидит статус и сможет обновить анкету."
            : "The participant will see the status and can update the profile.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: approve ? "success" : "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value={action} />
      <ActionButton confirm={approve} locale={locale} />
    </FeedbackForm>
  );
}

function ActionButton({ confirm, locale }: { confirm: boolean; locale: "ru" | "en" }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        confirm
          ? "border-qidra-accent bg-qidra-accent text-white hover:bg-qidra-accent80"
          : "border-qidra-grayMedium bg-transparent text-qidra-dark hover:border-qidra-red hover:text-qidra-red"
      }`}
      type="submit"
    >
      {confirm ? (locale === "ru" ? "Одобрить" : "Approve") : locale === "ru" ? "Отклонить" : "Reject"}
    </button>
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
