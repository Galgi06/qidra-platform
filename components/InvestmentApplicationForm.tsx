"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InvestmentAmountInput } from "@/components/InvestmentAmountInput";
import { NotificationCard } from "@/components/NotificationCard";
import type { Locale } from "@/lib/i18n";
import { AM_CAPITAL_MANAGER_FEE_PERCENT, type RealEstateProjectData } from "@/lib/real-estate";

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
  useAmCapitalFlow: boolean;
};

type AmCapitalAcknowledgement = {
  id: string;
  label: Record<Locale, string>;
};

const minParticipationUsdt = 100;

const amCapitalAcknowledgements: AmCapitalAcknowledgement[] = [
  {
    id: "amProjectTermsAccepted",
    label: {
      ru: "Я подтверждаю, что ознакомился с описанием проекта, финансовой структурой, документами и условиями участия.",
      en: "I confirm that I reviewed the project description, financial structure, documents, and participation terms."
    }
  },
  {
    id: "amQidraPlatformAccepted",
    label: {
      ru: "Я понимаю, что Qidra является информационной и технологической платформой и не является стороной договора между мной и управляющим партнёром.",
      en: "I understand that Qidra is an informational and technology platform and is not a party to the contract between me and the managing partner."
    }
  },
  {
    id: "amDirectRelationshipAccepted",
    label: {
      ru: "Я понимаю, что все договорные отношения возникают напрямую между мной и Adam Miziev / AM Capital Property Fund.",
      en: "I understand that all contractual relations arise directly between me and Adam Miziev / AM Capital Property Fund."
    }
  },
  {
    id: "amYieldNotGuaranteedAccepted",
    label: {
      ru: "Я понимаю, что доходность проекта не гарантируется.",
      en: "I understand that project returns are not guaranteed."
    }
  },
  {
    id: "amCapitalNotGuaranteedAccepted",
    label: {
      ru: "Я понимаю, что возврат капитала не гарантируется.",
      en: "I understand that repayment of capital is not guaranteed."
    }
  },
  {
    id: "amNotDepositAccepted",
    label: {
      ru: "Я понимаю, что средства направляются в объект недвижимости и не являются банковским депозитом.",
      en: "I understand that the funds are allocated to a real estate asset and are not a bank deposit."
    }
  },
  {
    id: "amNoOnDemandReturnAccepted",
    label: {
      ru: "Я понимаю, что после направления средств в проект возврат по первому требованию невозможен.",
      en: "I understand that once funds are committed to the project, return on first demand is not possible."
    }
  },
  {
    id: "amMinimumHoldingAccepted",
    label: {
      ru: "Я понимаю, что минимальный срок удержания участия составляет 12 месяцев.",
      en: "I understand that the minimum holding period is 12 months."
    }
  },
  {
    id: "amExitAfterHoldingAccepted",
    label: {
      ru: "Я понимаю, что выход возможен только после завершения минимального срока удержания через окна выхода.",
      en: "I understand that exit is possible only after the minimum holding period through exit windows."
    }
  },
  {
    id: "amExitWindowsAccepted",
    label: {
      ru: "Я понимаю, что окна выхода открываются два раза в год: в июне и декабре.",
      en: "I understand that exit windows open twice a year: in June and December."
    }
  },
  {
    id: "amMarketValueAccepted",
    label: {
      ru: "Я понимаю, что стоимость моей доли при выходе определяется текущей рыночной стоимостью объекта на момент выхода и может быть как выше, так и ниже первоначальной суммы участия.",
      en: "I understand that the value of my share at exit is based on the current market value of the asset and may be higher or lower than my initial participation amount."
    }
  },
  {
    id: "amBuyerDependencyAccepted",
    label: {
      ru: "Я понимаю, что возможность выхода зависит от наличия покупателя или замещающего участника.",
      en: "I understand that exit depends on the availability of a buyer or a replacement participant."
    }
  },
  {
    id: "amAgreementAccepted",
    label: {
      ru: "Я подтверждаю, что ознакомился и согласен с Генеральным договором Мудараба AM Capital Property Fund.",
      en: "I confirm that I reviewed and agree with the AM Capital Property Fund General Mudaraba Agreement."
    }
  }
];

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
  realEstate,
  useAmCapitalFlow
}: InvestmentApplicationFormProps) {
  const isRu = locale === "ru";
  const router = useRouter();
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [agreementViewed, setAgreementViewed] = useState(false);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hasActiveApplication = activeApplicationAmountUsdt > 0;

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

    if (useAmCapitalFlow && !agreementViewed) {
      setPopup({
        title: isRu ? "Откройте договор" : "Open the agreement",
        text: isRu
          ? "Перед отправкой заявки откройте Генеральный договор Мудараба AM Capital Property Fund."
          : "Before submitting the application, open the AM Capital Property Fund General Mudaraba Agreement.",
        tone: "warning"
      });
      return;
    }

    const feeUnits = useAmCapitalFlow ? calculateFeeUnits(amountUnits) : 0;
    const totalUnits = amountUnits + feeUnits;
    const freeUnits = Math.max(Math.floor(freeUsdt * 1_000_000), 0);

    if (totalUnits > freeUnits) {
      const shortfallUnits = totalUnits - freeUnits;
      const shortfallAmount = unitsToAmount(shortfallUnits);
      const requestedAmount = unitsToAmount(amountUnits);
      const totalAmount = unitsToAmount(totalUnits);
      const topUpHref = `/investor/wallet?lang=${locale}&amount=${encodeURIComponent(formatAmountForInput(shortfallAmount))}`;

      setPopup({
        title: isRu ? "Недостаточно баланса" : "Insufficient balance",
        text: useAmCapitalFlow
          ? isRu
            ? `На доступном балансе ${formatUsdt(freeUsdt)}. Для участия на ${formatUsdt(requestedAmount)} и комиссии ${formatUsdt(unitsToAmount(feeUnits))} нужно всего ${formatUsdt(totalAmount)} и пополнение ещё на ${formatUsdt(shortfallAmount)}.`
            : `Your available balance is ${formatUsdt(freeUsdt)}. Participation of ${formatUsdt(requestedAmount)} plus the ${formatUsdt(unitsToAmount(feeUnits))} manager fee requires ${formatUsdt(totalAmount)} in total, so top up another ${formatUsdt(shortfallAmount)}.`
          : isRu
            ? `На доступном балансе ${formatUsdt(freeUsdt)}. Для заявки на ${formatUsdt(requestedAmount)} нужно пополнить ещё ${formatUsdt(shortfallAmount)}.`
            : `Your available balance is ${formatUsdt(freeUsdt)}. To apply for ${formatUsdt(requestedAmount)}, top up another ${formatUsdt(shortfallAmount)}.`,
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
        {useAmCapitalFlow ? <input name="amAgreementViewed" type="hidden" value={agreementViewed ? "yes" : ""} /> : null}
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
        <InvestmentAmountInput locale={locale} />
        {useAmCapitalFlow ? <AmCapitalFeeSummary locale={locale} /> : null}
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
        {useAmCapitalFlow ? (
          <NotificationCard
            title={isRu ? "Генеральный договор AM Capital" : "AM Capital general agreement"}
            text={
              isRu
                ? "Карточка данного проекта, включая описание объекта, финансовую структуру, комиссию управляющего, условия выплат, условия выхода и риски, является неотъемлемой частью Генерального договора Мудараба AM Capital Property Fund."
                : "This project card, including the asset description, financial structure, manager fee, distribution terms, exit terms, and risks, forms an integral part of the AM Capital Property Fund General Mudaraba Agreement."
            }
          />
        ) : null}
        <NotificationCard
          title={applicationReadinessTitle(kycApproved, freeUsdt, locale, useAmCapitalFlow)}
          text={applicationReadinessText(kycApproved, freeUsdt, locale, useAmCapitalFlow)}
          tone={kycApproved && freeUsdt >= minimumRequiredBalance(useAmCapitalFlow) ? "success" : "warning"}
        />
        {useAmCapitalFlow ? (
          <>
            {amCapitalAcknowledgements.slice(0, -1).map((item) => (
              <Checkbox key={item.id} name={item.id} required>
                {item.label[locale]}
              </Checkbox>
            ))}
            <Checkbox name="amAgreementAccepted" required>
              <span>{amCapitalAcknowledgements[amCapitalAcknowledgements.length - 1].label[locale]}</span>
              <button
                className="ml-2 inline-flex font-medium text-qidra-accent hover:text-qidra-dark"
                onClick={(event) => {
                  event.preventDefault();
                  setAgreementViewed(true);
                  setAgreementOpen(true);
                }}
                type="button"
              >
                {isRu ? "Открыть договор" : "Open agreement"}
              </button>
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
            {realEstate ? (
              <>
                <Checkbox name="riskAccepted" required>
                  {isRu ? "Я ознакомлен с рисками." : "I acknowledge the risks."}
                </Checkbox>
                <Checkbox name="qidraDisclaimerAccepted" required>
                  {isRu ? "Я понимаю, что Qidra является информационной платформой." : "I understand that Qidra is an informational platform."}
                </Checkbox>
                <Checkbox name="transferAccepted" required>
                  {isRu ? "Я согласен на передачу моей заявки предпринимателю." : "I agree that my application may be shared with the entrepreneur."}
                </Checkbox>
              </>
            ) : null}
          </>
        )}
        <Button loading={submitting} loadingLabel={isRu ? "Отправка" : "Submitting"} type="submit">
          {hasActiveApplication ? (isRu ? "Обновить заявку" : "Update application") : isRu ? "Создать заявку" : "Create application"}
        </Button>
        <Link className="text-center text-14 font-medium text-qidra-accent hover:text-qidra-dark" href={`/investor/wallet?lang=${locale}`}>
          {isRu ? "Пополнить кошелёк" : "Top up wallet"}
        </Link>
      </form>
      {agreementOpen ? <AmCapitalAgreement locale={locale} projectTitle={projectTitle} onClose={() => setAgreementOpen(false)} /> : null}
      {popup ? <InvestmentPopup locale={locale} popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
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

function AmCapitalFeeSummary({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <div className="grid gap-3 rounded-[20px] border border-qidra-grayLight bg-qidra-grayLight/50 p-5">
      <p className="text-16 font-semibold text-qidra-dark">{isRu ? "Структура оплаты AM Capital" : "AM Capital payment structure"}</p>
      <div className="grid gap-2 text-14 text-qidra-grayBlue">
        <p>{isRu ? "Сумма участия направляется в объект недвижимости полностью." : "The participation amount is allocated to the real estate asset in full."}</p>
        <p>{isRu ? `Комиссия управляющего составляет ${AM_CAPITAL_MANAGER_FEE_PERCENT}% единоразово и добавляется сверху к сумме участия.` : `The manager fee is a one-time ${AM_CAPITAL_MANAGER_FEE_PERCENT}% and is added on top of the participation amount.`}</p>
        <p>{isRu ? "Итого к оплате = сумма участия + комиссия управляющего." : "Total payable = participation amount + manager fee."}</p>
      </div>
    </div>
  );
}

function AmCapitalAgreement({ locale, onClose, projectTitle }: { locale: Locale; onClose: () => void; projectTitle: string }) {
  const isRu = locale === "ru";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-qidra-dark/30 px-4 py-8">
      <div className="surface max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-qidra-grayLight bg-white p-6 shadow-qidra">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-12 font-semibold uppercase tracking-[0.08em] text-qidra-accent">
              {isRu ? "AM Capital Property Fund" : "AM Capital Property Fund"}
            </p>
            <h2 className="mt-2 text-[28px] font-medium leading-tight text-qidra-dark">
              {isRu ? "Генеральный договор Мудараба" : "General Mudaraba Agreement"}
            </h2>
          </div>
          <Button onClick={onClose} size="sm" type="button" variant="outline">
            {isRu ? "Закрыть" : "Close"}
          </Button>
        </div>
        <div className="mt-6 grid gap-5 text-15 leading-7 text-qidra-grayBlue">
          <AgreementSection
            locale={locale}
            titleRu="1. Стороны и роль платформы"
            titleEn="1. Parties and platform role"
            textRu="Договорные отношения по участию в проектах AM Capital Property Fund возникают напрямую между инвестором и Adam Miziev / AM Capital Property Fund. Qidra выступает только как информационная и технологическая платформа и не является стороной договора."
            textEn="Contractual relations for participation in AM Capital Property Fund projects arise directly between the investor and Adam Miziev / AM Capital Property Fund. Qidra acts only as an informational and technology platform and is not a party to the agreement."
          />
          <AgreementSection
            locale={locale}
            titleRu="2. Предмет участия"
            titleEn="2. Participation subject"
            textRu="Инвестор направляет сумму участия в выбранный объект недвижимости в рамках структуры Мудараба. Сумма участия полностью относится к объекту и не уменьшается на размер комиссии управляющего."
            textEn="The investor allocates the participation amount to the selected real estate asset under a Mudaraba structure. The participation amount is fully attributed to the asset and is not reduced by the manager fee."
          />
          <AgreementSection
            locale={locale}
            titleRu="3. Комиссия управляющего"
            titleEn="3. Manager fee"
            textRu={`Комиссия управляющего составляет ${AM_CAPITAL_MANAGER_FEE_PERCENT}% единоразово и добавляется сверху к сумме участия. Итоговая сумма к оплате равна сумме участия плюс комиссия управляющего.`}
            textEn={`The manager fee is a one-time ${AM_CAPITAL_MANAGER_FEE_PERCENT}% and is added on top of the participation amount. The total payable amount equals the participation amount plus the manager fee.`}
          />
          <AgreementSection
            locale={locale}
            titleRu="4. Срок удержания и выход"
            titleEn="4. Holding period and exit"
            textRu="Минимальный срок удержания участия составляет 12 месяцев. Выход возможен только после окончания минимального срока удержания через окна выхода, которые открываются два раза в год: в июне и декабре. Возможность выхода зависит от наличия покупателя или замещающего участника."
            textEn="The minimum holding period is 12 months. Exit is available only after the minimum holding period through exit windows, which open twice a year: in June and December. Exit depends on the availability of a buyer or replacement participant."
          />
          <AgreementSection
            locale={locale}
            titleRu="5. Риски и отсутствие гарантий"
            titleEn="5. Risks and no guarantees"
            textRu="Доходность проекта и возврат капитала не гарантируются. Стоимость доли при выходе определяется текущей рыночной стоимостью объекта на момент выхода и может быть как выше, так и ниже первоначальной суммы участия. Средства, направленные в проект, не являются банковским депозитом."
            textEn="Project returns and repayment of capital are not guaranteed. The value of the share at exit is determined by the current market value of the asset at the time of exit and may be higher or lower than the initial participation amount. Funds allocated to the project are not a bank deposit."
          />
          <AgreementSection
            locale={locale}
            titleRu="6. Карточка проекта как приложение"
            titleEn="6. Project card as appendix"
            textRu={`Карточка проекта «${projectTitle}», включая описание объекта, финансовую структуру, комиссию управляющего, условия выплат, условия выхода и риски, является неотъемлемой частью настоящего Генерального договора Мудараба AM Capital Property Fund.`}
            textEn={`The project card for “${projectTitle}”, including the asset description, financial structure, manager fee, distribution terms, exit terms, and risks, forms an integral part of this AM Capital Property Fund General Mudaraba Agreement.`}
          />
        </div>
      </div>
    </div>
  );
}

function AgreementSection({
  locale,
  textEn,
  textRu,
  titleEn,
  titleRu
}: {
  locale: Locale;
  textEn: string;
  textRu: string;
  titleEn: string;
  titleRu: string;
}) {
  return (
    <section className="grid gap-2">
      <h3 className="text-16 font-semibold text-qidra-dark">{locale === "ru" ? titleRu : titleEn}</h3>
      <p>{locale === "ru" ? textRu : textEn}</p>
    </section>
  );
}

function applicationReadinessTitle(kycApproved: boolean, freeUsdt: number, locale: Locale, useAmCapitalFlow: boolean) {
  if (!kycApproved) return locale === "ru" ? "Профиль ещё не одобрен" : "Profile is not approved yet";
  if (freeUsdt < minimumRequiredBalance(useAmCapitalFlow)) return locale === "ru" ? "Недостаточно свободного баланса" : "Insufficient free balance";
  return locale === "ru" ? "Свободный баланс" : "Free balance";
}

function applicationReadinessText(kycApproved: boolean, freeUsdt: number, locale: Locale, useAmCapitalFlow: boolean) {
  if (!kycApproved) {
    return locale === "ru"
      ? "Заявка на участие станет доступна после одобрения профиля и документов в разделе проверки."
      : "Participation applications become available after your profile and documents are approved in the review section.";
  }

  if (freeUsdt < minimumRequiredBalance(useAmCapitalFlow)) {
    return locale === "ru"
      ? `Для новых заявок доступно ${formatUsdt(freeUsdt)}. При создании заявки система предложит пополнить недостающую сумму.`
      : `${formatUsdt(freeUsdt)} is available for new applications. When creating an application, the system will offer to top up the missing amount.`;
  }

  if (useAmCapitalFlow) {
    return locale === "ru"
      ? `Для AM Capital сумма к оплате включает инвестицию и комиссию ${AM_CAPITAL_MANAGER_FEE_PERCENT}% сверху. На текущий момент доступно ${formatUsdt(freeUsdt)}.`
      : `For AM Capital, the payable amount includes the investment and the ${AM_CAPITAL_MANAGER_FEE_PERCENT}% fee on top. You currently have ${formatUsdt(freeUsdt)} available.`;
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

function calculateFeeUnits(amountUnits: number) {
  return Math.round((amountUnits * AM_CAPITAL_MANAGER_FEE_PERCENT) / 100);
}

function minimumRequiredBalance(useAmCapitalFlow: boolean) {
  return useAmCapitalFlow ? minParticipationUsdt * (1 + AM_CAPITAL_MANAGER_FEE_PERCENT / 100) : minParticipationUsdt;
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
