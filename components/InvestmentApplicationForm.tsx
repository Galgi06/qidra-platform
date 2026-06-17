"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InvestmentAmountInput } from "@/components/InvestmentAmountInput";
import { NotificationCard } from "@/components/NotificationCard";
import type { Locale } from "@/lib/i18n";
import type { RealEstateProjectData } from "@/lib/real-estate";

type PopupState = {
  title: string;
  text: string;
  tone: "success" | "warning" | "error";
  topUpHref?: string;
  topUpLabel?: string;
};

type InvestmentApplicationFormProps = {
  activeApplicationAmountUsdt: number;
  activeReservedUsdt: number;
  endpoint: string;
  freeUsdt: number;
  kycApproved: boolean;
  locale: Locale;
  noFixedYieldText: string;
  prefills: {
    country: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  projectSlug: string;
  projectTitle: string;
  realEstate: RealEstateProjectData | null;
};

const minParticipationUsdt = 100;

export function InvestmentApplicationForm({
  activeApplicationAmountUsdt,
  activeReservedUsdt,
  endpoint,
  freeUsdt,
  kycApproved,
  locale,
  noFixedYieldText,
  prefills,
  projectSlug,
  projectTitle,
  realEstate
}: InvestmentApplicationFormProps) {
  const isRu = locale === "ru";
  const router = useRouter();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState("");
  const hasActiveApplication = activeApplicationAmountUsdt > 0;
  const managementFeePercent = realEstate?.managerFeePercent && Number.isFinite(realEstate.managerFeePercent) ? realEstate.managerFeePercent : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const amountValue = String(formData.get("amount") ?? "");
    const amountUnits = parseUsdtUnits(amountValue);

    if (amountUnits === null || amountUnits < minParticipationUsdt * 1_000_000) {
      setPopup({
        title: isRu ? "Проверьте сумму" : "Check the amount",
        text: isRu ? "Минимальная сумма участия: 100 USDT." : "Minimum participation amount is 100 USDT.",
        tone: "warning"
      });
      return;
    }

    const managementFeeUnits = calculateFeeUnits(amountUnits, managementFeePercent);
    const totalPaymentUnits = amountUnits + managementFeeUnits;

    const freeUnits = Math.max(Math.floor(freeUsdt * 1_000_000), 0);

    if (totalPaymentUnits > freeUnits) {
      const shortfallUnits = totalPaymentUnits - freeUnits;
      const shortfallAmount = unitsToAmount(shortfallUnits);
      const requestedAmount = unitsToAmount(amountUnits);
      const feeAmount = unitsToAmount(managementFeeUnits);
      const totalAmount = unitsToAmount(totalPaymentUnits);
      const topUpHref = `/investor/wallet?lang=${locale}&amount=${encodeURIComponent(formatAmountForInput(shortfallAmount))}`;

      setPopup({
        title: isRu ? "Недостаточно баланса" : "Insufficient balance",
        text: isRu
          ? `На доступном балансе ${formatUsdt(freeUsdt)}. Для участия на ${formatUsdt(requestedAmount)}${managementFeeUnits ? ` и комиссии ${formatUsdt(feeAmount)}` : ""} нужен общий платёж ${formatUsdt(totalAmount)}. Не хватает ${formatUsdt(shortfallAmount)}.`
          : `Your available balance is ${formatUsdt(freeUsdt)}. Participation for ${formatUsdt(requestedAmount)}${managementFeeUnits ? ` plus a ${formatUsdt(feeAmount)} fee` : ""} requires a total payment of ${formatUsdt(totalAmount)}. You are short by ${formatUsdt(shortfallAmount)}.`,
        tone: "warning",
        topUpHref,
        topUpLabel: isRu ? `Пополнить ${formatUsdt(shortfallAmount)}` : `Top up ${formatUsdt(shortfallAmount)}`
      });
      return;
    }

    if (!kycApproved) {
      setPopup({
        title: isRu ? "Профиль ещё не одобрен" : "Profile is not approved yet",
        text: isRu
          ? "Заявка на участие станет доступна после одобрения профиля и документов."
          : "Participation applications become available after your profile and documents are approved.",
        tone: "warning"
      });
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        shortfallUsdt?: string;
        title?: string;
      };

      if (!response.ok) {
        const shortfall = Number(data.shortfallUsdt ?? 0);
        setPopup({
          title: data.title ?? (isRu ? "Заявка не создана" : "Application was not created"),
          text: data.message ?? (isRu ? "Проверьте данные и попробуйте снова." : "Check the details and try again."),
          tone: "error",
          topUpHref: shortfall > 0 ? `/investor/wallet?lang=${locale}&amount=${encodeURIComponent(formatAmountForInput(shortfall))}` : undefined,
          topUpLabel: shortfall > 0 ? (isRu ? `Пополнить ${formatUsdt(shortfall)}` : `Top up ${formatUsdt(shortfall)}`) : undefined
        });
        return;
      }

      form.reset();
      setAmount("");
      setPopup({
        title: data.title ?? (hasActiveApplication ? (isRu ? "Заявка обновлена" : "Application updated") : isRu ? "Заявка создана" : "Application created"),
        text:
          data.message ??
          (isRu
            ? "Мы приняли заявку на участие. Статус появится в профиле участника после рассмотрения."
            : "We received your participation application. The status will appear in your participant profile after review."),
        tone: "success"
      });
      router.refresh();
    } catch {
      setPopup({
        title: isRu ? "Ошибка" : "Error",
        text: isRu ? "Не удалось отправить заявку. Проверьте соединение и попробуйте снова." : "Could not submit the application. Check the connection and try again.",
        tone: "error"
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form aria-busy={submitting} className="container-qidra grid max-w-2xl gap-5" onSubmit={handleSubmit}>
        <h1 className="subtitle-28">{isRu ? "Заявка на участие" : "Participation application"}</h1>
        <p className="text-18 text-qidra-grayBlue">{projectTitle}</p>
        <input name="projectSlug" type="hidden" value={projectSlug} />
        {realEstate ? <input name="managementFeePercent" type="hidden" value={managementFeePercent.toString()} /> : null}
        {realEstate ? (
          <div className="grid gap-4 rounded-[20px] border border-qidra-grayLight bg-qidra-grayLight/50 p-5 md:grid-cols-2">
            <InputField defaultValue={prefills.firstName} label={isRu ? "Имя" : "First name"} name="firstName" required />
            <InputField defaultValue={prefills.lastName} label={isRu ? "Фамилия" : "Last name"} name="lastName" required />
            <InputField defaultValue={prefills.email} label="Email" name="email" required type="email" />
            <InputField defaultValue={prefills.phone} label={isRu ? "Телефон" : "Phone"} name="phone" required />
            <InputField label="WhatsApp" name="whatsapp" />
            <InputField defaultValue={prefills.country} label={isRu ? "Страна" : "Country"} name="contactCountry" required />
            <div className="md:col-span-2">
              <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                <span>{isRu ? "Комментарий" : "Comment"}</span>
                <textarea className="field-shell min-h-[120px] rounded-qidra px-4 py-3 text-16 outline-none" name="comment" maxLength={1200} />
              </label>
            </div>
          </div>
        ) : null}
        <InvestmentAmountInput locale={locale} onChange={(event) => setAmount(event.currentTarget.value)} value={amount} />
        {realEstate ? <RealEstatePaymentSummary amount={amount} locale={locale} managementFeePercent={managementFeePercent} /> : null}
        {hasActiveApplication ? (
          <NotificationCard
            title={isRu ? "Заявка уже на проверке" : "Application already in review"}
            text={
              isRu
                ? `Текущая сумма заявки: ${formatUsdt(activeApplicationAmountUsdt)}. Зарезервировано: ${formatUsdt(activeReservedUsdt)}. Повторная отправка обновит эту заявку, а не создаст новую.`
                : `Current application amount: ${formatUsdt(activeApplicationAmountUsdt)}. Reserved: ${formatUsdt(activeReservedUsdt)}. Submitting again updates this application instead of creating a new one.`
            }
          />
        ) : null}
        <NotificationCard title={isRu ? "Без гарантии доходности" : "No guaranteed returns"} text={noFixedYieldText} />
        <NotificationCard
          title={applicationReadinessTitle(kycApproved, freeUsdt, locale)}
          text={applicationReadinessText(kycApproved, freeUsdt, locale)}
          tone={kycApproved && freeUsdt >= minParticipationUsdt ? "success" : "warning"}
        />
        {realEstate ? <RealEstateExitTerms locale={locale} /> : null}
        {realEstate ? (
          <>
            <input name="termsAccepted" type="hidden" value="on" />
            <input name="contractAccepted" type="hidden" value="on" />
            <Checkbox name="riskAccepted" required>
              {isRu ? "Я понимаю, что доходность и возврат капитала не гарантируются." : "I understand that returns and capital repayment are not guaranteed."}
            </Checkbox>
            <Checkbox name="qidraDisclaimerAccepted" required>
              {isRu ? "Я понимаю, что Qidra является информационной платформой и не является стороной договора." : "I understand that Qidra is an informational platform and is not a party to the agreement."}
            </Checkbox>
            <Checkbox name="transferExitAccepted" required>
              {isRu
                ? "Я понимаю, что после направления средств в проект недвижимости возврат средств по первому требованию невозможен. Выход из проекта осуществляется только в порядке, предусмотренном условиями проекта и договором с управляющим партнёром."
                : "I understand that after funds are directed to a real estate project, they cannot be returned on first demand. Exit is possible only under the project terms and the agreement with the managing partner."}
            </Checkbox>
            <Checkbox name="minHoldAccepted" required>
              {isRu ? "Я понимаю, что минимальный период участия составляет 12 месяцев." : "I understand that the minimum holding period is 12 months."}
            </Checkbox>
            <Checkbox name="exitWindowAccepted" required>
              {isRu ? "Я понимаю, что выход возможен только через окна выхода в июне и декабре после завершения минимального периода удержания." : "I understand that exit is possible only through exit windows in June and December after the minimum holding period."}
            </Checkbox>
            <Checkbox name="marketPriceAccepted" required>
              {isRu ? "Я понимаю, что стоимость моей доли при выходе определяется текущей рыночной стоимостью объекта и может быть выше или ниже моей первоначальной суммы участия." : "I understand that the value of my share at exit is determined by the current market value of the asset and may be above or below my original participation amount."}
            </Checkbox>
            <Checkbox name="transferAccepted" required>
              {isRu ? "Я согласен на передачу моей заявки предпринимателю / управляющему партнёру проекта." : "I agree that my application may be shared with the entrepreneur / managing partner of the project."}
            </Checkbox>
          </>
        ) : (
          <>
            <Checkbox name="termsAccepted" required>
              {isRu ? "Я изучил условия проекта и предупреждение о рисках." : "I reviewed project terms and the risk notice."}
            </Checkbox>
            <Checkbox name="contractAccepted" required>
              {isRu ? "Я принимаю договорную структуру Mudaraba/Musharaka." : "I accept the Mudaraba/Musharaka contractual structure."}
            </Checkbox>
          </>
        )}
        <Button loading={submitting} loadingLabel={isRu ? "Отправка" : "Submitting"} type="submit">
          {hasActiveApplication ? (isRu ? "Обновить заявку" : "Update application") : isRu ? "Создать заявку" : "Create application"}
        </Button>
        <Link className="text-center text-14 font-medium text-qidra-accent hover:text-qidra-dark" href={`/investor/wallet?lang=${locale}`}>
          {isRu ? "Пополнить кошелёк" : "Top up wallet"}
        </Link>
      </form>
      {popup ? <InvestmentPopup locale={locale} popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
  );
}

function RealEstateExitTerms({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <section className="grid gap-4 rounded-[20px] border border-qidra-grayMedium/20 bg-white p-5 shadow-[0_12px_36px_rgba(18,20,23,0.04)]">
      <h2 className="text-20 font-semibold text-qidra-dark">{isRu ? "Условия внесения средств и выхода из проекта" : "Funding and exit conditions"}</h2>
      <div className="grid gap-4 text-15 leading-7 text-qidra-grayBlue">
        <p>
          {isRu
            ? "Средства участника вносятся для участия в конкретном объекте недвижимости в рамках условий проекта."
            : "Participant funds are contributed for participation in a specific real estate asset under the project terms."}
        </p>
        <p>
          {isRu
            ? "После подтверждения участия и направления средств в проект участник не может требовать немедленного возврата средств по первому требованию, поскольку капитал используется в объекте недвижимости и связан со сроком владения, арендной стратегией, рыночной ликвидностью и возможной продажей объекта."
            : "After participation is confirmed and funds are directed into the project, the participant cannot demand immediate repayment on first request because the capital is tied to the real estate asset, holding period, rental strategy, market liquidity, and possible asset sale."}
        </p>
        <div className="grid gap-2">
          <p className="font-semibold text-qidra-dark">{isRu ? "Возврат средств участнику возможен только в следующих случаях:" : "A participant may receive funds back only in the following cases:"}</p>
          <ol className="grid gap-2 pl-5">
            <li>{isRu ? "До фактического направления средств в проект — по письменному запросу участника, если средства ещё не были использованы для участия в объекте." : "Before the funds are actually directed into the project, upon the participant's written request, if the funds have not yet been used for participation in the asset."}</li>
            <li>{isRu ? "После завершения проекта — после продажи объекта, получения расчётов и распределения чистого результата между участниками." : "After project completion, following the sale of the asset, receipt of settlement proceeds, and distribution of the net result among participants."}</li>
            <li>{isRu ? "При наличии нового участника, готового заменить действующего участника, если управляющий партнёр одобрит такую замену." : "If a new participant is ready to replace the current participant and the managing partner approves such a replacement."}</li>
            <li>{isRu ? "В иной срок или порядке, прямо предусмотренный договором Мудараба / Мушарака по конкретному проекту." : "At another time or in another manner expressly provided for by the Mudaraba / Musharaka agreement for the relevant project."}</li>
          </ol>
        </div>
        <p>
          {isRu
            ? "Участник понимает и принимает, что недвижимость является низколиквидным активом, а сроки выхода из проекта зависят от рыночных условий, продажи объекта, арендаторов, документооборота и иных факторов."
            : "The participant understands and accepts that real estate is a low-liquidity asset and that the timing of exit from the project depends on market conditions, asset sale, tenants, documentation flow, and other factors."}
        </p>
        <p>
          {isRu
            ? "Qidra не принимает средства участников, не хранит средства, не осуществляет возврат средств и не является стороной договора. Все финансовые отношения возникают напрямую между участником и предпринимателем / управляющим партнёром проекта."
            : "Qidra does not receive participant funds, does not hold funds, does not return funds, and is not a party to the agreement. All financial relations arise directly between the participant and the entrepreneur / managing partner of the project."}
        </p>
      </div>
    </section>
  );
}

function RealEstatePaymentSummary({ amount, locale, managementFeePercent }: { amount: string; locale: Locale; managementFeePercent: number }) {
  const isRu = locale === "ru";
  const amountUnits = parseUsdtUnits(amount) ?? 0;
  const feeUnits = calculateFeeUnits(amountUnits, managementFeePercent);
  const totalUnits = amountUnits + feeUnits;

  return (
    <section className="grid gap-4 rounded-[20px] border border-qidra-grayMedium/20 bg-white p-5 shadow-[0_12px_36px_rgba(18,20,23,0.04)]">
      <p className="text-14 font-semibold text-qidra-dark">{isRu ? "Расчёт участия и комиссии" : "Participation and fee breakdown"}</p>
      <div className="grid gap-3 rounded-[18px] bg-qidra-grayLight p-4 text-15 text-qidra-grayBlue">
        <SummaryRow label={isRu ? "Сумма участия" : "Participation amount"} value={formatUsdt(unitsToAmount(amountUnits))} />
        <SummaryRow
          label={
            managementFeePercent > 0
              ? isRu
                ? `Единоразовая комиссия управляющего ${managementFeePercent}%`
                : `One-time management fee ${managementFeePercent}%`
              : isRu
                ? "Единоразовая комиссия управляющего"
                : "One-time management fee"
          }
          value={managementFeePercent > 0 ? formatUsdt(unitsToAmount(feeUnits)) : isRu ? "Не применяется" : "Not applied"}
        />
        <SummaryRow label={isRu ? "Итого к оплате" : "Total payment"} value={formatUsdt(unitsToAmount(totalUnits))} strong />
      </div>
    </section>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <span>{label}</span>
      <span className={strong ? "font-semibold text-qidra-dark" : "font-medium text-qidra-dark"}>{value}</span>
    </div>
  );
}

function InputField(props: { defaultValue?: string; label: string; name: string; required?: boolean; type?: string }) {
  return (
    <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
      <span>{props.label}</span>
      <input className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" defaultValue={props.defaultValue} name={props.name} required={props.required} type={props.type || "text"} />
    </label>
  );
}

function InvestmentPopup({ locale, onClose, popup }: { locale: Locale; onClose: () => void; popup: PopupState }) {
  const toneClass = popup.tone === "success" ? "bg-qidra-green" : popup.tone === "warning" ? "bg-qidra-gold" : "bg-qidra-red";

  return (
    <div aria-atomic="true" aria-live="polite" className="fixed inset-0 z-50 grid place-items-center bg-qidra-dark/20 px-4" role={popup.tone === "error" ? "alert" : "status"}>
      <div className="surface w-full max-w-md border-qidra-grayLight bg-white p-5 shadow-qidra">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className={`mt-2 size-3 shrink-0 rounded-full ${toneClass}`} />
          <div className="min-w-0 flex-1">
            <p className="text-18 font-semibold text-qidra-dark">{popup.title}</p>
            <p className="mt-2 text-14 text-qidra-grayBlue">{popup.text}</p>
          </div>
          <button
            aria-label={locale === "ru" ? "Закрыть уведомление" : "Close notification"}
            className="flex size-8 shrink-0 items-center justify-center rounded-qidra border border-qidra-grayLight text-16 text-qidra-grayBlue transition-colors hover:border-qidra-accent hover:text-qidra-accent"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {popup.topUpHref ? (
            <ButtonLink href={popup.topUpHref} size="sm">
              {popup.topUpLabel}
            </ButtonLink>
          ) : null}
          <Button onClick={onClose} size="sm" type="button" variant={popup.topUpHref ? "outline" : "primary"}>
            {locale === "ru" ? "Понятно" : "Got it"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function applicationReadinessTitle(kycApproved: boolean, freeUsdt: number, locale: Locale) {
  if (!kycApproved) return locale === "ru" ? "Профиль ещё не одобрен" : "Profile is not approved yet";
  if (freeUsdt < minParticipationUsdt) return locale === "ru" ? "Недостаточно свободного баланса" : "Insufficient free balance";
  return locale === "ru" ? "Свободный баланс" : "Free balance";
}

function applicationReadinessText(kycApproved: boolean, freeUsdt: number, locale: Locale) {
  if (!kycApproved) {
    return locale === "ru"
      ? "Заявка на участие станет доступна после одобрения профиля и документов в разделе проверки."
      : "Participation applications become available after your profile and documents are approved in the review section.";
  }

  if (freeUsdt < minParticipationUsdt) {
    return locale === "ru"
      ? `Для новых заявок доступно ${formatUsdt(freeUsdt)}. При создании заявки система предложит пополнить недостающую сумму.`
      : `${formatUsdt(freeUsdt)} is available for new applications. When creating an application, the system will offer to top up the missing amount.`;
  }

  return locale === "ru"
    ? `Для новых заявок доступно ${formatUsdt(freeUsdt)}. Если сумма заявки выше, система предложит пополнить разницу.`
    : `${formatUsdt(freeUsdt)} is available for new applications. If the application amount is higher, the system will offer to top up the difference.`;
}

function parseUsdtUnits(value: string) {
  const normalized = value.trim().replace(",", ".").replace(/\s/g, "");

  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 1_000_000 + Number(fraction.padEnd(6, "0"));
}

function calculateFeeUnits(amountUnits: number, feePercent: number) {
  if (!feePercent || feePercent <= 0) return 0;
  return Math.round(amountUnits * (feePercent / 100));
}

function unitsToAmount(units: number) {
  return units / 1_000_000;
}

function formatAmountForInput(value: number) {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value)} USDT`;
}
