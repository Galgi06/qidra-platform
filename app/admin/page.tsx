import Link from "next/link";
import { InvestmentStatus, KycStatus, PaymentStatus, ProjectStatus, TransactionType } from "@prisma/client";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

const sections = [
  {
    href: "/admin/users",
    label: { ru: "Пользователи", en: "Users" },
    text: { ru: "Роли, профили участников и проверка доступа.", en: "Roles, participant profiles and access review." }
  },
  {
    href: "/admin/kyc",
    label: { ru: "KYC", en: "KYC" },
    text: { ru: "Проверка анкет, риск-флаги и дополнительные запросы.", en: "Profile review workflow, risk flags and additional requests." }
  },
  {
    href: "/admin/projects",
    label: { ru: "Проекты", en: "Projects" },
    text: { ru: "Создание, публикация и архив проектов.", en: "Create, edit, publish and archive projects." }
  },
  {
    href: "/admin/investments",
    label: { ru: "Заявки", en: "Applications" },
    text: { ru: "Подтверждение или отклонение заявок на участие.", en: "Approve or reject participation requests." }
  },
  {
    href: "/admin/payments",
    label: { ru: "Платежи", en: "Payments" },
    text: { ru: "Сверка USDT-операций и статусов заявок.", en: "Reconcile USDT operations and application statuses." }
  },
  {
    href: "/admin/audit",
    label: { ru: "Журнал действий", en: "Audit log" },
    text: { ru: "История изменений, проверок и финансовых решений.", en: "History of changes, reviews and financial decisions." }
  }
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin");
  const [userCount, pendingKycCount, pendingInvestmentCount, pendingPaymentCount, activeProjectCount, draftProjectCount, reviewProjectCount, pendingDepositCount, pendingWithdrawalCount] = await Promise.all([
    prisma.user.count(),
    prisma.kycApplication.count({ where: { status: KycStatus.SUBMITTED } }),
    prisma.investmentApplication.count({ where: { status: InvestmentStatus.PENDING } }),
    prisma.walletTransaction.count({ where: { status: PaymentStatus.PENDING } }),
    prisma.project.count({ where: { status: { in: [ProjectStatus.ACTIVE, ProjectStatus.FUNDED] } } }),
    prisma.project.count({ where: { status: ProjectStatus.DRAFT } }),
    prisma.project.count({ where: { status: ProjectStatus.REVIEW } }),
    prisma.walletTransaction.count({ where: { status: PaymentStatus.PENDING, type: TransactionType.DEPOSIT } }),
    prisma.walletTransaction.count({ where: { status: PaymentStatus.PENDING, type: TransactionType.WITHDRAWAL } })
  ]);
  const metrics = [
    {
      label: { ru: "Пользователи", en: "Users" },
      value: formatNumber(userCount),
      note: { ru: `${formatNumber(pendingKycCount)} KYC на проверке`, en: `${formatNumber(pendingKycCount)} pending KYC` }
    },
    {
      label: { ru: "Заявки", en: "Participation requests" },
      value: formatNumber(pendingInvestmentCount),
      note: { ru: "Ожидают решения", en: "Awaiting decision" }
    },
    {
      label: { ru: "Платежные операции", en: "Payment operations" },
      value: formatNumber(pendingPaymentCount),
      note: { ru: "Ожидают сверки", en: "Awaiting reconciliation" }
    },
    {
      label: { ru: "Проекты", en: "Projects" },
      value: formatNumber(activeProjectCount),
      note: { ru: `${formatNumber(draftProjectCount)} в черновике`, en: `${formatNumber(draftProjectCount)} in draft` }
    }
  ];
  const queueItems = [
    {
      href: withLocale("/admin/kyc?status=submitted", locale),
      label: { ru: "KYC на проверке", en: "KYC pending review" },
      value: pendingKycCount,
      text: { ru: "Проверить анкеты и документы участников.", en: "Review participant profiles and documents." }
    },
    {
      href: withLocale("/admin/investments?status=pending", locale),
      label: { ru: "Заявки участия", en: "Participation requests" },
      value: pendingInvestmentCount,
      text: { ru: "Принять решение после проверки KYC и баланса.", en: "Decide after KYC and balance checks." }
    },
    {
      href: withLocale("/admin/payments?status=pending", locale),
      label: { ru: "Платежи на сверке", en: "Payments pending" },
      value: pendingPaymentCount,
      text: { ru: `${formatNumber(pendingDepositCount)} пополнений, ${formatNumber(pendingWithdrawalCount)} выводов.`, en: `${formatNumber(pendingDepositCount)} deposits, ${formatNumber(pendingWithdrawalCount)} withdrawals.` }
    },
    {
      href: withLocale("/admin/projects?status=review", locale),
      label: { ru: "Проекты на проверке", en: "Projects in review" },
      value: reviewProjectCount,
      text: { ru: "Подготовить публикацию после юридической проверки.", en: "Prepare publishing after legal review." }
    },
    {
      href: withLocale("/admin/projects?status=draft", locale),
      label: { ru: "Черновики проектов", en: "Project drafts" },
      value: draftProjectCount,
      text: { ru: "Доработать описание, документы и параметры.", en: "Complete descriptions, documents and parameters." }
    }
  ];

  return (
    <>
      <Header locale={locale} path="/admin" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin" }
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{locale === "ru" ? "Операции Qidra" : "Qidra operations"}</p>
                <h1 className="mt-4 title-48 text-qidra-dark">{locale === "ru" ? "Операционный центр" : "Operations center"}</h1>
                <p className="mt-5 max-w-3xl text-20 text-qidra-grayBlue">
                  {locale === "ru"
                    ? "Операционный центр для комплаенса, публикации проектов, KYC и платежной сверки."
                    : "Operations center for compliance, project publishing, KYC and payment reconciliation."}
                </p>
              </div>
              <NotificationCard
                tone="warning"
                title={locale === "ru" ? "Напоминание по безопасности" : "Security reminder"}
                text={
                  locale === "ru"
                    ? "Используйте роли с минимальными правами и фиксируйте каждую смену статуса перед запуском production-контролей."
                    : "Use least-privilege manager roles and record every status change before production controls are launched."
                }
              />
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((item) => (
                <div key={item.label.en} className="surface bg-white p-6">
                  <p className="text-14 font-medium text-qidra-grayBlue">{item.label[locale]}</p>
                  <p className="mt-3 subtitle-28 text-qidra-dark">{item.value}</p>
                  <p className="mt-2 text-14 text-qidra-grayBlue">{item.note[locale]}</p>
                </div>
              ))}
            </div>
            <div className="mt-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{locale === "ru" ? "Что требует внимания" : "Needs attention"}</h2>
                  <p className="mt-2 text-16 text-qidra-grayBlue">
                    {locale === "ru" ? "Быстрые переходы в очереди, где нужно решение администратора." : "Fast links to queues that need an administrator decision."}
                  </p>
                </div>
                <ButtonLink href={withLocale("/admin/audit", locale)} size="sm" variant="outline">
                  {locale === "ru" ? "Открыть журнал" : "Open audit log"}
                </ButtonLink>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-5">
                {queueItems.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-qidra bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] transition-colors hover:text-qidra-accent">
                    <p className="text-14 font-medium text-qidra-grayBlue">{item.label[locale]}</p>
                    <p className="mt-3 text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{formatNumber(item.value)}</p>
                    <p className="mt-2 text-14 text-qidra-grayBlue">{item.text[locale]}</p>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra">
            <AdminTabs activePath="/admin" locale={locale} />
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {sections.map((section) => (
                <Link key={section.href} href={withLocale(section.href, locale)} className="surface p-6 transition hover:border-qidra-accent">
                  <p className="text-20 font-medium text-qidra-dark">{section.label[locale]}</p>
                  <p className="mt-3 text-16 text-qidra-grayBlue">{section.text[locale]}</p>
                </Link>
              ))}
            </div>
            <div className="mt-8">
              <ButtonLink href={withLocale("/admin/projects", locale)}>{locale === "ru" ? "Создать черновик проекта" : "Create project draft"}</ButtonLink>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
