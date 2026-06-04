import { InvestmentStatus } from "@prisma/client";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { UserAvatar } from "@/components/UserAvatar";
import { ButtonLink } from "@/components/ui/Button";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function InvestorPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor");
  const isRu = locale === "ru";
  const userName = session.user?.name || (isRu ? "Участник Qidra" : "Qidra participant");
  const userEmail = session.user?.email ?? "";
  const displayEmail = userEmail.endsWith("@telegram.qidra.local") ? (isRu ? "Аккаунт Telegram" : "Telegram account") : userEmail;
  const userId = session.user?.id ?? "";
  const [latestKyc, wallet, activeApplications] = await Promise.all([
    prisma.kycApplication.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.investmentApplication.count({ where: { userId, status: { in: [InvestmentStatus.PENDING, InvestmentStatus.CONFIRMED] } } })
  ]);
  const profileStatus = latestKyc?.status ?? "DRAFT";
  const profileStatusText = profileStatusLabel(profileStatus, locale);
  const profileNotice = profileNoticeContent(profileStatus, locale);
  const primaryActionHref = profileStatus === "APPROVED" ? withLocale("/projects", locale) : withLocale("/investor/kyc", locale);
  const primaryActionLabel = profileStatus === "APPROVED" ? (isRu ? "Выбрать проект" : "Choose project") : isRu ? "Начать проверку" : "Start review";

  return (
    <>
      <Header locale={locale} path="/investor" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-7 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="flex items-start gap-4 sm:gap-5">
                <UserAvatar name={userName} />
                <div>
                  <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Профиль участника" : "Participant profile"}</p>
                  <h1 className="mt-3 text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[48px]">{userName}</h1>
                  {displayEmail ? <p className="mt-2 text-16 text-qidra-grayBlue">{displayEmail}</p> : null}
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ButtonLink href={withLocale("/investor/kyc", locale)} className="h-12 min-w-44">
                  {isRu ? "Заполнить профиль" : "Complete profile"}
                </ButtonLink>
                <ButtonLink href={withLocale("/projects", locale)} variant="outline" className="h-12 min-w-44">
                  {isRu ? "Открыть проекты" : "Open projects"}
                </ButtonLink>
              </div>
            </div>
            <Tabs
              items={[
                { label: isRu ? "Обзор" : "Overview", href: withLocale("/investor", locale), active: true },
                { label: isRu ? "Проверка" : "Review", href: withLocale("/investor/kyc", locale) },
                { label: isRu ? "Кошелек" : "Wallet", href: withLocale("/investor/wallet", locale) },
                { label: isRu ? "Участие" : "Participation", href: withLocale("/investor/investments", locale) }
              ]}
            />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-5 md:grid-cols-3">
              <MetricCard label={isRu ? "Статус профиля" : "Profile status"} value={profileStatusText} tone={profileStatus === "APPROVED" ? "neutral" : "warning"} />
              <MetricCard label={isRu ? "Доступный баланс" : "Available balance"} value={formatUsdt(wallet?.availableUsdt ?? 0)} />
              <MetricCard label={isRu ? "Активные заявки" : "Active applications"} value={activeApplications.toString()} />
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr]">
              <section className="rounded-[20px] bg-qidra-grayLight p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[40px]">
                      {isRu ? "Что сделать дальше" : "Next steps"}
                    </h2>
                    <p className="mt-3 max-w-2xl text-18 text-qidra-grayBlue">
                      {isRu
                        ? "Чтобы подать заявку на участие, сначала заполните профиль и ознакомьтесь с условиями выбранного проекта."
                        : "To submit a participation application, complete your profile first and review the terms of the selected project."}
                    </p>
                  </div>
                  <ButtonLink href={primaryActionHref} className="h-12 shrink-0">
                    {primaryActionLabel}
                  </ButtonLink>
                </div>
                <div className="mt-8 grid gap-4">
                  <StepItem
                    number="01"
                    title={isRu ? "Заполните профиль" : "Complete profile"}
                    text={isRu ? "Укажите страну, город, профессию и источник средств." : "Add your country, city, occupation and source of funds."}
                  />
                  <StepItem
                    number="02"
                    title={isRu ? "Изучите документы проекта" : "Review project documents"}
                    text={isRu ? "Откройте карточку проекта и проверьте условия до подачи заявки." : "Open the project page and review terms before applying."}
                  />
                  <StepItem
                    number="03"
                    title={isRu ? "Подайте заявку" : "Submit application"}
                    text={isRu ? "После проверки профиля создайте заявку на странице проекта." : "After profile review, create an application from the project page."}
                    last
                  />
                </div>
              </section>

              <aside className="grid content-start gap-5">
                <NotificationCard
                  title={profileNotice.title}
                  text={profileNotice.text}
                  tone={profileNotice.tone}
                />
                <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                  <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Последние действия" : "Recent activity"}</h2>
                  <div className="mt-6 grid gap-4 text-16 text-qidra-grayBlue">
                    <ActivityItem label={isRu ? "Аккаунт создан" : "Account created"} value={isRu ? "Готово" : "Done"} />
                    <ActivityItem label={isRu ? "Профиль участника" : "Participant profile"} value={profileStatusText} />
                    <ActivityItem label={isRu ? "Заявки" : "Applications"} value={activeApplications ? activeApplications.toString() : isRu ? "Нет активных" : "No active"} />
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function profileStatusLabel(status: string, locale: "ru" | "en") {
  if (status === "APPROVED") return locale === "ru" ? "Одобрен" : "Approved";
  if (status === "SUBMITTED") return locale === "ru" ? "На проверке" : "In review";
  if (status === "REJECTED") return locale === "ru" ? "Нужны правки" : "Updates needed";
  return locale === "ru" ? "Нужно заполнить" : "Action needed";
}

