import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const SITE_CONTENT_KEY = "global";

export type LocalizedText = {
  en: string;
  ru: string;
};

export type SiteDocumentAsset =
  | {
      type: "stored";
      contentType: string;
      fileName: string;
      storagePath: string;
    }
  | {
      type: "url";
      href: string;
    };

export type LegalPageContent = {
  assets?: Partial<Record<"en" | "ru", SiteDocumentAsset>>;
  slug: string;
  title: LocalizedText;
  body: LocalizedText;
};

export type FooterLink = {
  href: string;
  label: LocalizedText;
};

export type SiteContentSnapshot = {
  faqItems: { answer: LocalizedText; question: LocalizedText }[];
  footer: {
    aboutLinks: FooterLink[];
    companyText: string;
    cooperationEmail: string;
    cooperationLabel: LocalizedText;
    privacySlug: string;
    projectLinks: FooterLink[];
    socialLinks: {
      instagram: string;
      telegram: string;
      whatsapp: string;
    };
  };
  home: {
    business: {
      steps: {
        actionLabel?: LocalizedText;
        items: LocalizedText[];
        title: LocalizedText;
      }[];
      title: LocalizedText;
    };
    finalCta: {
      buttonLabel: LocalizedText;
      text: LocalizedText;
      title: LocalizedText;
    };
    hero: {
      ctaLabel: LocalizedText;
      kicker: LocalizedText;
      signals: {
        label: LocalizedText;
        value: LocalizedText;
      }[];
      subtitle: LocalizedText;
      title: LocalizedText;
    };
    intro: {
      featurePanels: {
        text: LocalizedText;
        title: LocalizedText;
      }[];
      process: {
        insights: {
          text: LocalizedText;
          title: LocalizedText;
        }[];
        kicker: LocalizedText;
        title: LocalizedText;
      };
      subtitle: LocalizedText;
      title: LocalizedText;
    };
    openProjects: {
      buttonLabels: {
        catalog: LocalizedText;
        listProject: LocalizedText;
      };
      sectors: {
        href: string;
        text: LocalizedText;
        title: LocalizedText;
      }[];
      subtitle: LocalizedText;
      title: LocalizedText;
    };
    safety: {
      panels: {
        text: LocalizedText;
        title: LocalizedText;
      }[];
      principles: {
        text: LocalizedText;
        title: LocalizedText;
      }[];
      subtitle: LocalizedText;
      title: LocalizedText;
    };
  };
  legalPages: LegalPageContent[];
};

