import type { Locale } from "@/lib/i18n";

export const propertyTypeOptions = ["residential", "commercial", "hotel", "land", "mixed-use", "other"] as const;
export const propertyStatusOptions = ["off-plan", "ready", "under-construction", "income-generating"] as const;
export const incomeSourceOptions = ["rental-income", "capital-growth", "resale", "hybrid"] as const;

export type PropertyTypeValue = (typeof propertyTypeOptions)[number];
export type PropertyStatusValue = (typeof propertyStatusOptions)[number];
export type IncomeSourceValue = (typeof incomeSourceOptions)[number];

export type RealEstateDocumentAsset = {
  category: "brochure" | "document" | "floor-plan" | "gallery" | "render";
  href: string;
  name: string;
  size?: number;
  type?: string;
};

export type RealEstateProjectData = {
  address?: string;
  city?: string;
  completionDate?: string;
  country?: string;
  coverImage?: string;
  currency?: string;
  descriptionFull?: string;
  descriptionShort?: string;
  developer?: string;
  documents?: RealEstateDocumentAsset[];
  fundraisingCurrency?: string;
  gallery?: string[];
  gatheredAmount?: number;
  incomeSources?: IncomeSourceValue[];
  managerCarryPercent?: number;
  managerFeePercent?: number;
  managerName?: string;
  managerSharePercent?: number;
  minimumParticipation?: number;
  objectName?: string;
  objectStatus?: PropertyStatusValue;
  partnerName?: string;
  plannedStartDate?: string;
  projectTermMonths?: number;
  propertyType?: PropertyTypeValue;
  remainingAmount?: number;
  riskNotice?: Record<Locale, string>;
  targetRaise?: number;
  titleComplex?: string;
  totalAssetValue?: number;
  visuals?: string[];
};

export type RealEstateLeadData = {
  comment?: string;
  contactCountry?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  qidraDisclaimerAccepted?: boolean;
  riskAccepted?: boolean;
  transferAccepted?: boolean;
  whatsapp?: string;
};

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = Number(value.replace(",", "."));
    return Number.isFinite(normalized) ? normalized : undefined;
  }
  return undefined;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function parseRealEstateData(value: unknown): RealEstateProjectData | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const propertyType = asString(source.propertyType) as PropertyTypeValue | undefined;
  const objectStatus = asString(source.objectStatus) as PropertyStatusValue | undefined;
  const incomeSources = asStringArray(source.incomeSources).filter((item): item is IncomeSourceValue => incomeSourceOptions.includes(item as IncomeSourceValue));
  const documents = Array.isArray(source.documents)
    ? source.documents.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        const category = asString(record.category);
        const href = asString(record.href);
        const name = asString(record.name);
        if (!category || !href || !name) return [];
        return [
          {
            category: category as RealEstateDocumentAsset["category"],
            href,
            name,
            size: asNumber(record.size),
            type: asString(record.type)
          }
        ];
      })
    : [];

  return {
    address: asString(source.address),
    city: asString(source.city),
    completionDate: asString(source.completionDate),
    country: asString(source.country),
    coverImage: asString(source.coverImage),
    currency: asString(source.currency),
    descriptionFull: asString(source.descriptionFull),
    descriptionShort: asString(source.descriptionShort),
    developer: asString(source.developer),
    documents,
    fundraisingCurrency: asString(source.fundraisingCurrency),
    gallery: asStringArray(source.gallery),
    gatheredAmount: asNumber(source.gatheredAmount),
    incomeSources,
    managerCarryPercent: asNumber(source.managerCarryPercent),
    managerFeePercent: asNumber(source.managerFeePercent),
    managerName: asString(source.managerName),
    managerSharePercent: asNumber(source.managerSharePercent),
    minimumParticipation: asNumber(source.minimumParticipation),
    objectName: asString(source.objectName),
    objectStatus,
    partnerName: asString(source.partnerName),
    plannedStartDate: asString(source.plannedStartDate),
    projectTermMonths: asNumber(source.projectTermMonths),
    propertyType,
    remainingAmount: asNumber(source.remainingAmount),
    targetRaise: asNumber(source.targetRaise),
    titleComplex: asString(source.titleComplex),
    totalAssetValue: asNumber(source.totalAssetValue),
    visuals: asStringArray(source.visuals)
  };
}

export function parseRealEstateLeadData(value: unknown): RealEstateLeadData | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  return {
    comment: asString(source.comment),
    contactCountry: asString(source.contactCountry),
    firstName: asString(source.firstName),
    lastName: asString(source.lastName),
    phone: asString(source.phone),
    qidraDisclaimerAccepted: source.qidraDisclaimerAccepted === true,
    riskAccepted: source.riskAccepted === true,
    transferAccepted: source.transferAccepted === true,
    whatsapp: asString(source.whatsapp)
  };
}

export function propertyTypeLabel(value: PropertyTypeValue | undefined, locale: Locale) {
  const map: Record<PropertyTypeValue, Record<Locale, string>> = {
    residential: { ru: "Жилая", en: "Residential" },
    commercial: { ru: "Коммерческая", en: "Commercial" },
    hotel: { ru: "Отель", en: "Hotel" },
    land: { ru: "Земля", en: "Land" },
    "mixed-use": { ru: "Смешанное использование", en: "Mixed Use" },
    other: { ru: "Другое", en: "Other" }
  };
  return value ? map[value][locale] : locale === "ru" ? "Не указано" : "Not set";
}

export function propertyStatusLabel(value: PropertyStatusValue | undefined, locale: Locale) {
  const map: Record<PropertyStatusValue, Record<Locale, string>> = {
    "off-plan": { ru: "Off Plan", en: "Off Plan" },
    ready: { ru: "Готов", en: "Ready" },
    "under-construction": { ru: "Строится", en: "Under Construction" },
    "income-generating": { ru: "Генерирует доход", en: "Income Generating" }
  };
  return value ? map[value][locale] : locale === "ru" ? "Не указано" : "Not set";
}

export function incomeSourceLabel(value: IncomeSourceValue, locale: Locale) {
  const map: Record<IncomeSourceValue, Record<Locale, string>> = {
    "rental-income": { ru: "Арендный доход", en: "Rental income" },
    "capital-growth": { ru: "Рост стоимости", en: "Capital growth" },
    resale: { ru: "Перепродажа", en: "Resale" },
    hybrid: { ru: "Комбинированная модель", en: "Combined model" }
  };
  return map[value][locale];
}
