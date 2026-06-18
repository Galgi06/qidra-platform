import { FileUpload } from "@/components/FileUpload";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorWorkspace } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { ProjectSectorFields, type ProjectSectorInitialValues } from "@/components/ProjectSectorFields";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { getPrimaryOrganizationForUser } from "@/lib/organizations";
import { prisma } from "@/lib/prisma";
import { parseRealEstateData } from "@/lib/real-estate";

export default async function NewProjectSubmissionPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const locale = await getLocale(resolvedSearchParams);
  const session = await requireAuth(locale, "/investor/projects/new");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const editSubmissionId = getSearchParam(resolvedSearchParams, "edit");
  const [latestKyc, recentSubmissions, organization, editableSubmission] = await Promise.all([
    prisma.kycApplication.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.projectSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        projectId: true,
        status: true,
        title: true
      }
    }),
    getPrimaryOrganizationForUser(userId),
    editSubmissionId
      ? prisma.projectSubmission.findFirst({
          where: {
            id: editSubmissionId,
            projectId: { not: null },
            status: "APPROVED",
            userId
          },
          include: {
            project: {
              select: {
                id: true,
                slug: true,
                titleRu: true
              }
            }
          }
        })
      : Promise.resolve(null)
  ]);
  const approved = latestKyc?.status === "APPROVED";
  const editMode = Boolean(editableSubmission?.projectId);
  const initialValues = editableSubmission ? buildInitialValues(editableSubmission, locale) : null;
  const submitFeedback = editMode
    ? {
        title: isRu ? "Изменения отправлены" : "Changes submitted",
        text:
          isRu
            ? "Правки по опубликованному проекту отправлены на повторную модерацию. Публичная карточка обновится после одобрения администратором."
            : "Changes to the published project were sent for moderation. The public listing will update after administrator approval.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success" as const
      }
    : {
        title: isRu ? "Проект отправлен" : "Project submitted",
        text:
          isRu
            ? "Заявка на размещение проекта отправлена команде Qidra. После первичной проверки статус появится в профиле."
            : "Your project listing application was sent to the Qidra team. Its status will appear in your profile after initial review.",
        buttonLabel: isRu ? "Понятно" : "Got it",
        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
        tone: "success" as const
      };

  return (
    <>
      <Header locale={locale} path="/investor/projects/new" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="section-kicker">{isRu ? "Профиль участника" : "Participant profile"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {editMode
                  ? isRu
                    ? "Отредактировать опубликованный проект"
                    : "Edit published project"
                  : organization
                    ? isRu
                      ? "Создать листинг компании"
                      : "Create a company listing"
                    : isRu
                      ? "Разместить свой проект"
                      : "List your project"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {editMode
                  ? isRu
                    ? "Обновите нужные поля и отправьте правки на повторную проверку. Действующий опубликованный проект останется без изменений, пока администратор не одобрит ревизию."
                    : "Update the necessary fields and submit changes for review. The current public project will stay unchanged until an administrator approves the revision."
                  : organization
                  ? isRu
                    ? `Листинг будет создан от имени компании ${organization.displayName}. Опишите продукт, приложите документы и отправьте его на модерацию.`
                    : `This listing will be created on behalf of ${organization.displayName}. Describe the offering, attach documents, and send it for moderation.`
                  : isRu
                    ? "Опишите инициативу, приложите документы и отправьте проект на первичную проверку Qidra перед публикацией в каталоге."
                    : "Describe the initiative, attach documents and send the project for Qidra's initial review."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <InvestorWorkspace activePath="/investor/projects/new" locale={locale}>
          <div className="grid gap-8 xl:grid-cols-[1fr_0.48fr]">
            <div id="project-form">
            <FeedbackForm
              className="premium-card grid gap-6 p-6 sm:p-8"
              endpoint={`/api/investor/project-submissions?lang=${locale}`}
              feedback={submitFeedback}
              payload="form-data"
              popupPlacement="center"
              reloadOnSuccess
            >
              <fieldset className="grid gap-6" disabled={!approved}>
                {editMode ? <input name="sourceSubmissionId" type="hidden" value={editableSubmission?.id} /> : null}
                {organization ? (
                  <NotificationCard
                    title={isRu ? "Листинг компании" : "Company listing"}
                    text={
                      isRu
                        ? `Публикация идёт от имени ${organization.displayName}. После одобрения карточка компании сможет собирать входящие лиды и заявки.`
                        : `The listing is being created on behalf of ${organization.displayName}. Once approved, the company profile can collect inbound leads and applications.`
                    }
                    tone="info"
                  />
                ) : null}
                <div>
                  <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">
                    {editMode ? (isRu ? "Обновление проекта" : "Project update") : isRu ? "Информация о проекте" : "Project information"}
                  </h2>
                  <p className="mt-3 max-w-2xl text-16 text-qidra-grayBlue">
                    {editMode
                      ? isRu
                        ? "Измените только нужные данные. Если не загружать новые документы или изображения, текущие материалы проекта сохранятся."
                        : "Change only the necessary fields. If you do not upload new documents or images, the current project materials will be preserved."
                      : isRu
                        ? "Чем подробнее описание и документы, тем быстрее команда сможет провести первичный отбор."
                        : "The more complete the description and documents, the faster the team can complete initial screening."}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label={isRu ? "Название проекта" : "Project title"} name="title" maxLength={180} minLength={5} defaultValue={initialValues?.title ?? ""} placeholder={isRu ? "Например: Производство халяльной продукции" : "Example: Halal product manufacturing"} required />
                  <ProjectSectorFields className="md:col-span-2" locale={locale} initialValues={initialValues?.sectorFields} />
                  <Input label={isRu ? "Страна / город реализации" : "Country / city"} name="location" maxLength={180} minLength={5} defaultValue={initialValues?.location ?? ""} placeholder={isRu ? "ОАЭ, Дубай" : "UAE, Dubai"} />
                  <Input label={isRu ? "Целевой объём, USDT" : "Target amount, USDT"} name="targetUsdt" inputMode="decimal" defaultValue={initialValues?.targetUsdt ?? ""} placeholder="100000" />
                  <Select
                    label={isRu ? "Предполагаемая структура" : "Expected structure"}
                    name="structure"
                    defaultValue={initialValues?.structure ?? ""}
                    options={[
                      { value: "", label: isRu ? "Команда Qidra определит после проверки" : "Qidra team will define after review" },
                      { value: "Mudaraba", label: "Mudaraba" },
                      { value: "Musharaka", label: "Musharaka" }
                    ]}
                  />
                  <Input
                    label={isRu ? "Ожидаемый результат проекта" : "Expected project result"}
                    name="expectedReturn"
                    defaultValue={initialValues?.expectedReturn ?? ""}
                    maxLength={180}
                    minLength={8}
                    placeholder={isRu ? "Например: расширение производства и доля прибыли по итогам периода" : "Example: production expansion and profit share by period"}
                    required
                  />
                  <Input
                    label={isRu ? "Ориентир доходности" : "Return guidance"}
                    name="expectedYield"
                    defaultValue={initialValues?.expectedYield ?? ""}
                    maxLength={180}
                    minLength={5}
                    placeholder={isRu ? "Например: ориентировочно 30-40% по итогам проекта, не гарантия" : "Example: approximately 30-40% by project outcome, not guaranteed"}
                    required
                  />
                  <Input label={isRu ? "Стадия проекта" : "Project stage"} name="stage" maxLength={180} minLength={5} defaultValue={initialValues?.stage ?? ""} placeholder={isRu ? "Стартап, действующий бизнес, расширение" : "Startup, operating business, expansion"} required />
                  <Input label={isRu ? "Срок участия" : "Participation term"} name="participationTerm" maxLength={180} minLength={5} defaultValue={initialValues?.participationTerm ?? ""} placeholder={isRu ? "Например: 12 месяцев после запуска" : "Example: 12 months after launch"} required />
                  <Input label={isRu ? "Начало сбора" : "Fundraising start"} name="fundraisingStartAt" type="date" defaultValue={initialValues?.fundraisingStartAt ?? ""} required />
                  <Input label={isRu ? "Окончание сбора" : "Fundraising end"} name="fundraisingEndAt" type="date" defaultValue={initialValues?.fundraisingEndAt ?? ""} required />
                  <Input label={isRu ? "План запуска проекта" : "Planned launch"} name="plannedLaunchAt" type="date" defaultValue={initialValues?.plannedLaunchAt ?? ""} required />
                  <Input label={isRu ? "План первых выплат" : "Planned first distributions"} name="plannedDividendAt" type="date" defaultValue={initialValues?.plannedDividendAt ?? ""} required />
                  <Select
                    label={isRu ? "График выплат" : "Distribution schedule"}
                    name="payoutFrequency"
                    defaultValue={initialValues?.payoutFrequency ?? "QUARTERLY"}
                    options={[
                      { value: "MONTHLY", label: isRu ? "Ежемесячно" : "Monthly" },
                      { value: "QUARTERLY", label: isRu ? "Ежеквартально" : "Quarterly" },
                      { value: "ANNUAL", label: isRu ? "Ежегодно" : "Annual" },
                      { value: "CUSTOM", label: isRu ? "Индивидуально по условиям проекта" : "Custom under project terms" }
                    ]}
                  />
                </div>
                <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                  {isRu ? "Что уже сделано" : "Current progress"}
                  <textarea
                    className="field-shell min-h-[140px] rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
                    defaultValue={initialValues?.currentProgress ?? ""}
                    maxLength={2500}
                    minLength={30}
                    name="currentProgress"
                    placeholder={
                      isRu
                        ? "Опишите текущую стадию: что уже создано, какие активы/договоры есть, что готово к запуску."
                        : "Describe current stage: what is already built, assets/contracts available and launch readiness."
                    }
                    required
                  />
                </label>
                <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                  {isRu ? "План и этапы сбора" : "Raise plan and phases"}
                  <textarea
                    className="field-shell min-h-[120px] rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
                    defaultValue={initialValues?.raisePlan ?? ""}
                    maxLength={2500}
                    minLength={20}
                    name="raisePlan"
                    placeholder={
                      isRu
                        ? "Если сбор идёт этапами, опишите этапы. Срок сбора должен быть в пределах 1-3 месяцев."
                        : "If the raise is phased, describe phases. Fundraising period must be within 1-3 months."
                    }
                  />
                </label>
                <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                  {isRu ? "Подробное описание проекта" : "Detailed project description"}
                  <textarea
                    className="field-shell min-h-[420px] resize-y rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
                    defaultValue={initialValues?.summary ?? ""}
                    minLength={120}
                    name="summary"
                    placeholder={
                      isRu
                        ? "Опишите бизнес-модель, стадию проекта, участников, активы, ожидаемый результат, ориентир доходности, сроки, риски и документы, которые подтверждают проект."
                        : "Describe the business model, project stage, parties, assets, expected cooperation structure, risks and documents supporting the project."
                    }
                    required
                  />
                </label>
                <FileUpload
                  hint={
                    isRu
                      ? "Можно выбрать несколько файлов: презентация, регистрационные документы, финмодель, договоры, фото. PDF/DOCX/XLSX/PPTX/JPG/PNG"
                      : "You can select multiple files: presentation, registration documents, financial model, contracts, photos. PDF/DOCX/XLSX/PPTX/JPG/PNG"
                  }
                  existingFileName={initialValues?.documentsSummary ?? undefined}
                  existingLabel={isRu ? "Текущие" : "Current"}
                  label={isRu ? "Документы проекта" : "Project documents"}
                  manyFilesLabel={isRu ? "файлов" : "files"}
                  name="documents"
                  selectedLabel={isRu ? "Выбрано" : "Selected"}
                  multiple
                  required={!initialValues?.documentsSummary}
                />
                <Button type="submit" className="w-full sm:w-auto">
                  {editMode ? (isRu ? "Отправить правки на проверку" : "Submit changes for review") : isRu ? "Отправить проект на проверку" : "Submit project for review"}
                </Button>
              </fieldset>
            </FeedbackForm>
            </div>

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
                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Мои проекты" : "My projects"}</h2>
                  <div className="mt-5 grid gap-3">
                    {recentSubmissions.map((submission) => (
                      <div key={submission.id} className="rounded-qidra bg-qidra-grayLight p-4">
                        <p className="font-medium text-qidra-dark">{submission.title}</p>
                        <p className="mt-1 text-14 text-qidra-grayBlue">{submissionStatusLabel(submission.status, locale)}</p>
                        {submission.status === "APPROVED" && submission.projectId ? (
                          <ButtonLink className="mt-3 h-10" href={withLocale(`/investor/projects/new?edit=${submission.id}#project-form`, locale)} size="sm" variant="outline">
                            {isRu ? "Редактировать опубликованный проект" : "Edit published project"}
                          </ButtonLink>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
              <section className="premium-card p-6 sm:p-8">
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
          </InvestorWorkspace>
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

function getSearchParam(params: SearchParams | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildInitialValues(
  submission: {
    currentProgress: string | null;
    documents: unknown;
    expectedReturn: string | null;
    expectedYield: string | null;
    fundraisingEndAt: Date | null;
    fundraisingStartAt: Date | null;
    location: string | null;
    participationTerm: string | null;
    payoutFrequency: string;
    plannedDividendAt: Date | null;
    plannedLaunchAt: Date | null;
    propertyData: unknown;
    raisePlan: string | null;
    sector: string | null;
    stage: string | null;
    structure: string | null;
    summary: string;
    targetUsdt: { toString(): string } | number | null;
    title: string;
  },
  locale: "ru" | "en"
) {
  const realEstate = parseRealEstateData(submission.propertyData);
  const sectorFields = buildSectorInitialValues(submission, realEstate, locale);
  const submissionDocuments = readSubmissionFiles(submission.documents);

  return {
    currentProgress: submission.currentProgress ?? "",
    documentsSummary: summarizeCount(submissionDocuments.length, locale, locale === "ru" ? "файлов" : "files"),
    expectedReturn: submission.expectedReturn ?? "",
    expectedYield: submission.expectedYield ?? "",
    fundraisingEndAt: toDateInputValue(submission.fundraisingEndAt),
    fundraisingStartAt: toDateInputValue(submission.fundraisingStartAt),
    location: submission.location ?? "",
    participationTerm: submission.participationTerm ?? "",
    payoutFrequency: submission.payoutFrequency,
    plannedDividendAt: toDateInputValue(submission.plannedDividendAt),
    plannedLaunchAt: toDateInputValue(submission.plannedLaunchAt),
    raisePlan: submission.raisePlan ?? "",
    sectorFields,
    stage: submission.stage ?? "",
    structure: submission.structure ?? "",
    summary: submission.summary,
    targetUsdt: decimalInputValue(submission.targetUsdt),
    title: submission.title
  };
}

function buildSectorInitialValues(
  submission: { sector: string | null; propertyData: unknown },
  realEstate: ReturnType<typeof parseRealEstateData>,
  locale: "ru" | "en"
): ProjectSectorInitialValues | null {
  if (!submission.sector) return null;

  const baseSector = ["real-estate", "trade", "production", "technology", "logistics", "other"].includes(submission.sector) ? submission.sector : "other";
  const assets = realEstate?.documents ?? [];
  const galleryAssets = assets.filter((asset) => asset.category === "gallery");
  const coverAsset = galleryAssets.find((asset) => asset.href === realEstate?.coverImage) ?? galleryAssets[0];

  return {
    existingUploads: {
      brochures: summarizeCount(assets.filter((asset) => asset.category === "brochure").length, locale, locale === "ru" ? "файлов" : "files"),
      coverImage: coverAsset?.name ?? null,
      floorPlans: summarizeCount(assets.filter((asset) => asset.category === "floor-plan").length, locale, locale === "ru" ? "файлов" : "files"),
      galleryImages: summarizeCount(Math.max(galleryAssets.length - (coverAsset ? 1 : 0), 0), locale, locale === "ru" ? "файлов" : "files"),
      visuals: summarizeCount(assets.filter((asset) => asset.category === "render").length, locale, locale === "ru" ? "файлов" : "files")
    },
    propertyAddress: realEstate?.address ?? "",
    propertyCity: realEstate?.city ?? "",
    propertyComplexName: realEstate?.titleComplex ?? "",
    propertyCompletionDate: toDateInputValue(realEstate?.completionDate),
    propertyCountry: realEstate?.country ?? "",
    propertyCurrency: realEstate?.currency ?? "",
    propertyDeveloper: realEstate?.developer ?? "",
    propertyDistrict: realEstate?.district ?? "",
    propertyEstimatedAssetValue: numberInputValue(realEstate?.estimatedAssetValue),
    propertyFullDescription: realEstate?.descriptionFull ?? "",
    propertyFundraisingCurrency: realEstate?.fundraisingCurrency ?? "",
    propertyGatheredAmount: numberInputValue(realEstate?.gatheredAmount),
    propertyIncomeSources: realEstate?.incomeSources ?? [],
    propertyInvestorSharePercent: numberInputValue(realEstate?.investorSharePercent),
    propertyManagerFeePercent: numberInputValue(realEstate?.managerFeePercent),
    propertyManagerName: realEstate?.managerName ?? "",
    propertyManagerSharePercent: numberInputValue(realEstate?.managerSharePercent),
    propertyMinimumParticipation: numberInputValue(realEstate?.minimumParticipation),
    propertyObjectName: realEstate?.objectName ?? "",
    propertyPlannedStartDate: toDateInputValue(realEstate?.plannedStartDate),
    propertyRemainingAmount: numberInputValue(realEstate?.remainingAmount),
    propertyShortDescription: realEstate?.descriptionShort ?? "",
    propertyStatus: realEstate?.objectStatus ?? "",
    propertyTargetRaise: numberInputValue(realEstate?.targetRaise),
    propertyTermMonths: numberInputValue(realEstate?.projectTermMonths),
    propertyTotalAssetValue: numberInputValue(realEstate?.totalAssetValue),
    propertyType: realEstate?.propertyType ?? "",
    propertyVehicleName: realEstate?.vehicleName ?? "",
    sector: baseSector,
    sectorOther: baseSector === "other" ? submission.sector : ""
  };
}

function readSubmissionFiles(value: unknown) {
  if (!value || typeof value !== "object" || !("files" in value)) return [];
  const files = (value as { files?: unknown }).files;
  return Array.isArray(files)
    ? files.filter(
        (item): item is { name: string } =>
          Boolean(item) && typeof item === "object" && typeof (item as { name?: unknown }).name === "string"
      )
    : [];
}

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function decimalInputValue(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) return "";
  return typeof value === "number" ? String(value) : value.toString();
}

function numberInputValue(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function summarizeCount(count: number, locale: "ru" | "en", label: string) {
  return count > 0 ? `${count} ${label}` : undefined;
}
