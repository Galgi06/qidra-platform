"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { FeedbackPopup, type FeedbackMessage } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import type { Locale } from "@/lib/i18n";

type SocialAuthButtonsProps = {
  googleEnabled: boolean;
  locale: Locale;
  mode: "signIn" | "signUp";
  nextPath: string;
  telegramEnabled: boolean;
};

export function SocialAuthButtons({ googleEnabled, locale, mode, nextPath, telegramEnabled }: SocialAuthButtonsProps) {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const isRu = locale === "ru";

  function showDisabledFeedback(provider: "Google" | "Telegram") {
    setFeedback({
      title: isRu ? `${provider} ещё не подключён` : `${provider} is not connected yet`,
      text:
        provider === "Google"
          ? isRu
            ? "Добавьте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET в переменные окружения, затем перезапустите сайт."
            : "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables, then restart the site."
          : isRu
            ? "Добавьте TELEGRAM_BOT_USERNAME и TELEGRAM_BOT_TOKEN в переменные окружения, затем перезапустите сайт."
            : "Add TELEGRAM_BOT_USERNAME and TELEGRAM_BOT_TOKEN to environment variables, then restart the site.",
      buttonLabel: isRu ? "Понятно" : "Got it",
      dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
      tone: "info"
    });
  }

  function openTelegram() {
    const params = new URLSearchParams({ lang: locale, next: nextPath });
    window.location.href = `/auth/telegram?${params.toString()}`;
  }

  const googleLabel =
    mode === "signUp"
      ? isRu
        ? "Регистрация через Google"
        : "Sign up with Google"
      : isRu
        ? "Вход через Google"
        : "Sign in with Google";
  const telegramLabel =
    mode === "signUp"
      ? isRu
        ? "Регистрация через Telegram"
        : "Sign up with Telegram"
      : isRu
        ? "Вход через Telegram"
        : "Sign in with Telegram";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          aria-label={googleLabel}
          className="h-12 gap-3 bg-white"
          onClick={() => {
            if (!googleEnabled) {
              showDisabledFeedback("Google");
              return;
            }

            void signIn("google", { callbackUrl: nextPath });
          }}
          type="button"
          variant="outline"
        >
          <GoogleIcon />
          Google
        </Button>
        <Button
          aria-label={telegramLabel}
          className="h-12 gap-3 bg-white"
          onClick={() => {
            if (!telegramEnabled) {
              showDisabledFeedback("Telegram");
              return;
            }

            openTelegram();
          }}
          type="button"
          variant="outline"
        >
          <TelegramIcon />
          Telegram
        </Button>
      </div>
      {feedback ? <FeedbackPopup feedback={feedback} onClose={() => setFeedback(null)} /> : null}
    </>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path d="M21.6 12.23c0-.77-.07-1.5-.2-2.21H12v4.18h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.5Z" fill="#4285F4" />
      <path d="M12 22c2.7 0 4.97-.9 6.62-2.43l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z" fill="#34A853" />
      <path d="M6.41 13.9a6.02 6.02 0 0 1 0-3.8V7.51H3.06a10 10 0 0 0 0 8.98l3.35-2.59Z" fill="#FBBC05" />
      <path d="M12 5.98c1.47 0 2.8.5 3.84 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.51l3.35 2.59C7.2 7.74 9.4 5.98 12 5.98Z" fill="#EA4335" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="M21 4.4 3.2 11.45c-.95.4-.94 1.75.07 2.02l4.48 1.28 1.72 5.43c.32 1.03 1.63 1.25 2.29.43l2.62-3.25 4.56 3.33c.85.62 2.02.08 2.2-.96l2.16-13.5c.2-1.23-1.06-2.23-2.3-1.83Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="m7.98 14.7 8.6-5.4-6.72 7.56" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}
