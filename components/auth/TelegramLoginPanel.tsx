"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { FeedbackPopup, type FeedbackMessage } from "@/components/ActionFeedback";
import type { Locale } from "@/lib/i18n";

type TelegramPayload = {
  auth_date: number;
  first_name?: string;
  hash: string;
  id: number;
  last_name?: string;
  photo_url?: string;
  username?: string;
};

declare global {
  interface Window {
    qidraTelegramAuth?: (user: TelegramPayload) => void;
  }
}

export function TelegramLoginPanel({ botUsername, locale, nextPath }: { botUsername: string; locale: Locale; nextPath: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const isRu = locale === "ru";

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    window.qidraTelegramAuth = async (user) => {
      const result = await signIn("telegram", {
        auth_date: String(user.auth_date),
        first_name: user.first_name ?? "",
        hash: user.hash,
        id: String(user.id),
        last_name: user.last_name ?? "",
        photo_url: user.photo_url ?? "",
        redirect: false,
        username: user.username ?? ""
      });

      if (!result?.ok) {
        setFeedback({
          title: isRu ? "Не удалось войти через Telegram" : "Could not sign in with Telegram",
          text: isRu ? "Попробуйте ещё раз или используйте вход по email." : "Try again or use email sign-in.",
          buttonLabel: isRu ? "Понятно" : "Got it",
          dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
          tone: "error"
        });
        return;
      }

      window.location.href = nextPath;
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "qidraTelegramAuth(user)");
    container.appendChild(script);

    return () => {
      delete window.qidraTelegramAuth;
      container.innerHTML = "";
    };
  }, [botUsername, isRu, nextPath]);

  return (
    <>
      <div className="grid gap-5 rounded-[20px] bg-qidra-grayLight p-6 text-center sm:p-8">
        <div>
          <h1 className="subtitle-28">{isRu ? "Вход через Telegram" : "Telegram sign-in"}</h1>
          <p className="mt-3 text-16 text-qidra-grayBlue">
            {isRu
              ? "Подтвердите вход в Telegram. После подтверждения Qidra откроет ваш кабинет."
              : "Confirm the login in Telegram. After confirmation, Qidra will open your cabinet."}
          </p>
        </div>
        <div ref={containerRef} className="flex min-h-12 justify-center" />
      </div>
      {feedback ? <FeedbackPopup feedback={feedback} onClose={() => setFeedback(null)} /> : null}
    </>
  );
}
