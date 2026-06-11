import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

const adminSections = [
  { path: "/admin", label: { ru: "Обзор", en: "Overview" }, description: { ru: "Сводка платформы", en: "Platform summary" } },
  { path: "/admin/users", label: { ru: "Пользователи", en: "Users" }, description: { ru: "Клиенты, роли, доступы", en: "Clients, roles, access" } },
  { path: "/admin/kyc", label: { ru: "KYC", en: "KYC" }, description: { ru: "Анкеты и документы", en: "Profiles and documents" } },
  { path: "/admin/projects", label: { ru: "Проекты", en: "Projects" }, description: { ru: "Карточки и статусы", en: "Cards and statuses" } },
  { path: "/admin/project-submissions", label: { ru: "Размещение", en: "Listings" }, description: { ru: "Инициативы клиентов", en: "Client initiatives" } },
  { path: "/admin/investments", label: { ru: "Заявки", en: "Applications" }, description: { ru: "Участие и резервы", en: "Participation and reserves" } },
  { path: "/admin/payments", label: { ru: "Платежи", en: "Payments" }, description: { ru: "Пополнения и выводы", en: "Deposits and withdrawals" } },
  { path: "/admin/support", label: { ru: "Коммуникации", en: "Communications" }, description: { ru: "Чаты и рассылки", en: "Chats and broadcasts" } },
  { path: "/admin/content", label: { ru: "Контент", en: "Content" }, description: { ru: "Главная, документы, контакты", en: "Home, documents, contacts" } },
  { path: "/admin/security", label: { ru: "Безопасность", en: "Security" }, description: { ru: "Блокировки и 2FA", en: "Blocks and 2FA" } },
  { path: "/admin/audit", label: { ru: "Журнал", en: "Audit" }, description: { ru: "История действий", en: "Action history" } }
];

export function AdminTabs({ activePath, locale, role }: { activePath: string; locale: Locale; role?: string }) {
  const visibleSections =
    role === "TECH_SUPPORT" || role === "SALES_MANAGER"
      ? adminSections.filter((section) => section.path === "/admin/users" || section.path === "/admin/support")
      : adminSections;

  return (
    <nav className="premium-card grid gap-3 p-4">
      <div className="px-1">
        <p className="text-12 font-medium uppercase text-qidra-accent">{locale === "ru" ? "Операционный центр" : "Operations center"}</p>
        <p className="mt-1 text-14 text-qidra-grayBlue">
          {locale === "ru" ? "Разделы администрирования, поддержки, платежей и аудита." : "Administration, support, payments and audit sections."}
        </p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {visibleSections.map((section) => {
          const active = section.path === activePath;

          return (
            <Link
              key={section.path}
              className={`grid min-h-[92px] content-start gap-1 rounded-qidra px-4 py-3 transition-[background-color,color,box-shadow] ${
                active ? "bg-qidra-dark text-white shadow-[0_14px_30px_rgba(18,20,23,0.18)]" : "bg-qidra-grayLight text-qidra-dark hover:bg-white hover:shadow-[0_12px_28px_rgba(18,20,23,0.08)]"
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
  );
}
