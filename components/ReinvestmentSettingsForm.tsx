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
    <section className="grid gap-5 rounded-[20px] border border-qidra-accent/15 bg-qidra-accent8 p-6 sm:p-8">
      <div>
        <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Добровольная настройка" : "Optional setting"}</p>
        <h2 className="mt-2 text-[28px] font-medium leading-tight text-qidra-dark">{isRu ? "Автоматический реинвест" : "Automatic reinvestment"}</h2>
        <p className="mt-3 max-w-4xl text-14 leading-6 text-qidra-grayBlue">
          {isRu
            ? "После каждой будущей выплаты выбранная доля дивидендов будет направлена в указанный проект. Если проект закрыт, заполнен или операция не проходит проверки, вся сумма останется на доступном балансе. Настройку можно отключить в любой момент."
            : "After each future payout, the selected share of dividends will be directed to the chosen project. If the project is closed, full, or fails validation, the full amount remains available in your wallet. You can disable this setting at any time."}
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
