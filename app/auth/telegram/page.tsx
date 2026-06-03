import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { ButtonLink } from "@/components/ui/Button";
import { TelegramLoginPanel } from "@/components/auth/TelegramLoginPanel";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { getSocialAuthConfig } from "@/lib/social-auth";
import { readParam } from "@/lib/tokens";

type TelegramSearchParams = SearchParams & {
  next?: string | string[];
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/investor";
  }

  return value;
}

export default async function TelegramAuthPage({ searchParams }: { searchParams?: TelegramSearchParams | Promise<TelegramSearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const nextPath = safeNextPath(readParam(params?.next));
  const socialAuth = getSocialAuthConfig();

  return (
    <>
      <Header locale={locale} path="/auth/telegram" />
      <main className="section">
        <div className="container-qidra grid max-w-xl gap-5">
          {socialAuth.telegramEnabled ? (
            <TelegramLoginPanel botUsername={socialAuth.telegramBotUsername} locale={locale} nextPath={nextPath} />
          ) : (
            <>
              <NotificationCard
                title={locale === "ru" ? "Telegram ещё не подключён" : "Telegram is not connected yet"}
                text={
                  locale === "ru"
                    ? "Добавьте TELEGRAM_BOT_USERNAME и TELEGRAM_BOT_TOKEN в переменные окружения, затем перезапустите сайт."
                    : "Add TELEGRAM_BOT_USERNAME and TELEGRAM_BOT_TOKEN to environment variables, then restart the site."
                }
                tone="info"
              />
              <ButtonLink href={withLocale("/auth/sign-in", locale)} variant="outline">
                {locale === "ru" ? "Вернуться ко входу" : "Back to sign in"}
              </ButtonLink>
            </>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
