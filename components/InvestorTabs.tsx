import { Tabs } from "@/components/Tabs";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import Link from "next/link";
import type { ReactNode } from "react";

const investorSections = [
  { path: "/investor", label: { ru: "Обзор", en: "Overview" }, description: { ru: "Главная сводка кабинета", en: "Account summary" } },
  { path: "/investor/kyc", label: { ru: "Профиль и KYC", en: "Profile and KYC" }, description: { ru: "Анкета, документы, проверка", en: "Profile, documents, review" } },
  { path: "/investor/wallet", label: { ru: "Кошелек", en: "Wallet" }, description: { ru: "Баланс, пополнения, вывод", en: "Balance, deposits, withdrawals" } },
  { path: "/investor/investments", label: { ru: "Партнёрские контракты", en: "Partnership contracts" }, description: { ru: "Заявки, контракты, начисления", en: "Applications, contracts, accruals" } },
  { path: "/investor/projects/new", label: { ru: "Разместить проект", en: "List a project" }, description: { ru: "Заявка на листинг инициативы", en: "Listing request for an initiative" } },
  { path: "/investor/support", label: { ru: "Поддержка", en: "Support" }, description: { ru: "Техподдержка и отдел проектов", en: "Support and project desk" } }
];

export function InvestorTabs({ activePath, locale }: { activePath: string; locale: Locale }) {
  return (
    <Tabs
      items={investorSections.map((section) => ({
        active: section.path === activePath,
        label: section.label[locale],
        href: withLocale(section.path, locale)
      }))}
    />
  );
}

export function InvestorSidebar({ activePath, locale }: { activePath: string; locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <aside className="lg:sticky lg:top-6">
      <nav className="rounded-[20px] bg-white p-4 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
        <div className="border-b border-qidra-grayLight px-2 pb-4">
          <p className="text-12 font-medium uppercase text-qidra-accent">{isRu ? "Личный кабинет" : "Account"}</p>
          <h2 className="mt-2 text-22 font-medium leading-tight text-qidra-dark">{isRu ? "Меню участника" : "Participant menu"}</h2>
          <p className="mt-2 text-14 text-qidra-grayBlue">
            {isRu ? "Все разделы профиля, кошелька и проектов находятся здесь." : "All profile, wallet and project sections are here."}
          </p>
        </div>
        <div className="mt-3 grid gap-2">
          {investorSections.map((section) => {
            const active = section.path === activePath;

            return (
              <Link
                key={section.path}
                className={`grid gap-1 rounded-[12px] px-4 py-3 text-left transition-colors ${
                  active ? "bg-qidra-dark text-white" : "text-qidra-dark hover:bg-qidra-grayLight"
                }`}
                href={withLocale(section.path, locale)}
              >
                <span className="text-15 font-medium">{section.label[locale]}</span>
                <span className={`text-12 ${active ? "text-white/70" : "text-qidra-grayBlue"}`}>{section.description[locale]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}

export function InvestorWorkspace({ activePath, children, locale }: { activePath: string; children: ReactNode; locale: Locale }) {
  return (
    <div className="mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <InvestorSidebar activePath={activePath} locale={locale} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
