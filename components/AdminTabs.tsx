import { Tabs } from "@/components/Tabs";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

const adminSections = [
  { path: "/admin", label: { ru: "Обзор", en: "Overview" } },
  { path: "/admin/users", label: { ru: "Пользователи", en: "Users" } },
  { path: "/admin/kyc", label: { ru: "KYC", en: "KYC" } },
  { path: "/admin/projects", label: { ru: "Проекты", en: "Projects" } },
  { path: "/admin/project-submissions", label: { ru: "Размещение", en: "Listings" } },
  { path: "/admin/investments", label: { ru: "Заявки", en: "Applications" } },
  { path: "/admin/payments", label: { ru: "Платежи", en: "Payments" } },
  { path: "/admin/support", label: { ru: "Коммуникации", en: "Communications" } },
  { path: "/admin/audit", label: { ru: "Журнал", en: "Audit" } }
];

export function AdminTabs({ activePath, locale, role }: { activePath: string; locale: Locale; role?: string }) {
  const visibleSections =
    role === "TECH_SUPPORT" || role === "SALES_MANAGER" ? adminSections.filter((section) => section.path === "/admin/support") : adminSections;

  return (
    <Tabs
      items={visibleSections.map((section) => ({
        label: section.label[locale],
        href: withLocale(section.path, locale)
      }))}
      activeHref={withLocale(activePath, locale)}
    />
  );
}