function profileNoticeContent(status: string, locale: "ru" | "en") {
  if (status === "APPROVED") {
    return {
      title: locale === "ru" ? "Профиль одобрен" : "Profile approved",
      text: locale === "ru" ? "Теперь можно выбирать проект и отправлять заявку на участие." : "You can now choose a project and submit a participation application.",
      tone: "success" as const
    };
  }

  if (status === "SUBMITTED") {
    return {
      title: locale === "ru" ? "Профиль на проверке" : "Profile in review",
      text: locale === "ru" ? "Команда Qidra проверяет анкету и документы." : "The Qidra team is reviewing the profile and documents.",
      tone: "info" as const
    };
  }

  if (status === "REJECTED") {
    return {
      title: locale === "ru" ? "Анкету нужно обновить" : "Profile needs updates",
      text: locale === "ru" ? "Откройте проверку профиля, обновите данные и отправьте анкету повторно." : "Open profile review, update the details and submit the profile again.",
      tone: "error" as const
    };
  }

  return {
    title: locale === "ru" ? "Профиль ещё не отправлен" : "Profile not submitted yet",
    text:
      locale === "ru"
        ? "Заполните анкету и прикрепите документы, чтобы команда Qidra могла начать проверку."
        : "Complete the form and attach documents so the Qidra team can start the review.",
    tone: "warning" as const
  };
}

function formatUsdt(value: { toString(): string } | number) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function MetricCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warning" }) {
  const isWarning = tone === "warning";

  return (
    <article className={`rounded-[20px] p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] ${isWarning ? "bg-[#2418f2] text-white" : "bg-white text-qidra-dark"}`}>
      <p className={`text-14 font-medium ${isWarning ? "text-white/72" : "text-qidra-grayBlue"}`}>{label}</p>
      <p className="mt-4 text-[30px] font-medium leading-tight tracking-[0]">{value}</p>
    </article>
  );
}

function StepItem({ number, title, text, last = false }: { number: string; title: string; text: string; last?: boolean }) {
  return (
    <article className={`grid gap-4 py-5 sm:grid-cols-[72px_1fr] ${last ? "" : "border-b border-qidra-grayMedium/20"}`}>
      <span className="text-18 font-medium text-qidra-accent">{number}</span>
      <div>
        <h3 className="text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h3>
        <p className="mt-2 text-16 text-qidra-grayBlue">{text}</p>
      </div>
    </article>
  );
}

function ActivityItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-qidra-grayMedium/20 pb-4 last:border-b-0 last:pb-0">
      <span>{label}</span>
      <strong className="font-medium text-qidra-dark">{value}</strong>
    </div>
  );
}
