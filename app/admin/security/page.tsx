import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { requireAdmin } from "@/lib/access";
import { diagnosticsSummary, productionDiagnostics, type DiagnosticStatus } from "@/lib/production-diagnostics";
import { getLocale, t, type Locale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function AdminSecurityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/security");

  const groups = productionDiagnostics();
  const summary = diagnosticsSummary(groups);
  const isReady = summary.blocked === 0 && summary.warning === 0;

  const metrics = [
    { label: { ru: "Всего проверок", en: "Total checks" }, value: summary.total, status: "ready" as DiagnosticStatus },
    { label: { ru: "Готово", en: "Ready" }, value: summary.ready, status: "ready" as DiagnosticStatus },
    { label: { ru: "Предупреждения", en: "Warnings" }, value: summary.warning, status: "warning" as DiagnosticStatus },
    { label: { ru: "Блокеры запуска", en: "Launch blockers" }, value: summary.blocked, status: "blocked" as DiagnosticStatus }
  ];

  return (
    <>
      <Header locale={locale} path="/admin/security" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: locale === "ru" ? "Безопасность" : "Security" }
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{locale === "ru" ? "Production readiness" : "Production readiness"}</p>
                <h1 className="mt-4 title-48 text-qidra-dark">{locale === "ru" ? "Безопасность запуска" : "Launch security"}</h1>
                <p className="mt-5 max-w-3xl text-20 text-qidra-grayBlue">
                  {locale === "ru"
                    ? "Диагностика показывает, какие настройки обязательны перед запуском с реальными клиентами, файлами и USDT. Значения секретов здесь не раскрываются."
                    : "Diagnostics show which settings are required before launching with real clients, files and USDT. Secret values are not exposed here."}
                </p>
              </div>
              <NotificationCard
                tone={isReady ? "success" : "warning"}
                title={isReady ? (locale === "ru" ? "Критичных блокеров нет" : "No critical blockers") : locale === "ru" ? "Есть блокеры запуска" : "Launch blockers detected"}
                text={
                  isReady
                    ? locale === "ru"
                      ? "Все обязательные настройки выглядят заполненными. Перед деплоем всё равно проведите контрольный ручной чек."
                      : "All required settings look configured. Still run a final manual check before deployment."
                    : locale === "ru"
                      ? "Не запускайте production-деньги, пока красные пункты не закрыты и предупреждения не проверены."
                      : "Do not launch production money flows until red items are closed and warnings are reviewed."
                }
              />
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-4">
              {metrics.map((metric) => (
                <div key={metric.label.en} className="surface bg-white p-6">
                  <p className="text-14 font-medium text-qidra-grayBlue">{metric.label[locale]}</p>
                  <p className={`mt-3 subtitle-28 ${statusTextClass(metric.status)}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra">
            <AdminTabs activePath="/admin/security" locale={locale} />
            <div className="mt-8 grid gap-5">
              {groups.map((group) => (
                <section key={group.key} className="surface p-6">
                  <div className="flex flex-col gap-3 border-b border-qidra-line pb-5 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-24 font-medium text-qidra-dark">{group.title[locale]}</h2>
                      <p className="mt-2 max-w-3xl text-16 text-qidra-grayBlue">{group.description[locale]}</p>
                    </div>
                    <span className={groupBadgeClass(group.checks.every((check) => check.status === "ready"))}>
                      {group.checks.every((check) => check.status === "ready")
                        ? locale === "ru"
                          ? "Готово"
                          : "Ready"
                        : locale === "ru"
                          ? "Проверить"
                          : "Review"}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {group.checks.map((check) => (
                      <div key={check.key} className="grid gap-3 rounded-qidra bg-qidra-grayLight p-4 md:grid-cols-[220px_140px_1fr] md:items-center">
                        <p className="text-16 font-medium text-qidra-dark">{check.label}</p>
                        <span className={statusBadgeClass(check.status)}>{statusLabel(check.status, locale)}</span>
                        <p className="text-15 text-qidra-grayBlue">{check.description[locale]}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function statusLabel(status: DiagnosticStatus, locale: Locale) {
  const labels = {
    blocked: { en: "Blocked", ru: "Блокер" },
    ready: { en: "Ready", ru: "Готово" },
    warning: { en: "Warning", ru: "Внимание" }
  };
  return labels[status][locale];
}

function statusBadgeClass(status: DiagnosticStatus) {
  const base = "inline-flex w-fit rounded-full px-3 py-1 text-13 font-medium";
  if (status === "ready") return `${base} bg-emerald-50 text-emerald-700`;
  if (status === "warning") return `${base} bg-amber-50 text-amber-700`;
  return `${base} bg-red-50 text-red-700`;
}

function statusTextClass(status: DiagnosticStatus) {
  if (status === "ready") return "text-emerald-700";
  if (status === "warning") return "text-amber-700";
  return "text-red-700";
}

function groupBadgeClass(ready: boolean) {
  return ready
    ? "inline-flex w-fit rounded-full bg-emerald-50 px-4 py-2 text-14 font-medium text-emerald-700"
    : "inline-flex w-fit rounded-full bg-amber-50 px-4 py-2 text-14 font-medium text-amber-700";
}
