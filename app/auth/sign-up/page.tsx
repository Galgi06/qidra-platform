import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getLocale, type SearchParams } from "@/lib/i18n";

export default async function SignUpPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);

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
                ? "Проверьте свой электронный адрес и подтвердите электронную почту по ссылке из письма."
                : "Check your email address and confirm your account using the link in the message.",
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
          <Checkbox required>
            {locale === "ru"
              ? "Я принимаю условия Qidra, предупреждение о рисках и понимаю, что доходность не гарантируется."
              : "I accept Qidra terms, the risk notice, and understand that returns are not guaranteed."}
          </Checkbox>
          <Button type="submit">{locale === "ru" ? "Создать аккаунт" : "Create account"}</Button>
        </FeedbackForm>
      </main>
      <Footer locale={locale} />
    </>
  );
}
