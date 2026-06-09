"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { FeedbackPopup, type FeedbackMessage } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
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
    Telegram?: {
      Login?: {
        auth: (
          options: {
            bot_id: string;
            lang?: string;
            request_access?: string;
          },
          callback: (user: TelegramPayload | false) => void
        ) => void;
      };
    };
  }
}

export function TelegramLoginPanel({ botId, locale, nextPath }: { botId: string; locale: Locale; nextPath: string }) {
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && Boolean(window.Telegram?.Login?.auth));
  const [isSigningIn, setIsSigningIn] = useState(false);
  const isRu = locale === "ru";

  useEffect(() => {
    if (window.Telegram?.Login?.auth) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.onload = () => setScriptReady(Boolean(window.Telegram?.Login?.auth));
    script.onerror = () => {
      setFeedback({
        title: isRu ? "Telegram временно недоступен" : "Telegram is temporarily unavailable",
        text: isRu ? "Не удалось загрузить Telegram. Попробуйте обновить страницу." : "Could not load Telegram. Try refreshing the page.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "error"
      });
    };
    scriptRef.current = script;
    document.body.appendChild(script);

    return () => {
      scriptRef.current?.remove();
      scriptRef.current = null;
    };
  }, [isRu]);

  async function finishTelegramSignIn(user: TelegramPayload | false) {
    if (!user) {
      setIsSigningIn(false);
      return;
    }

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
      setIsSigningIn(false);
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
  }

  function openTelegram() {
    const login = window.Telegram?.Login;

    if (!login?.auth) {
      setFeedback({
        title: isRu ? "Telegram ещё загружается" : "Telegram is still loading",
        text: isRu ? "Подождите пару секунд и попробуйте снова." : "Wait a couple of seconds and try again.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "info"
      });
      return;
    }

    setIsSigningIn(true);
    login.auth(
      {
        bot_id: botId,
        lang: isRu ? "ru" : "en",
        request_access: "write"
      },
      (user) => {
        void finishTelegramSignIn(user);
      }
    );
  }

  return (
    <>
      <div className="grid gap-5 rounded-[20px] bg-qidra-grayLight p-6 text-center sm:p-8">
        <div>
          <h1 className="subtitle-28">{isRu ? "Вход через Telegram" : "Telegram sign-in"}</h1>
          <p className="mt-3 text-16 text-qidra-grayBlue">
            {isRu
              ? "Подтвердите вход в Telegram. После подтверждения Qidra откроет ваш профиль участника."
              : "Confirm the login in Telegram. After confirmation, Qidra will open your participant profile."}
          </p>
        </div>
        <div className="flex min-h-12 justify-center">
          <Button type="button" variant="dark" loading={isSigningIn} loadingLabel={isRu ? "Открываем Telegram..." : "Opening Telegram..."} disabled={!scriptReady} onClick={openTelegram}>
            {scriptReady ? (isRu ? "Войти через Telegram" : "Sign in with Telegram") : isRu ? "Загружаем Telegram..." : "Loading Telegram..."}
          </Button>
        </div>
      </div>
      {feedback ? <FeedbackPopup feedback={feedback} onClose={() => setFeedback(null)} /> : null}
    </>
  );
}
