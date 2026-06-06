import { Role } from "@prisma/client";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Locale } from "@/lib/i18n";

export function RoleManagementForm({
  compact = false,
  currentRole,
  endpoint,
  locale
}: {
  compact?: boolean;
  currentRole: Role;
  endpoint: string;
  locale: Locale;
}) {
  const isRu = locale === "ru";
  const form = (
    <FeedbackForm
      className={compact ? "mt-3 grid min-w-[320px] gap-3 rounded-qidra bg-qidra-grayLight p-3" : "grid gap-3 rounded-qidra bg-qidra-grayLight p-4"}
      endpoint={endpoint}
      feedback={{
        title: isRu ? "Роль обновлена" : "Role updated",
        text: isRu ? "Доступ пользователя обновлён и сохранён в журнале." : "The user's access was updated and saved in the audit log.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      popupPlacement="center"
      reloadOnSuccess
    >
      <Select
        aria-label={isRu ? "Роль пользователя" : "User role"}
        className={compact ? "h-10 text-14" : undefined}
        defaultValue={currentRole}
        label={isRu ? "Новая роль" : "New role"}
        name="role"
        options={roleOptions(locale)}
        required
      />
      <RoleReasonField locale={locale} />
      <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
      <Button size={compact ? "sm" : "md"} type="submit">
        {isRu ? "Сохранить роль" : "Save role"}
      </Button>
    </FeedbackForm>
  );

  if (!compact) {
    return form;
  }

  return (
    <details className="max-w-[360px]">
      <summary className="inline-flex h-10 cursor-pointer list-none items-center justify-center rounded-qidra border border-qidra-dark px-4 text-14 font-medium text-qidra-dark transition-colors hover:bg-qidra-dark hover:text-white">
        {isRu ? "Роль/доступ" : "Role/access"}
      </summary>
      {form}
    </details>
  );
}

function RoleReasonField({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {isRu ? "Причина изменения роли" : "Reason for role change"}
      <textarea
        className="min-h-24 rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
        maxLength={600}
        minLength={12}
        name="reason"
        placeholder={
          isRu
            ? "Например: назначение менеджера техподдержки после внутреннего согласования"
            : "For example: assigning a support manager after internal approval"
        }
        required
      />
      <span className="text-12 text-qidra-grayBlue">
        {isRu ? "Минимум 12 символов. Причина попадёт в журнал действий." : "Minimum 12 characters. The reason will be written to the audit log."}
      </span>
    </label>
  );
}

function roleOptions(locale: Locale) {
  return [
    { value: Role.INVESTOR, label: locale === "ru" ? "Участник" : "Participant" },
    { value: Role.TECH_SUPPORT, label: locale === "ru" ? "Менеджер техподдержки" : "Technical support manager" },
    { value: Role.SALES_MANAGER, label: locale === "ru" ? "Менеджер отдела продаж" : "Sales manager" },
    { value: Role.ADMIN, label: locale === "ru" ? "Администратор" : "Administrator" },
    { value: Role.SUPER_ADMIN, label: locale === "ru" ? "Главный администратор" : "Super administrator" }
  ];
}
