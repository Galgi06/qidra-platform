import { FeedbackForm } from "@/components/ActionFeedback";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n";

type ProjectOption = { id: string; title: string };

export function ReinvestmentSettingsForm({
  allocationPercent,
  enabled,
  kycApproved,
  locale,
  projects,
  targetProjectId
}: {
  allocationPercent: number;
  enabled: boolean;
  kycApproved: boolean;
  locale: Locale;
  projects: ProjectOption[];
  targetProjectId?: string;
}) {
  const isRu = locale === "ru";

  return (
    <section className="data-surface grid gap-5 overflow-hidden p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{isRu ? "Только по вашему выбору" : "Only by your choice"}</p>
          <h2 className="mt-2 text-[28px] font-medium leading-tight tracking-[-0.025em] text-qidra-dark">{isRu ? "Добровольный автореинвест" : "Optional auto-reinvestment"}</h2>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-12 font-semibold ${enabled ? "border-qidra-green/20 bg-[#e9f5ef] text-qidra-green" : "border-qidra-dark/10 bg-qidra-grayLight text-qidra-grayBlue"}`}>
          {enabled ? (isRu ? "Включён вами" : "Enabled by you") : isRu ? "Выключен" : "Off"}
        </span>
      </div>
      <div>
        <p className="mt-3 max-w-4xl text-14 leading-6 text-qidra-grayBlue">
          {isRu
            ? "По умолчанию дивиденды поступают на доступный баланс. Только после вашего явного согласия выбранная доля будущих выплат будет направляться в указанный проект. Настройку можно отключить в любой момент."
            : "By default, dividends are credited to your available balance. Only after your explicit consent will the selected share of future payouts be directed to a chosen project. You can disable this setting at any time."}
        </p>
      </div>

      {!kycApproved ? (
        <p className="rounded-qidra border border-qidra-gold bg-yellow-50 px-4 py-3 text-14 text-qidra-grayBlue">
          {isRu ? "Автореинвест станет доступен после одобрения KYC." : "Automatic reinvestment becomes available after KYC approval."}
        </p>
      ) : projects.length ? (
        <FeedbackForm
          endpoint={`/api/reinvestment-preference?lang=${locale}`}
          feedback={{
            title: isRu ? "Настройка сохранена" : "Setting saved",
            text: isRu ? "Автореинвест применяется только к будущим выплатам." : "Automatic reinvestment applies only to future payouts.",
            buttonLabel: isRu ? "Понятно" : "Got it",
            dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
            tone: "success"
          }}
          refreshOnSuccess
        >
          <input name="action" type="hidden" value="enable" />
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
              {isRu ? "Проект для будущих дивидендов" : "Project for future dividends"}
              <select className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" defaultValue={targetProjectId || projects[0]?.id} name="targetProjectId" required>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
              {isRu ? "Доля дивидендов, %" : "Dividend share, %"}
              <input className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" defaultValue={allocationPercent} max="100" min="1" name="allocationPercent" required step="1" type="number" />
            </label>
          </div>
          <Checkbox name="termsAccepted" required>
            {isRu
              ? "Я добровольно поручаю Qidra реинвестировать указанную долю будущих дивидендов, понимаю риски выбранного проекта и согласен, что при невозможности операции средства останутся на балансе."
              : "I voluntarily instruct Qidra to reinvest the selected share of future dividends, understand the chosen project's risks, and agree that funds remain in my wallet if the operation cannot be completed."}
          </Checkbox>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">{enabled ? (isRu ? "Обновить настройку" : "Update setting") : isRu ? "Включить автореинвест" : "Enable auto-reinvestment"}</Button>
          </div>
        </FeedbackForm>
      ) : (
        <p className="rounded-qidra border border-qidra-grayLight bg-white px-4 py-3 text-14 text-qidra-grayBlue">
          {isRu ? "Сейчас нет активных проектов со свободным объёмом. Настройку можно будет включить после открытия нового сбора." : "There are currently no active projects with available capacity. You can enable this setting when a new raise opens."}
        </p>
      )}

      {enabled ? (
        <FeedbackForm
          confirm={{
            title: isRu ? "Отключить автореинвест?" : "Disable auto-reinvestment?",
            text: isRu ? "Будущие дивиденды будут полностью поступать на доступный баланс." : "Future dividends will be credited entirely to your available balance.",
            confirmLabel: isRu ? "Отключить" : "Disable",
            cancelLabel: isRu ? "Отмена" : "Cancel",
            tone: "warning"
          }}
          endpoint={`/api/reinvestment-preference?lang=${locale}`}
          feedback={{
            title: isRu ? "Автореинвест отключён" : "Auto-reinvestment disabled",
            text: isRu ? "Будущие дивиденды будут поступать на баланс." : "Future dividends will be credited to your wallet.",
            buttonLabel: isRu ? "Понятно" : "Got it",
            dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
            tone: "warning"
          }}
          refreshOnSuccess
        >
          <input name="action" type="hidden" value="disable" />
          <Button type="submit" variant="outline">{isRu ? "Отключить автореинвест" : "Disable auto-reinvestment"}</Button>
        </FeedbackForm>
      ) : null}
    </section>
  );
}
