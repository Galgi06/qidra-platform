"use client";

import { useEffect, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";

export type FeedbackTone = "info" | "success" | "warning" | "error";

export type FeedbackMessage = {
  title: string;
  text: string;
  tone?: FeedbackTone;
  buttonLabel?: string;
  dismissLabel?: string;
};

const toneDot: Record<FeedbackTone, string> = {
  info: "bg-qidra-accent",
  success: "bg-qidra-green",
  warning: "bg-qidra-gold",
  error: "bg-qidra-red"
};

export function FeedbackPopup({ feedback, onClose }: { feedback: FeedbackMessage; onClose: () => void }) {
  const tone = feedback.tone ?? "success";

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
    <div aria-atomic="true" aria-live="polite" className="fixed inset-x-4 top-4 z-50 mx-auto max-w-md md:inset-x-auto md:right-6" role={tone === "error" ? "alert" : "status"}>
      <div className="surface border-qidra-grayLight bg-white p-5 shadow-qidra">
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
  resetOnSubmit?: boolean;
};

export function FeedbackForm({ children, className = "", endpoint, feedback, resetOnSubmit = false }: FeedbackFormProps) {
  const [open, setOpen] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState(feedback);
  const [submitting, setSubmitting] = useState(false);

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
        const payload = Object.fromEntries(formData.entries());
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = (await response.json().catch(() => ({}))) as { title?: string; message?: string };

        setActiveFeedback({
          ...feedback,
          title: data.title ?? feedback.title,
          text: data.message ?? feedback.text,
          tone: response.ok ? feedback.tone : "error"
        });

        if (!response.ok) {
          setOpen(true);
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
  }

  return (
    <>
      <form aria-busy={submitting} className={className} onSubmit={handleSubmit}>
        {children}
      </form>
      {open ? <FeedbackPopup feedback={activeFeedback} onClose={() => setOpen(false)} /> : null}
    </>
  );
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
