import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Footer } from "@/components/Footer";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ProjectCard } from "@/components/ProjectCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { ButtonLink } from "@/components/ui/Button";
import { canAccessAdmin } from "@/lib/auth";
import { dictionary, getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { authOptions } from "@/lib/next-auth";
import { getPublicProjects } from "@/lib/project-catalog";

export const dynamic = "force-dynamic";

type SessionWithRole = Awaited<ReturnType<typeof getServerSession>> & {
  user?: {
    role?: string;
  };
};

export default async function Home({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const t = dictionary[locale];
  const isRu = locale === "ru";
  const [session, projects] = await Promise.all([(getServerSession(authOptions) as Promise<SessionWithRole>), getPublicProjects()]);
  const signedIn = Boolean(session?.user);
  const adminSession = canAccessAdmin(session?.user?.role as "ADMIN" | "SUPER_ADMIN" | "guest" | undefined);
  const accountHref = adminSession ? "/admin" : "/investor";

  return (
    <>
      <main className="premium-page">
        <section className="relative mx-3 mt-3 overflow-hidden rounded-b-[24px] bg-qidra-dark text-white sm:mx-4 lg:mx-6">
          <Image
            src="/assets/hero/qidra-hero-blue.png"
            alt={isRu ? "Визуал Qidra для международных халяльных проектов" : "Qidra visual for international halal projects"}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[58%_center]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(18,20,23,0.98)_0%,rgba(6,63,55,0.88)_42%,rgba(79,70,229,0.44)_70%,rgba(18,20,23,0.12)_100%)]" />
          <div className="relative z-10 mx-auto max-w-[1840px] px-5 py-6 sm:px-8 lg:px-11">
            <div className="grid gap-4 border-b border-white/60 pb-5 sm:flex sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3">
                <Link href={withLocale("/", locale)} className="text-[30px] font-semibold leading-none text-white sm:text-[34px]" aria-label="Qidra">
                  Qidra
                </Link>
                <div className="sm:hidden">
                  <LanguageSwitcher locale={locale} path="/" tone="dark" />
                </div>
              </div>
              <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center sm:gap-3">
                <div className="hidden sm:block">
                  <LanguageSwitcher locale={locale} path="/" tone="dark" />
                </div>
                {signedIn ? (
                  <>
                    <ButtonLink href={withLocale(accountHref, locale)} variant="white" size="sm" className="h-11 min-w-0 px-3 text-14 sm:min-w-44 sm:px-6 sm:text-16">
                      {adminSession ? (isRu ? "Операционный центр" : "Operations") : isRu ? "Профиль" : "Profile"}
                    </ButtonLink>
                    <SignOutButton callbackUrl={withLocale("/", locale)} label={isRu ? "Выход" : "Sign out"} className="h-11 min-w-0 px-3 text-14 sm:px-4 sm:text-16" />
                  </>
                ) : (
                  <>
                    <ButtonLink href={withLocale("/auth/sign-up", locale)} variant="white" size="sm" className="h-11 min-w-0 px-3 text-14 sm:min-w-44 sm:px-6 sm:text-16">
                      {t.nav.signUp}
                    </ButtonLink>
                    <ButtonLink href={withLocale("/auth/sign-in", locale)} size="sm" className="h-11 min-w-0 border-white/16 bg-white/14 px-3 text-14 text-white hover:bg-white/22 sm:min-w-32 sm:px-6 sm:text-16">
                      {t.nav.signIn}
                    </ButtonLink>
                  </>
                )}
              </div>
            </div>

            <div className="grid min-h-[620px] items-center py-12 sm:min-h-[680px] lg:min-h-[720px] lg:py-14">
              <div className="grid max-w-[980px] gap-7">
                <span className="section-kicker border-white/18 bg-white/10 text-white">{isRu ? "Проверенные проекты · защищённая инфраструктура" : "Reviewed projects · protected infrastructure"}</span>
                <h1 className="whitespace-pre-line text-[40px] font-medium leading-[1.08] tracking-[0] text-white sm:text-[54px] lg:text-[66px] xl:text-[72px]">
                  {t.hero.title}
                </h1>
                <p className="max-w-[680px] text-[22px] leading-[1.35] text-white/88 sm:text-[28px]">{t.hero.subtitle}</p>
                <ButtonLink href={withLocale("/projects", locale)} variant="white" className="mt-8 h-14 w-full max-w-[520px] text-18 sm:h-[64px] lg:mt-14">
                  {isRu ? "Перейти к проектам" : "Go to projects"}
                </ButtonLink>
                <div className="grid max-w-[760px] gap-3 pt-2 sm:grid-cols-3">
                  <HeroSignalTile label={isRu ? "ПРОВЕРКА" : "REVIEW"} value={isRu ? "Отбор проектов" : "Project screening"} />
                  <HeroSignalTile label={isRu ? "ДОКУМЕНТЫ" : "DOCUMENTS"} value={isRu ? "Условия открыты" : "Clear terms"} />
                  <HeroSignalTile label={isRu ? "КАБИНЕТ" : "WORKSPACE"} value={isRu ? "Статусы и связь" : "Status and support"} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:px-11 lg:py-28">
          <div className="mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-start">
            <div className="grid content-start gap-7 pt-2">
              <h2 className="max-w-4xl text-[44px] font-medium leading-[1.14] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                {isRu ? "Международные проекты доступны каждому" : "International projects open to every participant"}
              </h2>
              <p className="max-w-3xl text-[22px] leading-[1.35] text-qidra-dark sm:text-[28px]">
                {isRu ? "Платформа объединяет предпринимателей и партнёров из разных стран" : "The platform connects entrepreneurs and partners from different countries"}
              </p>
            </div>
            <div className="premium-card grid min-h-[360px] content-between overflow-hidden p-7 sm:p-10 lg:min-h-[430px] lg:p-12">
              <div>
                <span className="section-kicker">{isRu ? "Как устроена платформа" : "How the platform works"}</span>
                <h3 className="mt-8 max-w-2xl text-[32px] font-medium leading-[1.14] tracking-[0] text-qidra-dark sm:text-[42px]">
                  {isRu ? "От заявки до сопровождения в одном рабочем контуре" : "From application to support in one operating flow"}
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <InsightTile title={isRu ? "Отбор" : "Review"} text={isRu ? "Проект проходит первичную проверку" : "Projects pass an initial review"} />
                <InsightTile title={isRu ? "Документы" : "Documents"} text={isRu ? "Условия и материалы доступны участникам" : "Terms and materials are available to participants"} />
                <InsightTile title={isRu ? "Кабинет" : "Workspace"} text={isRu ? "Заявки, статусы и связь в профиле" : "Applications, statuses and support in profile"} />
              </div>
            </div>
          </div>
          <div className="mx-auto mt-8 grid max-w-[1840px] gap-8 lg:grid-cols-2">
            <FeaturePanel
              tone="blue"
              title={isRu ? "Разные направления для партнёрских проектов" : "Different sectors for partnership projects"}
              text={
                isRu
                  ? "Выбирайте инициативы по направлению и масштабу: от локальных компаний до международного сотрудничества."
                  : "Choose initiatives by sector and scale, from local companies to international cooperation."
              }
            />
            <FeaturePanel
              title={isRu ? "Комплексная экспертиза каждого проекта" : "Comprehensive review for every project"}
              text={
                isRu
                  ? "Юридическая, экономическая и шариатская экспертиза помогает участникам понимать правила и структуру сотрудничества."
                  : "Legal, economic, and Sharia review helps participants understand the rules and cooperation structure."
              }
            />
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-11 lg:pb-28">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <h2 className="text-[44px] font-medium leading-[1.12] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                {isRu ? "Халяльность и безопасность" : "Halal principles and safety"}
              </h2>
              <p className="mt-6 max-w-5xl text-[22px] leading-[1.35] text-qidra-dark sm:text-[28px]">
                {isRu
                  ? "Каждый проект проходит экспертную проверку и сопровождается на всех этапах реализации"
                  : "Every project goes through expert review and is supported throughout implementation"}
              </p>
            </div>
            <div className="grid gap-8 lg:grid-cols-2">
              <FeaturePanel
                title={isRu ? "Юридическая экспертиза" : "Legal review"}
                text={isRu ? "Анализ документов и договорных условий для соблюдения правовых требований." : "Analysis of documents and contract terms for legal compliance."}
              />
              <FeaturePanel
                title={isRu ? "Экономическая оценка проекта" : "Economic project assessment"}
                text={
                  isRu
                    ? "Проверка модели реализации, прозрачности отчётности и согласованных условий взаимодействия."
                    : "Review of the operating model, reporting transparency, and agreed cooperation terms."
                }
              />
            </div>
            <div className="grid gap-8 lg:grid-cols-[0.98fr_1fr]">
              <FeaturePanel
                tone="blue"
                title={isRu ? "Соответствие шариату" : "Sharia compliance"}
                text={
                  isRu
                    ? "Шариатский совет Qidra контролирует проекты на этапах отбора, раскрытия условий и сопровождения."
                    : "The Qidra Sharia board oversees project selection, condition disclosure, and ongoing support."
                }
              />
              <div className="premium-card p-7 sm:p-10">
                <PrincipleItem title={isRu ? "Риба" : "Riba"} text={isRu ? "Исключение фиксированных обязательных начислений" : "Exclusion of fixed mandatory accruals"} />
                <PrincipleItem
                  title={isRu ? "Гарар" : "Gharar"}
                  text={isRu ? "Недопустимы неопределённость, скрытая информация или неясные условия сотрудничества" : "Uncertainty, hidden information, and unclear cooperation terms are not accepted"}
                />
                <PrincipleItem title={isRu ? "Мейсир" : "Maysir"} text={isRu ? "Исключаются азартные и спекулятивные механизмы" : "Gambling and speculative mechanisms are excluded"} last />
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-11 lg:pb-28">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-[44px] font-medium leading-[1.12] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
                  {isRu ? "Открытые проекты" : "Open projects"}
                </h2>
                <p className="mt-5 max-w-4xl text-[22px] leading-[1.35] text-qidra-grayBlue sm:text-[26px]">
                  {isRu
                    ? "На главной доступны те же опубликованные проекты, документы и описания, которые участник видит в каталоге."
                    : "The home page shows the same published projects, documents and descriptions available in the participant catalog."}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href={withLocale("/projects", locale)} variant="outline" className="h-12">
                  {isRu ? "Весь каталог" : "Full catalog"}
                </ButtonLink>
                <ButtonLink href={withLocale("/investor/projects/new", locale)} className="h-12">
                  {isRu ? "Разместить проект" : "List project"}
                </ButtonLink>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <HomeSectorCard
                title={isRu ? "Недвижимость" : "Real estate"}
                text={isRu ? "Девелопмент, доходные объекты и партнёрские сделки с недвижимостью." : "Development, income assets and real-estate partnership deals."}
                href={withLocale("/projects?sector=real-estate", locale)}
              />
              <HomeSectorCard
                title={isRu ? "Торговля" : "Trade"}
                text={isRu ? "Закупки, поставки, международная торговля и оборотные контракты." : "Procurement, supply, international trade and working-capital contracts."}
                href={withLocale("/projects?sector=trade", locale)}
              />
              <HomeSectorCard
                title={isRu ? "Металлургия и сырьё" : "Metallurgy and resources"}
                text={isRu ? "Проекты добычи, переработки, производства и поставок сырья." : "Mining, processing, production and resource supply projects."}
                href={withLocale("/projects?sector=metallurgy", locale)}
              />
              <HomeSectorCard
                title={isRu ? "Медицина и технологии" : "Healthcare and technology"}
                text={isRu ? "Медицинские, цифровые и технологические инициативы." : "Healthcare, digital and technology initiatives."}
                href={withLocale("/projects?sector=healthcare", locale)}
              />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {projects.slice(0, 2).map((project) => (
                <ProjectCard key={project.slug} project={project} locale={locale} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-11 lg:pb-28">
          <div className="mx-auto max-w-[1840px]">
            <h2 className="text-[44px] font-medium leading-[1.12] tracking-[0] text-qidra-dark sm:text-[58px] lg:text-[72px]">
              {isRu ? "Быстрый старт для бизнеса" : "Fast start for business"}
            </h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-3">
              <StepCard
                title={isRu ? "Оставьте заявку с описанием идеи" : "Submit an application with your idea"}
                items={
                  isRu
                    ? ["Экспертная оценка проекта", "Поддержка команды Qidra при подготовке проекта к размещению"]
                    : ["Expert project assessment", "Qidra team support while preparing the project for publication"]
                }
                action={isRu ? "Создать проект" : "Create project"}
                href={withLocale(signedIn ? "/investor/projects/new" : "/auth/sign-up", locale)}
              />
              <StepCard
                title={isRu ? "Получите поддержку международного сообщества" : "Get support from an international community"}
                items={
                  isRu
                    ? ["Проект становится доступным широкой аудитории участников", "Платформа обеспечивает структурированное и прозрачное взаимодействие сторон"]
                    : ["The project becomes available to a wide participant audience", "The platform provides structured and transparent cooperation"]
                }
              />
              <StepCard
                title={isRu ? "Реализуйте цели своего бизнеса" : "Reach your business goals"}
                items={
                  isRu
                    ? ["Привлечение партнёров для реализации бизнес-задач", "Прямое взаимодействие с участниками проекта через платформу"]
                    : ["Attract partners to carry out business goals", "Direct interaction with project participants through the platform"]
                }
              />
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-11 lg:pb-28">
          <div className="premium-dark-panel mx-auto grid max-w-[1840px] gap-8 p-7 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14">
            <div>
              <h2 className="text-[34px] font-medium leading-[1.15] tracking-[0] sm:text-[44px]">
                {isRu ? "Откройте каталог проектов Qidra" : "Open the Qidra project catalog"}
              </h2>
              <p className="mt-4 max-w-3xl text-20 text-white/82">
                {isRu
                  ? "Выберите подходящее направление, изучите условия и перейдите к заявке через страницу проекта."
                  : "Choose a suitable sector, review the terms, and proceed to the application from the project page."}
              </p>
            </div>
            <ButtonLink href={withLocale("/projects", locale)} variant="white" className="h-14 min-w-56">
              {isRu ? "Перейти к проектам" : "Go to projects"}
            </ButtonLink>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function FeaturePanel({ title, text, tone = "light" }: { title: string; text: string; tone?: "light" | "blue" }) {
  const isBlue = tone === "blue";

  return (
    <article className={`min-h-[330px] overflow-hidden p-7 sm:p-10 lg:p-12 ${isBlue ? "premium-dark-panel text-white" : "premium-card text-qidra-dark"}`}>
      <h3 className="max-w-3xl text-[30px] font-medium leading-[1.15] tracking-[0] sm:text-[38px]">{title}</h3>
      <p className={`mt-7 max-w-3xl text-20 sm:text-[24px] ${isBlue ? "text-white/84" : "text-qidra-grayBlue"}`}>{text}</p>
    </article>
  );
}

function HomeSectorCard({ href, text, title }: { href: string; text: string; title: string }) {
  return (
    <Link className="premium-card grid min-h-[190px] content-between p-6 transition-transform duration-150 hover:-translate-y-0.5" href={href}>
      <div>
        <h3 className="text-[26px] font-medium leading-tight text-qidra-dark">{title}</h3>
        <p className="mt-3 text-16 text-qidra-grayBlue">{text}</p>
      </div>
      <span className="mt-6 text-15 font-medium text-qidra-accent">Qidra →</span>
    </Link>
  );
}

function InsightTile({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-qidra bg-qidra-grayLight p-4 shadow-[inset_0_0_0_1px_rgba(18,20,23,0.06)]">
      <p className="text-13 font-semibold uppercase text-qidra-accent">{title}</p>
      <p className="mt-3 text-15 leading-snug text-qidra-grayBlue">{text}</p>
    </div>
  );
}

function HeroSignalTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-24 rounded-qidra border border-white/18 bg-white/12 p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <p className="text-12 font-semibold text-white/66">{label}</p>
      <p className="mt-3 text-[20px] font-semibold leading-tight text-white">{value}</p>
    </div>
  );
}

function PrincipleItem({ title, text, last = false }: { title: string; text: string; last?: boolean }) {
  return (
    <div className={`grid grid-cols-[44px_1fr] gap-5 py-6 ${last ? "" : "border-b border-qidra-grayMedium/25"}`}>
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-qidra-accent text-white">
        <CrossIcon />
      </div>
      <div>
        <h3 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{title}</h3>
        <p className="mt-2 text-20 text-qidra-grayBlue">{text}</p>
      </div>
    </div>
  );
}

function StepCard({ title, items, action, href }: { title: string; items: string[]; action?: string; href?: string }) {
  return (
    <article className="premium-card relative grid min-h-[480px] content-start p-7 sm:p-10">
      <div className="absolute right-[-28px] top-12 hidden h-24 w-24 items-center justify-center rounded-full bg-white text-[62px] leading-none text-qidra-accent shadow-qidra lg:flex">
        <ArrowIcon />
      </div>
      <h3 className="max-w-md text-[30px] font-medium leading-[1.15] tracking-[0] text-qidra-dark sm:text-[36px]">{title}</h3>
      <ul className="mt-10 grid gap-6 text-20 leading-[1.35] text-qidra-grayBlue">
        {items.map((item) => (
          <li key={item} className="grid grid-cols-[22px_1fr] gap-4">
            <span aria-hidden="true">-</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {action && href ? (
        <ButtonLink href={href} className="mt-auto h-14 w-full">
          {action}
        </ButtonLink>
      ) : null}
    </article>
  );
}

function CrossIcon() {
  return (
    <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 28 28">
      <path d="m7 7 14 14M21 7 7 21" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" className="size-14" fill="none" viewBox="0 0 56 56">
      <path d="M12 28h29M30 16l12 12-12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
    </svg>
  );
}
