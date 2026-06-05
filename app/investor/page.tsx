import { InvestmentStatus } from "@prisma/client";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorTabs } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { UserAvatar } from "@/components/UserAvatar";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function InvestorPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor");
  const isRu = locale === "ru";
  const userName = session.user?.name || (isRu ? "Участник Qidra" : "Qidra participant");
  const userEmail = session.user?.email ?? "";
  const displayEmail = userEmail.endsWith("@telegram.qidra.local") ? (isRu ? "Аккаунт Telegram" : "Telegram account") : userEmail;
  const userId = session.user?.id ?? "";
  const [
    latestKyc,
    wallet,
    pendingApplications,
    confirmedApplications,
    rejectedApplications,
    cancelledApplications,
    latestApplications
  ] = await Promise.all([
    prisma.kycApplication.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.wallet.findUnique({ where: { userId } }),
    prisma.investmentApplication.count({ where: { userId, status: InvestmentStatus.PENDING } }),
    prisma.investmentApplication.count({ where: { userId, status: InvestmentStatus.CONFIRMED } }),
    prisma.investmentApplication.count({ where: { userId, status: InvestmentStatus.REJECTED } }),
    prisma.investmentApplication.count({ where: { userId, status: InvestmentStatus.CANCELLED } }),
    prisma.investmentApplication.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { createdAt: "desc" },
      take: 3
    })
  ]);
  const profileStatus = latestKyc?.status ?? "DRAFT";
  const profileStatusText = profileStatusLabel(profileStatus, locale);
  const profileNotice = profileNoticeContent(profileStatus, locale);
  const nextStep = nextStepContent(profileStatus, locale, numericAmount(wallet?.availableUsdt));
  const availableUsdt = numericAmount(wallet?.availableUsdt);
  const reservedUsdt = numericAmount(wallet?.reservedUsdt);
  const pendingUsdt = numericAmount(wallet?.pendingUsdt);
  const activeApplications = pendingApplications + confirmedApplications;
  const totalApplications = activeApplications + rejectedApplications + cancelledApplications;
  const walletNotice = walletNoticeContent(profileStatus, availableUsdt, reservedUsdt, pendingUsdt, locale);

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
                <ButtonLink href={withLocale("/investor/projects/new", locale)} variant="outline" className="h-12 min-w-44">
                  {isRu ? "Залистить проект" : "List project"}
                </ButtonLink>
              </div>
            </div>
            <InvestorTabs activePath="/investor" locale={locale} />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-5 md:grid-cols-3">
              <MetricCard label={isRu ? "Статус профиля" : "Profile status"} value={profileStatusText} tone={profileStatus === "APPROVED" ? "neutral" : "warning"} />
              <MetricCard label={isRu ? "Свободный баланс" : "Available balance"} value={formatUsdt(availableUsdt)} />
              <MetricCard label={isRu ? "Заявки на проверке" : "Applications in review"} value={pendingApplications.toString()} />
            </div>

            <div className="grid gap-8 lg:grid-cols-[1fr_0.72fr]">
              <section className="rounded-[20px] bg-qidra-grayLight p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div>
                    <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[40px]">{nextStep.title}</h2>
                    <p className="mt-3 max-w-2xl text-18 text-qidra-grayBlue">
                      {nextStep.text}
                    </p>
                  </div>
                  <ButtonLink href={nextStep.href} className="h-12 shrink-0">
                    {nextStep.buttonLabel}
                  </ButtonLink>
                </div>
                <div className="mt-8 grid gap-0">
                  <ActionRow
                    title={isRu ? "Профиль и документы" : "Profile and documents"}
                    text={profileStatus === "APPROVED" ? (isRu ? "Проверка пройдена, данные можно обновить при необходимости." : "Review is complete, details can be updated when needed.") : profileNotice.text}
                    href={withLocale("/investor/kyc", locale)}
                    label={profileStatusText}
                  />
                  <ActionRow
                    title={isRu ? "Кошелек USDT TRC20" : "USDT TRC20 wallet"}
                    text={isRu ? "Пополняйте баланс перед отправкой заявок и отслеживайте проверку переводов." : "Top up before sending applications and track transfer verification."}
                    href={withLocale("/investor/wallet", locale)}
                    label={formatUsdt(availableUsdt)}
                  />
                  <ActionRow
                    title={isRu ? "Каталог проектов" : "Project catalog"}
                    text={isRu ? "Выберите проект, изучите документы и подайте заявку только в пределах свободного баланса." : "Choose a project, review documents and apply within available balance."}
                    href={withLocale("/projects", locale)}
                    label={isRu ? "Открыть" : "Open"}
                  />
                  <ActionRow
                    title={isRu ? "Залистить свой проект" : "List your project"}
                    text={
                      isRu
                        ? "Подайте инициативу на первичную проверку: описание, документы, модель сотрудничества и команда."
                        : "Submit an initiative for initial review: description, documents, cooperation model and team."
                    }
                    href={withLocale("/investor/projects/new", locale)}
                    label={isRu ? "Подать" : "Submit"}
                  />
                  <ActionRow
                    title={isRu ? "Мои заявки" : "My applications"}
                    text={isRu ? "Проверяйте статусы заявок, резерв и документы по каждому проекту." : "Track application statuses, reserved balance and documents for each project."}
                    href={withLocale("/investor/investments", locale)}
                    label={totalApplications ? totalApplications.toString() : isRu ? "Нет" : "None"}
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
                <NotificationCard title={walletNotice.title} text={walletNotice.text} tone={walletNotice.tone} />
                <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                  <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Финансовый статус" : "Financial status"}</h2>
                  <div className="mt-6 grid gap-4 text-16 text-qidra-grayBlue">
                    <ActivityItem label={isRu ? "Свободно" : "Available"} value={formatUsdt(availableUsdt)} />
                    <ActivityItem label={isRu ? "Зарезервировано" : "Reserved"} value={formatUsdt(reservedUsdt)} />
                    <ActivityItem label={isRu ? "Переводы на проверке" : "Transfers in review"} value={formatUsdt(pendingUsdt)} />
                  </div>
                </section>
                <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Последние заявки" : "Latest applications"}</h2>
                    <ButtonLink href={withLocale("/investor/investments", locale)} variant="outline" size="sm">
                      {isRu ? "Все заявки" : "All applications"}
                    </ButtonLink>
                  </div>
                  {latestApplications.length ? (
                    <div className="mt-6 grid gap-4">
                      {latestApplications.map((application) => (
                        <LatestApplicationItem
                          key={application.id}
                          amount={formatUsdt(application.amountUsdt)}
                          date={formatDate(application.createdAt, locale)}
                          href={withLocale(`/projects/${application.project.slug}`, locale)}
                          status={investmentStatus(application.status)}
                          title={locale === "ru" ? application.project.titleRu : application.project.titleEn}
                          locale={locale}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="mt-6">
                      <NotificationCard
                        title={isRu ? "Заявок пока нет" : "No applications yet"}
                        text={isRu ? "После подачи заявки она появится здесь с суммой и текущим статусом." : "After submission, an application will appear here with its amount and current status."}
                      />
                    </div>
                  )}
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

function nextStepContent(status: string, locale: "ru" | "en", availableUsdt: number) {
  if (status === "APPROVED" && availableUsdt <= 0) {
    return {
      title: locale === "ru" ? "Пополните баланс перед заявкой" : "Top up before applying",
      text:
        locale === "ru"
          ? "Профиль уже одобрен. Пополните кошелек USDT TRC20, чтобы подать заявку на участие в выбранном проекте."
          : "Your profile is approved. Top up the USDT TRC20 wallet before submitting a project application.",
      href: withLocale("/investor/wallet", locale),
      buttonLabel: locale === "ru" ? "Открыть кошелек" : "Open wallet"
    };
  }

  if (status === "APPROVED") {
    return {
      title: locale === "ru" ? "Выберите проект для участия" : "Choose a project to join",
      text:
        locale === "ru"
          ? "Свободный баланс доступен для новых заявок. Перед отправкой проверьте документы и условия проекта."
          : "Available balance can be used for new applications. Review project documents and terms before submitting.",
      href: withLocale("/projects", locale),
      buttonLabel: locale === "ru" ? "Смотреть проекты" : "View projects"
    };
  }

  if (status === "SUBMITTED") {
    return {
      title: locale === "ru" ? "Дождитесь проверки профиля" : "Wait for profile review",
      text:
        locale === "ru"
          ? "Команда Qidra проверяет анкету. Пока можно изучить открытые проекты и подготовить кошелек к пополнению."
          : "The Qidra team is reviewing your profile. You can review open projects and prepare the wallet meanwhile.",
      href: withLocale("/projects", locale),
      buttonLabel: locale === "ru" ? "Открыть проекты" : "Open projects"
    };
  }

  if (status === "REJECTED") {
    return {
      title: locale === "ru" ? "Обновите анкету" : "Update your profile",
      text:
        locale === "ru"
          ? "Перед участием нужно исправить замечания по анкете и повторно отправить профиль на проверку."
          : "Before joining projects, update the requested details and resubmit your profile for review.",
      href: withLocale("/investor/kyc", locale),
      buttonLabel: locale === "ru" ? "Исправить анкету" : "Update profile"
    };
  }

  return {
    title: locale === "ru" ? "Завершите проверку профиля" : "Complete profile review",
    text:
      locale === "ru"
        ? "Заполните данные и прикрепите документы. После проверки вы сможете подавать заявки на проекты."
        : "Add your details and attach documents. After review, you will be able to submit project applications.",
    href: withLocale("/investor/kyc", locale),
    buttonLabel: locale === "ru" ? "Начать проверку" : "Start review"
  };
}

function walletNoticeContent(status: string, availableUsdt: number, reservedUsdt: number, pendingUsdt: number, locale: "ru" | "en") {
  if (pendingUsdt > 0) {
    return {
      title: locale === "ru" ? "Перевод ожидает проверки" : "Transfer is being reviewed",
      text:
        locale === "ru"
          ? `${formatUsdt(pendingUsdt)} появится в доступном балансе после автоматической проверки и подтверждения.`
          : `${formatUsdt(pendingUsdt)} will move to available balance after automatic verification and confirmation.`,
      tone: "info" as const
    };
  }

  if (reservedUsdt > 0) {
    return {
      title: locale === "ru" ? "Средства зарезервированы" : "Funds are reserved",
      text:
        locale === "ru"
          ? `${formatUsdt(reservedUsdt)} удерживается под заявки на проверке. При отмене или отклонении резерв вернется в свободный баланс.`
          : `${formatUsdt(reservedUsdt)} is reserved for applications in review. If cancelled or rejected, it returns to available balance.`,
      tone: "info" as const
    };
  }

  if (status === "APPROVED" && availableUsdt <= 0) {
    return {
      title: locale === "ru" ? "Баланс готов к пополнению" : "Wallet is ready for top-up",
      text:
        locale === "ru"
          ? "Пополните кошелек USDT TRC20 перед отправкой первой заявки."
          : "Top up the USDT TRC20 wallet before sending your first application.",
      tone: "warning" as const
    };
  }

  return {
    title: locale === "ru" ? "Баланс под контролем" : "Balance is ready",
    text:
      locale === "ru"
        ? "Свободная сумма используется только для новых заявок, а резерв отдельно показывает уже отправленные заявки."
        : "Available funds are used only for new applications, while reserved funds show applications already submitted.",
    tone: "success" as const
  };
}

function numericAmount(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  return typeof value === "number" ? value : Number(value.toString());
}

function formatUsdt(value: { toString(): string } | number | null | undefined) {
  const amount = numericAmount(value);
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

function ActionRow({ title, text, href, label, last = false }: { title: string; text: string; href: string; label: string; last?: boolean }) {
  return (
    <article className={`grid gap-4 py-5 sm:grid-cols-[1fr_auto] sm:items-center ${last ? "" : "border-b border-qidra-grayMedium/20"}`}>
      <div>
        <h3 className="text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h3>
        <p className="mt-2 text-16 text-qidra-grayBlue">{text}</p>
      </div>
      <ButtonLink href={href} variant="outline" size="sm" className="w-full sm:w-auto">
        {label}
      </ButtonLink>
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

function LatestApplicationItem({
  amount,
  date,
  href,
  locale,
  status,
  title
}: {
  amount: string;
  date: string;
  href: string;
  locale: "ru" | "en";
  status: BadgeStatus;
  title: string;
}) {
  return (
    <article className="border-b border-qidra-grayMedium/20 pb-4 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-14 text-qidra-grayBlue">{date}</p>
          <Link href={href} className="mt-1 block text-18 font-medium leading-tight tracking-[0] text-qidra-dark hover:text-qidra-accent">
            {title}
          </Link>
        </div>
        <ProjectStatusBadge status={status} locale={locale} />
      </div>
      <p className="mt-3 text-16 font-medium text-qidra-dark">{amount}</p>
    </article>
  );
}

function investmentStatus(status: string): BadgeStatus {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "pending";
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
