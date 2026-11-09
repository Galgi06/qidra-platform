const labels = {
  active: { ru: "Открыт", en: "Open", tone: "green" },
  closed: { ru: "Закрыт", en: "Closed", tone: "dark" },
  draft: { ru: "Черновик", en: "Draft", tone: "dark" },
  review: { ru: "На проверке", en: "In review", tone: "accent" },
  funded: { ru: "Сбор завершён", en: "Funded", tone: "gold" },
  paused: { ru: "Приостановлен", en: "Paused", tone: "red" },
  pending: { ru: "На проверке", en: "Pending", tone: "accent" },
  confirmed: { ru: "Подтверждено", en: "Confirmed", tone: "green" },
  approved: { ru: "Одобрено", en: "Approved", tone: "green" },
  rejected: { ru: "Отклонено", en: "Rejected", tone: "red" }
} as const;

const colors = {
  accent: "border-qidra-accent/20 bg-qidra-accent8 text-qidra-accent",
  dark: "border-qidra-dark/15 bg-qidra-grayLight text-qidra-grayBlueDark",
  gold: "border-qidra-gold/25 bg-[#f7f2e7] text-[#7f632b]",
  green: "border-qidra-green/20 bg-[#e9f5ef] text-qidra-green",
  red: "border-qidra-red/20 bg-[#faeeee] text-qidra-red"
};

export type BadgeStatus = keyof typeof labels;

export function ProjectStatusBadge({ status, locale = "ru" }: { status: BadgeStatus; locale?: "ru" | "en" }) {
  const item = labels[status];

  return (
    <span className={`inline-flex self-start justify-self-start items-center gap-2 rounded-full border px-3 py-1.5 text-12 font-semibold ${colors[item.tone]}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {item[locale]}
    </span>
  );
}
