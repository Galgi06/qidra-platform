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
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 items-center justify-center rounded-full bg-qidra-accent px-5 text-15 font-semibold text-white shadow-[0_18px_40px_rgba(79,70,229,0.26)]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {open ? (isRu ? "Закрыть чат" : "Close chat") : isRu ? "Онлайн-чат" : "Live chat"}
      </button>
      {open ? (
        <section className="fixed bottom-24 right-6 z-40 grid w-[min(92vw,420px)] gap-4 rounded-[22px] border border-qidra-grayLight bg-white p-5 shadow-[0_28px_70px_rgba(18,20,23,0.18)]">
          <div>
            <p className="text-12 font-semibold uppercase tracking-[0.08em] text-qidra-accent">{isRu ? "Qidra support" : "Qidra support"}</p>
            <h2 className="mt-2 text-24 font-medium text-qidra-dark">{isRu ? "Напишите нам" : "Message us"}</h2>
            <p className="mt-2 text-14 text-qidra-grayBlue">
              {thread
                ? isRu
                  ? "Диалог сохранён в этом браузере. Продолжайте переписку здесь."
                  : "This conversation is saved in this browser. Continue chatting here."
                : isRu
                  ? "Если не получается войти в кабинет, напишите сюда. Команда поддержки увидит сообщение сразу."
                  : "If you cannot access your account, message us here. The support team will see it right away."}
            </p>
          </div>

          {thread?.messages.length ? (
            <div className="grid max-h-72 gap-3 overflow-y-auto rounded-[18px] bg-qidra-grayLight/60 p-3">
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
