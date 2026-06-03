import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackButton } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function AdminInvestmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/investments");
  const requests = await prisma.investmentApplication.findMany({
    include: {
      project: true,
      user: true
    },
    orderBy: { createdAt: "desc" },
    take: 50
  });

  return (
    <>
      <Header locale={locale} path="/admin/investments" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: locale === "ru" ? "Заявки" : "Applications" }
              ]}
            />
            <h1 className="mt-8 title-48 text-qidra-dark">{locale === "ru" ? "Заявки на участие" : "Participation applications"}</h1>
            <p className="mt-4 text-20 text-qidra-grayBlue">
              {locale === "ru"
                ? "Подтверждайте заявки только после проверки средств, профиля участника и принятия договорных условий."
                : "Approve only after funds, participant profile and contract acceptance are checked."}
            </p>
          </div>
        </section>
        <section className="section">
          <div className="container-qidra grid gap-4">
            {requests.length ? (
              requests.map((request) => (
                <div key={request.id} className="surface grid gap-4 p-6 lg:grid-cols-[0.7fr_1fr_1fr_0.8fr_auto] lg:items-center">
                  <div>
                    <p className="text-16 font-medium text-qidra-dark">{request.id.slice(-8).toUpperCase()}</p>
                    <p className="mt-1 text-14 text-qidra-grayBlue">{formatDate(request.createdAt, locale)}</p>
                  </div>
                  <p className="text-16 text-qidra-grayBlue">{request.user.name || request.user.email}</p>
                  <p className="text-16 text-qidra-grayBlue">{locale === "ru" ? request.project.titleRu : request.project.titleEn}</p>
                  <p className="text-16 font-medium text-qidra-dark">{formatUsdt(request.amountUsdt)}</p>
                  <div className="flex items-center gap-3">
                    <ProjectStatusBadge status={investmentStatus(request.status)} locale={locale} />
                    <FeedbackButton
                      feedback={{
                        title: locale === "ru" ? "Заявка открыта" : "Application opened",
                        text:
                          locale === "ru"
                            ? "Карточка заявки готова к проверке профиля, суммы и договорных условий."
                            : "The application card is ready for profile, amount and contract review.",
                        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
                        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
                        tone: "info"
                      }}
                      size="sm"
                      variant="outline"
                    >
                      {locale === "ru" ? "Открыть" : "Open"}
                    </FeedbackButton>
                  </div>
                </div>
              ))
            ) : (
              <NotificationCard
                title={locale === "ru" ? "Заявок пока нет" : "No applications yet"}
                text={locale === "ru" ? "Новые заявки появятся здесь после отправки формы на странице проекта." : "New applications will appear here after the project form is submitted."}
              />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function investmentStatus(status: string): BadgeStatus {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "pending";
}

function formatUsdt(value: { toString(): string }) {
  const amount = Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
