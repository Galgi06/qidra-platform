"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
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
    <div className="grid min-w-0 gap-4 md:col-span-2">
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
        <div className="grid min-w-0 gap-6 rounded-[24px] border border-qidra-grayLight bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.04)] sm:p-6 lg:p-7">
          <div className="min-w-0">
            <h3 className="text-20 font-medium text-qidra-dark">{isRu ? "Поля недвижимости" : "Real estate fields"}</h3>
            <p className="mt-2 max-w-4xl text-14 leading-6 text-qidra-grayBlue">
              {isRu
                ? "Эти данные помогут подготовить профессиональную карточку объекта без отдельной системы недвижимости."
                : "These details let Qidra publish a professional property card without a separate real estate system."}
            </p>
          </div>

          <SectionCard
            title={isRu ? "Объект" : "Property"}
            description={isRu ? "Базовые данные объекта, локация и управляющая сторона." : "Core property details, location and management party."}
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
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
            </div>
          </SectionCard>

          <SectionCard
            title={isRu ? "Финансы объекта" : "Property finance"}
            description={isRu ? "Стоимость объекта, ориентиры привлечения и валюта." : "Asset value, target raise and currency settings."}
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Input label={isRu ? "Полная стоимость объекта" : "Total asset value"} name="propertyTotalAssetValue" inputMode="decimal" placeholder="520000" required />
              <Input label={isRu ? "Оценочная стоимость объекта" : "Appraised value"} name="propertyAppraisedValue" inputMode="decimal" placeholder="1230000" />
              <Input label={isRu ? "Валюта" : "Currency"} name="propertyCurrency" maxLength={12} defaultValue="USD" required />
              <Input label={isRu ? "Валюта участия" : "Participation currency"} name="propertyFundraisingCurrency" maxLength={12} defaultValue="USD" required />
              <Input label={isRu ? "Минимальная сумма участия" : "Minimum participation"} name="propertyMinimumParticipation" inputMode="decimal" placeholder="1000" required />
              <Input label={isRu ? "Целевой объём привлечения" : "Target raise"} name="propertyTargetRaise" inputMode="decimal" placeholder="250000" required />
            </div>
          </SectionCard>

          <SectionCard
            title={isRu ? "Статистика объекта" : "Property statistics"}
            description={isRu ? "Автоматический или ручной режим показателей финансирования." : "Automatic or manual funding metrics."}
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Select
                label={isRu ? "Режим статистики объекта" : "Object stats mode"}
                name="propertyStatsMode"
                defaultValue="auto"
                options={[
                  { value: "auto", label: isRu ? "Автоматический" : "Automatic" },
                  { value: "manual", label: isRu ? "Ручной" : "Manual" }
                ]}
              />
              <Input label={isRu ? "Процент финансирования" : "Funding percent"} name="propertyFundingPercent" inputMode="decimal" placeholder="64" />
              <Input label={isRu ? "Количество инвесторов" : "Investor count"} name="propertyInvestorCount" inputMode="numeric" placeholder="164" />
              <Input label={isRu ? "Собрано средств" : "Raised amount"} name="propertyGatheredAmount" inputMode="decimal" placeholder="68000" />
              <Input label={isRu ? "Осталось привлечь" : "Remaining amount"} name="propertyRemainingAmount" inputMode="decimal" placeholder="182000" />
            </div>
          </SectionCard>

          <SectionCard
            title={isRu ? "Условия участия" : "Participation terms"}
            description={isRu ? "Срок проекта, структура долей и комиссия управляющего." : "Project term, share split and management fee."}
          >
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Input label={isRu ? "Срок проекта, месяцев" : "Project term, months"} name="propertyTermMonths" inputMode="numeric" placeholder="18" required />
              <Input label={isRu ? "Дата начала" : "Planned start date"} name="propertyPlannedStartDate" type="date" required />
              <Input label={isRu ? "Планируемая дата завершения" : "Planned completion date"} name="propertyCompletionDate" type="date" required />
              <Input label={isRu ? "Доля инвесторов, %" : "Investor share, %"} name="propertyInvestorSharePercent" inputMode="decimal" defaultValue="75" required />
              <Input label={isRu ? "Доля управляющего, %" : "Managing partner share, %"} name="propertyManagerSharePercent" inputMode="decimal" defaultValue="25" required />
              <Input label={isRu ? "Комиссия управляющего, %" : "Manager fee, %"} name="propertyManagerFeePercent" inputMode="decimal" defaultValue="5" required />
            </div>
          </SectionCard>

          <SectionCard
            title={isRu ? "Доход и описание" : "Income and description"}
            description={isRu ? "Источник дохода и полное описание объекта." : "Income source and full property narrative."}
          >
            <div className="grid gap-3">
              <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Источник дохода" : "Income source"}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <CheckboxTile name="propertyIncomeSources" value="rental-income" label={isRu ? "Арендный доход" : "Rental income"} />
                <CheckboxTile name="propertyIncomeSources" value="capital-growth" label={isRu ? "Рост стоимости недвижимости" : "Capital growth"} />
                <CheckboxTile name="propertyIncomeSources" value="resale" label={isRu ? "Перепродажа объекта" : "Resale"} />
                <CheckboxTile name="propertyIncomeSources" value="hybrid" label={isRu ? "Комбинированная модель" : "Combined model"} />
              </div>
            </div>

            <label className="grid min-w-0 gap-2 text-14 font-semibold text-qidra-dark">
              <span className="break-words leading-snug">{isRu ? "Полное описание объекта" : "Full property description"}</span>
              <textarea
                className="field-shell min-h-[180px] w-full min-w-0 rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
                name="propertyFullDescription"
                maxLength={6000}
                minLength={80}
                required
              />
            </label>
          </SectionCard>

          <SectionCard
            title={isRu ? "Медиа и материалы" : "Media and materials"}
            description={isRu ? "Изображения, планировки, визуализации и PDF-брошюры." : "Images, floor plans, renderings and PDF brochures."}
          >
            <div className="grid min-w-0 gap-4 lg:grid-cols-2">
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
          </SectionCard>
        </div>
      ) : null}
    </div>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-5 rounded-[20px] border border-qidra-grayLight bg-qidra-grayLight/45 p-4 sm:p-5">
      <div className="grid gap-1">
        <h4 className="text-16 font-semibold text-qidra-dark">{title}</h4>
        <p className="text-13 leading-6 text-qidra-grayBlue">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CheckboxTile({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="flex min-w-0 items-center gap-3 rounded-qidra bg-qidra-grayLight px-4 py-3 text-14 font-medium text-qidra-dark shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <input className="size-4 accent-qidra-accent" name={name} type="checkbox" value={value} />
      <span className="break-words leading-snug">{label}</span>
    </label>
  );
}
