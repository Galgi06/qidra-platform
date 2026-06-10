import { FeedbackForm } from "@/components/ActionFeedback";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Locale } from "@/lib/i18n";

type Option = {
  label: string;
  value: string;
};

export type ParticipantProfileEditDefaults = {
  address: string;
  citizenship: string;
  city: string;
  country: string;
  dateOfBirth: string;
  name: string;
  occupation: string;
  phone: string;
  phoneDialCode: string;
  sourceOfFunds: string;
};

export function ParticipantProfileEditForm({
  countryOptions,
  defaults,
  dialCodeOptions,
  endpoint,
  locale
}: {
  countryOptions: Option[];
  defaults: ParticipantProfileEditDefaults;
  dialCodeOptions: Option[];
  endpoint: string;
  locale: Locale;
}) {
  const isRu = locale === "ru";
  const sourceOptions = [
    { value: "", label: isRu ? "Не указано" : "Not provided" },
    { value: "salary", label: isRu ? "Доход от работы" : "Employment income" },
    { value: "business", label: isRu ? "Бизнес" : "Business" },
    { value: "savings", label: isRu ? "Накопления" : "Savings" },
    { value: "family", label: isRu ? "Семья" : "Family" },
    { value: "other", label: isRu ? "Другое" : "Other" }
  ];
  const optionalCountries = [{ value: "", label: isRu ? "Не указано" : "Not provided" }, ...countryOptions];
  const optionalDialCodes = [{ value: "", label: isRu ? "Не указано" : "Not provided" }, ...dialCodeOptions];

  return (
    <div className="grid gap-5">
      <NotificationCard
        title={isRu ? "Административная правка карточки" : "Administrative card update"}
        text={
          isRu
            ? "Используйте только после обращения клиента или внутренней проверки. Причина и изменённые поля сохраняются в журнале действий."
            : "Use only after a client request or internal verification. The reason and changed fields are saved to the audit log."
        }
        tone="warning"
      />
      <FeedbackForm
        className="grid gap-4"
        endpoint={endpoint}
        feedback={{
          title: isRu ? "Карточка обновлена" : "Participant card updated",
          text: isRu ? "Данные клиента сохранены, правка записана в журнал действий." : "Client details were saved and written to the audit log.",
          buttonLabel: isRu ? "Понятно" : "Got it",
          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
          tone: "success"
        }}
        popupPlacement="center"
        reloadOnSuccess
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input defaultValue={defaults.name} label={isRu ? "Имя участника" : "Participant name"} name="name" required />
          <Input defaultValue={defaults.dateOfBirth} label={isRu ? "Дата рождения" : "Date of birth"} name="dateOfBirth" type="date" />
          <Select defaultValue={defaults.phoneDialCode} label={isRu ? "Код телефона" : "Phone code"} name="phoneDialCode" options={optionalDialCodes} />
          <Input defaultValue={defaults.phone} inputMode="tel" label={isRu ? "Телефон" : "Phone"} name="phone" />
          <Select defaultValue={defaults.country} label={isRu ? "Страна проживания" : "Country of residence"} name="country" options={optionalCountries} />
          <Input defaultValue={defaults.city} label={isRu ? "Город" : "City"} name="city" />
          <Select defaultValue={defaults.citizenship} label={isRu ? "Гражданство" : "Citizenship"} name="citizenship" options={optionalCountries} />
          <Input defaultValue={defaults.occupation} label={isRu ? "Профессия" : "Occupation"} name="occupation" />
          <Select defaultValue={defaults.sourceOfFunds} label={isRu ? "Источник средств" : "Source of funds"} name="sourceOfFunds" options={sourceOptions} />
          <Input defaultValue={defaults.address} label={isRu ? "Адрес проживания" : "Residential address"} name="address" />
        </div>
        <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
          <span>{isRu ? "Причина правки" : "Reason for update"}</span>
          <textarea
            className="field-shell min-h-28 rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
            maxLength={800}
            name="reason"
            placeholder={isRu ? "Например: клиент обратился в поддержку и подтвердил актуальные данные." : "For example: the client contacted support and confirmed the current details."}
            required
          />
        </label>
        <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
        <Button type="submit">{isRu ? "Сохранить карточку" : "Save card"}</Button>
      </FeedbackForm>
    </div>
  );
}
