const labels = {
  active: { ru: "Активен", en: "Active", tone: "green" },
  review: { ru: "Проверка", en: "Review", tone: "accent" },
  funded: { ru: "Собран", en: "Funded", tone: "dark" },
  pending: { ru: "На проверке", en: "Pending", tone: "accent" },
  confirmed: { ru: "Подтверждено", en: "Confirmed", tone: "green" },
  approved: { ru: "Одобрено", en: "Approved", tone: "green" },
  rejected: { ru: "Отклонено", en: "Rejected", tone: "red" }
} as const;

const colors = {
  accent: "bg-qidra-accent",
  dark: "bg-qidra-dark",
  green: "bg-qidra-green",
  red: "bg-qidra-red"
};

export type BadgeStatus = keyof typeof labels;

export function ProjectStatusBadge({ status, locale = "ru" }: { status: BadgeStatus; locale?: "ru" | "en" }) {
  const item = labels[status];

  return <span className={`inline-flex self-start justify-self-start rounded-full px-3 py-1 text-12 font-medium text-white ${colors[item.tone]}`}>{item[locale]}</span>;
}