const defaultSiteContent: SiteContentSnapshot = {
  home: {
    hero: {
      kicker: {
        ru: "Проверенные проекты · защищённая инфраструктура",
        en: "Reviewed projects · protected infrastructure"
      },
      title: {
        ru: "Международная халяльная\nплатформа для партнёрских проектов",
        en: "International halal\nplatform for partnership projects"
      },
      subtitle: {
        ru: "Присоединяйтесь к проектам на платформе или представьте собственную инициативу для международного сотрудничества.",
        en: "Join projects on the platform or present your own initiative for international cooperation."
      },
      ctaLabel: {
        ru: "Перейти к проектам",
        en: "Go to projects"
      },
      signals: [
        { label: { ru: "ПРОВЕРКА", en: "REVIEW" }, value: { ru: "Отбор проектов", en: "Project screening" } },
        { label: { ru: "ДОКУМЕНТЫ", en: "DOCUMENTS" }, value: { ru: "Условия открыты", en: "Clear terms" } },
        { label: { ru: "КАБИНЕТ", en: "WORKSPACE" }, value: { ru: "Статусы и связь", en: "Status and support" } }
      ]
    },
    intro: {
      title: {
        ru: "Международные проекты доступны каждому",
        en: "International projects open to every participant"
      },
      subtitle: {
        ru: "Платформа объединяет предпринимателей и партнёров из разных стран",
        en: "The platform connects entrepreneurs and partners from different countries"
      },
      process: {
        kicker: {
          ru: "Как устроена платформа",
          en: "How the platform works"
        },
        title: {
          ru: "От заявки до сопровождения в одном рабочем контуре",
          en: "From application to support in one operating flow"
        },
        insights: [
          { title: { ru: "Отбор", en: "Review" }, text: { ru: "Проект проходит первичную проверку", en: "Projects pass an initial review" } },
          { title: { ru: "Документы", en: "Documents" }, text: { ru: "Условия и материалы доступны участникам", en: "Terms and materials are available to participants" } },
          { title: { ru: "Кабинет", en: "Workspace" }, text: { ru: "Заявки, статусы и связь в профиле", en: "Applications, statuses and support in profile" } }
        ]
      },
      featurePanels: [
        {
          title: {
            ru: "Разные направления для партнёрских проектов",
            en: "Different sectors for partnership projects"
          },
          text: {
            ru: "Выбирайте инициативы по направлению и масштабу: от локальных компаний до международного сотрудничества.",
            en: "Choose initiatives by sector and scale, from local companies to international cooperation."
          }
        },
        {
          title: {
            ru: "Комплексная экспертиза каждого проекта",
            en: "Comprehensive review for every project"
          },
          text: {
            ru: "Юридическая, экономическая и шариатская экспертиза помогает участникам понимать правила и структуру сотрудничества.",
            en: "Legal, economic, and Sharia review helps participants understand the rules and cooperation structure."
          }
        }
      ]
    },
    safety: {
      title: {
        ru: "Халяльность и безопасность",
        en: "Halal principles and safety"
      },
      subtitle: {
        ru: "Каждый проект проходит экспертную проверку и сопровождается на всех этапах реализации",
        en: "Every project goes through expert review and is supported throughout implementation"
      },
      panels: [
        {
          title: { ru: "Юридическая экспертиза", en: "Legal review" },
          text: {
            ru: "Анализ документов и договорных условий для соблюдения правовых требований.",
            en: "Analysis of documents and contract terms for legal compliance."
          }
        },
        {
          title: { ru: "Экономическая оценка проекта", en: "Economic project assessment" },
          text: {
            ru: "Проверка модели реализации, прозрачности отчётности и согласованных условий взаимодействия.",
            en: "Review of the operating model, reporting transparency, and agreed cooperation terms."
          }
        },
        {
          title: { ru: "Соответствие шариату", en: "Sharia compliance" },
          text: {
            ru: "Шариатский совет Qidra контролирует проекты на этапах отбора, раскрытия условий и сопровождения.",
            en: "The Qidra Sharia board oversees project selection, condition disclosure, and ongoing support."
          }
        }
      ],
      principles: [
        { title: { ru: "Риба", en: "Riba" }, text: { ru: "Исключение фиксированных обязательных начислений", en: "Exclusion of fixed mandatory accruals" } },
        {
          title: { ru: "Гарар", en: "Gharar" },
          text: {
            ru: "Недопустимы неопределённость, скрытая информация или неясные условия сотрудничества",
            en: "Uncertainty, hidden information, and unclear cooperation terms are not accepted"
          }
        },
        { title: { ru: "Мейсир", en: "Maysir" }, text: { ru: "Исключаются азартные и спекулятивные механизмы", en: "Gambling and speculative mechanisms are excluded" } }
      ]
    },
    openProjects: {
      title: { ru: "Открытые проекты", en: "Open projects" },
      subtitle: {
        ru: "На главной доступны те же опубликованные проекты, документы и описания, которые участник видит в каталоге.",
        en: "The home page shows the same published projects, documents and descriptions available in the participant catalog."
      },
      buttonLabels: {
        catalog: { ru: "Весь каталог", en: "Full catalog" },
        listProject: { ru: "Разместить проект", en: "List project" }
      },
      sectors: [
        {
          href: "/projects?sector=real-estate",
          title: { ru: "Недвижимость", en: "Real estate" },
          text: { ru: "Девелопмент, доходные объекты и партнёрские сделки с недвижимостью.", en: "Development, income assets and real-estate partnership deals." }
        },
        {
          href: "/projects?sector=trade",
          title: { ru: "Торговля", en: "Trade" },
          text: { ru: "Закупки, поставки, международная торговля и оборотные контракты.", en: "Procurement, supply, international trade and working-capital contracts." }
        },
        {
          href: "/projects?sector=metallurgy",
          title: { ru: "Металлургия и сырьё", en: "Metallurgy and resources" },
          text: { ru: "Проекты добычи, переработки, производства и поставок сырья.", en: "Mining, processing, production and resource supply projects." }
        },
        {
          href: "/projects?sector=healthcare",
          title: { ru: "Медицина и технологии", en: "Healthcare and technology" },
          text: { ru: "Медицинские, цифровые и технологические инициативы.", en: "Healthcare, digital and technology initiatives." }
        }
      ]
    },
    business: {
      title: { ru: "Быстрый старт для бизнеса", en: "Fast start for business" },
      steps: [
        {
          title: { ru: "Оставьте заявку с описанием идеи", en: "Submit an application with your idea" },
          items: [
            { ru: "Экспертная оценка проекта", en: "Expert project assessment" },
            { ru: "Поддержка команды Qidra при подготовке проекта к размещению", en: "Qidra team support while preparing the project for publication" }
          ],
          actionLabel: { ru: "Создать проект", en: "Create project" }
        },
        {
          title: { ru: "Получите поддержку международного сообщества", en: "Get support from an international community" },
          items: [
            { ru: "Проект становится доступным широкой аудитории участников", en: "The project becomes available to a wide participant audience" },
            { ru: "Платформа обеспечивает структурированное и прозрачное взаимодействие сторон", en: "The platform provides structured and transparent cooperation" }
          ]
        },
        {
          title: { ru: "Реализуйте цели своего бизнеса", en: "Reach your business goals" },
          items: [
            { ru: "Привлечение партнёров для реализации бизнес-задач", en: "Attract partners to carry out business goals" },
            { ru: "Прямое взаимодействие с участниками проекта через платформу", en: "Direct interaction with project participants through the platform" }
          ]
        }
      ]
    },
    finalCta: {
      title: { ru: "Откройте каталог проектов Qidra", en: "Open the Qidra project catalog" },
      text: {
        ru: "Выберите подходящее направление, изучите условия и перейдите к заявке через страницу проекта.",
        en: "Choose a suitable sector, review the terms, and proceed to the application from the project page."
      },
      buttonLabel: { ru: "Перейти к проектам", en: "Go to projects" }
    }
  },
  footer: {
    socialLinks: {
      telegram: "#",
      instagram: "#",
      whatsapp: "#"
    },
    projectLinks: [
      { href: "/projects", label: { ru: "Открытые", en: "Open" } },
      { href: "/projects", label: { ru: "Избранные", en: "Selected" } }
    ],
    aboutLinks: [
      { href: "/faq", label: { ru: "Работа платформы", en: "How it works" } },
      { href: "/legal/sharia-compliance", label: { ru: "Шариатский совет", en: "Sharia board" } },
      { href: "/auth/sign-up", label: { ru: "Предпринимателям", en: "For entrepreneurs" } },
      { href: "/auth/sign-up", label: { ru: "Партнерам", en: "For partners" } }
    ],
    companyText: "QIDRA LLC, Sharjah Media City (Shams), P.O. Box 839, Sharjah, United Arab Emirates, License No: 2539733.01, Formation Date: 04 August 2025",
    cooperationLabel: { ru: "Сотрудничество", en: "Cooperation" },
    cooperationEmail: "info@qidra.io",
    privacySlug: "privacy"
  },
  legalPages: [
    {
      slug: "terms",
      title: { ru: "Terms and Conditions", en: "Terms and Conditions" },
      body: {
        ru: "Пользователь принимает условия Qidra, понимает риски участия в проектах и подтверждает, что Qidra не обещает фиксированную доходность.",
        en: "The user accepts Qidra terms, understands participation risks, and confirms that Qidra does not promise fixed returns."
      },
      assets: {
        ru: { type: "url", href: "/assets/documents/legal/terms-conditions-ru.docx" },
        en: { type: "url", href: "/assets/documents/legal/terms-conditions-ru.docx" }
      }
    },
    {
      slug: "privacy",
      title: { ru: "Privacy Policy", en: "Privacy Policy" },
      body: {
        ru: "Политика описывает обработку персональных данных, документов участника и информации, необходимой для работы сервиса.",
        en: "This policy describes processing of personal data, participant documents, and information needed to operate the service."
      },
      assets: {
        ru: { type: "url", href: "/assets/documents/legal/privacy-policy-ru.docx" },
        en: { type: "url", href: "/assets/documents/legal/privacy-policy-ru.docx" }
      }
    },
    {
      slug: "aml-kyc",
      title: { ru: "AML/KYC Policy", en: "AML/KYC Policy" },
      body: {
        ru: "Qidra проверяет данные участников и может отклонять заявки, если выявлены повышенные комплаенс-риски.",
        en: "Qidra reviews participant information and may reject applications when elevated compliance risks are identified."
      }
    },
    {
      slug: "risk-disclaimer",
      title: { ru: "Risk Disclaimer", en: "Risk Disclaimer" },
      body: {
        ru: "Участие в проектах может привести к частичной или полной потере капитала. Прошлые результаты и прогнозы не являются гарантией.",
        en: "Participation in projects may result in partial or total capital loss. Past performance and projections are not guarantees."
      }
    },
    {
      slug: "sharia-compliance",
      title: { ru: "Sharia Compliance Statement", en: "Sharia Compliance Statement" },
      body: {
        ru: "Qidra использует договорные структуры Mudaraba/Musharaka и раскрывает условия участия до подачи заявки.",
        en: "Qidra uses Mudaraba/Musharaka contractual structures and discloses participation terms before application."
      }
    }
  ],
  faqItems: [
    {
      question: { ru: "Qidra гарантирует доходность?", en: "Does Qidra guarantee returns?" },
      answer: {
        ru: "Нет. Qidra не обещает фиксированную доходность и раскрывает риски до подачи заявки.",
        en: "No. Qidra does not promise fixed returns and discloses risks before an application is submitted."
      }
    },
    {
      question: { ru: "Как подать заявку на участие?", en: "How do I submit a participation application?" },
      answer: {
        ru: "Выберите проект, изучите условия и документы, затем отправьте заявку через страницу проекта.",
        en: "Choose a project, review the terms and documents, then submit an application from the project page."
      }
    },
    {
      question: { ru: "Когда включится 2FA?", en: "When will 2FA be enabled?" },
      answer: {
        ru: "Структура 2FA подготовлена в MVP, но первый запуск может работать без обязательного 2FA.",
        en: "2FA structure is prepared in the MVP, but the first launch may run without mandatory 2FA."
      }
    }
  ]
};

