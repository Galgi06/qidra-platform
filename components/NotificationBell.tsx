"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

type NotificationItem = {
  bodyEn: string;
  bodyRu: string;
  createdAt: string;
  href: string | null;
  id: string;
  readAt: string | null;
  titleEn: string;
  titleRu: string;
  type: string;
};

type NotificationResponse = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export function NotificationBell({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNotifications() {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as NotificationResponse;
        if (!cancelled) {
          setItems(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        // Notification polling is intentionally quiet.
      }
    }

    loadNotifications();
    const intervalId = window.setInterval(loadNotifications, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  async function markRead(id?: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true })
    }).catch(() => null);

    setItems((current) => current.map((item) => (!id || item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)));
    setUnreadCount((count) => (id ? Math.max(0, count - 1) : 0));
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        aria-expanded={open}
        aria-label={isRu ? "Уведомления" : "Notifications"}
        className="relative flex size-10 items-center justify-center rounded-qidra border border-qidra-grayLight bg-white text-qidra-dark transition-colors hover:border-qidra-accent hover:text-qidra-accent"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <BellIcon />
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-qidra-red px-1 text-[11px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-[min(92vw,420px)] rounded-[18px] border border-qidra-grayLight bg-white p-4 shadow-qidra">
          <div className="flex items-center justify-between gap-4">
            <p className="text-18 font-semibold text-qidra-dark">{isRu ? "Уведомления" : "Notifications"}</p>
            <button className="text-13 font-medium text-qidra-accent" onClick={() => markRead()} type="button">
              {isRu ? "Прочитать все" : "Mark all read"}
            </button>
          </div>
          <div className="mt-3 max-h-[420px] overflow-y-auto">
            {items.length ? (
              <div className="grid gap-2">
                {items.map((item) => {
                  const unread = !item.readAt;
                  const href = item.href ? withLocale(item.href, locale) : null;
                  const content = (
                    <div className={`rounded-[14px] border p-3 text-left transition-colors ${unread ? "border-qidra-red/50 bg-qidra-red/5" : "border-qidra-grayLight bg-white"}`}>
                      <div className="flex items-start gap-2">
                        {unread ? <span className="mt-2 size-2 shrink-0 rounded-full bg-qidra-red" /> : null}
                        <div className="min-w-0">
                          <p className={`text-14 ${unread ? "font-semibold text-qidra-dark" : "font-medium text-qidra-grayBlue"}`}>{isRu ? item.titleRu : item.titleEn}</p>
                          <p className={`mt-1 text-13 ${unread ? "text-qidra-red" : "text-qidra-grayBlue"}`}>{isRu ? item.bodyRu : item.bodyEn}</p>
                          <p className="mt-2 text-12 text-qidra-grayMedium">{formatNotificationDate(item.createdAt, locale)}</p>
                        </div>
                      </div>
                    </div>
                  );

                  return href ? (
                    <Link key={item.id} href={href} onClick={() => markRead(item.id)}>
                      {content}
                    </Link>
                  ) : (
                    <button key={item.id} onClick={() => markRead(item.id)} type="button">
                      {content}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-[14px] bg-qidra-grayLight p-4 text-14 text-qidra-grayBlue">{isRu ? "Новых уведомлений пока нет." : "No notifications yet."}</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BellIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M15 17H9m9-1v-5a6 6 0 1 0-12 0v5l-2 2h20l-2-2ZM10 20h4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function formatNotificationDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(new Date(value));
}
