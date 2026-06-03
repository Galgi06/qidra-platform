import Link from "next/link";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";

const metrics = [
  { label: { ru: "Пользователи", en: "Users" }, value: "128", note: { ru: "17 KYC на проверке", en: "17 pending KYC" } },
  { label: { ru: "Заявки", en: "Participation requests" }, value: "42", note: { ru: "9 требуют проверки", en: "9 require review" } },
  { label: { ru: "Платежные операции", en: "Payment operations" }, value: "14", note: { ru: "USDT TRC20", en: "USDT TRC20" } },
  { label: { ru: "Проекты", en: "Published projects" }, value: "6", note: { ru: "2 в черновике", en: "2 in draft" } }
];

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
  }
];

export default async function AdminPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin");

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
              <p className="text-14 font-medium uppercase text-qidra-accent">Qidra operations</p>
              <h1 className="mt-4 title-48 text-qidra-dark">Admin panel</h1>
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
        </div>
      </section>

      <section className="section">
        <div className="container-qidra">
          <Tabs
            items={[
              { label: locale === "ru" ? "Обзор" : "Overview", href: withLocale("/admin", locale) },
              { label: locale === "ru" ? "Пользователи" : "Users", href: withLocale("/admin/users", locale) },
              { label: "KYC", href: withLocale("/admin/kyc", locale) },
              { label: locale === "ru" ? "Проекты" : "Projects", href: withLocale("/admin/projects", locale) },
              { label: locale === "ru" ? "Платежи" : "Payments", href: withLocale("/admin/payments", locale) }
            ]}
            activeHref={withLocale("/admin", locale)}
          />
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
