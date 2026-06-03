import { FileUpload } from "@/components/FileUpload";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function KycPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor/kyc");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const [profile, application] = await Promise.all([
    prisma.investorProfile.findUnique({ where: { userId } }),
    prisma.kycApplication.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
  ]);
  const submitted = application?.status === "SUBMITTED";
  const approved = application?.status === "APPROVED";
  const rejected = application?.status === "REJECTED";
  const dateOfBirth = profile?.dateOfBirth ? profile.dateOfBirth.toISOString().slice(0, 10) : "";
  const statusTitle = approved
    ? isRu
      ? "Профиль одобрен"
      : "Profile approved"
    : submitted
      ? isRu
        ? "Анкета на проверке"
        : "Profile in review"
      : rejected
        ? isRu
          ? "Нужны правки"
          : "Updates required"
        : isRu
          ? "Профиль не отправлен"
          : "Profile not submitted";
  const statusText = approved
    ? isRu
      ? "Теперь вы можете подавать заявки на участие в проектах."
      : "You can now submit participation applications."
    : submitted
      ? isRu
        ? "Команда Qidra проверяет данные. Если потребуется уточнение, уведомление появится в кабинете."
        : "The Qidra team is reviewing your details. If clarification is needed, a notification will appear in your cabinet."
      : rejected
        ? application?.reviewerNote || (isRu ? "Обновите данные и отправьте анкету повторно." : "Update your details and submit the profile again.")
        : isRu
          ? "Заполните анкету и прикрепите два документа для начала проверки."
          : "Complete the profile and attach two documents to start the review.";

  return (
    <>
      <Header locale={locale} path="/investor/kyc" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Проверка участника" : "Participant review"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Профиль для участия в проектах" : "Profile for project participation"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Данные нужны для проверки участника, юридического оформления и прозрачного взаимодействия с проектами."
                  : "These details are needed for participant review, legal documentation and transparent cooperation with projects."}
              </p>
            </div>
            <Tabs
              items={[
                { label: isRu ? "Обзор" : "Overview", href: withLocale("/investor", locale) },
                { label: isRu ? "Проверка" : "Review", href: withLocale("/investor/kyc", locale), active: true },
                { label: isRu ? "Кошелек" : "Wallet", href: withLocale("/investor/wallet", locale) },
                { label: isRu ? "Участие" : "Participation", href: withLocale("/investor/investments", locale) }
              ]}
            />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[1fr_0.46fr]">
            <FeedbackForm
              className="grid gap-6 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8"
              endpoint={`/api/investor/kyc?lang=${locale}`}
              feedback={{
                title: isRu ? "Анкета отправлена" : "Profile submitted",
                text:
                  isRu
                    ? "Профиль и документы отправлены команде Qidra. Статус появится в кабинете после проверки."
                    : "Your profile and documents were sent to the Qidra team. The status will appear in your cabinet after review.",
                buttonLabel: isRu ? "Понятно" : "Got it",
                dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                tone: "success"
              }}
              payload="form-data"
            >
              <div>
                <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Анкета" : "Profile form"}</h2>
                <p className="mt-3 max-w-2xl text-16 text-qidra-grayBlue">
                  {isRu
                    ? "Укажите актуальные данные. При повторной отправке предыдущая активная заявка будет обновлена."
                    : "Enter current details. Resubmitting will update your active review application."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label={isRu ? "Телефон" : "Phone"} name="phone" defaultValue={profile?.phone ?? ""} placeholder="+971..." />
                <Input label={isRu ? "Дата рождения" : "Date of birth"} name="dateOfBirth" type="date" defaultValue={dateOfBirth} />
                <Input label={isRu ? "Страна проживания" : "Country of residence"} name="country" defaultValue={profile?.country ?? ""} required />
                <Input label={isRu ? "Город" : "City"} name="city" defaultValue={profile?.city ?? ""} required />
                <Input label={isRu ? "Гражданство" : "Citizenship"} name="citizenship" defaultValue={profile?.citizenship ?? ""} required />
                <Input label={isRu ? "Профессия" : "Occupation"} name="occupation" defaultValue={application?.occupation ?? ""} required />
                <Select
                  label={isRu ? "Источник средств" : "Source of funds"}
                  name="sourceOfFunds"
                  defaultValue={application?.sourceOfFunds ?? ""}
                  options={[
                    { value: "", label: isRu ? "Выберите" : "Select" },
                    { value: "salary", label: isRu ? "Доход от работы" : "Salary" },
                    { value: "business", label: isRu ? "Бизнес" : "Business" },
                    { value: "savings", label: isRu ? "Личные накопления" : "Personal savings" },
                    { value: "family", label: isRu ? "Семейные средства" : "Family funds" },
                    { value: "other", label: isRu ? "Другое" : "Other" }
                  ]}
                  required
                />
                <Input label={isRu ? "Адрес проживания" : "Residential address"} name="address" defaultValue={profile?.address ?? ""} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FileUpload
                  label={isRu ? "Документ личности" : "Identity document"}
                  hint={isRu ? "Паспорт или ID, PDF/JPG/PNG" : "Passport or ID, PDF/JPG/PNG"}
                  name="identityDocument"
                  required={!submitted && !approved}
                />
                <FileUpload
                  label={isRu ? "Подтверждение адреса" : "Proof of address"}
                  hint={isRu ? "Счёт или справка, PDF/JPG/PNG" : "Bill or statement, PDF/JPG/PNG"}
                  name="addressProof"
                  required={!submitted && !approved}
                />
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                {submitted || approved ? (isRu ? "Обновить анкету" : "Update profile") : isRu ? "Отправить на проверку" : "Submit for review"}
              </Button>
            </FeedbackForm>

            <aside className="grid content-start gap-5">
              <NotificationCard title={statusTitle} text={statusText} tone={approved ? "success" : rejected ? "error" : submitted ? "info" : "warning"} />
              <section className="rounded-[20px] bg-qidra-grayLight p-6 sm:p-8">
                <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Что проверяется" : "What is reviewed"}</h2>
                <div className="mt-5 grid gap-4 text-16 text-qidra-grayBlue">
                  <CheckItem text={isRu ? "Личность и контактные данные" : "Identity and contact details"} />
                  <CheckItem text={isRu ? "Страна, адрес и гражданство" : "Country, address and citizenship"} />
                  <CheckItem text={isRu ? "Источник средств и профессия" : "Source of funds and occupation"} />
                  <CheckItem text={isRu ? "Документ личности и подтверждение адреса" : "Identity document and proof of address"} />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function CheckItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-qidra-accent" />
      <span>{text}</span>
    </div>
  );
}
