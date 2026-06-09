"use client";

import { useState, type ChangeEvent } from "react";
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
    </div>
  );
}
