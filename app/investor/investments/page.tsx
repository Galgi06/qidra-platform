import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function InvestmentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor/investments");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const applications = await prisma.investmentApplication.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { createdAt: "desc" }
  });
  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    select: { availableUsdt: true, reservedUsdt: true }
  });
  const pendingTotal = applications
    .filter((application) => application.status === "PENDING")
    .reduce((total, application) => total + Number(application.amountUsdt.toString()), 0);
  const availableUsdt = Number(wallet?.availableUsdt.toString() ?? 0);
  const reservedUsdt = Number(wallet?.reservedUsdt.toString() ?? 0);
  const freeUsdt = Math.max(availableUsdt, 0);
  const unbackedPendingUsdt = Math.max(pendingTotal - reservedUsdt - availableUsdt, 0);

  return (
    <>
      <Header locale={locale} path="/investor/investments" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Профиль участника" : "Participant profile"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Моё участие" : "My participation"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Здесь отображаются заявки на участие, которые вы отправили через страницы проектов."
                  : "This page shows participation applications submitted from project pages."}
              </p>
            </div>
            <Tabs
              items={[
                { label: isRu ? "Обзор" : "Overview", href: withLocale("/investor", locale) },
                { label: isRu ? "Проверка" : "Review", href: withLocale("/investor/kyc", locale) },
                { label: isRu ? "Кошелек" : "Wallet", href: withLocale("/investor/wallet", locale) },
                { label: isRu ? "Участие" : "Participation", href: withLocale("/investor/investments", locale), active: true }
              ]}
            />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-5">
            <div className="grid gap-4 md:grid-cols-3">
              <SummaryCard label={isRu ? "Доступно для новых заявок" : "Available for new applications"} value={formatUsdt(freeUsdt)} />
              <SummaryCard label={isRu ? "Зарезервировано" : "Reserved"} value={formatUsdt(reservedUsdt)} />
              <SummaryCard label={isRu ? "Заявки на проверке" : "Pending applications"} value={formatUsdt(pendingTotal)} tone={unbackedPendingUsdt > 0 ? "warning" : "success"} />
            </div>
            {applications.length ? (
              <div className="grid gap-4">
                {applications.map((application) => {
                  const balanceWarning = application.status === "PENDING" && unbackedPendingUsdt > 0;
                  const shortfall = unbackedPendingUsdt;

                  return (
                  <article key={application.id} className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.7fr_0.7fr_auto] lg:items-center">
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{formatDate(application.createdAt, locale)}</p>
                        <Link className="mt-2 block text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark hover:text-qidra-accent" href={withLocale(`/projects/${application.project.slug}`, locale)}>
                          {locale === "ru" ? application.project.titleRu : application.project.titleEn}
                        </Link>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{isRu ? "Сумма" : "Amount"}</p>
                        <p className="mt-1 text-18 font-medium text-qidra-dark">{formatUsdt(application.amountUsdt)}</p>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{isRu ? "Статус" : "Status"}</p>
                        <div className="mt-2">
                          <ProjectStatusBadge status={investmentStatus(application.status)} locale={locale} />
                        </div>
                      </div>
                      <ButtonLink href={withLocale(`/projects/${application.project.slug}/documents`, locale)} variant="outline" size="sm">
                        {isRu ? "Документы" : "Documents"}
                      </ButtonLink>
                    </div>
                    {balanceWarning ? (
                      <div className="mt-5 grid gap-3 rounded-qidra border border-qidra-gold bg-yellow-50 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
                        <div>
                          <p className="text-16 font-medium text-qidra-dark">{isRu ? "Недостаточно баланса для подтверждения" : "Insufficient balance for confirmation"}</p>
                          <p className="mt-1 text-14 text-qidra-grayBlue">
                            {isRu
                              ? `Доступно ${formatUsdt(availableUsdt)}, зарезервировано ${formatUsdt(reservedUsdt)}, заявки на проверке ${formatUsdt(pendingTotal)}. Пополните ${formatUsdt(shortfall)} или отмените лишнюю заявку.`
                              : `Available ${formatUsdt(availableUsdt)}, reserved ${formatUsdt(reservedUsdt)}, pending applications ${formatUsdt(pendingTotal)}. Top up ${formatUsdt(shortfall)} or cancel an extra application.`}
                          </p>
                        </div>
                        <ButtonLink href={withLocale(`/investor/wallet?amount=${formatAmountForInput(shortfall)}`, locale)} size="sm">
                          {isRu ? "Пополнить разницу" : "Top up difference"}
                        </ButtonLink>
                        <CancelApplicationForm applicationId={application.id} locale={locale} />
                      </div>
                    ) : application.status === "PENDING" ? (
                      <div className="mt-5 flex justify-end">
                        <CancelApplicationForm applicationId={application.id} locale={locale} />
                      </div>
                    ) : null}
                  </article>
                  );
                })}
              </div>
            ) : (
              <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <NotificationCard
                  title={isRu ? "Заявок пока нет" : "No applications yet"}
                  text={isRu ? "Выберите проект, изучите документы и отправьте заявку на участие." : "Choose a project, review documents and submit a participation application."}
                />
                <ButtonLink href={withLocale("/projects", locale)}>{isRu ? "Открыть проекты" : "Open projects"}</ButtonLink>
              </section>
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function SummaryCard({ label, tone = "default", value }: { label: string; tone?: "default" | "success" | "warning"; value: string }) {
  const color = tone === "success" ? "bg-green-50 text-qidra-green" : tone === "warning" ? "bg-yellow-50 text-qidra-dark" : "bg-white text-qidra-dark";

  return (
    <article className={`rounded-[20px] p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] ${color}`}>
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className="mt-3 text-[28px] font-medium leading-tight tracking-[0]">{value}</p>
    </article>
  );
}

function CancelApplicationForm({ applicationId, locale }: { applicationId: string; locale: "ru" | "en" }) {
  return (
    <FeedbackForm
      className="contents"
      endpoint={`/api/investments/${applicationId}?lang=${locale}`}
      feedback={{
        title: locale === "ru" ? "Заявка отменена" : "Application cancelled",
        text: locale === "ru" ? "Заявка снята с проверки. Страница обновится." : "The application was removed from review. The page will refresh.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "warning"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value="cancel" />
      <button className="inline-flex h-10 items-center justify-center rounded-qidra border border-qidra-grayMedium bg-white px-4 text-14 font-medium text-qidra-dark transition-colors hover:border-qidra-red hover:text-qidra-red" type="submit">
        {locale === "ru" ? "Отменить заявку" : "Cancel application"}
      </button>
    </FeedbackForm>
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

function formatAmountForInput(value: number) {
  return Math.max(value, 0).toFixed(6).replace(/\.?0+$/, "");
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
