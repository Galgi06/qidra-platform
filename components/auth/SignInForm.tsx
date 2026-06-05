"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { FeedbackPopup, type FeedbackMessage } from "@/components/ActionFeedback";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

export function SignInForm({
  googleEnabled,
  locale,
  nextPath,
  telegramEnabled
}: {
  googleEnabled: boolean;
  locale: Locale;
  nextPath: string;
  telegramEnabled: boolean;
}) {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    setLoading(true);

    const result = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false
    });

    setLoading(false);

    if (!result?.ok) {
      setFeedback({
        title: locale === "ru" ? "Не удалось войти" : "Could not sign in",
        text:
          locale === "ru"
            ? "Проверьте email, пароль и подтверждение электронной почты."
            : "Check your email, password, and email confirmation.",
        buttonLabel: locale === "ru" ? "Понятно" : "Got it",
        dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
        tone: "error"
      });
      return;
    }

    setFeedback({
      title: locale === "ru" ? "Вход выполнен" : "Signed in",
      text: locale === "ru" ? "Сейчас откроется нужная страница." : "The requested page will open now.",
      buttonLabel: locale === "ru" ? "Понятно" : "Got it",
      dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
      tone: "success"
    });

    const targetPath = await resolveTargetPath(nextPath, locale);

    window.setTimeout(() => {
      window.location.href = targetPath;
    }, 350);
  }

  return (
    <>
      <form aria-busy={loading} className="container-qidra grid max-w-md gap-5" onSubmit={handleSubmit}>
        <h1 className="subtitle-28">{locale === "ru" ? "Вход" : "Sign in"}</h1>
        <SocialAuthButtons googleEnabled={googleEnabled} locale={locale} mode="signIn" nextPath={nextPath} telegramEnabled={telegramEnabled} />
        <div className="flex items-center gap-3 text-12 font-medium uppercase text-qidra-grayBlue">
          <span className="h-px flex-1 bg-qidra-grayLight" />
          {locale === "ru" ? "или email" : "or email"}
          <span className="h-px flex-1 bg-qidra-grayLight" />
        </div>
        <Input label="Email" name="email" type="email" placeholder="name@example.com" required />
        <Input label={locale === "ru" ? "Пароль" : "Password"} name="password" type="password" placeholder="********" required />
        <Button loading={loading} loadingLabel={locale === "ru" ? "Входим..." : "Signing in..."} type="submit">
          {locale === "ru" ? "Войти" : "Sign in"}
        </Button>
        <div className="flex justify-between gap-3 text-14 text-qidra-grayBlue">
          <Link href={withLocale("/auth/sign-up", locale)}>{locale === "ru" ? "Регистрация" : "Create account"}</Link>
          <Link href={withLocale("/auth/forgot-password", locale)}>{locale === "ru" ? "Забыли пароль" : "Forgot password"}</Link>
        </div>
      </form>
      {feedback ? <FeedbackPopup feedback={feedback} onClose={() => setFeedback(null)} /> : null}
    </>
  );
}

async function resolveTargetPath(nextPath: string, locale: Locale) {
  if (nextPath !== "/investor") {
    return nextPath;
  }

  try {
    const response = await fetch("/api/auth/session");
    const session = (await response.json()) as { user?: { role?: string } };

    if (session.user?.role === "ADMIN" || session.user?.role === "SUPER_ADMIN") {
      return withLocale("/admin", locale);
    }
  } catch {
    return nextPath;
  }

  return nextPath;
}
