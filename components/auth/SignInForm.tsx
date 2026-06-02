"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState, type FormEvent } from "react";
import { FeedbackPopup, type FeedbackMessage } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";

export function SignInForm({ locale, nextPath }: { locale: Locale; nextPath: string }) {
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

    window.setTimeout(() => {
      window.location.href = nextPath;
    }, 350);
  }

  return (
    <>
      <form aria-busy={loading} className="container-qidra grid max-w-md gap-5" onSubmit={handleSubmit}>
        <h1 className="subtitle-28">{locale === "ru" ? "Вход" : "Sign in"}</h1>
        <Input label="Email" name="email" type="email" placeholder="name@example.com" required />
        <Input label={locale === "ru" ? "Пароль" : "Password"} name="password" type="password" placeholder="********" required />
        <Button loading={loading} type="submit">
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
