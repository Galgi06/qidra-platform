export type Locale = "ru" | "en";
export type SearchParams = Record<string, string | string[] | undefined> & { lang?: string | string[] };
type MaybePromise<T> = T | Promise<T>;

export async function getLocale(searchParams?: MaybePromise<SearchParams>): Promise<Locale> {
  const params = await searchParams;
  const lang = Array.isArray(params?.lang) ? params?.lang[0] : params?.lang;
  return lang === "en" ? "en" : "ru";
}

export function withLocale(path: string, locale: Locale) {
  return `${path}${path.includes("?") ? "&" : "?"}lang=${locale}`;
}

export function t(locale: Locale, path: string) {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dictionary[locale]) as string;
}

export const dictionary = {
  ru: {
    nav: {
      home: "Главная",
      projects: "Проекты",
      faq: "FAQ",
      legal: "Документы",
      investor: "Кабинет",
      admin: "Админ",
      signUp: "Регистрация",
      signIn: "Вход"
    },
    hero: {
      label: "Qidra",
      title: "Международная халяльная\nплатформа партнёрских проектов",
      subtitle:
        "Присоединяйтесь к проектам на платформе или представьте собственную инициативу для международного сотрудничества.",
      primary: "Смотреть проекты",
      secondary: "Представить инициативу"
    },
    common: {
      noFixedYield: "Qidra не обещает фиксированную доходность. Участие в проектах связано с риском.",
      view: "Открыть",
      status: "Статус",
      amount: "Сумма",
      documents: "Документы",
      continue: "Продолжить",
      submit: "Отправить",
      save: "Сохранить",
      pending: "На проверке",
      confirmed: "Подтверждено",
      rejected: "Отклонено"
    }
  },
  en: {
    nav: {
      home: "Home",
      projects: "Projects",
      faq: "FAQ",
      legal: "Documents",
      investor: "Cabinet",
      admin: "Admin",
      signUp: "Registration",
      signIn: "Sign in"
    },
    hero: {
      label: "Qidra",
      title: "International halal\nplatform for partnership projects",
      subtitle:
        "Join projects on the platform or present your own initiative for international cooperation.",
      primary: "View projects",
      secondary: "Submit initiative"
    },
    common: {
      noFixedYield: "Qidra does not promise fixed returns. Participation in projects involves risk.",
      view: "Open",
      status: "Status",
      amount: "Amount",
      documents: "Documents",
      continue: "Continue",
      submit: "Submit",
      save: "Save",
      pending: "Pending",
      confirmed: "Confirmed",
      rejected: "Rejected"
    }
  }
} as const;
