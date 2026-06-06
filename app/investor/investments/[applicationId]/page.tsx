import Link from "next/link";
import { notFound } from "next/navigation";
import { InvestmentStatus, PaymentStatus, TransactionType } from "@prisma/client";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { DocumentItem } from "@/components/DocumentItem";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorTabs } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAuth } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function InvestorContractPage({
  params,
  searchParams
}: {
  params: Promise<{ applicationId: string }>;
  searchParams?: SearchParams;
}) {
  const [{ applicationId }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = await requireAuth(locale, `/investor/investments/${applicationId}`);
  const userId = session.user?.id ?? "";
  const isRu = locale === "ru";
  const application = await prisma.investmentApplication.findFirst({
    where: { id: applicationId, userId },
    include: {
      project: {
        include: {
          documents: true,
          reports: true
        }
      }
    }
  });

  if (!application) {
    notFound();
  }

  const wallet = await prisma.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        where: {
          note: { contains: application.id }
        },
        orderBy: { createdAt: "desc" },
        take: 50
      }
    }
  });
  const projectTitle = isRu ? application.project.titleRu : application.project.titleEn;
  const expectedReturn = localizedText(application.project.expectedReturnRu, application.project.expectedReturnEn, locale);
  const expectedYield = localizedText(application.project.expectedYieldRu, application.project.expectedYieldEn, locale);
  const linkedTransactions = wallet?.transactions ?? [];
  const accrualsUsdt = sumUsdt(linkedTransactions.filter((transaction) => transaction.type === TransactionType.RETURN && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt));
  const withdrawnUsdt = sumUsdt(linkedTransactions.filter((transaction) => transaction.type === TransactionType.WITHDRAWAL && transaction.status === PaymentStatus.CONFIRMED).map((transaction) => transaction.amountUsdt));

  return (
    <>
      <Header locale={locale} path={`/investor/investments/${application.id}`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: isRu ? "Кабинет" : "Dashboard", href: withLocale("/investor", locale) },
                { label: isRu ? "Моё участие" : "My participation", href: withLocale("/investor/investments", locale) },
                { label: projectTitle }
              ]}
            />
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Партнёрский контракт" : "Partnership contract"}</p>
                <h1 className="mt-3 max-w-5xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[58px]">{projectTitle}</h1>
                <p className="mt-4 max-w-4xl text-20 text-qidra-grayBlue">
                  {isRu
                    ? "Детали вашего участия: сумма, статус, документы проекта, начисления, выводы и связанные операции."
                    : "Your participation details: amount, status, project documents, accruals, withdrawals and linked operations."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={withLocale(`/projects/${application.project.slug}`, locale)} variant="outline">
                  {isRu ? "Открыть проект" : "Open project"}
                </ButtonLink>
                <ButtonLink href={withLocale("/investor/investments", locale)}>
                  {isRu ? "Все контракты" : "All contracts"}
                </ButtonLink>
              </div>
            </div>
            <InvestorTabs activePath="/investor/investments" locale={locale} />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard label={isRu ? "Статус" : "Status"} value={investmentStatusLabel(application.status, locale)} tone={investmentTone(application.status)} />
              <MetricCard label={isRu ? "Сумма контракта" : "Contract amount"} value={formatUsdt(application.amountUsdt)} />
              <MetricCard label={isRu ? "Резерв" : "Reserve"} value={formatUsdt(application.reservedUsdt)} />
              <MetricCard label={isRu ? "Начислено" : "Accrued"} value={formatUsdt(accrualsUsdt)} tone="success" />
              <MetricCard label={isRu ? "Выведено" : "Withdrawn"} value={formatUsdt(withdrawnUsdt)} />
            </div>

            <div className="grid gap-8 xl:grid-cols-[1fr_0.74fr]">
              <section className="grid gap-6">
                <Panel title={isRu ? "Условия и параметры" : "Terms and parameters"}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock label={isRu ? "Дата заявки" : "Application date"} value={formatDateTime(application.createdAt, locale)} />
                    <InfoBlock label={isRu ? "Дата активации" : "Activation date"} value={application.contractAcceptedAt ? formatDateTime(application.contractAcceptedAt, locale) : null} />
                    <InfoBlock label={isRu ? "Структура" : "Structure"} value={application.project.structure} />
                    <InfoBlock label={isRu ? "Локация" : "Location"} value={application.project.location} />
                    <InfoBlock label={isRu ? "Риск" : "Risk"} value={application.project.riskLevel} />
                    <InfoBlock label={isRu ? "Статус проекта" : "Project status"} value={application.project.status} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoBlock label={isRu ? "Ожидаемый результат" : "Expected result"} value={expectedReturn || (isRu ? "По условиям проекта" : "Per project terms")} />
                    <InfoBlock label={isRu ? "Ориентир доходности" : "Yield guidance"} value={expectedYield || (isRu ? "Смотрите документы проекта" : "See project documents")} />
                  </div>
                  {application.adminNote ? (
                    <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                      <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Комментарий Qidra" : "Qidra note"}</p>
                      <p className="mt-2 whitespace-pre-wrap text-14 text-qidra-grayBlue">{application.adminNote}</p>
                    </div>
                  ) : null}
                </Panel>

                <Panel title={isRu ? "Документы проекта" : "Project documents"}>
                  {application.project.documents.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {application.project.documents.map((document) => (
                        <DocumentItem
                          key={document.id}
                          actionLabel={isRu ? "Открыть" : "Open"}
                          href={document.fileUrl}
                          meta={document.kind}
                          title={isRu ? document.titleRu : document.titleEn}
                        />
                      ))}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Документы пока не опубликованы" : "Documents are not published yet"}
                      text={isRu ? "Документы появятся здесь после подготовки проекта." : "Documents will appear here after project preparation."}
                    />
                  )}
                </Panel>

                <Panel title={isRu ? "Отчётность по проекту" : "Project reporting"}>
                  {application.project.reports.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {application.project.reports.map((report) => (
                        <DocumentItem
                          key={report.id}
                          actionLabel={isRu ? "Открыть" : "Open"}
                          href={report.fileUrl}
                          meta={report.publishedAt ? formatDate(report.publishedAt, locale) : report.period}
                          title={isRu ? report.titleRu : report.titleEn}
                        />
                      ))}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Отчётов пока нет" : "No reports yet"}
                      text={isRu ? "Когда проект начнёт публиковать отчётность, материалы появятся в этом разделе." : "When the project starts publishing reports, materials will appear here."}
                    />
                  )}
                </Panel>
              </section>

              <aside className="grid content-start gap-6">
                <Panel title={isRu ? "Состояние договора" : "Contract state"}>
                  <div className="flex items-center justify-between gap-4 rounded-qidra bg-qidra-grayLight p-4">
                    <span className="text-14 font-medium text-qidra-grayBlue">{isRu ? "Текущий статус" : "Current status"}</span>
                    <ProjectStatusBadge status={investmentBadgeStatus(application.status)} locale={locale} />
                  </div>
                  <InfoBlock label={isRu ? "ID заявки" : "Application ID"} value={application.id} />
                  <InfoBlock label={isRu ? "Согласие с условиями" : "Terms accepted"} value={application.termsAcceptedAt ? formatDateTime(application.termsAcceptedAt, locale) : null} />
                </Panel>

                <Panel title={isRu ? "История операций" : "Operation history"}>
                  {linkedTransactions.length ? (
                    <div className="grid gap-3">
                      {linkedTransactions.map((transaction) => (
                        <article key={transaction.id} className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-16 font-medium text-qidra-dark">{transactionTitle(transaction.type, locale)}</p>
                              <p className="mt-1 text-12 text-qidra-grayBlue">{formatDateTime(transaction.createdAt, locale)}</p>
                            </div>
                            <strong className="text-16 text-qidra-dark">{transactionAmount(transaction.type, transaction.amountUsdt)}</strong>
                          </div>
                          <p className="mt-2 break-all text-12 text-qidra-grayBlue">{transaction.txHash || transaction.destinationAddress || transaction.note}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <NotificationCard
                      title={isRu ? "Операций по контракту пока нет" : "No contract operations yet"}
                      text={
                        isRu
                          ? "После активации, начислений или вывода по этому договору операции появятся здесь."
                          : "After activation, accruals or withdrawals for this contract, operations will appear here."
                      }
                    />
                  )}
                </Panel>
              </aside>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
      <h2 className="text-[30px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h2>
      {children}
    </section>
  );
}

function MetricCard({ label, tone = "neutral", value }: { label: string; tone?: "danger" | "neutral" | "success" | "warning"; value: string }) {
  const toneClass = tone === "success" ? "text-qidra-green" : tone === "danger" ? "text-qidra-red" : tone === "warning" ? "text-qidra-gold" : "text-qidra-dark";

  return (
    <article className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 font-medium text-qidra-grayBlue">{label}</p>
      <p className={`mt-3 break-words text-[26px] font-medium leading-tight tracking-[0] ${toneClass}`}>{value}</p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="mt-2 break-words text-16 font-medium text-qidra-dark">{value || "—"}</p>
    </div>
  );
}

function sumUsdt(values: Array<{ toString(): string }>) {
  return values.reduce<number>((sum, value) => sum + Number(value.toString()), 0);
}

function localizedText(ru: string | null | undefined, en: string | null | undefined, locale: "ru" | "en") {
  return locale === "ru" ? ru || en || "" : en || ru || "";
}

function investmentStatusLabel(status: InvestmentStatus, locale: "ru" | "en") {
  if (status === InvestmentStatus.CONFIRMED) return locale === "ru" ? "Активирован" : "Activated";
  if (status === InvestmentStatus.REJECTED) return locale === "ru" ? "Отклонён" : "Rejected";
  if (status === InvestmentStatus.CANCELLED) return locale === "ru" ? "Отменён" : "Cancelled";
  return locale === "ru" ? "На проверке" : "Under review";
}

function investmentTone(status: InvestmentStatus): "danger" | "neutral" | "success" | "warning" {
  if (status === InvestmentStatus.CONFIRMED) return "success";
  if (status === InvestmentStatus.REJECTED) return "danger";
  if (status === InvestmentStatus.CANCELLED) return "neutral";
  return "warning";
}

function investmentBadgeStatus(status: InvestmentStatus): BadgeStatus {
  if (status === InvestmentStatus.CONFIRMED) return "confirmed";
  if (status === InvestmentStatus.REJECTED || status === InvestmentStatus.CANCELLED) return "rejected";
  return "pending";
}

function transactionTitle(type: TransactionType, locale: "ru" | "en") {
  if (type === TransactionType.WITHDRAWAL) return locale === "ru" ? "Вывод" : "Withdrawal";
  if (type === TransactionType.INVESTMENT) return locale === "ru" ? "Участие" : "Participation";
  if (type === TransactionType.RETURN) return locale === "ru" ? "Начисление" : "Accrual";
  if (type === TransactionType.ADJUSTMENT) return locale === "ru" ? "Корректировка" : "Adjustment";
  return locale === "ru" ? "Пополнение" : "Deposit";
}

function transactionAmount(type: TransactionType, amount: { toString(): string }) {
  const sign = type === TransactionType.INVESTMENT || type === TransactionType.WITHDRAWAL ? "-" : "+";
  return `${sign}${formatUsdt(amount)}`;
}

function formatUsdt(value: { toString(): string } | number) {
  const amount = typeof value === "number" ? value : Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
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
