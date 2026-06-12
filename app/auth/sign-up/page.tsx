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
  const params = await searchParams;
  const locale = await getLocale(searchParams);
  const socialAuth = getSocialAuthConfig();
  const inviteToken = readParam(params?.invite);
  const accountType = readParam(params?.account) === "company" ? "company" : "investor";
  const inviteMode = Boolean(inviteToken);
  const isRu = locale === "ru";

  return (
    <>
      <Header locale={locale} path="/auth/sign-up" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <aside className="premium-card grid content-start gap-6 p-6 sm:p-8">
                <div>
                  <p className="section-kicker">{isRu ? "Qidra onboarding" : "Qidra onboarding"}</p>
                  <h1 className="mt-4 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[52px]">
                    {inviteMode ? (isRu ? "Присоединение к команде компании" : "Join a company team") : isRu ? "Выберите роль на платформе" : "Choose your platform role"}
                  </h1>
                  <p className="mt-4 text-18 text-qidra-grayBlue">
                    {inviteMode
                      ? isRu
                        ? "Вы регистрируетесь по приглашению в кабинет компании. После подтверждения email получите доступ к внутренней рабочей области компании."
                        : "You are registering through a company invitation. After email confirmation you will receive access to the internal company workspace."
                      : isRu
                      ? "Qidra объединяет инвесторов и компании. Частные инвесторы изучают проекты и подают заявки. Компании создают витрину, публикуют продукты и получают лиды."
                      : "Qidra connects investors and companies. Private investors review opportunities and apply. Companies build a profile, publish products, and receive leads."}
                  </p>
                </div>
                <div className="grid gap-4">
                  <RoleCard
                    active={accountType === "investor"}
                    description={isRu ? "Профиль участника, KYC, кошелёк, участие в проектах и прямые заявки." : "Participant profile, KYC, wallet, project participation, and direct applications."}
                    href={`?lang=${locale}&account=investor`}
                    title={isRu ? "Я инвестор / частное лицо" : "I am an investor / individual"}
                  />
                  <RoleCard
                    active={inviteMode || accountType === "company"}
                    description={isRu ? "Кабинет компании, публичный профиль, документы, продуктовые листинги и входящие лиды." : "Company workspace, public profile, documents, product listings, and inbound leads."}
                    href={inviteMode ? `?lang=${locale}&account=company&invite=${encodeURIComponent(inviteToken)}` : `?lang=${locale}&account=company`}
                    title={inviteMode ? (isRu ? "Приглашение в компанию" : "Company invitation") : isRu ? "Я компания / юридическое лицо" : "I am a company / legal entity"}
                  />
                </div>
                <div className="rounded-[18px] bg-qidra-grayLight p-5">
                  <p className="text-15 font-medium text-qidra-dark">{isRu ? "Платформенная логика" : "Platform logic"}</p>
                  <p className="mt-2 text-14 leading-6 text-qidra-grayBlue">
                    {isRu
                      ? "Qidra остаётся информационной и технологической платформой. Компания размещает предложения и принимает лиды, а отношения с клиентами возникают напрямую."
                      : "Qidra remains an informational and technology platform. A company publishes offerings and receives leads, while client relationships arise directly."}
                  </p>
                </div>
              </aside>

              <FeedbackForm
                className="premium-card grid gap-5 p-6 sm:p-8"
                endpoint={`/api/auth/register?lang=${locale}`}
                feedback={{
                  title: isRu ? "Регистрация прошла успешно" : "Registration successful",
                  text:
                    accountType === "company"
                      ? isRu
                        ? "Компания создана в черновике. Подтвердите email, затем заполните профиль компании и загрузите документы."
                        : "The company was created as a draft. Confirm your email, then complete the company profile and upload documents."
                      : isRu
                        ? "Проверьте свой электронный адрес и подтвердите электронную почту. Ссылка действует 15 минут."
                        : "Check your email address and confirm your account. The link is valid for 15 minutes.",
                  buttonLabel: isRu ? "Понятно" : "Got it",
                  dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                  tone: "success"
                }}
                resetOnSubmit
              >
                <input name="accountType" type="hidden" value={inviteMode ? "investor" : accountType} />
                <input name="inviteToken" type="hidden" value={inviteToken} />
                <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">
                  {inviteMode
                    ? isRu
                      ? "Присоединиться к компании"
                      : "Join the company"
                    : accountType === "company"
                    ? isRu
                      ? "Регистрация компании"
                      : "Company registration"
                    : isRu
                      ? "Регистрация участника"
                      : "Participant registration"}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label={isRu ? "Имя" : "Name"} name="name" placeholder={isRu ? "Ваше имя" : "Your name"} required />
                  <Input label="Email" name="email" type="email" placeholder="name@example.com" required />
                  <div className="md:col-span-2">
                    <Input label={isRu ? "Пароль" : "Password"} name="password" type="password" placeholder="********" required />
                  </div>
                  {!inviteMode && accountType === "company" ? (
                    <>
                      <Input label={isRu ? "Юридическое название компании" : "Legal company name"} name="companyName" placeholder={isRu ? "Например: AM Capital LLC-FZ" : "Example: AM Capital LLC-FZ"} required />
                      <Input label={isRu ? "Публичный адрес компании" : "Public company slug"} name="companySlug" placeholder="am-capital" required />
                      <Input label={isRu ? "Страна регистрации" : "Country of registration"} name="companyCountry" placeholder={isRu ? "ОАЭ" : "UAE"} required />
                      <Input label={isRu ? "Ваша роль в компании" : "Your role in the company"} name="companyRole" placeholder={isRu ? "Управляющий партнёр" : "Managing partner"} />
                    </>
                  ) : null}
                </div>
                <p className="text-14 text-qidra-grayBlue">{isRu ? passwordPolicyDescription.ru : passwordPolicyDescription.en}</p>
                <Checkbox required>
                  {accountType === "company"
                    ? isRu
                      ? "Я подтверждаю, что действую от имени компании и понимаю, что Qidra является информационной платформой, а не стороной сделки."
                      : "I confirm that I act on behalf of the company and understand that Qidra is an informational platform, not a transaction counterparty."
                    : isRu
                      ? "Я принимаю условия Qidra, предупреждение о рисках и понимаю, что доходность не гарантируется."
                      : "I accept Qidra terms, the risk notice, and understand that returns are not guaranteed."}
                </Checkbox>
                <Button type="submit">
                  {accountType === "company" ? (isRu ? "Создать кабинет компании" : "Create company workspace") : isRu ? "Создать аккаунт" : "Create account"}
                </Button>
                <div className="flex items-center gap-3 text-12 font-medium uppercase text-qidra-grayBlue">
                  <span className="h-px flex-1 bg-qidra-grayLight" />
                  {isRu ? "или через Google / Telegram" : "or with Google / Telegram"}
                  <span className="h-px flex-1 bg-qidra-grayLight" />
                </div>
                <SocialAuthButtons
                  googleEnabled={socialAuth.googleEnabled}
                  locale={locale}
                  mode="signUp"
                  nextPath={accountType === "company" ? "/company" : "/investor"}
                  telegramEnabled={socialAuth.telegramEnabled}
                />
              </FeedbackForm>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function RoleCard({ active, description, href, title }: { active: boolean; description: string; href: string; title: string }) {
  return (
    <a
      className={`rounded-[18px] p-5 transition-colors ${active ? "bg-qidra-dark text-white" : "bg-white text-qidra-dark shadow-[0_0_0_1px_rgba(18,20,23,0.08)] hover:bg-qidra-grayLight"}`}
      href={href}
    >
      <p className="text-18 font-medium">{title}</p>
      <p className={`mt-2 text-14 leading-6 ${active ? "text-white/72" : "text-qidra-grayBlue"}`}>{description}</p>
    </a>
  );
}
