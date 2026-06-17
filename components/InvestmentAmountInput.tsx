import type { ChangeEventHandler } from "react";
import { Input } from "@/components/ui/Input";
import type { Locale } from "@/lib/i18n";

export function InvestmentAmountInput({ locale, onChange, value }: { locale: Locale; onChange?: ChangeEventHandler<HTMLInputElement>; value?: string }) {
  return <Input label={locale === "ru" ? "Сумма участия" : "Participation amount"} name="amount" inputMode="decimal" onChange={onChange} placeholder="1000" required value={value} />;
}
