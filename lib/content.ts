import type { Locale } from "@/lib/i18n";

export type Project = {
  slug: string;
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  description: Record<Locale, string>;
  status: "active" | "review" | "funded";
  targetUsdt: number;
  fundedUsdt: number;
  location: string;
  structure: "Mudaraba" | "Musharaka";
  riskLevel: string;
  documents: { title: Record<Locale, string>; href: string; kind: string }[];
};

export const projects: Project[] = [
  {
    slug: "qidra-real-estate-income",
    title: {
      ru: "Qidra Real Estate Income",
      en: "Qidra Real Estate Income"
    },
    summary: {
      ru: "Партнёрское участие в объекте недвижимости в ОАЭ с раскрытием документов, структуры Mudaraba и регулярной отчётностью.",
      en: "Partnership participation in a UAE real estate asset with document disclosure, Mudaraba structure and regular reporting."
    },
    description: {
      ru:
        "Проект предполагает участие в объекте недвижимости через структуру Mudaraba. До подачи заявки участник изучает регистрационные документы, правовую основу, целевой объём, статус сбора и порядок отчётности. Ожидаемый результат зависит от фактической реализации проекта, расходов, сроков и рыночных условий; фиксированная доходность не обещается.",
      en:
        "The project provides participation in a real estate asset through a Mudaraba structure. Before applying, a participant reviews registration documents, legal basis, target amount, funding status and reporting process. The expected result depends on actual execution, costs, timing and market conditions; fixed returns are not promised."
    },
    status: "active",
    targetUsdt: 250000,
    fundedUsdt: 68000,
    location: "UAE",
    structure: "Mudaraba",
    riskLevel: "Moderate",
    documents: [
      {
        title: { ru: "Business License", en: "Business License" },
        href: "/assets/documents/compliance/business-license.pdf",
        kind: "compliance"
      },
      {
        title: { ru: "Certificate of Formation", en: "Certificate of Formation" },
        href: "/assets/documents/compliance/certificate-of-formation.pdf",
        kind: "compliance"
      }
    ]
  },
  {
    slug: "qidra-trade-participation",
    title: {
      ru: "Qidra Trade Participation",
      en: "Qidra Trade Participation"
    },
    summary: {
      ru: "Торговый проект в формате Musharaka: участники заранее видят структуру, документы, этапы и правила распределения результата.",
      en: "A Musharaka trade project: participants review the structure, documents, stages and result allocation rules before applying."
    },
    description: {
      ru:
        "Проект описывает торговый цикл, роль сторон, ориентировочный объём участия, документы компании и правила отчётности. Перед заявкой участник должен изучить раскрытые материалы и учитывать, что итоговый результат зависит от фактической торговли, сроков поставки, расходов и исполнения договоров.",
      en:
        "The project describes the trade cycle, parties' roles, indicative participation amount, company documents and reporting rules. Before applying, a participant must review disclosed materials and understand that results depend on actual trade, delivery timing, costs and contract execution."
    },
    status: "review",
    targetUsdt: 120000,
    fundedUsdt: 0,
    location: "UAE",
    structure: "Musharaka",
    riskLevel: "High",
    documents: [
      {
        title: { ru: "ESR Declaration", en: "ESR Declaration" },
        href: "/assets/documents/compliance/esr-declaration.pdf",
        kind: "compliance"
      },
      {
        title: { ru: "DNFBP Confirmation", en: "DNFBP Confirmation" },
        href: "/assets/documents/compliance/dnfbp-confirmation.pdf",
        kind: "compliance"
      }
    ]
  }
];

export function getProjects(locale: Locale) {
  return projects.map((project) => ({
    ...project,
    localizedTitle: project.title[locale],
    localizedSummary: project.summary[locale],
    localizedDescription: project.description[locale]
  }));
}

export const legalPages = [
  {
    slug: "terms",
    title: { ru: "Terms and Conditions", en: "Terms and Conditions" },
    body: {
      ru: "Пользователь принимает условия Qidra, понимает риски участия в проектах и подтверждает, что Qidra не обещает фиксированную доходность.",
      en: "The user accepts Qidra terms, understands participation risks, and confirms that Qidra does not promise fixed returns."
    },
    asset: "/assets/documents/legal/terms-conditions-ru.docx"
  },
  {
    slug: "privacy",
    title: { ru: "Privacy Policy", en: "Privacy Policy" },
    body: {
      ru: "Политика описывает обработку персональных данных, документов участника и информации, необходимой для работы сервиса.",
      en: "This policy describes processing of personal data, participant documents, and information needed to operate the service."
    },
    asset: "/assets/documents/legal/privacy-policy-ru.docx"
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
];

export const faqItems = [
  {
    q: { ru: "Qidra гарантирует доходность?", en: "Does Qidra guarantee returns?" },
    a: {
      ru: "Нет. Qidra не обещает фиксированную доходность и раскрывает риски до подачи заявки.",
      en: "No. Qidra does not promise fixed returns and discloses risks before an application is submitted."
    }
  },
  {
    q: { ru: "Как подать заявку на участие?", en: "How do I submit a participation application?" },
    a: {
      ru: "Выберите проект, изучите условия и документы, затем отправьте заявку через страницу проекта.",
      en: "Choose a project, review the terms and documents, then submit an application from the project page."
    }
  },
  {
    q: { ru: "Когда включится 2FA?", en: "When will 2FA be enabled?" },
    a: {
      ru: "Структура 2FA подготовлена в MVP, но первый запуск может работать без обязательного 2FA.",
      en: "2FA structure is prepared in the MVP, but the first launch may run without mandatory 2FA."
    }
  }
];
