import Link from "next/link";
import type { ReactNode } from "react";
import { Tabs } from "@/components/Tabs";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

const companySections = [
  { group: "overview", path: "/company", label: { ru: "Обзор", en: "Overview" }, description: { ru: "Сводка компании и воронки", en: "Company and funnel summary" } },
  { group: "profile", path: "/company/profile", label: { ru: "Профиль компании", en: "Company profile" }, description: { ru: "Позиционирование, представитель, документы", en: "Positioning, representative, documents" } },
  { group: "profile", path: "/company/documents", label: { ru: "Документы", en: "Documents" }, description: { ru: "Загрузка юридических и product файлов", en: "Upload legal and product files" } },
  { group: "listings", path: "/investor/projects/new", label: { ru: "Новый листинг", en: "New listing" }, description: { ru: "Создание продукта или проекта", en: "Create a product or project" } },
  { group: "listings", path: "/admin/project-submissions", label: { ru: "Статусы листингов", en: "Listing statuses" }, description: { ru: "Следите за модерацией отправленных заявок", en: "Track moderation of submitted listings" } },
  { group: "workspace", path: "/company/leads", label: { ru: "Leads inbox", en: "Leads inbox" }, description: { ru: "Входящие обращения по проектам", en: "Inbound leads for your projects" } },
  { group: "workspace", path: "/company/team", label: { ru: "Команда", en: "Team" }, description: { ru: "Многоучётность и роли внутри компании", en: "Multi-account access and roles" } },
  { group: "workspace", path: "/company/analytics", label: { ru: "Аналитика", en: "Analytics" }, description: { ru: "Просмотры, лиды и конверсия", en: "Views, leads, and conversion" } },
  { group: "workspace", path: "/projects", label: { ru: "Витрина платформы", en: "Platform marketplace" }, description: { ru: "Проверка публичного каталога и конкурентов", en: "Review public catalog and peer positioning" } }
];

const companyGroups = [
  { key: "overview", label: { ru: "Компания", en: "Company" } },
  { key: "profile", label: { ru: "Onboarding", en: "Onboarding" } },
  { key: "listings", label: { ru: "Листинги", en: "Listings" } },
  { key: "workspace", label: { ru: "Рынок", en: "Marketplace" } }
];

export function CompanyTabs({ activePath, locale }: { activePath: string; locale: Locale }) {
  return (
    <Tabs
      items={companySections.map((section) => ({
        active: section.path === activePath,
        href: withLocale(section.path, locale),
        label: section.label[locale]
      }))}
    />
  );
}

export function CompanyWorkspace({ activePath, children, locale }: { activePath: string; children: ReactNode; locale: Locale }) {
  return (
    <div className="mx-auto grid max-w-[1840px] gap-8 2xl:grid-cols-[320px_minmax(0,1fr)] 2xl:items-start">
      <div className="2xl:hidden">
        <CompanyMenuDisclosure activePath={activePath} locale={locale} />
      </div>
      <div className="hidden 2xl:block">
        <CompanySidebar activePath={activePath} locale={locale} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function CompanySidebar({ activePath, locale }: { activePath: string; locale: Locale }) {
  const isRu = locale === "ru";
  return (
    <nav className="premium-card p-4">
      <div className="border-b border-qidra-grayLight px-2 pb-4">
        <p className="text-12 font-medium uppercase text-qidra-accent">{isRu ? "B2B workspace" : "B2B workspace"}</p>
        <h2 className="mt-2 text-22 font-medium leading-tight text-qidra-dark">{isRu ? "Навигация компании" : "Company navigation"}</h2>
        <p className="mt-2 text-14 text-qidra-grayBlue">
          {isRu ? "Профиль компании, листинги, лиды и публичная витрина." : "Company profile, listings, leads, and public storefront."}
        </p>
      </div>
      <div className="mt-4">
        <CompanyNavigationContent activePath={activePath} locale={locale} />
      </div>
    </nav>
  );
}

function CompanyMenuDisclosure({ activePath, locale }: { activePath: string; locale: Locale }) {
  const isRu = locale === "ru";
  return (
    <details className="group premium-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <p className="text-12 font-semibold uppercase text-qidra-accent">{isRu ? "B2B workspace" : "B2B workspace"}</p>
          <h2 className="mt-1 text-22 font-medium leading-tight text-qidra-dark">{isRu ? "Меню компании" : "Company menu"}</h2>
        </div>
        <span className="grid size-11 place-items-center rounded-qidra border border-qidra-grayLight bg-qidra-grayLight" aria-hidden="true">
          <span className="grid w-5 gap-1">
            <span className="h-0.5 rounded-full bg-qidra-dark" />
            <span className="h-0.5 rounded-full bg-qidra-dark" />
            <span className="h-0.5 rounded-full bg-qidra-dark" />
          </span>
        </span>
      </summary>
      <div className="border-t border-qidra-grayLight p-4">
        <CompanyNavigationContent activePath={activePath} compact locale={locale} />
      </div>
    </details>
  );
}

function CompanyNavigationContent({ activePath, compact = false, locale }: { activePath: string; compact?: boolean; locale: Locale }) {
  return (
    <div className={`grid gap-5 ${compact ? "md:grid-cols-2 xl:grid-cols-4" : ""}`}>
      {companyGroups.map((group) => {
        const sections = companySections.filter((section) => section.group === group.key);

        return (
          <section key={group.key} className="grid gap-2">
            <p className="px-2 text-11 font-semibold uppercase text-qidra-grayMedium">{group.label[locale]}</p>
            <div className="grid gap-2">
              {sections.map((section) => {
                const active = section.path === activePath;

                return (
                  <Link
                    key={section.path}
                    className={`grid gap-1 rounded-qidra px-4 py-3 transition-[background-color,color,box-shadow] ${
                      active ? "bg-qidra-dark text-white shadow-[0_12px_28px_rgba(18,20,23,0.18)]" : "text-qidra-dark hover:bg-qidra-grayLight hover:shadow-[inset_3px_0_0_var(--qidra-accent)]"
                    }`}
                    href={withLocale(section.path, locale)}
                  >
                    <span className="text-15 font-medium">{section.label[locale]}</span>
                    <span className={`text-12 ${active ? "text-white/70" : "text-qidra-grayBlue"}`}>{section.description[locale]}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
