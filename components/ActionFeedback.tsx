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
type FieldErrors = Record<string, string | string[]>;
type ConfirmMessage = {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: FeedbackTone;
};

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

function ConfirmationPopup({
  confirmation,
  onCancel,
  onConfirm
}: {
  confirmation: ConfirmMessage;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const tone = confirmation.tone ?? "warning";

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancel();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-qidra-dark/30 px-4" role="alertdialog">
      <div className="surface w-full max-w-lg border-qidra-grayLight bg-white p-6 shadow-qidra">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className={`mt-2 size-3 shrink-0 rounded-full ${toneDot[tone]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-18 font-semibold text-qidra-dark">{confirmation.title}</p>
            <p className="mt-2 text-14 text-qidra-grayBlue">{confirmation.text}</p>
          </div>
          <button
            aria-label={confirmation.cancelLabel}
            className="flex size-8 shrink-0 items-center justify-center rounded-qidra border border-qidra-grayLight text-16 text-qidra-grayBlue transition-colors hover:border-qidra-accent hover:text-qidra-accent"
            onClick={onCancel}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel} size="sm" type="button" variant="outline">
            {confirmation.cancelLabel}
          </Button>
          <Button onClick={onConfirm} size="sm" type="button" variant="dark">
            {confirmation.confirmLabel}
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
  confirm?: ConfirmMessage;
  draftKey?: string;
  endpoint?: string;
  feedback: FeedbackMessage;
  formId?: string;
  payload?: "json" | "form-data";
  popupPlacement?: FeedbackPlacement;
  refreshOnSuccess?: boolean;
  reloadOnSuccess?: boolean;
  resetOnSubmit?: boolean;
};

export function FeedbackForm({
  children,
  className = "",
  confirm,
  draftKey,
  endpoint,
  feedback,
  formId,
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pendingFormRef = useState(() => ({ current: null as HTMLFormElement | null }))[0];
  const pendingSubmitterRef = useState(() => ({ current: null as { name: string; value: string } | null }))[0];
  const formRef = useState(() => ({ current: null as HTMLFormElement | null }))[0];

  useEffect(() => {
    const form = formRef.current;

    if (!form || !draftKey) return;

    const snapshot = readDraftSnapshot(draftKey);

    if (!snapshot) return;

    applyDraftSnapshot(form, snapshot);
    const rafId = window.requestAnimationFrame(() => applyDraftSnapshot(form, snapshot));
    const timeoutId = window.setTimeout(() => applyDraftSnapshot(form, snapshot), 120);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
    };
  }, [draftKey]);

  useEffect(() => {
    const form = formRef.current;

    if (!form || !draftKey) return;

    const persistDraft = () => {
      writeDraftSnapshot(draftKey, collectDraftSnapshot(form));
    };

    form.addEventListener("input", persistDraft);
    form.addEventListener("change", persistDraft);
    persistDraft();

    return () => {
      form.removeEventListener("input", persistDraft);
      form.removeEventListener("change", persistDraft);
    };
  }, [draftKey]);

  useEffect(() => {
    const form = formRef.current;

    if (!form) return;

    const clearFieldState = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
      clearSingleFieldError(target);
    };

    form.addEventListener("input", clearFieldState);
    form.addEventListener("change", clearFieldState);

    return () => {
      form.removeEventListener("input", clearFieldState);
      form.removeEventListener("change", clearFieldState);
    };
  }, []);

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

  async function submitForm(form: HTMLFormElement, submitter: { name: string; value: string } | null) {
    if (endpoint) {
      setSubmitting(true);
      clearFieldErrors(form);

      try {
        const formData = new FormData(form);

        if (submitter?.name) {
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
        const data = (await response.json().catch(() => ({}))) as {
          fieldErrors?: FieldErrors;
          message?: string;
          redirectTo?: string;
          title?: string;
          tone?: FeedbackTone;
        };
        const english = feedback.buttonLabel === "Got it" || feedback.dismissLabel === "Close notification";
        const fieldErrorText = formatFieldErrorSummary(data.fieldErrors);
        const nextFeedback = {
          ...feedback,
          title: data.title ?? (response.ok ? feedback.title : english ? "Action failed" : "Действие не выполнено"),
          text:
            [data.message, fieldErrorText].filter(Boolean).join(" ") ||
            (response.ok
              ? feedback.text
              : english
                ? "The server did not confirm the action. Refresh the page and try again."
                : "Сервер не подтвердил действие. Обновите страницу и попробуйте ещё раз."),
          tone: response.ok ? data.tone ?? feedback.tone : "error"
        };

        setActiveFeedback(nextFeedback);

        if (!response.ok) {
          applyFieldErrors(form, data.fieldErrors);
          setOpen(true);
          return;
        }

        if (draftKey) {
          clearDraftSnapshot(draftKey);
        }

        if (data.redirectTo) {
          storeFeedback(nextFeedback);
          router.push(data.redirectTo);
          router.refresh();
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    clearFieldErrors(form);
    const browserValid = form.checkValidity();

    if (!browserValid) {
      markBrowserInvalidFields(form);
    }

    const customFilesValid = validateCustomRequiredFiles(form);

    if (!browserValid || !customFilesValid) {
      focusFirstInvalidField(form);
      if (!browserValid) {
        form.reportValidity();
      }
      return;
    }

    const nativeSubmitter = (event.nativeEvent as SubmitEvent).submitter;
    const submitter =
      nativeSubmitter instanceof HTMLButtonElement || nativeSubmitter instanceof HTMLInputElement
        ? nativeSubmitter.name
          ? { name: nativeSubmitter.name, value: nativeSubmitter.value }
          : null
        : null;

    if (confirm) {
      pendingFormRef.current = form;
      pendingSubmitterRef.current = submitter;
      setConfirmOpen(true);
      return;
    }

    await submitForm(form, submitter);
  }

  async function handleConfirm() {
    const form = pendingFormRef.current;

    setConfirmOpen(false);

    if (!form) {
      return;
    }

    await submitForm(form, pendingSubmitterRef.current);
    pendingFormRef.current = null;
    pendingSubmitterRef.current = null;
  }

  return (
    <>
      <form
        aria-busy={submitting}
        className={className}
        id={formId}
        onSubmit={handleSubmit}
        ref={(node) => {
          formRef.current = node;
        }}
      >
        {children}
      </form>
      {confirmOpen && confirm ? <ConfirmationPopup confirmation={confirm} onCancel={() => setConfirmOpen(false)} onConfirm={handleConfirm} /> : null}
      {open ? <FeedbackPopup feedback={activeFeedback} onClose={() => setOpen(false)} placement={popupPlacement} /> : null}
    </>
  );
}

function markBrowserInvalidFields(form: HTMLFormElement) {
  clearFieldErrors(form);

  for (const element of Array.from(form.elements)) {
    if (!isFieldElement(element) || element.validity.valid) continue;
    markInvalidField(element, element.validationMessage);
  }
}

function validateCustomRequiredFiles(form: HTMLFormElement) {
  const fileInputs = Array.from(form.querySelectorAll<HTMLInputElement>("input[type='file'][data-required-file='true']"));

  if (!fileInputs.length) {
    return true;
  }

  const processed = new Set<string>();
  let valid = true;

  for (const input of fileInputs) {
    const key = input.name || input.id;

    if (!key || processed.has(key)) continue;
    processed.add(key);

    const group = fileInputs.filter((candidate) => (candidate.name || candidate.id) === key);
    const referenceInput = group[0] ?? input;
    const wrapper = referenceInput.closest<HTMLElement>("[data-field-wrapper]");
    const hasUploadedFile = wrapper?.dataset.hasFile === "true";
    const hasSelectedFile = group.some((candidate) => (candidate.files?.length ?? 0) > 0);

    if (hasUploadedFile || hasSelectedFile) continue;

    markInvalidField(referenceInput, referenceInput.dataset.requiredMessage || referenceInput.validationMessage);
    valid = false;
  }

  return valid;
}

function applyFieldErrors(form: HTMLFormElement, fieldErrors: FieldErrors | undefined) {
  if (!fieldErrors) return;

  for (const [fieldName, message] of Object.entries(fieldErrors)) {
    const field = form.elements.namedItem(fieldName);
    const fieldMessage = Array.isArray(message) ? message[0] : message;

    if (field instanceof RadioNodeList) {
      const firstField = Array.from(field).find(isFieldElement);
      if (firstField) markInvalidField(firstField, fieldMessage);
      continue;
    }

    if (isFieldElement(field)) {
      markInvalidField(field, fieldMessage);
    }
  }

  focusFirstInvalidField(form);
}

function clearFieldErrors(form: HTMLFormElement) {
  form.querySelectorAll("[aria-invalid='true']").forEach((element) => {
    element.setAttribute("aria-invalid", "false");
    element.removeAttribute("aria-describedby");
  });
  form.querySelectorAll("[data-field-error-message]").forEach((element) => element.remove());
}

function clearSingleFieldError(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  field.setAttribute("aria-invalid", "false");
  field.removeAttribute("aria-describedby");
  const wrapper = field.closest<HTMLElement>("[data-field-wrapper]") ?? field.closest<HTMLElement>("label") ?? field.parentElement;
  wrapper?.setAttribute("aria-invalid", "false");
  wrapper?.querySelectorAll(`[data-field-error-message='${field.name}']`).forEach((element) => element.remove());
}

function focusFirstInvalidField(form: HTMLFormElement) {
  const firstInvalid = form.querySelector<HTMLElement>("[aria-invalid='true']");

  if (!firstInvalid) return;

  firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });

  if (firstInvalid instanceof HTMLInputElement || firstInvalid instanceof HTMLSelectElement || firstInvalid instanceof HTMLTextAreaElement) {
    firstInvalid.focus({ preventScroll: true });
    return;
  }

  const nestedField = firstInvalid.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea");
  nestedField?.focus({ preventScroll: true });
}

function markInvalidField(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, message: string | undefined) {
  const wrapper = field.closest<HTMLElement>("[data-field-wrapper]") ?? field.closest<HTMLElement>("label") ?? field.parentElement;
  const target = wrapper ?? field;
  const errorId = `${field.name || field.id}-error`;

  field.setAttribute("aria-invalid", "true");
  target.setAttribute("aria-invalid", "true");

  if (!message || wrapper?.querySelector(`[data-field-error-message='${field.name}']`)) return;

  const error = document.createElement("span");
  error.className = "text-12 text-qidra-red";
  error.dataset.fieldErrorMessage = field.name;
  error.id = errorId;
  error.textContent = message;
  field.setAttribute("aria-describedby", errorId);
  target.append(error);
}

function formatFieldErrorSummary(fieldErrors: FieldErrors | undefined) {
  if (!fieldErrors || !Object.keys(fieldErrors).length) return "";
  return Object.values(fieldErrors)
    .map((message) => (Array.isArray(message) ? message[0] : message))
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");
}

function isFieldElement(element: unknown): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement;
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

type DraftFieldValue =
  | { type: "checkbox"; checked: boolean }
  | { type: "radio"; checked: boolean }
  | { type: "value"; value: string };

type DraftSnapshot = Record<string, DraftFieldValue>;

function readDraftSnapshot(key: string) {
  try {
    const raw = window.localStorage?.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as DraftSnapshot;
  } catch {
    return null;
  }
}

function writeDraftSnapshot(key: string, snapshot: DraftSnapshot) {
  try {
    window.localStorage?.setItem(key, JSON.stringify(snapshot));
  } catch {
    return false;
  }

  return true;
}

function clearDraftSnapshot(key: string) {
  try {
    window.localStorage?.removeItem(key);
  } catch {
    return false;
  }

  return true;
}

function collectDraftSnapshot(form: HTMLFormElement) {
  const snapshot: DraftSnapshot = {};

  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
    if (!element.name) continue;
    if (element.dataset.draftIgnore === "true") continue;
    if (element instanceof HTMLInputElement && ["file", "password", "submit", "button", "reset"].includes(element.type)) continue;

    const key = draftFieldKey(element);

    if (element instanceof HTMLInputElement && element.type === "checkbox") {
      snapshot[key] = { type: "checkbox", checked: element.checked };
      continue;
    }

    if (element instanceof HTMLInputElement && element.type === "radio") {
      snapshot[key] = { type: "radio", checked: element.checked };
      continue;
    }

    snapshot[key] = { type: "value", value: element.value };
  }

  return snapshot;
}

function applyDraftSnapshot(form: HTMLFormElement, snapshot: DraftSnapshot) {
  for (const element of Array.from(form.elements)) {
    if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)) continue;
    if (!element.name) continue;
    if (element.dataset.draftIgnore === "true") continue;
    if (element instanceof HTMLInputElement && ["file", "password", "submit", "button", "reset"].includes(element.type)) continue;

    const saved = snapshot[draftFieldKey(element)];
    if (!saved) continue;

    if (saved.type === "checkbox" && element instanceof HTMLInputElement && element.type === "checkbox") {
      element.checked = saved.checked;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }

    if (saved.type === "radio" && element instanceof HTMLInputElement && element.type === "radio") {
      element.checked = saved.checked;
      element.dispatchEvent(new Event("change", { bubbles: true }));
      continue;
    }

    if (saved.type === "value") {
      element.value = saved.value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}

function draftFieldKey(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio")) {
    return `${element.name}::${element.value}`;
  }

  return element.name;
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
