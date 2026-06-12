import { SignInForm } from "@/components/auth/SignInForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { getSocialAuthConfig } from "@/lib/social-auth";
import { readParam } from "@/lib/tokens";

type SignInSearchParams = SearchParams & {
  blocked?: string | string[];
  error?: string | string[];
  next?: string | string[];
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/investor";
  }

  return value;
}

export default async function SignInPage({ searchParams }: { searchParams?: Promise<SignInSearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const nextPath = safeNextPath(readParam(params?.next));
  const blocked = readParam(params?.blocked) === "1" || readParam(params?.error) === "AccessDenied";
  const socialAuth = getSocialAuthConfig();

  return (
    <>
      <Header locale={locale} path="/auth/sign-in" />
      <main className="section">
        {blocked ? (
          <div className="container-qidra mb-5 max-w-md">
            <NotificationCard
              title={locale === "ru" ? "Доступ ограничен" : "Access restricted"}
              text={
                locale === "ru"
                  ? "Аккаунт временно или постоянно заблокирован администратором. Обратитесь в поддержку Qidra для уточнения статуса."
                  : "The account has been temporarily or permanently blocked by an administrator. Contact Qidra support to clarify the status."
              }
            />
          </div>
        ) : null}
        <SignInForm googleEnabled={socialAuth.googleEnabled} locale={locale} nextPath={nextPath} telegramEnabled={socialAuth.telegramEnabled} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
