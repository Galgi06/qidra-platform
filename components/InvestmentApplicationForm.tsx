"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button, ButtonLink } from "@/components/ui/Button";
import { InvestmentAmountInput } from "@/components/InvestmentAmountInput";
import { NotificationCard } from "@/components/NotificationCard";
import type { Locale } from "@/lib/i18n";

type PopupState = {
  title: string;
  text: string;
  tone: "success" | "warning" | "error";
  topUpHref?: string;
  topUpLabel?: string;
};

type InvestmentApplicationFormProps = {
  endpoint: string;
  freeUsdt: number;
  kycApproved: boolean;
  locale: Locale;
  noFixedYieldText: string;
  projectSlug: string;
  projectTitle: string;
};

const minParticipationUsdt = 100;

export function InvestmentApplicationForm({
  endpoint,
  freeUsdt,
  kycApproved,
  locale,
  noFixedYieldText,
  projectSlug,
  projectTitle
}: InvestmentApplicationFormProps) {
  const isRu = locale === "ru";
  const router = useRouter();
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const freeUnits = Math.max(Math.floor(freeUsdt * 1_000_000), 0);

    if (amountUnits > freeUnits) {
      const shortfallUnits = amountUnits - freeUnits;
      const shortfallAmount = unitsToAmount(shortfallUnits);
      const requestedAmount = unitsToAmount(amountUnits);
      const topUpHref = `/investor/wallet?lang=${locale}&amount=${encodeURIComponent(formatAmountForInput(shortfallAmount))}`;

      setPopup({
        title: isRu ? "Недостаточно баланса" : "Insufficient balance",
        text: isRu
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
        title: data.title ?? (isRu ? "Заявка создана" : "Application created"),
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
        <InvestmentAmountInput locale={locale} />
        <NotificationCard title={isRu ? "Без гарантии доходности" : "No guaranteed returns"} text={noFixedYieldText} />
        <NotificationCard
          title={applicationReadinessTitle(kycApproved, freeUsdt, locale)}
          text={applicationReadinessText(kycApproved, freeUsdt, locale)}
          tone={kycApproved && freeUsdt >= minParticipationUsdt ? "success" : "warning"}
        />
        <Checkbox name="termsAccepted" required>
          {isRu ? "Я изучил условия проекта и предупреждение о рисках." : "I reviewed project terms and the risk notice."}
        </Checkbox>
        <Checkbox name="contractAccepted" required>
          {isRu ? "Я принимаю договорную структуру Mudaraba/Musharaka." : "I accept the Mudaraba/Musharaka contractual structure."}
        </Checkbox>
        <Button loading={submitting} loadingLabel={isRu ? "Отправка" : "Submitting"} type="submit">
          {isRu ? "Создать заявку" : "Create application"}
        </Button>
        <Link className="text-center text-14 font-medium text-qidra-accent hover:text-qidra-dark" href={`/investor/wallet?lang=${locale}`}>
          {isRu ? "Пополнить кошелёк" : "Top up wallet"}
        </Link>
      </form>
      {popup ? <InvestmentPopup locale={locale} popup={popup} onClose={() => setPopup(null)} /> : null}
    </>
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

function unitsToAmount(units: number) {
  return units / 1_000_000;
}

function formatAmountForInput(value: number) {
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value)} USDT`;
}
