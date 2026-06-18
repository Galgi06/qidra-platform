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
  appraisedValue?: number;
  city?: string;
  completionDate?: string;
  country?: string;
  coverImage?: string;
  currency?: string;
  descriptionFull?: string;
  descriptionShort?: string;
  developer?: string;
  district?: string;
  documents?: RealEstateDocumentAsset[];
  estimatedAssetValue?: number;
  fundingPercent?: number;
  fundraisingCurrency?: string;
  gallery?: string[];
  gatheredAmount?: number;
  incomeSources?: IncomeSourceValue[];
  investorSharePercent?: number;
  investorCount?: number;
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
  statsMode?: "auto" | "manual";
  targetRaise?: number;
  titleComplex?: string;
  totalAssetValue?: number;
  vehicleName?: string;
  visuals?: string[];
};

export type RealEstateLeadData = {
  amCapitalAgreementAccepted?: boolean;
  comment?: string;
  confirmationIp?: string;
  confirmedAt?: string;
  contactCountry?: string;
  exitWindowAccepted?: boolean;
  firstName?: string;
  investmentAmountUsdt?: number;
  managerFeePercent?: number;
  managerFeeUsdt?: number;
  lastName?: string;
  marketPriceAccepted?: boolean;
  minHoldAccepted?: boolean;
  phone?: string;
  qidraDisclaimerAccepted?: boolean;
  riskAccepted?: boolean;
  totalPayableUsdt?: number;
  transferAccepted?: boolean;
  transferExitAccepted?: boolean;
  whatsapp?: string;
};

export const AM_CAPITAL_MANAGER_FEE_PERCENT = 5;

const amCapitalCompanyMarkers = ["am capital llc-fz", "am capital property fund"];
const amCapitalManagerMarkers = ["adam miziev"];

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
    appraisedValue: asNumber(source.appraisedValue),
    city: asString(source.city),
    completionDate: asString(source.completionDate),
    country: asString(source.country),
    coverImage: asString(source.coverImage),
    currency: asString(source.currency),
    descriptionFull: asString(source.descriptionFull),
    descriptionShort: asString(source.descriptionShort),
    developer: asString(source.developer),
    district: asString(source.district),
    documents,
    estimatedAssetValue: asNumber(source.estimatedAssetValue),
    fundingPercent: asNumber(source.fundingPercent),
    fundraisingCurrency: asString(source.fundraisingCurrency),
    gallery: asStringArray(source.gallery),
    gatheredAmount: asNumber(source.gatheredAmount),
    incomeSources,
    investorSharePercent: asNumber(source.investorSharePercent),
    investorCount: asNumber(source.investorCount),
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
    statsMode: asString(source.statsMode) === "manual" ? "manual" : "auto",
    targetRaise: asNumber(source.targetRaise),
    titleComplex: asString(source.titleComplex),
    totalAssetValue: asNumber(source.totalAssetValue),
    vehicleName: asString(source.vehicleName),
    visuals: asStringArray(source.visuals)
  };
}

export function parseRealEstateLeadData(value: unknown): RealEstateLeadData | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  return {
    amCapitalAgreementAccepted: source.amCapitalAgreementAccepted === true,
    comment: asString(source.comment),
    confirmationIp: asString(source.confirmationIp),
    confirmedAt: asString(source.confirmedAt),
    contactCountry: asString(source.contactCountry),
    exitWindowAccepted: source.exitWindowAccepted === true,
    firstName: asString(source.firstName),
    investmentAmountUsdt: asNumber(source.investmentAmountUsdt),
    lastName: asString(source.lastName),
    managerFeePercent: asNumber(source.managerFeePercent),
    managerFeeUsdt: asNumber(source.managerFeeUsdt),
    marketPriceAccepted: source.marketPriceAccepted === true,
    minHoldAccepted: source.minHoldAccepted === true,
    phone: asString(source.phone),
    qidraDisclaimerAccepted: source.qidraDisclaimerAccepted === true,
    riskAccepted: source.riskAccepted === true,
    totalPayableUsdt: asNumber(source.totalPayableUsdt),
    transferAccepted: source.transferAccepted === true,
    transferExitAccepted: source.transferExitAccepted === true,
    whatsapp: asString(source.whatsapp)
  };
}

function normalizeEntity(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAnyMarker(value: string, markers: string[]) {
  return markers.some((marker) => value.includes(marker));
}

export function isAmCapitalPropertyFundProject(input: {
  initiatorName?: string | null;
  managerName?: string | null;
  organizationDisplayName?: string | null;
  organizationLegalName?: string | null;
  partnerName?: string | null;
  sector?: string | null;
}) {
  if (input.sector !== "real-estate") {
    return false;
  }

  const companyText = normalizeEntity([input.organizationDisplayName, input.organizationLegalName, input.partnerName].filter(Boolean).join(" "));
  const managerText = normalizeEntity([input.managerName, input.initiatorName].filter(Boolean).join(" "));

  return includesAnyMarker(companyText, amCapitalCompanyMarkers) || includesAnyMarker(managerText, amCapitalManagerMarkers);
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

export function realEstateAssetCategoryLabel(category: RealEstateDocumentAsset["category"], locale: Locale) {
  const map: Record<RealEstateDocumentAsset["category"], Record<Locale, string>> = {
    brochure: { ru: "Брошюра", en: "Brochure" },
    document: { ru: "Документ", en: "Document" },
    "floor-plan": { ru: "Планировка", en: "Floor plan" },
    gallery: { ru: "Галерея", en: "Gallery" },
    render: { ru: "Визуализация", en: "Rendering" }
  };

  return map[category][locale];
}

export function realEstateAssetDisplayName(asset: RealEstateDocumentAsset, locale: Locale, index = 0) {
  const normalized = asset.name.trim();

  if (looksLikeStorageHashName(normalized)) {
    const extension = fileExtension(normalized);
    const baseLabel = realEstateAssetCategoryLabel(asset.category, locale);
    const numbered = `${baseLabel} ${index + 1}`;
    return extension ? `${numbered}.${extension}` : numbered;
  }

  return normalized;
}

function looksLikeStorageHashName(value: string) {
  const fileName = value.split("/").pop() ?? value;
  const base = fileName.replace(/\.[a-z0-9]+$/i, "");
  return /^[a-f0-9]{24,}$/i.test(base);
}

function fileExtension(value: string) {
  const match = value.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "";
}
