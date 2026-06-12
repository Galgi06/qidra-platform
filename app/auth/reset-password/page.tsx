import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { passwordPolicyDescription } from "@/lib/password-policy";
import { readParam } from "@/lib/tokens";

type ResetPasswordSearchParams = SearchParams & {
  email?: string | string[];
  token?: string | string[];
};

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<ResetPasswordSearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const email = readParam(params?.email) || "";
  const token = readParam(params?.token) || "";
  const canReset = Boolean(email && token);

  return (
    <>
      <Header locale={locale} path="/auth/reset-password" />
      <main className="section">
        {canReset ? (
          <FeedbackForm
            className="container-qidra grid max-w-md gap-5"
            endpoint={`/api/auth/reset-password?lang=${locale}`}
            feedback={{
              title: locale === "ru" ? "Пароль обновлен" : "Password updated",
              text: locale === "ru" ? "Теперь вы можете войти в Qidra с новым паролем." : "You can now sign in to Qidra with your new password.",
              buttonLabel: locale === "ru" ? "Понятно" : "Got it",
              dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
              tone: "success"
            }}
            resetOnSubmit
          >
            <h1 className="subtitle-28">{locale === "ru" ? "Новый пароль" : "New password"}</h1>
            <input name="email" type="hidden" value={email} />
            <input name="token" type="hidden" value={token} />
            <Input label={locale === "ru" ? "Пароль" : "Password"} name="password" type="password" placeholder="********" required />
            <p className="text-14 text-qidra-grayBlue">{locale === "ru" ? passwordPolicyDescription.ru : passwordPolicyDescription.en}</p>
            <Button type="submit">{locale === "ru" ? "Сохранить пароль" : "Save password"}</Button>
          </FeedbackForm>
        ) : (
          <div className="container-qidra max-w-xl">
            <NotificationCard
              title={locale === "ru" ? "Ссылка недействительна" : "Invalid link"}
              text={locale === "ru" ? "Запросите новую ссылку восстановления пароля." : "Request a new password reset link."}
              tone="error"
            />
          </div>
        )}
      </main>
      <Footer locale={locale} />
    </>
  );
}
