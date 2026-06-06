import type { User } from "@prisma/client";
import { FeedbackForm } from "@/components/ActionFeedback";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Locale } from "@/lib/i18n";
import { userBlockMode } from "@/lib/user-access";

type BlockableUser = Pick<User, "blockedAt" | "blockedUntil" | "blockReason">;

export function UserBlockForm({
  canManageBlock,
  endpoint,
  isOwnAccount,
  locale,
  user
}: {
  canManageBlock: boolean;
  endpoint: string;
  isOwnAccount: boolean;
  locale: Locale;
  user: BlockableUser;
}) {
  const isRu = locale === "ru";
  const mode = userBlockMode(user);

  if (!canManageBlock) {
    return null;
  }

  if (isOwnAccount) {
    return (
      <NotificationCard
        title={isRu ? "Собственный аккаунт защищён" : "Own account is protected"}
        text={isRu ? "Супер-админ не может заблокировать самого себя, чтобы не потерять доступ к управлению платформой." : "A super administrator cannot block their own account to avoid losing platform management access."}
      />
    );
  }

  return (
    <div className="mt-5 grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <div>
        <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Блокировка доступа" : "Access blocking"}</p>
        <p className="mt-2 text-14 text-qidra-grayBlue">
          {isRu
            ? "Доступ можно ограничить временно или постоянно. Любое изменение требует причины, подтверждения и попадает в журнал действий."
            : "Access can be restricted temporarily or permanently. Every change requires a reason, confirmation and is written to the audit log."}
        </p>
      </div>
      <NotificationCard title={blockStatusTitle(mode, user.blockedUntil, locale)} text={user.blockReason || blockStatusText(mode, locale)} />
      <FeedbackForm
        className="grid gap-3"
        endpoint={endpoint}
        feedback={{
          title: isRu ? "Доступ обновлён" : "Access updated",
          text: isRu ? "Изменение сохранено и записано в журнал действий." : "The change was saved and written to the audit log.",
          buttonLabel: isRu ? "Понятно" : "Got it",
          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
          tone: "success"
        }}
        popupPlacement="center"
        reloadOnSuccess
      >
        <Select
          defaultValue={mode === "active" ? "temporary" : "unblock"}
          label={isRu ? "Действие" : "Action"}
          name="mode"
          options={[
            { value: "temporary", label: isRu ? "Временная блокировка" : "Temporary block" },
            { value: "permanent", label: isRu ? "Постоянная блокировка" : "Permanent block" },
            { value: "unblock", label: isRu ? "Разблокировать" : "Unblock" }
          ]}
          required
        />
        <Input
          label={isRu ? "Срок временной блокировки" : "Temporary block end"}
          name="blockedUntil"
          type="datetime-local"
        />
        <BlockReasonField locale={locale} />
        <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
        <Button type="submit">{isRu ? "Сохранить доступ" : "Save access"}</Button>
      </FeedbackForm>
    </div>
  );
}

function BlockReasonField({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {isRu ? "Причина" : "Reason"}
      <textarea
        className="min-h-28 rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
        maxLength={800}
        minLength={12}
        name="reason"
        placeholder={isRu ? "Например: подозрительная активность до завершения проверки службы безопасности" : "For example: suspicious activity pending security review"}
        required
      />
      <span className="text-12 text-qidra-grayBlue">
        {isRu ? "Минимум 12 символов. Причина попадёт в журнал действий." : "Minimum 12 characters. The reason will be written to the audit log."}
      </span>
    </label>
  );
}

function blockStatusTitle(mode: ReturnType<typeof userBlockMode>, blockedUntil: Date | null, locale: Locale) {
  if (mode === "temporary") {
    return locale === "ru" ? `Временно заблокирован до ${formatDateTime(blockedUntil, locale)}` : `Temporarily blocked until ${formatDateTime(blockedUntil, locale)}`;
  }

  if (mode === "permanent") {
    return locale === "ru" ? "Постоянно заблокирован" : "Permanently blocked";
  }

  return locale === "ru" ? "Аккаунт активен" : "Account is active";
}

function blockStatusText(mode: ReturnType<typeof userBlockMode>, locale: Locale) {
  if (mode === "active") {
    return locale === "ru" ? "Ограничений доступа сейчас нет." : "There are currently no access restrictions.";
  }

  return locale === "ru" ? "Причина блокировки не указана." : "No block reason was provided.";
}

function formatDateTime(value: Date | null, locale: Locale) {
  if (!value) {
    return locale === "ru" ? "без срока" : "without an end date";
  }

  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}
