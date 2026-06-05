"use client";

import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export type FeedbackTone = "info" | "success" | "warning" | "error";

export type FeedbackMessage = {
  title: string;
  text: string;
  tone?: FeedbackTone;
  buttonLabel?: string;
  dismissLabel?: string;
};

type FeedbackPlacement = "top-right" | "center";

const storedFeedbackKey = "qidra:feedback";

const toneDot: Record<FeedbackTone, string> = {
  info: "bg-qidra-accent",
  success: "bg-qidra-green",
  warning: "bg-qidra-gold",
  error: "bg-qidra-red"
};

export function FeedbackPopup({ feedback, onClose, placement = "top-right" }: { feedback: FeedbackMessage; onClose: () => void; placement?: FeedbackPlacement }) {
  const tone = feedback.tone ?? "success";
  const wrapperClass =
    placement === "center"
      ? "fixed inset-0 z-50 grid place-items-center bg-qidra-dark/20 px-4"
      : "fixed inset-x-4 top-4 z-50 mx-auto max-w-md md:inset-x-auto md:right-6";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div aria-atomic="true" aria-live="polite" className={wrapperClass} role={tone === "error" ? "alert" : "status"}>
      <div className="surface w-full max-w-md border-qidra-grayLight bg-white p-5 shadow-qidra">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className={`mt-2 size-3 shrink-0 rounded-full ${toneDot[tone]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-18 font-semibold text-qidra-dark">{feedback.title}</p>
            <p className="mt-2 text-14 text-qidra-grayBlue">{feedback.text}</p>
          </div>
          <button
            aria-label={feedback.dismissLabel ?? feedback.buttonLabel ?? "Close"}
            className="flex size-8 shrink-0 items-center justify-center rounded-qidra border border-qidra-grayLight text-16 text-qidra-grayBlue transition-colors hover:border-qidra-accent hover:text-qidra-accent"
            onClick={onClose}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={onClose} size="sm" type="button">
            {feedback.buttonLabel ?? "OK"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

type FeedbackFormProps = {
  children: ReactNode;
  className?: string;
  endpoint?: string;
  feedback: FeedbackMessage;
  payload?: "json" | "form-data";
  popupPlacement?: FeedbackPlacement;
  refreshOnSuccess?: boolean;
  reloadOnSuccess?: boolean;
  resetOnSubmit?: boolean;
};

export function FeedbackForm({
  children,
  className = "",
  endpoint,
  feedback,
  payload = "json",
  popupPlacement = "top-right",
  refreshOnSuccess = false,
  reloadOnSuccess = false,
  resetOnSubmit = false
}: FeedbackFormProps) {
  const router = useRouter();
  const [storedFeedbackFallback] = useState(feedback);
  const [open, setOpen] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState(feedback);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const storedFeedback = readStoredFeedback(storedFeedbackFallback);

    if (storedFeedback) {
      const timeoutId = window.setTimeout(() => {
        setActiveFeedback(storedFeedback);
        setOpen(true);
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [storedFeedbackFallback]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (endpoint) {
      setSubmitting(true);

      try {
        const formData = new FormData(form);
        const submitter = (event.nativeEvent as SubmitEvent).submitter;

        if ((submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) && submitter.name) {
          formData.set(submitter.name, submitter.value);
        }

        const response =
          payload === "form-data"
            ? await fetch(endpoint, {
                method: "POST",
                body: formData
              })
            : await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(formData.entries()))
              });
        const data = (await response.json().catch(() => ({}))) as { title?: string; message?: string; tone?: FeedbackTone };
        const nextFeedback = {
          ...feedback,
          title: data.title ?? feedback.title,
          text: data.message ?? feedback.text,
          tone: response.ok ? data.tone ?? feedback.tone : "error"
        };

        setActiveFeedback(nextFeedback);

        if (!response.ok) {
          setOpen(true);
          return;
        }

        if (reloadOnSuccess) {
          if (storeFeedback(nextFeedback)) {
            window.location.reload();
          } else {
            setOpen(true);
            router.refresh();
          }

          return;
        }
      } catch {
        const english = feedback.buttonLabel === "Got it" || feedback.dismissLabel === "Close notification";
        setActiveFeedback({
          title: english ? "Error" : "Ошибка",
          text: english ? "Could not complete the action. Check the connection and try again." : "Не удалось выполнить действие. Проверьте соединение и попробуйте снова.",
          buttonLabel: feedback.buttonLabel,
          dismissLabel: feedback.dismissLabel,
          tone: "error"
        });
        setOpen(true);
        return;
      } finally {
        setSubmitting(false);
      }
    } else {
      setActiveFeedback(feedback);
    }

    setOpen(true);

    if (resetOnSubmit) {
      form.reset();
    }

    if (refreshOnSuccess) {
      router.refresh();
    }
  }

  return (
    <>
      <form aria-busy={submitting} className={className} onSubmit={handleSubmit}>
        {children}
      </form>
      {open ? <FeedbackPopup feedback={activeFeedback} onClose={() => setOpen(false)} placement={popupPlacement} /> : null}
    </>
  );
}

function readStoredFeedback(fallback: FeedbackMessage) {
  if (typeof window === "undefined") return null;

  const stored = readStoredFeedbackValue();

  if (!stored) return null;

  try {
    return JSON.parse(stored) as FeedbackMessage;
  } catch {
    return fallback;
  }
}

function readStoredFeedbackValue() {
  try {
    const stored = window.sessionStorage?.getItem(storedFeedbackKey) ?? null;
    window.sessionStorage?.removeItem(storedFeedbackKey);
    return stored;
  } catch {
    return null;
  }
}

function storeFeedback(feedback: FeedbackMessage) {
  try {
    window.sessionStorage?.setItem(storedFeedbackKey, JSON.stringify(feedback));
    return true;
  } catch {
    return false;
  }
}

type FeedbackButtonProps = ComponentProps<typeof Button> & {
  feedback: FeedbackMessage;
};

export function FeedbackButton({ feedback, children, onClick, type = "button", ...props }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            setOpen(true);
          }
        }}
        type={type}
      >
        {children}
      </Button>
      {open ? <FeedbackPopup feedback={feedback} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
