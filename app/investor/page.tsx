import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { UserAvatar } from "@/components/UserAvatar";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function InvestorPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  await requireAuth(locale, "/investor");

  return (
    <>
      <Header locale={locale} path="/investor" />
      <main className="section">
        <div className="container-qidra grid gap-6">
          <div className="flex items-center gap-4">
            <UserAvatar name="Qidra Investor" />
            <div>
              <h1 className="subtitle-28">{locale === "ru" ? "Кабинет участника" : "Participant cabinet"}</h1>
              <p className="text-14 text-qidra-grayBlue">investor@example.com</p>
            </div>
          </div>
          <Tabs
            items={[
              { label: locale === "ru" ? "Профиль" : "Profile", href: withLocale("/investor", locale), active: true },
              { label: locale === "ru" ? "Проверка" : "Review", href: withLocale("/investor/kyc", locale) },
              { label: locale === "ru" ? "Кошелек" : "Wallet", href: withLocale("/investor/wallet", locale) },
              { label: locale === "ru" ? "Участие" : "Participation", href: withLocale("/investor/investments", locale) }
            ]}
          />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="surface p-5">
              <span className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Статус профиля" : "Profile status"}</span>
              <strong className="mt-2 block text-20">{locale === "ru" ? "Черновик" : "Draft"}</strong>
            </div>
            <div className="surface p-5">
              <span className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Баланс" : "Balance"}</span>
              <strong className="mt-2 block text-20">0 USDT</strong>
            </div>
            <div className="surface p-5">
              <span className="text-14 text-qidra-grayBlue">{locale === "ru" ? "Активные заявки" : "Active applications"}</span>
              <strong className="mt-2 block text-20">0</strong>
            </div>
          </div>
          <NotificationCard
            title={locale === "ru" ? "Следующий шаг" : "Next step"}
            text={locale === "ru" ? "Заполните профиль перед созданием заявки на участие." : "Complete your profile before creating a participation application."}
          />
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
