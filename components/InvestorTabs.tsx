import { Tabs } from "@/components/Tabs";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

const investorSections = [
  { path: "/investor", label: { ru: "Обзор", en: "Overview" } },
  { path: "/investor/kyc", label: { ru: "Проверка", en: "Review" } },
  { path: "/investor/wallet", label: { ru: "Кошелек", en: "Wallet" } },
  { path: "/investor/investments", label: { ru: "Участие", en: "Participation" } },
  { path: "/investor/projects/new", label: { ru: "Разместить проект", en: "List project" } },
  { path: "/investor/support", label: { ru: "Поддержка", en: "Support" } }
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
