import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getLocale, type SearchParams } from "@/lib/i18n";

export default async function ForgotPasswordPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);

  return (
    <>
      <Header locale={locale} path="/auth/forgot-password" />
      <main className="section">
        <FeedbackForm
          className="container-qidra grid max-w-md gap-5"
          endpoint={`/api/auth/forgot-password?lang=${locale}`}
          feedback={{
            title: locale === "ru" ? "Ссылка отправлена" : "Reset link sent",
            text:
              locale === "ru"
                ? "Проверьте электронную почту и перейдите по ссылке для восстановления пароля."
                : "Check your email and follow the link to reset your password.",
            buttonLabel: locale === "ru" ? "Понятно" : "Got it",
            dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
            tone: "success"
          }}
          resetOnSubmit
        >
          <h1 className="subtitle-28">{locale === "ru" ? "Восстановление пароля" : "Password recovery"}</h1>
          <Input label="Email" name="email" type="email" placeholder="name@example.com" required />
          <Button type="submit">{locale === "ru" ? "Отправить ссылку" : "Send reset link"}</Button>
        </FeedbackForm>
      </main>
      <Footer locale={locale} />
    </>
  );
}
