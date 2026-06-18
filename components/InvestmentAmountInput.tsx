import { Input } from "@/components/ui/Input";
import type { Locale } from "@/lib/i18n";

export function InvestmentAmountInput({ locale }: { locale: Locale }) {
  return <Input label={locale === "ru" ? "Сумма участия" : "Participation amount"} name="amount" inputMode="decimal" placeholder="1000" required />;
}
