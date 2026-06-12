import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { passwordPolicyDescription } from "@/lib/password-policy";
import { getSocialAuthConfig } from "@/lib/social-auth";

export default async function SignUpPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const socialAuth = getSocialAuthConfig();

  return (
    <>
      <Header locale={locale} path="/auth/sign-up" />
      <main className="section">
        <FeedbackForm
          className="container-qidra grid max-w-lg gap-5"
          endpoint={`/api/auth/register?lang=${locale}`}
          feedback={{
            title: locale === "ru" ? "Регистрация прошла успешно" : "Registration successful",
            text:
              locale === "ru"
                ? "Проверьте свой электронный адрес и подтвердите электронную почту. Ссылка действует 15 минут."
                : "Check your email address and confirm your account. The link is valid for 15 minutes.",
            buttonLabel: locale === "ru" ? "Понятно" : "Got it",
            dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
            tone: "success"
          }}
          resetOnSubmit
        >
          <h1 className="subtitle-28">{locale === "ru" ? "Регистрация участника" : "Participant registration"}</h1>
          <Input label={locale === "ru" ? "Имя" : "Name"} name="name" placeholder={locale === "ru" ? "Ваше имя" : "Your name"} required />
          <Input label="Email" name="email" type="email" placeholder="name@example.com" required />
          <Input label={locale === "ru" ? "Пароль" : "Password"} name="password" type="password" placeholder="********" required />
          <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? passwordPolicyDescription.ru : passwordPolicyDescription.en}</p>
          <Checkbox required>
            {locale === "ru"
              ? "Я принимаю условия Qidra, предупреждение о рисках и понимаю, что доходность не гарантируется."
              : "I accept Qidra terms, the risk notice, and understand that returns are not guaranteed."}
          </Checkbox>
          <Button type="submit">{locale === "ru" ? "Создать аккаунт" : "Create account"}</Button>
          <div className="flex items-center gap-3 text-12 font-medium uppercase text-qidra-grayBlue">
            <span className="h-px flex-1 bg-qidra-grayLight" />
            {locale === "ru" ? "или через Google / Telegram" : "or with Google / Telegram"}
            <span className="h-px flex-1 bg-qidra-grayLight" />
          </div>
          <SocialAuthButtons
            googleEnabled={socialAuth.googleEnabled}
            locale={locale}
            mode="signUp"
            nextPath="/investor"
            telegramEnabled={socialAuth.telegramEnabled}
          />
        </FeedbackForm>
      </main>
      <Footer locale={locale} />
    </>
  );
}
