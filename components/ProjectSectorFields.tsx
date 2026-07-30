"use client";

import { useState, type ChangeEvent } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export type ProjectSectorInitialValues = {
  existingUploads?: {
    brochures?: string | null;
    coverImage?: string | null;
    floorPlans?: string | null;
    galleryImages?: string | null;
    visuals?: string | null;
  };
  propertyAddress?: string;
  propertyCity?: string;
  propertyComplexName?: string;
  propertyCompletionDate?: string;
  propertyCountry?: string;
  propertyCurrency?: string;
  propertyDeveloper?: string;
  propertyDistrict?: string;
  propertyEstimatedAssetValue?: string;
  propertyFullDescription?: string;
  propertyFundraisingCurrency?: string;
  propertyIncomeSources?: string[];
  propertyInvestorSharePercent?: string;
  propertyManagerFeePercent?: string;
  propertyManagerName?: string;
  propertyManagerSharePercent?: string;
  propertyMinimumParticipation?: string;
  propertyObjectName?: string;
  propertyPlannedStartDate?: string;
  propertyRemainingAmount?: string;
  propertyShortDescription?: string;
  propertyStatus?: string;
  propertyTargetRaise?: string;
  propertyTermMonths?: string;
  propertyTotalAssetValue?: string;
  propertyType?: string;
  propertyGatheredAmount?: string;
  propertyVehicleName?: string;
  sector?: string;
  sectorOther?: string;
};

