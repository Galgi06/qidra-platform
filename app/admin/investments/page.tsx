import Link from "next/link";
import type { ReactNode } from "react";
import { InvestmentStatus, Prisma } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
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
  const params = await searchParams;
  const locale = await getLocale(params);
  await requireAdmin(locale, "/admin/investments");
  const statusFilter = parseInvestmentStatus(searchParamString(params.status));
  const applicationWhere: Prisma.InvestmentApplicationWhereInput = statusFilter ? { status: statusFilter } : {};
  const [requests, totalCount, pendingCount, confirmedCount, rejectedCount, cancelledCount] = await Promise.all([
    prisma.investmentApplication.findMany({
      where: applicationWhere,
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
      take: 80
    }),
    prisma.investmentApplication.count(),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.PENDING } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.CONFIRMED } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.REJECTED } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.CANCELLED } })
  ]);
  const stats = { cancelledCount, confirmedCount, pendingCount, rejectedCount, totalCount };

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
          <div className="container-qidra grid gap-8">
            <AdminTabs activePath="/admin/investments" locale={locale} />
            <InvestmentDashboard locale={locale} stats={stats} />
            <InvestmentFilters locale={locale} stats={stats} statusFilter={statusFilter} />
            {requests.length ? (
              requests.map((request) => {
                const latestKycStatus = request.user.kycApplications[0]?.status;
                const walletAvailableUsdt = Number(request.user.wallet?.availableUsdt.toString() ?? 0);
                const walletReservedUsdt = Number(request.user.wallet?.reservedUsdt.toString() ?? 0);
                const applicationReservedUsdt = Number(request.reservedUsdt.toString());
                const amountUsdt = Number(request.amountUsdt.toString());
                const reserveGapUsdt = Math.max(amountUsdt - applicationReservedUsdt, 0);
                const hasEnoughAvailable = walletAvailableUsdt >= reserveGapUsdt;
                const hasEnoughReserve = walletReservedUsdt >= applicationReservedUsdt;
                const hasEnoughBalance = hasEnoughAvailable && hasEnoughReserve;
                const canConfirm = latestKycStatus === "APPROVED" && hasEnoughBalance;
                const blockedMessage = investmentBlockedMessage({
                  hasEnoughAvailable,
                  hasEnoughReserve,
                  latestKycStatus,
                  locale
                });

                return (
                  <div key={request.id} className="surface grid gap-5 p-6">
                    <div className="grid gap-4 lg:grid-cols-[0.7fr_1fr_1fr_0.8fr_0.9fr_auto] lg:items-center">
                      <div>
                        <p className="text-16 font-medium text-qidra-dark">{request.id.slice(-8).toUpperCase()}</p>
                        <p className="mt-1 text-14 text-qidra-grayBlue">{formatDate(request.createdAt, locale)}</p>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Участник" : "Participant"}</p>
                        <p className="mt-1 text-16 font-medium text-qidra-dark">{request.user.name || request.user.email}</p>
                        <p className="mt-1 break-words text-14 text-qidra-grayBlue">{request.user.email}</p>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Проект" : "Project"}</p>
                        <p className="mt-1 text-16 font-medium text-qidra-dark">{locale === "ru" ? request.project.titleRu : request.project.titleEn}</p>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Сумма" : "Amount"}</p>
                        <p className="mt-1 text-16 font-medium text-qidra-dark">{formatUsdt(request.amountUsdt)}</p>
                      </div>
                      <div className="grid gap-1 text-14">
                        <p className="font-medium text-qidra-dark">{locale === "ru" ? "KYC" : "KYC"}: {kycStatusLabel(latestKycStatus, locale)}</p>
                        <p className={hasEnoughAvailable ? "text-qidra-green" : "text-qidra-red"}>
                          {locale === "ru" ? "Свободно" : "Available"}: {formatUsdt(request.user.wallet?.availableUsdt ?? 0)}
                        </p>
                        <p className={hasEnoughReserve ? "text-qidra-green" : "text-qidra-red"}>
                          {locale === "ru" ? "Резерв кошелька" : "Wallet reserve"}: {formatUsdt(request.user.wallet?.reservedUsdt ?? 0)}
                        </p>
                        <p className="text-qidra-grayBlue">
                          {locale === "ru" ? "Резерв заявки" : "Application reserve"}: {formatUsdt(request.reservedUsdt)}
                        </p>
                        <p className="text-qidra-grayBlue">
                          {locale === "ru" ? "Нужно из свободного" : "Needed from available"}: {formatUsdt(reserveGapUsdt)}
                        </p>
                      </div>
                      <div className="grid gap-3 lg:justify-items-end">
                        <ProjectStatusBadge status={investmentStatus(request.status)} locale={locale} />
                        {request.status === "PENDING" ? (
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <InvestmentActionForm action="confirm" disabled={!canConfirm} endpoint={`/api/admin/investments/${request.id}?lang=${locale}`} locale={locale} />
                            <InvestmentActionForm action="reject" endpoint={`/api/admin/investments/${request.id}?lang=${locale}`} locale={locale} />
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {request.status === "PENDING" && !canConfirm ? (
                      <div className="rounded-qidra border border-qidra-gold bg-qidra-accent8 p-4 text-14 text-qidra-dark">
                        {blockedMessage}
                      </div>
                    ) : null}
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

type InvestmentStats = {
  cancelledCount: number;
  confirmedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
};

function InvestmentDashboard({ locale, stats }: { locale: "ru" | "en"; stats: InvestmentStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <InvestmentStatCard label={locale === "ru" ? "Всего заявок" : "Total applications"} value={stats.totalCount} />
      <InvestmentStatCard label={locale === "ru" ? "На проверке" : "Pending review"} tone="accent" value={stats.pendingCount} />
      <InvestmentStatCard label={locale === "ru" ? "Подтверждено" : "Confirmed"} tone="success" value={stats.confirmedCount} />
      <InvestmentStatCard label={locale === "ru" ? "Отклонено" : "Rejected"} tone="danger" value={stats.rejectedCount} />
      <InvestmentStatCard label={locale === "ru" ? "Отменено" : "Cancelled"} value={stats.cancelledCount} />
    </div>
  );
}

function InvestmentStatCard({ label, tone = "neutral", value }: { label: string; tone?: "accent" | "danger" | "neutral" | "success"; value: number }) {
  const valueClass = tone === "success" ? "text-qidra-green" : tone === "danger" ? "text-qidra-red" : tone === "accent" ? "text-qidra-accent" : "text-qidra-dark";

  return (
    <article className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 text-[32px] font-medium leading-tight tracking-[0] ${valueClass}`}>{formatCount(value)}</p>
    </article>
  );
}

function InvestmentFilters({ locale, stats, statusFilter }: { locale: "ru" | "en"; stats: InvestmentStats; statusFilter?: InvestmentStatus }) {
  return (
    <div className="grid gap-2 rounded-qidra border border-qidra-grayLight bg-white p-4">
      <p className="text-14 font-medium text-qidra-grayBlue">{locale === "ru" ? "Статус заявки" : "Application status"}</p>
      <div className="flex flex-wrap gap-2">
        <InvestmentFilterPill active={!statusFilter} href={investmentFilterHref(locale)}>
          {locale === "ru" ? "Все" : "All"} ({formatCount(stats.totalCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.PENDING} href={investmentFilterHref(locale, InvestmentStatus.PENDING)}>
          {locale === "ru" ? "На проверке" : "Pending"} ({formatCount(stats.pendingCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.CONFIRMED} href={investmentFilterHref(locale, InvestmentStatus.CONFIRMED)}>
          {locale === "ru" ? "Подтверждено" : "Confirmed"} ({formatCount(stats.confirmedCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.REJECTED} href={investmentFilterHref(locale, InvestmentStatus.REJECTED)}>
          {locale === "ru" ? "Отклонено" : "Rejected"} ({formatCount(stats.rejectedCount)})
        </InvestmentFilterPill>
        <InvestmentFilterPill active={statusFilter === InvestmentStatus.CANCELLED} href={investmentFilterHref(locale, InvestmentStatus.CANCELLED)}>
          {locale === "ru" ? "Отменено" : "Cancelled"} ({formatCount(stats.cancelledCount)})
        </InvestmentFilterPill>
      </div>
    </div>
  );
}

function InvestmentFilterPill({ active, children, href }: { active: boolean; children: ReactNode; href: string }) {
  return (
    <Link
      className={`inline-flex h-10 items-center justify-center rounded-qidra border px-4 text-14 font-medium transition-colors ${
        active ? "border-qidra-dark bg-qidra-dark text-white" : "border-qidra-grayLight bg-white text-qidra-grayBlue hover:border-qidra-accent hover:text-qidra-accent"
      }`}
      href={href}
    >
      {children}
    </Link>
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
            ? "Зарезервированная сумма переведена в участие по проекту, прогресс проекта обновлён."
            : "The reserved amount was moved into project participation and the project progress was updated."
          : locale === "ru"
            ? "Участник увидит обновлённый статус в профиле участника."
            : "The participant will see the updated status in the participant profile.",
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

function investmentBlockedMessage({
  hasEnoughAvailable,
  hasEnoughReserve,
  latestKycStatus,
  locale
}: {
  hasEnoughAvailable: boolean;
  hasEnoughReserve: boolean;
  latestKycStatus: string | undefined;
  locale: "ru" | "en";
}) {
  if (latestKycStatus !== "APPROVED") {
    return locale === "ru"
      ? "Подтверждение заблокировано: сначала одобрите KYC участника."
      : "Confirmation is blocked: approve the participant KYC first.";
  }

  if (!hasEnoughReserve) {
    return locale === "ru"
      ? "Подтверждение заблокировано: резерв кошелька меньше резерва заявки. Обновите страницу или отклоните заявку, чтобы вернуть доступный баланс участнику."
      : "Confirmation is blocked: the wallet reserve is lower than the application reserve. Refresh the page or reject the application to return available balance to the participant.";
  }

  if (!hasEnoughAvailable) {
    return locale === "ru"
      ? "Подтверждение заблокировано: свободного баланса недостаточно для недостающей части заявки."
      : "Confirmation is blocked: available balance is not enough for the remaining part of the application.";
  }

  return locale === "ru"
    ? "Подтверждение временно недоступно. Обновите страницу и проверьте заявку снова."
    : "Confirmation is temporarily unavailable. Refresh the page and check the application again.";
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

function searchParamString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseInvestmentStatus(value: string | undefined) {
  const normalized = value?.toUpperCase();

  if (normalized === InvestmentStatus.PENDING) return InvestmentStatus.PENDING;
  if (normalized === InvestmentStatus.CONFIRMED) return InvestmentStatus.CONFIRMED;
  if (normalized === InvestmentStatus.REJECTED) return InvestmentStatus.REJECTED;
  if (normalized === InvestmentStatus.CANCELLED) return InvestmentStatus.CANCELLED;
  return undefined;
}

function investmentFilterHref(locale: "ru" | "en", status?: InvestmentStatus) {
  const params = new URLSearchParams({ lang: locale });

  if (status) params.set("status", status.toLowerCase());

  return `/admin/investments?${params.toString()}`;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
