"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SupportQueue, SupportThreadStatus } from "@prisma/client";

type Locale = "ru" | "en";

type GuestMessage = {
  body: string;
  createdAt: string;
  id: string;
  senderKind: string;
  senderName?: string | null;
};

type GuestThreadPayload = {
  contact?: string | null;
  email: string;
  messages: GuestMessage[];
  name: string;
  queue: SupportQueue;
  status: SupportThreadStatus;
  subject?: string | null;
  token: string;
};

type GuestFormState = {
  body: string;
  contact: string;
  email: string;
  name: string;
  queue: SupportQueue;
  subject: string;
};

const storageKey = "qidra-guest-support-token";
const profileStorageKey = "qidra-guest-support-profile";

export function GuestSupportChatWidget({
  chatHref,
  locale,
  path,
  signedIn
}: {
  chatHref?: string | null;
  locale: Locale;
  path: string;
  signedIn: boolean;
}) {
  const isRu = locale === "ru";
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("supportToken");
  const [open, setOpen] = useState(() => Boolean(tokenFromUrl));
  const [sending, setSending] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<GuestThreadPayload | null>(null);
  const [form, setForm] = useState<GuestFormState>(() => {
    if (typeof window === "undefined") {
      return {
        body: "",
        contact: "",
        email: "",
        name: "",
        queue: SupportQueue.TECH_SUPPORT,
        subject: ""
      };
    }

    const storedProfile = window.localStorage.getItem(profileStorageKey);

    if (!storedProfile) {
      return {
        body: "",
        contact: "",
        email: "",
        name: "",
        queue: SupportQueue.TECH_SUPPORT,
        subject: ""
      };
    }

    try {
      return {
        body: "",
        contact: "",
        email: "",
        name: "",
        queue: SupportQueue.TECH_SUPPORT,
        subject: "",
        ...JSON.parse(storedProfile)
      };
    } catch {
      window.localStorage.removeItem(profileStorageKey);
      return {
        body: "",
        contact: "",
        email: "",
        name: "",
        queue: SupportQueue.TECH_SUPPORT,
        subject: ""
      };
    }
  });

  const hidden = path.startsWith("/admin") || path === "/investor/support";

  useEffect(() => {
    if (hidden || signedIn) return;

    if (tokenFromUrl) {
      window.localStorage.setItem(storageKey, tokenFromUrl);
    }
  }, [hidden, signedIn, tokenFromUrl]);

  const activeToken = useMemo(() => {
    if (signedIn || hidden || typeof window === "undefined") return null;
    return tokenFromUrl || window.localStorage.getItem(storageKey);
  }, [hidden, signedIn, tokenFromUrl]);

  useEffect(() => {
    if (!activeToken || signedIn || hidden) return;

    let cancelled = false;

    const loadThread = async () => {
      setLoadingThread(true);
      const response = await fetch(`/api/support/guest?token=${encodeURIComponent(activeToken)}&lang=${locale}`, { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { clearToken?: boolean; message?: string; thread?: GuestThreadPayload } | null;

      if (cancelled) return;

      if (!response.ok || !data?.thread) {
        if (data?.clearToken || response.status === 404) {
          window.localStorage.removeItem(storageKey);
          setThread(null);
        }

        setError(data?.message || (isRu ? "Не удалось загрузить чат." : "Could not load the chat."));
        setLoadingThread(false);
        return;
      }

      setThread(data.thread);
      setError(null);
      setLoadingThread(false);
    };

    void loadThread();
    const intervalId = window.setInterval(loadThread, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeToken, hidden, isRu, locale, signedIn]);

  if (hidden) return null;

  if (signedIn && chatHref) {
    return (
      <Link
        href={chatHref}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 items-center justify-center rounded-full bg-qidra-dark px-5 text-15 font-semibold text-white shadow-[0_18px_40px_rgba(18,20,23,0.24)]"
      >
        {isRu ? "Поддержка" : "Support"}
      </Link>
    );
  }

  const submit = async () => {
    setSending(true);
    setError(null);

    const token = typeof window === "undefined" ? null : window.localStorage.getItem(storageKey);
    const payload = {
      ...form,
      token: token || undefined
    };

    const response = await fetch(`/api/support/guest?lang=${locale}`, {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const data = (await response.json().catch(() => null)) as { clearToken?: boolean; message?: string; thread?: GuestThreadPayload } | null;

    setSending(false);

    if (!response.ok || !data?.thread) {
      if (data?.clearToken) {
        window.localStorage.removeItem(storageKey);
        setThread(null);
      }

      setError(data?.message || (isRu ? "Не удалось отправить сообщение." : "Could not send the message."));
      return;
    }

    window.localStorage.setItem(storageKey, data.thread.token);
    window.localStorage.setItem(
      profileStorageKey,
      JSON.stringify({
        contact: form.contact,
        email: form.email,
        name: form.name,
        queue: form.queue,
        subject: form.subject
      })
    );
    setThread(data.thread);
    setForm((current) => ({ ...current, body: "" }));
  };

  return (
    <>
      <button
        className="fixed bottom-4 right-4 z-40 inline-flex h-14 items-center justify-center rounded-full bg-qidra-accent px-5 text-15 font-semibold text-white shadow-[0_18px_40px_rgba(79,70,229,0.26)] sm:bottom-6 sm:right-6"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? (isRu ? "Закрыть чат" : "Close chat") : isRu ? "Онлайн-чат" : "Live chat"}
      </button>
      {open ? (
        <section className="fixed bottom-20 left-3 right-3 z-40 flex max-h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden rounded-[22px] border border-qidra-grayLight bg-white p-4 shadow-[0_28px_70px_rgba(18,20,23,0.18)] sm:bottom-24 sm:left-auto sm:right-6 sm:w-[min(88vw,390px)] sm:p-5">
          <div>
            <p className="text-12 font-semibold uppercase tracking-[0.08em] text-qidra-accent">{isRu ? "Qidra support" : "Qidra support"}</p>
            <h2 className="mt-2 text-24 font-medium text-qidra-dark">{isRu ? "Напишите нам" : "Message us"}</h2>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {thread
                ? isRu
                  ? "Диалог сохранён в этом браузере. Продолжайте переписку здесь."
                  : "This conversation is saved in this browser. Continue chatting here."
                : isRu
                  ? "Задайте любой вопрос по аккаунту, платежам, проектам, документам или работе платформы. Команда поддержки увидит сообщение сразу."
                  : "Ask any question about your account, payments, projects, documents, or the platform. The support team will see your message right away."}
            </p>
            <p className="mt-2 text-12 leading-snug text-qidra-grayBlue">
              {isRu
                ? "Ответ менеджера появится в этом окне и дополнительно придёт на email. Если вопрос требует проверки, просто опишите ситуацию как можно подробнее."
                : "The manager reply appears in this window and is also sent to email. If the issue needs review, describe the situation in as much detail as possible."}
            </p>
          </div>

          <div className="grid min-h-0 gap-4 overflow-y-auto pr-1">
          {thread?.messages.length ? (
            <div className="grid max-h-64 gap-3 overflow-y-auto rounded-[18px] bg-qidra-grayLight/60 p-3 sm:max-h-72">
              {thread.messages.map((message) => {
                const own = message.senderKind === "guest";
                return (
                  <div key={message.id} className={`max-w-[88%] rounded-[16px] px-4 py-3 text-14 ${own ? "ml-auto bg-qidra-dark text-white" : "bg-white text-qidra-dark"}`}>
                    <p className={`text-12 font-medium ${own ? "text-white/70" : "text-qidra-grayBlue"}`}>{message.senderName || (own ? form.name || "Guest" : "Qidra")}</p>
                    <p className="mt-2 whitespace-pre-wrap">{message.body}</p>
                    <p className={`mt-2 text-11 ${own ? "text-white/70" : "text-qidra-grayBlue"}`}>{formatDateTime(message.createdAt, locale)}</p>
                  </div>
                );
              })}
            </div>
          ) : loadingThread ? (
            <div className="rounded-[18px] bg-qidra-grayLight p-4 text-14 text-qidra-grayBlue">{isRu ? "Загружаем диалог..." : "Loading conversation..."}</div>
          ) : null}

          {!thread ? (
            <div className="grid gap-3">
              <Input label={isRu ? "Имя" : "Name"} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                hint={isRu ? "На этот адрес придёт ответ менеджера." : "The manager reply will be sent to this email."}
              />
              <Input
                label={isRu ? "Телефон или Telegram" : "Phone or Telegram"}
                value={form.contact}
                onChange={(event) => setForm((current) => ({ ...current, contact: event.target.value }))}
              />
              <Input
                label={isRu ? "Тема" : "Subject"}
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder={isRu ? "Например: не получается войти" : "For example: cannot sign in"}
              />
              <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                <span>{isRu ? "Кому адресовать" : "Department"}</span>
                <select
                  className="field-shell h-12 rounded-qidra px-4 text-16 outline-none"
                  value={form.queue}
                  onChange={(event) => setForm((current) => ({ ...current, queue: event.target.value as SupportQueue }))}
                >
                  <option value={SupportQueue.TECH_SUPPORT}>{isRu ? "Техподдержка" : "Technical support"}</option>
                  <option value={SupportQueue.SALES}>{isRu ? "Отдел продаж / проекты" : "Sales / projects"}</option>
                </select>
              </label>
            </div>
          ) : null}

          <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
            <span>{isRu ? "Сообщение" : "Message"}</span>
            <textarea
              className="min-h-28 rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
              maxLength={3000}
              placeholder={isRu ? "Опишите ситуацию" : "Describe the issue"}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            />
          </label>

          {thread ? (
            <p className="text-12 text-qidra-grayBlue">
              {isRu
                ? `Статус: ${thread.status === SupportThreadStatus.PENDING ? "ожидает ваш ответ" : thread.status === SupportThreadStatus.CLOSED ? "закрыт" : "в работе"}`
                : `Status: ${thread.status === SupportThreadStatus.PENDING ? "waiting for you" : thread.status === SupportThreadStatus.CLOSED ? "closed" : "in progress"}`}
            </p>
          ) : null}

          {error ? <p className="text-13 text-qidra-red">{error}</p> : null}
          </div>

          <Button
            type="button"
            loading={sending}
            loadingLabel={isRu ? "Отправляем..." : "Sending..."}
            onClick={() => void submit()}
          >
            {isRu ? "Отправить" : "Send"}
          </Button>
        </section>
      ) : null}
    </>
  );
}

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}
