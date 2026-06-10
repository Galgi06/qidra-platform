import { Role } from "@prisma/client";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Locale } from "@/lib/i18n";

export function CreateStaffAccountForm({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <FeedbackForm
      className="premium-card grid gap-5 p-6 sm:p-8"
      endpoint={`/api/admin/users?lang=${locale}`}
      feedback={{
        title: isRu ? "Сотрудник создан" : "Staff account created",
        text: isRu ? "Аккаунт сотрудника создан и действие сохранено в журнале." : "The staff account was created and recorded in the audit log.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      popupPlacement="center"
      reloadOnSuccess
    >
      <div>
        <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Создать сотрудника" : "Create staff account"}</h2>
        <p className="mt-2 max-w-3xl text-16 text-qidra-grayBlue">
          {isRu
            ? "Главный администратор выдаёт отдельные доступы техподдержке, отделу продаж или администратору. Каждый аккаунт создаётся с причиной и записью в журнал."
            : "The super administrator issues separate access for support, sales or admin staff. Every account requires a reason and audit record."}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Input label={isRu ? "Имя сотрудника" : "Staff name"} name="name" placeholder={isRu ? "Например: Менеджер поддержки" : "Example: Support manager"} required />
        <Input label="Email" name="email" placeholder="support@qidra.local" required type="email" />
        <Select
          label={isRu ? "Направление доступа" : "Access direction"}
          name="role"
          options={[
            { value: Role.TECH_SUPPORT, label: isRu ? "Техподдержка" : "Technical support" },
            { value: Role.SALES_MANAGER, label: isRu ? "Отдел продаж" : "Sales department" },
            { value: Role.ADMIN, label: isRu ? "Администратор" : "Administrator" }
          ]}
          required
        />
        <Input
          label={isRu ? "Временный пароль" : "Temporary password"}
          minLength={8}
          name="password"
          placeholder={isRu ? "Минимум 8 символов" : "At least 8 characters"}
          required
          type="password"
        />
        <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
      </div>
      <label className="grid gap-2 text-14 font-medium text-qidra-dark">
        {isRu ? "Причина создания доступа" : "Reason for creating access"}
        <textarea
          className="field-shell min-h-24 px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
          maxLength={600}
          minLength={12}
          name="reason"
          placeholder={isRu ? "Например: назначение сотрудника отдела продаж после внутреннего согласования" : "Example: assigning a sales manager after internal approval"}
          required
        />
      </label>
      <Button className="w-full sm:w-fit" type="submit">
        {isRu ? "Создать доступ" : "Create access"}
      </Button>
    </FeedbackForm>
  );
}
