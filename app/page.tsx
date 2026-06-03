import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { ButtonLink } from "@/components/ui/Button";
import { dictionary, getLocale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function Home({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const t = dictionary[locale];
  const isRu = locale === "ru";

  return (
    <>
      <main className="bg-white">
        <section className="relative mx-3 mt-3 overflow-hidden rounded-b-[24px] bg-[#1f14ef] text-white sm:mx-4 lg:mx-6">
          <Image
            src="/assets/hero/qidra-hero-blue.png"
            alt={isRu ? "Визуал Qidra для международных халяльных проектов" : "Qidra visual for international halal projects"}
            fill
            priority
            sizes="100vw"
            className="object-cover object-[58%_center]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,14,205,0.98)_0%,rgba(31,20,239,0.9)_43%,rgba(31,20,239,0.42)_66%,rgba(31,20,239,0.08)_100%)]" />
          <div className="relative z-10 mx-auto max-w-[1840px] px-5 py-6 sm:px-8 lg:px-11">
            <div className="flex items-center justify-between gap-4 border-b border-white/60 pb-5">
              <Link href={withLocale("/", locale)} className="text-[30px] font-semibold leading-none text-white sm:text-[34px]" aria-label="Qidra">
                Qidra
              </Link>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <ButtonLink href={withLocale("/auth/sign-up", locale)} variant="white" size="sm" className="h-11 px-4 sm:min-w-44 sm:px-6">
                  {t.nav.signUp}
                </ButtonLink>
                <ButtonLink href={withLocale("/auth/sign-in", locale)} size="sm" className="h-11 border-white/16 bg-white/14 px-4 text-white hover:bg-white/22 sm:min-w-32 sm:px-6">
                  {t.nav.signIn}
                </ButtonLink>
              </div>
            </div>

            <div className="grid min-h-[620px] items-center py-12 sm:min-h-[680px] lg:min-h-[720px] lg:py-14">
              <div className="grid max-w-[980px] gap-7">
                <h1 className="whitespace-pre-line text-[40px] font-medium leading-[1.08] tracking-[0] text-white sm:text-[54px] lg:text-[66px] xl:text-[72px]">
                  {t.hero.title}
                </h1>
                <p className="max-w-[680px] text-[22px] leading-[1.35] text-white/88 sm:text-[28px]">{t.hero.subtitle}</p>
                <ButtonLink href={withLocale("/projects", locale)} variant="white" className="mt-8 h-14 w-full max-w-[520px] text-18 sm:h-[64px] lg:mt-14">
                  {isRu ? "Перейти к проектам" : "Go to projects"}
                </ButtonLink>
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
            <div className="relative min-h-[360px] overflow-hidden rounded-[20px] bg-[#2418f2] lg:min-h-[430px]">
              <Image
                src="/assets/hero/qidra-hero-blue.png"
                alt={isRu ? "Международные халяльные проекты Qidra" : "Qidra international halal projects"}
                fill
                sizes="(min-width: 992px) 46vw, 100vw"
                className="object-cover object-[78%_center]"
              />
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
              <div className="rounded-[20px] bg-white p-7 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-10">
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
                href={withLocale("/auth/sign-up", locale)}
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
          <div className="mx-auto grid max-w-[1840px] gap-8 rounded-[20px] bg-[#2418f2] p-7 text-white sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center lg:p-14">
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
    <article className={`min-h-[330px] overflow-hidden rounded-[20px] p-7 sm:p-10 lg:p-12 ${isBlue ? "bg-[#2418f2] text-white" : "bg-qidra-grayLight text-qidra-dark"}`}>
      <h3 className="max-w-3xl text-[30px] font-medium leading-[1.15] tracking-[0] sm:text-[38px]">{title}</h3>
      <p className={`mt-7 max-w-3xl text-20 sm:text-[24px] ${isBlue ? "text-white/84" : "text-qidra-grayBlue"}`}>{text}</p>
    </article>
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
    <article className="relative grid min-h-[480px] content-start rounded-[20px] bg-qidra-grayLight p-7 sm:p-10">
      <div className="absolute right-[-28px] top-12 hidden h-24 w-24 items-center justify-center rounded-full bg-white text-[62px] leading-none text-[#2418f2] shadow-qidra lg:flex">
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
