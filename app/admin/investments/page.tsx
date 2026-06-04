import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
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
      user: {
        include: {
          wallet: true,
          kycApplications: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
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
              requests.map((request) => {
                const latestKycStatus = request.user.kycApplications[0]?.status;
                const hasEnoughBalance = Boolean(request.user.wallet?.availableUsdt.gte(request.amountUsdt));
                const canConfirm = latestKycStatus === "APPROVED" && hasEnoughBalance;

                return (
                <div key={request.id} className="surface grid gap-4 p-6 lg:grid-cols-[0.7fr_1fr_1fr_0.8fr_0.8fr_auto] lg:items-center">
                  <div>
                    <p className="text-16 font-medium text-qidra-dark">{request.id.slice(-8).toUpperCase()}</p>
                    <p className="mt-1 text-14 text-qidra-grayBlue">{formatDate(request.createdAt, locale)}</p>
                  </div>
                  <p className="text-16 text-qidra-grayBlue">{request.user.name || request.user.email}</p>
                  <p className="text-16 text-qidra-grayBlue">{locale === "ru" ? request.project.titleRu : request.project.titleEn}</p>
                  <p className="text-16 font-medium text-qidra-dark">{formatUsdt(request.amountUsdt)}</p>
                  <div className="grid gap-1 text-14">
                    <p className="font-medium text-qidra-dark">{locale === "ru" ? "KYC" : "KYC"}: {kycStatusLabel(latestKycStatus, locale)}</p>
                    <p className={hasEnoughBalance ? "text-qidra-green" : "text-qidra-red"}>
                      {locale === "ru" ? "Баланс" : "Balance"}: {formatUsdt(request.user.wallet?.availableUsdt ?? 0)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProjectStatusBadge status={investmentStatus(request.status)} locale={locale} />
                    {request.status === "PENDING" ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <InvestmentActionForm action="confirm" disabled={!canConfirm} endpoint={`/api/admin/investments/${request.id}?lang=${locale}`} locale={locale} />
                        <InvestmentActionForm action="reject" endpoint={`/api/admin/investments/${request.id}?lang=${locale}`} locale={locale} />
                      </div>
                    ) : null}
                  </div>
                </div>
                );
              })
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

function InvestmentActionForm({ action, disabled = false, endpoint, locale }: { action: "confirm" | "reject"; disabled?: boolean; endpoint: string; locale: "ru" | "en" }) {
  const confirm = action === "confirm";

  return (
    <FeedbackForm
      className="contents"
      endpoint={endpoint}
      feedback={{
        title: confirm ? (locale === "ru" ? "Заявка подтверждена" : "Application confirmed") : locale === "ru" ? "Заявка отклонена" : "Application rejected",
        text: confirm
          ? locale === "ru"
            ? "Сумма списана с доступного баланса участника."
            : "The amount was deducted from the participant's available balance."
          : locale === "ru"
            ? "Участник увидит обновлённый статус в кабинете."
            : "The participant will see the updated status in the cabinet.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: confirm ? "success" : "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value={action} />
      <ActionButton confirm={confirm} disabled={disabled} locale={locale} />
    </FeedbackForm>
  );
}

function ActionButton({ confirm, disabled, locale }: { confirm: boolean; disabled?: boolean; locale: "ru" | "en" }) {
  return (
    <button
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        confirm
          ? "border-qidra-accent bg-qidra-accent text-white hover:bg-qidra-accent80 disabled:cursor-not-allowed disabled:opacity-50"
          : "border-qidra-grayMedium bg-transparent text-qidra-dark hover:border-qidra-red hover:text-qidra-red"
      }`}
      disabled={disabled}
      type="submit"
    >
      {confirm ? (locale === "ru" ? "Подтвердить" : "Confirm") : locale === "ru" ? "Отклонить" : "Reject"}
    </button>
  );
}

function investmentStatus(status: string): BadgeStatus {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "pending";
}

function kycStatusLabel(status: string | undefined, locale: "ru" | "en") {
  if (status === "APPROVED") return locale === "ru" ? "одобрен" : "approved";
  if (status === "SUBMITTED") return locale === "ru" ? "на проверке" : "under review";
  if (status === "REJECTED") return locale === "ru" ? "отклонён" : "rejected";
  return locale === "ru" ? "не отправлен" : "not submitted";
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
