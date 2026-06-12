"use client";

import { useState, type ChangeEvent } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function ProjectSectorFields({ locale }: { locale: "ru" | "en" }) {
  const isRu = locale === "ru";
  const [sector, setSector] = useState("");

  function handleSectorChange(event: ChangeEvent<HTMLSelectElement>) {
    setSector(event.currentTarget.value);
  }

  return (
    <div className="grid gap-4">
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
          placeholder={isRu ? "Например: медицина, образование, агро..." : "Example: healthcare, education, agriculture..."}
          required
        />
      ) : null}
      {sector === "real-estate" ? (
        <div className="grid gap-6 rounded-[18px] border border-qidra-grayLight bg-qidra-grayLight/50 p-5 md:col-span-2">
          <div>
            <h3 className="text-20 font-medium text-qidra-dark">{isRu ? "Поля недвижимости" : "Real estate fields"}</h3>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {isRu
                ? "Эти данные помогут подготовить профессиональную карточку объекта без отдельной системы недвижимости."
                : "These details let Qidra publish a professional property card without a separate real estate system."}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input label={isRu ? "Название объекта" : "Property name"} name="propertyObjectName" maxLength={180} required />
            <Input label={isRu ? "Название комплекса" : "Complex name"} name="propertyComplexName" maxLength={180} required />
            <Input label={isRu ? "Девелопер" : "Developer"} name="propertyDeveloper" maxLength={180} required />
            <Input label={isRu ? "Управляющий партнёр" : "Managing partner"} name="propertyManagerName" maxLength={180} defaultValue="Adam Miziev" />
            <Input label={isRu ? "Страна" : "Country"} name="propertyCountry" maxLength={120} required />
            <Input label={isRu ? "Город" : "City"} name="propertyCity" maxLength={120} required />
            <Input label={isRu ? "Район" : "District"} name="propertyDistrict" maxLength={180} />
            <Input label={isRu ? "Адрес объекта" : "Property address"} name="propertyAddress" maxLength={240} required />
            <Select
              label={isRu ? "Тип недвижимости" : "Property type"}
              name="propertyType"
              defaultValue="residential"
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
              defaultValue="under-construction"
              options={[
                { value: "off-plan", label: "Off Plan" },
                { value: "ready", label: "Ready" },
                { value: "under-construction", label: "Under Construction" },
                { value: "income-generating", label: "Income Generating" }
              ]}
            />
            <Input label={isRu ? "Краткое описание объекта" : "Short property summary"} name="propertyShortDescription" maxLength={300} required />
            <Input label={isRu ? "Полное название фонда / направления" : "Fund / vehicle name"} name="propertyVehicleName" maxLength={180} defaultValue="AM Capital Property Fund" />
            <Input label={isRu ? "Полная стоимость объекта" : "Total asset value"} name="propertyTotalAssetValue" inputMode="decimal" placeholder="520000" required />
            <Input label={isRu ? "Валюта" : "Currency"} name="propertyCurrency" maxLength={12} defaultValue="USD" required />
            <Input label={isRu ? "Минимальная сумма участия" : "Minimum participation"} name="propertyMinimumParticipation" inputMode="decimal" placeholder="1000" required />
            <Input label={isRu ? "Целевой объём привлечения" : "Target raise"} name="propertyTargetRaise" inputMode="decimal" placeholder="250000" required />
            <Input label={isRu ? "Собрано средств" : "Raised amount"} name="propertyGatheredAmount" inputMode="decimal" placeholder="68000" />
            <Input label={isRu ? "Осталось привлечь" : "Remaining amount"} name="propertyRemainingAmount" inputMode="decimal" placeholder="182000" />
            <Input label={isRu ? "Срок проекта, месяцев" : "Project term, months"} name="propertyTermMonths" inputMode="numeric" placeholder="18" required />
            <Input label={isRu ? "Дата начала" : "Planned start date"} name="propertyPlannedStartDate" type="date" required />
            <Input label={isRu ? "Планируемая дата завершения" : "Planned completion date"} name="propertyCompletionDate" type="date" required />
            <Input label={isRu ? "Доля инвесторов, %" : "Investor share, %"} name="propertyInvestorSharePercent" inputMode="decimal" defaultValue="75" required />
            <Input label={isRu ? "Доля управляющего, %" : "Managing partner share, %"} name="propertyManagerSharePercent" inputMode="decimal" defaultValue="25" required />
            <Input label={isRu ? "Комиссия управляющего, %" : "Manager fee, %"} name="propertyManagerFeePercent" inputMode="decimal" defaultValue="5" required />
            <Input label={isRu ? "Валюта участия" : "Participation currency"} name="propertyFundraisingCurrency" maxLength={12} defaultValue="USD" required />
          </div>

          <div className="grid gap-3">
            <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Источник дохода" : "Income source"}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <CheckboxTile name="propertyIncomeSources" value="rental-income" label={isRu ? "Арендный доход" : "Rental income"} />
              <CheckboxTile name="propertyIncomeSources" value="capital-growth" label={isRu ? "Рост стоимости недвижимости" : "Capital growth"} />
              <CheckboxTile name="propertyIncomeSources" value="resale" label={isRu ? "Перепродажа объекта" : "Resale"} />
              <CheckboxTile name="propertyIncomeSources" value="hybrid" label={isRu ? "Комбинированная модель" : "Combined model"} />
            </div>
          </div>

          <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
            <span>{isRu ? "Полное описание объекта" : "Full property description"}</span>
            <textarea
              className="field-shell min-h-[180px] rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
              name="propertyFullDescription"
              maxLength={6000}
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
              required
            />
            <FileUpload
              accept=".jpg,.jpeg,.png,.webp"
              hint={isRu ? "Галерея объекта: JPG, PNG, WEBP" : "Gallery images: JPG, PNG, WEBP"}
              label={isRu ? "Галерея изображений" : "Image gallery"}
              name="propertyGalleryImages"
              multiple
            />
            <FileUpload
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              hint={isRu ? "Планировки: PDF, JPG, PNG, WEBP" : "Floor plans: PDF, JPG, PNG, WEBP"}
              label={isRu ? "Планировки" : "Floor plans"}
              name="propertyFloorPlans"
              multiple
            />
            <FileUpload
              accept=".pdf"
              hint="PDF"
              label={isRu ? "PDF-брошюры" : "PDF brochures"}
              name="propertyBrochures"
              multiple
            />
            <div className="lg:col-span-2">
              <FileUpload
                accept=".jpg,.jpeg,.png,.webp"
                hint={isRu ? "Визуализации: JPG, PNG, WEBP" : "Renderings: JPG, PNG, WEBP"}
                label={isRu ? "Визуализации" : "Visuals"}
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

function CheckboxTile({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="flex items-center gap-3 rounded-qidra bg-white px-4 py-3 text-14 font-medium text-qidra-dark shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <input className="size-4 accent-qidra-accent" name={name} type="checkbox" value={value} />
      <span>{label}</span>
    </label>
  );
}