export async function getSiteContent(): Promise<SiteContentSnapshot> {
  try {
    const record = await prisma.siteContent.findUnique({ where: { key: SITE_CONTENT_KEY } });
    return normalizeSiteContent(record);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return defaultSiteContentSnapshot();
    }

    throw error;
  }
}

export function defaultSiteContentSnapshot() {
  return structuredClone(defaultSiteContent);
}

export function legalAssetHref(page: LegalPageContent, locale: "en" | "ru") {
  const asset = page.assets?.[locale] ?? page.assets?.ru ?? page.assets?.en;
  if (!asset) return null;
  if (asset.type === "url") return asset.href;
  return `/api/site-content/legal/${page.slug}?lang=${locale}`;
}

function normalizeSiteContent(record: {
  faqContent?: unknown;
  footerContent?: unknown;
  homeContent?: unknown;
  legalContent?: unknown;
} | null): SiteContentSnapshot {
  const defaults = defaultSiteContentSnapshot();
  const home = (record?.homeContent as Partial<SiteContentSnapshot["home"]> | null) ?? {};
  const footer = (record?.footerContent as Partial<SiteContentSnapshot["footer"]> | null) ?? {};
  const legal = (record?.legalContent as Partial<LegalPageContent>[] | null) ?? [];
  const faq = (record?.faqContent as Partial<SiteContentSnapshot["faqItems"][number]>[] | null) ?? [];

  return {
    home: {
      hero: {
        ...defaults.home.hero,
        ...home.hero,
        signals: defaults.home.hero.signals.map((item, index) => ({ ...item, ...(home.hero?.signals?.[index] ?? {}) }))
      },
      intro: {
        ...defaults.home.intro,
        ...home.intro,
        process: {
          ...defaults.home.intro.process,
          ...home.intro?.process,
          insights: defaults.home.intro.process.insights.map((item, index) => ({ ...item, ...(home.intro?.process?.insights?.[index] ?? {}) }))
        },
        featurePanels: defaults.home.intro.featurePanels.map((item, index) => ({ ...item, ...(home.intro?.featurePanels?.[index] ?? {}) }))
      },
      safety: {
        ...defaults.home.safety,
        ...home.safety,
        panels: defaults.home.safety.panels.map((item, index) => ({ ...item, ...(home.safety?.panels?.[index] ?? {}) })),
        principles: defaults.home.safety.principles.map((item, index) => ({ ...item, ...(home.safety?.principles?.[index] ?? {}) }))
      },
      openProjects: {
        ...defaults.home.openProjects,
        ...home.openProjects,
        buttonLabels: {
          ...defaults.home.openProjects.buttonLabels,
          ...home.openProjects?.buttonLabels
        },
        sectors: defaults.home.openProjects.sectors.map((item, index) => ({ ...item, ...(home.openProjects?.sectors?.[index] ?? {}) }))
      },
      business: {
        ...defaults.home.business,
        ...home.business,
        steps: defaults.home.business.steps.map((step, index) => ({
          ...step,
          ...(home.business?.steps?.[index] ?? {}),
          items: step.items.map((item, itemIndex) => ({ ...item, ...(home.business?.steps?.[index]?.items?.[itemIndex] ?? {}) }))
        }))
      },
      finalCta: {
        ...defaults.home.finalCta,
        ...home.finalCta
      }
    },
    footer: {
      ...defaults.footer,
      ...footer,
      socialLinks: { ...defaults.footer.socialLinks, ...footer.socialLinks },
      projectLinks: defaults.footer.projectLinks.map((item, index) => ({ ...item, ...(footer.projectLinks?.[index] ?? {}) })),
      aboutLinks: defaults.footer.aboutLinks.map((item, index) => ({ ...item, ...(footer.aboutLinks?.[index] ?? {}) }))
    },
    legalPages: defaults.legalPages.map((item) => {
      const override = legal.find((page) => page?.slug === item.slug);
      return { ...item, ...override };
    }),
    faqItems: defaults.faqItems.map((item, index) => ({ ...item, ...(faq[index] ?? {}) }))
  };
}
