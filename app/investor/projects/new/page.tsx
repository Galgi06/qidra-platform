import { FileUpload } from "@/components/FileUpload";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorTabs } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function NewProjectSubmissionPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor/projects/new");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const [latestKyc, recentSubmissions] = await Promise.all([
    prisma.kycApplication.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.projectSubmission.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);
  const approved = latestKyc?.status === "APPROVED";

  return (
    <>
      <Header locale={locale} path="/investor/projects/new" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Профиль участника" : "Participant profile"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Разместить свой проект" : "List your project"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Опишите инициативу, приложите документы и отправьте проект на первичную проверку Qidra перед публикацией в каталоге."
                  : "Describe the initiative, attach documents and send the project for Qidra's initial review."}
              </p>
            </div>
            <InvestorTabs activePath="/investor/projects/new" locale={locale} />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[1fr_0.48fr]">
            <FeedbackForm
              className="grid gap-6 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8"
              endpoint={`/api/investor/project-submissions?lang=${locale}`}
              feedback={{
                title: isRu ? "Проект отправлен" : "Project submitted",
                text:
                  isRu
                    ? "Заявка на размещение проекта отправлена команде Qidra. После первичной проверки статус появится в профиле."
                    : "Your project listing application was sent to the Qidra team. Its status will appear in your profile after initial review.",
                buttonLabel: isRu ? "Понятно" : "Got it",
                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              payload="form-data"
              popupPlacement="center"
              reloadOnSuccess
            >
              <fieldset className="grid gap-6" disabled={!approved}>
                <div>
                  <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Информация о проекте" : "Project information"}</h2>
                  <p className="mt-3 max-w-2xl text-16 text-qidra-grayBlue">
                    {isRu
                      ? "Чем подробнее описание и документы, тем быстрее команда сможет провести первичный отбор."
                      : "The more complete the description and documents, the faster the team can complete initial screening."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label={isRu ? "Название проекта" : "Project title"} name="title" placeholder={isRu ? "Например: Производство халяльной продукции" : "Example: Halal product manufacturing"} required />
                  <Select
                    label={isRu ? "Отрасль" : "Sector"}
                    name="sector"
                    options={[
                      { value: "", label: isRu ? "Выберите" : "Select" },
                      { value: "real-estate", label: isRu ? "Недвижимость" : "Real estate" },
                      { value: "trade", label: isRu ? "Торговля" : "Trade" },
                      { value: "production", label: isRu ? "Производство" : "Production" },
                      { value: "technology", label: isRu ? "Технологии" : "Technology" },
                      { value: "logistics", label: isRu ? "Логистика" : "Logistics" },
                      { value: "other", label: isRu ? "Другое" : "Other" }
                    ]}
                  />
                  <Input label={isRu ? "Страна / город реализации" : "Country / city"} name="location" placeholder={isRu ? "ОАЭ, Дубай" : "UAE, Dubai"} />
                  <Input label={isRu ? "Целевой объём, USDT" : "Target amount, USDT"} name="targetUsdt" inputMode="decimal" placeholder="100000" />
                  <Select
                    label={isRu ? "Предполагаемая структура" : "Expected structure"}
                    name="structure"
                    options={[
                      { value: "", label: isRu ? "Команда Qidra определит после проверки" : "Qidra team will define after review" },
                      { value: "Mudaraba", label: "Mudaraba" },
                      { value: "Musharaka", label: "Musharaka" }
                    ]}
                  />
                  <Input
                    label={isRu ? "Ожидаемая модель результата" : "Expected result model"}
                    name="expectedReturn"
                    placeholder={isRu ? "Например: доля прибыли по итогам периода" : "Example: profit share by period"}
                  />
                </div>
                <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                  {isRu ? "Подробное описание проекта" : "Detailed project description"}
                  <textarea
                    className="min-h-[220px] rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
                    maxLength={5000}
                    minLength={40}
                    name="summary"
                    placeholder={
                      isRu
                        ? "Опишите бизнес-модель, стадию проекта, участников, активы, предполагаемую структуру сотрудничества, риски и документы, которые подтверждают проект."
                        : "Describe the business model, project stage, parties, assets, expected cooperation structure, risks and documents supporting the project."
                    }
                    required
                  />
                </label>
                <FileUpload
                  hint={
                    isRu
                      ? "Презентация, регистрационные документы, финмодель, договоры: PDF/DOCX/XLSX/PPTX/JPG/PNG"
                      : "Presentation, registration documents, financial model, contracts: PDF/DOCX/XLSX/PPTX/JPG/PNG"
                  }
                  label={isRu ? "Документы проекта" : "Project documents"}
                  manyFilesLabel={isRu ? "файла" : "files"}
                  name="documents"
                  selectedLabel={isRu ? "Выбрано" : "Selected"}
                  multiple
                  required
                />
                <Button type="submit" className="w-full sm:w-auto">
                  {isRu ? "Отправить проект на проверку" : "Submit project for review"}
                </Button>
              </fieldset>
            </FeedbackForm>

            <aside className="grid content-start gap-5">
              {!approved ? (
                <NotificationCard
                  title={isRu ? "Сначала завершите проверку" : "Complete review first"}
                  text={
                    isRu
                      ? "Размещение собственного проекта доступно после одобрения профиля и документов участника."
                      : "Listing your own project is available after participant profile and documents are approved."
                  }
                  tone="warning"
                />
              ) : null}
              {recentSubmissions.length ? (
                <section className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                  <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Мои проекты" : "My projects"}</h2>
                  <div className="mt-5 grid gap-3">
                    {recentSubmissions.map((submission) => (
                      <div key={submission.id} className="rounded-[14px] bg-qidra-grayLight p-4">
                        <p className="font-medium text-qidra-dark">{submission.title}</p>
                        <p className="mt-1 text-14 text-qidra-grayBlue">{submissionStatusLabel(submission.status, locale)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className="rounded-[20px] bg-qidra-grayLight p-6 sm:p-8">
                <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Что подготовить" : "What to prepare"}</h2>
                <div className="mt-5 grid gap-4 text-16 text-qidra-grayBlue">
                  <CheckItem text={isRu ? "Описание бизнес-модели и этапа проекта" : "Business model and project stage description"} />
                  <CheckItem text={isRu ? "Регистрационные и правоустанавливающие документы" : "Registration and title documents"} />
                  <CheckItem text={isRu ? "Финансовую модель или расчёты проекта" : "Financial model or project calculations"} />
                  <CheckItem text={isRu ? "Договоры, лицензии и разрешения, если применимо" : "Contracts, licenses and permits, if applicable"} />
                  <CheckItem text={isRu ? "Информацию о команде и ключевых участниках" : "Information about the team and key parties"} />
                </div>
              </section>
              <ButtonLink href={withLocale("/investor/kyc", locale)} variant="outline" className="h-12">
                {isRu ? "Открыть проверку профиля" : "Open profile review"}
              </ButtonLink>
            </aside>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function submissionStatusLabel(status: string, locale: "ru" | "en") {
  if (status === "APPROVED") return locale === "ru" ? "Одобрено" : "Approved";
  if (status === "REJECTED") return locale === "ru" ? "Отклонено" : "Rejected";
  if (status === "REVIEW") return locale === "ru" ? "На проверке" : "In review";
  return locale === "ru" ? "Отправлено" : "Submitted";
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-qidra-accent" />
      <span>{text}</span>
    </div>
  );
}
