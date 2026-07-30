"use client";

import { useMemo, useState } from "react";
import { FeedbackForm } from "@/components/ActionFeedback";
import { FileUpload } from "@/components/FileUpload";

type ProjectOption = {
  id: string;
  label: string;
};

type Props = {
  locale: "ru" | "en";
  projects: ProjectOption[];
  defaultPeriod: {
    end: string;
    label: string;
    start: string;
  };
};

const MODE_PROJECT_PROFIT = "PROJECT_PROFIT";
const MODE_READY_POOL = "READY_POOL";
type CalculationMode = typeof MODE_PROJECT_PROFIT | typeof MODE_READY_POOL;

export function DividendCalculationForm({ defaultPeriod, locale, projects }: Props) {
  const isRu = locale === "ru";
  const [mode, setMode] = useState<CalculationMode>(MODE_PROJECT_PROFIT);

  const modeCopy = useMemo(
    () => ({
      [MODE_PROJECT_PROFIT]: {
        description: isRu
          ? "Система сама посчитает чистую прибыль проекта, пул участников и прибыль компании."
          : "The system will calculate net project profit, the participant pool, and the company profit automatically.",
        title: isRu ? "Рассчитать прибыль проекта" : "Calculate project profit"
      },
      [MODE_READY_POOL]: {
        description: isRu
          ? "Используйте готовый фонд участников QIDRA без повторного применения процента."
          : "Use an already prepared QIDRA participant pool without reapplying the percentage.",
        title: isRu ? "Распределить готовый фонд участников" : "Distribute a ready participant pool"
      }
    }),
    [isRu]
  );

  return (
    <FeedbackForm
      className="grid gap-4 rounded-qidra border border-qidra-grayLight bg-qidra-grayLight p-4"
      draftKey={`company-dividend-form:${locale}`}
      endpoint={`/api/company/dividends?lang=${locale}`}
      payload="form-data"
      feedback={{
        title: isRu ? "Черновик расчёта сохранён" : "Calculation draft saved",
        text: isRu
          ? "Начисления подготовлены. Проверьте строки превью ниже и только потом утверждайте период."
          : "Accruals are prepared. Review the preview rows below before approving the period.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success"
      }}
      refreshOnSuccess
    >
      <input name="action" type="hidden" value="calculate" />
      <div className="grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-14 font-medium text-qidra-dark lg:col-span-2">
          {isRu ? "Проект" : "Project"}
          <select className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" name="projectId" required>
            <option value="">{isRu ? "Выберите проект" : "Choose project"}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Период" : "Period"}
          <input
            className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent"
            defaultValue={defaultPeriod.label}
            name="periodLabel"
            placeholder="2026 Q3"
            required
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Режим расчёта" : "Calculation mode"}
          <select
            className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent"
            name="calculationMode"
            onChange={(event) => setMode(event.target.value as CalculationMode)}
            value={mode}
          >
            <option value={MODE_PROJECT_PROFIT}>{modeCopy[MODE_PROJECT_PROFIT].title}</option>
            <option value={MODE_READY_POOL}>{modeCopy[MODE_READY_POOL].title}</option>
          </select>
        </label>
      </div>

      <div className="rounded-qidra border border-qidra-grayLight bg-white px-4 py-3 text-14 text-qidra-grayBlue">
        <p className="font-medium text-qidra-dark">{modeCopy[mode].title}</p>
        <p className="mt-1">{modeCopy[mode].description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Начало периода" : "Period start"}
          <input
            className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent"
            defaultValue={defaultPeriod.start}
            name="periodStart"
            required
            type="date"
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Конец периода" : "Period end"}
          <input
            className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent"
            defaultValue={defaultPeriod.end}
            name="periodEnd"
            required
            type="date"
          />
        </label>
        <label className="grid gap-2 text-14 font-medium text-qidra-dark lg:col-span-2">
          {isRu ? "Дата начала участия в прибыли" : "Profit accrual start date"}
          <input
            className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent"
            name="profitAccrualStart"
            type="date"
          />
        </label>
      </div>

      {mode === MODE_PROJECT_PROFIT ? (
        <div className="grid gap-4 lg:grid-cols-4">
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Выручка USDT" : "Revenue USDT"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" inputMode="decimal" min="0" name="grossRevenueUsdt" placeholder="100000" required step="0.000001" type="number" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Прямые расходы" : "Direct costs"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue="0" inputMode="decimal" min="0" name="directCostUsdt" required step="0.000001" type="number" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Опер. расходы" : "Operating expenses"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue="0" inputMode="decimal" min="0" name="operatingExpenseUsdt" required step="0.000001" type="number" />
          </label>
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Доля участникам, %" : "Participant share, %"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" defaultValue="30" inputMode="decimal" max="100" min="0.0001" name="investorSharePercent" required step="0.0001" type="number" />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <label className="grid gap-2 text-14 font-medium text-qidra-dark">
            {isRu ? "Фонд участников QIDRA, USDT" : "QIDRA participant pool, USDT"}
            <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" inputMode="decimal" min="0" name="qidraParticipantPoolUsdt" placeholder="190.24" required step="0.000001" type="number" />
          </label>
          <div className="rounded-qidra border border-dashed border-qidra-grayLight bg-white px-4 py-3 text-14 text-qidra-grayBlue">
            {isRu
              ? "В этом режиме выручка, расходы и процент участников не используются повторно. Система распределит только готовый фонд."
              : "In this mode revenue, costs, and participant share are not applied again. The system will distribute only the ready pool."}
          </div>
        </div>
      )}

      <label className="grid gap-2 text-14 font-medium text-qidra-dark">
        {isRu ? "Комментарий компании" : "Company note"}
        <textarea className="min-h-24 rounded-qidra border border-qidra-grayLight bg-white px-4 py-3 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" name="adminNote" />
      </label>

      <FileUpload
        accept=".pdf,.xls,.xlsx,.csv"
        hint={isRu ? "Прикрепите PDF или Excel/CSV отчётность по периоду. Без отчёта период нельзя будет утвердить." : "Attach PDF or Excel/CSV reporting for the period. Without a report the period cannot be approved."}
        label={isRu ? "Файлы отчётности периода" : "Period reporting files"}
        manyFilesLabel={isRu ? "файлов" : "files"}
        name="attachments"
        multiple
        selectedLabel={isRu ? "Выбрано" : "Selected"}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <label className="grid gap-2 text-14 font-medium text-qidra-dark">
          {isRu ? "Подтверждение" : "Confirmation"}
          <input className="h-14 rounded-qidra border border-qidra-grayLight bg-white px-4 text-16 font-medium text-qidra-dark outline-none transition-colors focus:border-qidra-accent" name="confirmation" placeholder="CONFIRM" required />
        </label>
        <button className="inline-flex h-12 items-center justify-center rounded-qidra border border-qidra-accent bg-qidra-accent px-5 text-16 font-medium text-white transition-colors hover:bg-qidra-accent80" type="submit">
          {isRu ? "Рассчитать начисления" : "Calculate accruals"}
        </button>
      </div>
    </FeedbackForm>
  );
}
