import { FeedbackForm } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Locale } from "@/lib/i18n";
import { passwordPolicyDescription } from "@/lib/password-policy";

export function UserPasswordChangeForm({
  endpoint,
  locale
}: {
  endpoint: string;
  locale: Locale;
}) {
  const isRu = locale === "ru";

  return (
    <div className="mt-5 grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <div>
        <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Прямая смена пароля" : "Direct password change"}</p>
        <p className="mt-2 text-14 text-qidra-grayBlue">
          {isRu
            ? "Используйте только по подтверждённому запросу участника. После сохранения старые сессии будут завершены."
            : "Use this only after a confirmed participant request. Existing sessions will be ended after saving."}
        </p>
      </div>
      <FeedbackForm
        className="grid gap-3"
        endpoint={endpoint}
        feedback={{
          title: isRu ? "Пароль обновлён" : "Password updated",
          text:
            isRu
              ? "Новый пароль сохранён, активные сессии завершены, действие записано в журнал."
              : "The new password was saved, active sessions were ended, and the action was written to the audit log.",
          buttonLabel: isRu ? "Понятно" : "Got it",
          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
          tone: "success"
        }}
        popupPlacement="center"
        resetOnSubmit
      >
        <Input
          autoComplete="new-password"
          label={isRu ? "Новый пароль" : "New password"}
          name="password"
          placeholder={isRu ? "Введите новый пароль" : "Enter a new password"}
          required
          type="password"
        />
        <Input
          autoComplete="new-password"
          label={isRu ? "Подтверждение пароля" : "Confirm password"}
          name="passwordConfirm"
          placeholder={isRu ? "Повторите новый пароль" : "Repeat the new password"}
          required
          type="password"
        />
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Причина смены" : "Reason for change"}
          <textarea
            className="min-h-24 rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
            maxLength={800}
            minLength={12}
            name="reason"
            placeholder={
              isRu
                ? "Например: участник прошёл идентификацию в поддержке и попросил задать новый пароль вручную"
                : "For example: the participant completed support verification and asked for a manual password change"
            }
            required
          />
          <span className="text-12 text-qidra-grayBlue">
            {isRu ? "Минимум 12 символов. Причина попадёт в журнал действий." : "Minimum 12 characters. The reason will be written to the audit log."}
          </span>
        </label>
        <Input
          hint={isRu ? `${passwordPolicyDescription.ru} Введите CONFIRM для фиксации действия.` : `${passwordPolicyDescription.en} Enter CONFIRM to record the action.`}
          label={isRu ? "Подтверждение" : "Confirmation"}
          name="confirmation"
          pattern="CONFIRM"
          placeholder="CONFIRM"
          required
        />
        <Button type="submit">{isRu ? "Сохранить новый пароль" : "Save new password"}</Button>
      </FeedbackForm>
    </div>
  );
}
