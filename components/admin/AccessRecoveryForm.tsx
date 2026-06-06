import { FeedbackForm } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { NotificationCard } from "@/components/NotificationCard";
import type { Locale } from "@/lib/i18n";

export function AccessRecoveryForm({
  kycDocumentLinks = [],
  endpoint,
  hasApprovedKyc,
  locale
}: {
  kycDocumentLinks?: { href: string; label: string; name: string }[];
  endpoint: string;
  hasApprovedKyc: boolean;
  locale: Locale;
}) {
  const isRu = locale === "ru";

  return (
    <div className="mt-5 grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4">
      <div>
        <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Восстановление доступа" : "Access recovery"}</p>
        <p className="mt-2 text-14 text-qidra-grayBlue">
          {isRu
            ? "Сотрудник не задаёт новый пароль клиенту. После сверки личности система отправляет одноразовую ссылку на email клиента."
            : "Staff do not set a new password for the client. After identity verification, the system sends a one-time link to the client's email."}
        </p>
      </div>
      {kycDocumentLinks.length ? (
        <div className="rounded-qidra border border-qidra-grayLight bg-white p-4">
          <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Первичные KYC-документы клиента" : "Client's original KYC documents"}</p>
          <p className="mt-1 text-13 text-qidra-grayBlue">
            {isRu
              ? "Откройте документы и сверяйте их с тем, что клиент предоставляет при обращении."
              : "Open these documents and compare them with what the client provides during the support request."}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {kycDocumentLinks.map((item) => (
              <a
                key={item.href}
                className="rounded-qidra border border-qidra-grayLight bg-qidra-grayLight px-3 py-2 text-13 font-medium text-qidra-dark transition-colors hover:border-qidra-accent hover:text-qidra-accent"
                href={item.href}
                rel="noreferrer"
                target="_blank"
              >
                <span className="block">{item.label}</span>
                <span className="mt-1 block break-words text-qidra-grayBlue">{item.name}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {hasApprovedKyc ? (
        <FeedbackForm
          className="grid gap-3"
          endpoint={endpoint}
          feedback={{
            title: isRu ? "Ссылка отправлена" : "Recovery link sent",
            text: isRu ? "Клиенту отправлена одноразовая ссылка восстановления. Действие записано в журнал." : "A one-time recovery link was sent to the client. The action was written to the audit log.",
            buttonLabel: isRu ? "Понятно" : "Got it",
            dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
            tone: "success"
          }}
          popupPlacement="center"
          resetOnSubmit
        >
          <Select
            label={isRu ? "Сверка личности" : "Identity check"}
            name="identityCheck"
            options={[
              {
                label: isRu ? "Документы клиента совпадают с одобренной KYC-анкетой" : "Client documents match the approved KYC profile",
                value: "KYC_DOCUMENTS_MATCH"
              },
              {
                label: isRu ? "Документы клиента НЕ совпадают с одобренной KYC-анкетой" : "Client documents do NOT match the approved KYC profile",
                value: "KYC_DOCUMENTS_MISMATCH"
              }
            ]}
            required
          />
          <ReasonField
            label={isRu ? "Причина восстановления" : "Recovery reason"}
            locale={locale}
            name="reason"
            placeholder={isRu ? "Например: клиент обратился в чат поддержки и подтвердил личность по KYC-документам" : "For example: client contacted support chat and confirmed identity with KYC documents"}
          />
          <Input label={isRu ? "Подтверждение" : "Confirmation"} name="confirmation" pattern="CONFIRM" placeholder="CONFIRM" required />
          <Button type="submit">{isRu ? "Отправить ссылку восстановления" : "Send recovery link"}</Button>
        </FeedbackForm>
      ) : (
        <NotificationCard
          title={isRu ? "Сначала нужен одобренный KYC" : "Approved KYC required first"}
          text={
            isRu
              ? "Через поддержку можно отправлять ссылку восстановления только клиенту, чья личность уже подтверждена документами."
              : "Support-assisted recovery links can only be sent to a client whose identity has already been verified by documents."
          }
        />
      )}
    </div>
  );
}

function ReasonField({ label, locale, name, placeholder }: { label: string; locale: Locale; name: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      {label}
      <textarea
        className="min-h-28 rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
        maxLength={800}
        minLength={12}
        name={name}
        placeholder={placeholder}
        required
      />
      <span className="text-12 text-qidra-grayBlue">
        {locale === "ru" ? "Минимум 12 символов. Эта причина попадёт в журнал действий." : "Minimum 12 characters. This reason will be written to the audit log."}
      </span>
    </label>
  );
}
