import type { Locale } from "@/lib/i18n";

export const projectSubmissionStatuses = ["SUBMITTED", "REVIEW", "APPROVED", "REJECTED"] as const;

export type ProjectSubmissionStatusValue = (typeof projectSubmissionStatuses)[number];

export function normalizeProjectSubmissionStatus(value?: string): ProjectSubmissionStatusValue | undefined {
  const status = value?.toUpperCase();
  return projectSubmissionStatuses.includes(status as ProjectSubmissionStatusValue) ? (status as ProjectSubmissionStatusValue) : undefined;
}

export function projectSubmissionStatusLabel(status: string, locale: Locale) {
  if (status === "APPROVED") return locale === "ru" ? "Одобрено" : "Approved";
  if (status === "REJECTED") return locale === "ru" ? "Отклонено" : "Rejected";
  if (status === "REVIEW") return locale === "ru" ? "На проверке" : "In review";
  return locale === "ru" ? "Отправлено" : "Submitted";
}