export function ProjectSectorFields({
  locale,
  className = "",
  initialValues
}: {
  locale: "ru" | "en";
  className?: string;
  initialValues?: ProjectSectorInitialValues | null;
}) {
  const isRu = locale === "ru";
  const [sector, setSector] = useState(initialValues?.sector ?? "");

  function handleSectorChange(event: ChangeEvent<HTMLSelectElement>) {
    setSector(event.currentTarget.value);
  }

  return (
    <div className={`grid gap-4 ${className}`}>
      <input name="sectorCurrent" type="hidden" value={sector} />
      <Select
        label={isRu ? "Отрасль" : "Sector"}
        name="sector"
        onChange={handleSectorChange}
        options={[
          { value: "", label: isRu ? "Выберите" : "Select" },
          { value: "real-estate", label: isRu ? "Недвижимость" : "Real estate" },
          { value: "trade", label: isRu ? "Торговля" : "Trade" },
          { value: "production", label: isRu ? "Производство" : "Production" },
          { value: "technology", label: isRu ? "Технологии" : "Technology" },
          { value: "logistics", label: isRu ? "Логистика" : "Logistics" },
          { value: "other", label: isRu ? "Другое" : "Other" }
        ]}
        required
        value={sector}
      />
      {sector === "other" ? (
        <Input
          label={isRu ? "Укажите отрасль" : "Specify sector"}
          maxLength={180}
          name="sectorOther"
          defaultValue={initialValues?.sectorOther ?? ""}
          placeholder={isRu ? "Например: медицина, образование, агро..." : "Example: healthcare, education, agriculture..."}
          required
        />
      ) : null}
      {sector === "real-estate" ? (
        <div className="grid gap-6 rounded-[18px] border border-qidra-grayLight bg-qidra-grayLight/50 p-5">
          <div>
            <h3 className="text-20 font-medium text-qidra-dark">{isRu ? "Поля недвижимости" : "Real estate fields"}</h3>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {isRu
                ? "Эти данные помогут подготовить профессиональную карточку объекта без отдельной системы недвижимости."
                : "These details let Qidra publish a professional property card without a separate real estate system."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label={isRu ? "Название объекта" : "Property name"} name="propertyObjectName" maxLength={180} defaultValue={initialValues?.propertyObjectName ?? ""} required />
            <Input label={isRu ? "Название комплекса" : "Complex name"} name="propertyComplexName" maxLength={180} defaultValue={initialValues?.propertyComplexName ?? ""} required />
            <Input label={isRu ? "Девелопер" : "Developer"} name="propertyDeveloper" maxLength={180} defaultValue={initialValues?.propertyDeveloper ?? ""} required />
            <Input label={isRu ? "Управляющий партнёр" : "Managing partner"} name="propertyManagerName" maxLength={180} defaultValue={initialValues?.propertyManagerName ?? "Adam Miziev"} />
            <Input label={isRu ? "Страна" : "Country"} name="propertyCountry" maxLength={120} defaultValue={initialValues?.propertyCountry ?? ""} required />
            <Input label={isRu ? "Город" : "City"} name="propertyCity" maxLength={120} defaultValue={initialValues?.propertyCity ?? ""} required />
            <Input label={isRu ? "Район" : "District"} name="propertyDistrict" maxLength={180} defaultValue={initialValues?.propertyDistrict ?? ""} />
            <Input label={isRu ? "Адрес объекта" : "Property address"} name="propertyAddress" maxLength={240} defaultValue={initialValues?.propertyAddress ?? ""} required />
            <Select
              label={isRu ? "Тип недвижимости" : "Property type"}
              name="propertyType"
              defaultValue={initialValues?.propertyType ?? "residential"}
              options={[
                { value: "residential", label: "Residential" },
                { value: "commercial", label: "Commercial" },
                { value: "hotel", label: "Hotel" },
                { value: "land", label: "Land" },
                { value: "mixed-use", label: "Mixed Use" },
                { value: "other", label: "Other" }
              ]}
            />
            <Select
              label={isRu ? "Статус объекта" : "Property status"}
              name="propertyStatus"
              defaultValue={initialValues?.propertyStatus ?? "under-construction"}
              options={[
                { value: "off-plan", label: "Off Plan" },
                { value: "ready", label: "Ready" },
                { value: "under-construction", label: "Under Construction" },
                { value: "income-generating", label: "Income Generating" }
              ]}
            />
            <Input label={isRu ? "Краткое описание объекта" : "Short property summary"} name="propertyShortDescription" maxLength={300} defaultValue={initialValues?.propertyShortDescription ?? ""} required />
            <Input label={isRu ? "Полное название фонда / направления" : "Fund / vehicle name"} name="propertyVehicleName" maxLength={180} defaultValue={initialValues?.propertyVehicleName ?? "AM Capital Property Fund"} />
            <Input label={isRu ? "Оценочная стоимость объекта" : "Estimated asset value"} name="propertyEstimatedAssetValue" inputMode="decimal" defaultValue={initialValues?.propertyEstimatedAssetValue ?? ""} placeholder="540000" required />
            <Input label={isRu ? "Полная стоимость объекта" : "Total asset value"} name="propertyTotalAssetValue" inputMode="decimal" defaultValue={initialValues?.propertyTotalAssetValue ?? ""} placeholder="520000" required />
            <Input label={isRu ? "Валюта" : "Currency"} name="propertyCurrency" maxLength={12} defaultValue={initialValues?.propertyCurrency ?? "USD"} required />
            <Input label={isRu ? "Минимальная сумма участия" : "Minimum participation"} name="propertyMinimumParticipation" inputMode="decimal" defaultValue={initialValues?.propertyMinimumParticipation ?? ""} placeholder="1000" required />
            <Input label={isRu ? "Целевой объём привлечения" : "Target raise"} name="propertyTargetRaise" inputMode="decimal" defaultValue={initialValues?.propertyTargetRaise ?? ""} placeholder="250000" required />
            <Input label={isRu ? "Собрано средств" : "Raised amount"} name="propertyGatheredAmount" inputMode="decimal" defaultValue={initialValues?.propertyGatheredAmount ?? ""} placeholder="68000" />
            <Input label={isRu ? "Осталось привлечь" : "Remaining amount"} name="propertyRemainingAmount" inputMode="decimal" defaultValue={initialValues?.propertyRemainingAmount ?? ""} placeholder="182000" />
            <Input label={isRu ? "Срок проекта, месяцев" : "Project term, months"} name="propertyTermMonths" inputMode="numeric" defaultValue={initialValues?.propertyTermMonths ?? ""} placeholder="18" required />
            <Input label={isRu ? "Дата начала" : "Planned start date"} name="propertyPlannedStartDate" type="date" defaultValue={initialValues?.propertyPlannedStartDate ?? ""} required />
            <Input label={isRu ? "Планируемая дата завершения" : "Planned completion date"} name="propertyCompletionDate" type="date" defaultValue={initialValues?.propertyCompletionDate ?? ""} required />
            <Input label={isRu ? "Доля инвесторов, %" : "Investor share, %"} name="propertyInvestorSharePercent" inputMode="decimal" defaultValue={initialValues?.propertyInvestorSharePercent ?? "75"} required />
            <Input label={isRu ? "Доля управляющего, %" : "Managing partner share, %"} name="propertyManagerSharePercent" inputMode="decimal" defaultValue={initialValues?.propertyManagerSharePercent ?? "25"} required />
            <Input label={isRu ? "Комиссия управляющего, %" : "Manager fee, %"} name="propertyManagerFeePercent" inputMode="decimal" defaultValue={initialValues?.propertyManagerFeePercent ?? "5"} required />
            <Input label={isRu ? "Валюта участия" : "Participation currency"} name="propertyFundraisingCurrency" maxLength={12} defaultValue={initialValues?.propertyFundraisingCurrency ?? "USD"} required />
          </div>

          <div className="grid gap-3">
            <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Источник дохода" : "Income source"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxTile name="propertyIncomeSources" value="rental-income" label={isRu ? "Арендный доход" : "Rental income"} defaultChecked={initialValues?.propertyIncomeSources?.includes("rental-income")} />
              <CheckboxTile name="propertyIncomeSources" value="capital-growth" label={isRu ? "Рост стоимости недвижимости" : "Capital growth"} defaultChecked={initialValues?.propertyIncomeSources?.includes("capital-growth")} />
              <CheckboxTile name="propertyIncomeSources" value="resale" label={isRu ? "Перепродажа объекта" : "Resale"} defaultChecked={initialValues?.propertyIncomeSources?.includes("resale")} />
              <CheckboxTile name="propertyIncomeSources" value="hybrid" label={isRu ? "Комбинированная модель" : "Combined model"} defaultChecked={initialValues?.propertyIncomeSources?.includes("hybrid")} />
            </div>
          </div>

          <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
            <span>{isRu ? "Полное описание объекта" : "Full property description"}</span>
            <textarea
              className="field-shell min-h-[320px] resize-y rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
              name="propertyFullDescription"
              defaultValue={initialValues?.propertyFullDescription ?? ""}
              minLength={80}
              required
            />
          </label>

          <div className="grid gap-4 lg:grid-cols-2">
            <FileUpload
              accept=".jpg,.jpeg,.png,.webp"
              hint={isRu ? "JPG, PNG, WEBP" : "JPG, PNG, WEBP"}
              label={isRu ? "Главное изображение" : "Main image"}
              name="propertyCoverImage"
              existingFileName={initialValues?.existingUploads?.coverImage ?? undefined}
              existingLabel={isRu ? "Текущее" : "Current"}
              required={!initialValues?.existingUploads?.coverImage}
            />
            <FileUpload
              accept=".jpg,.jpeg,.png,.webp"
              hint={isRu ? "Галерея объекта: JPG, PNG, WEBP" : "Gallery images: JPG, PNG, WEBP"}
              label={isRu ? "Галерея изображений" : "Image gallery"}
              existingFileName={initialValues?.existingUploads?.galleryImages ?? undefined}
              existingLabel={isRu ? "Текущие" : "Current"}
              name="propertyGalleryImages"
              multiple
            />
            <FileUpload
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              hint={isRu ? "Планировки: PDF, JPG, PNG, WEBP" : "Floor plans: PDF, JPG, PNG, WEBP"}
              label={isRu ? "Планировки" : "Floor plans"}
              existingFileName={initialValues?.existingUploads?.floorPlans ?? undefined}
              existingLabel={isRu ? "Текущие" : "Current"}
              name="propertyFloorPlans"
              multiple
            />
            <FileUpload
              accept=".pdf"
              hint="PDF"
              label={isRu ? "PDF-брошюры" : "PDF brochures"}
              existingFileName={initialValues?.existingUploads?.brochures ?? undefined}
              existingLabel={isRu ? "Текущие" : "Current"}
              name="propertyBrochures"
              multiple
            />
            <div className="lg:col-span-2">
              <FileUpload
                accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.m4v"
                hint={isRu ? "Визуализации: JPG, PNG, WEBP, MP4, MOV, WEBM" : "Renderings: JPG, PNG, WEBP, MP4, MOV, WEBM"}
                label={isRu ? "Визуализации" : "Visuals"}
                existingFileName={initialValues?.existingUploads?.visuals ?? undefined}
                existingLabel={isRu ? "Текущие" : "Current"}
                name="propertyVisuals"
                multiple
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CheckboxTile({ label, name, value, defaultChecked }: { label: string; name: string; value: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 rounded-qidra bg-white px-4 py-3 text-14 font-medium text-qidra-dark shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <input className="size-4 accent-qidra-accent" defaultChecked={defaultChecked} name={name} type="checkbox" value={value} />
      <span>{label}</span>
    </label>
  );
}
