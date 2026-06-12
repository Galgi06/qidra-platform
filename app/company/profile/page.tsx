import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";

export default async function CompanyProfilePage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";
  const { membership } = await requireCompanyAccess(locale, "/company/profile");
  const organization = membership.organization;

  return (
    <>
      <Header locale={locale} path="/company/profile" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card p-6 sm:p-8">
              <p className="eyebrow">{isRu ? "B2B onboarding" : "B2B onboarding"}</p>
              <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">
                {isRu ? "Профиль компании" : "Company profile"}
              </h1>
              <p className="mt-4 max-w-4xl text-18 text-qidra-grayBlue">
                {isRu
                  ? "Соберите публичный профиль компании: позиционирование, представитель, описание продукта и документы для модерации."
                  : "Assemble the public company profile: positioning, representative details, offering summary, and documents for moderation."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath="/company/profile" locale={locale}>
            <div className="grid gap-8 xl:grid-cols-[1fr_0.44fr]">
              <FeedbackForm
                className="premium-card grid gap-6 p-6 sm:p-8"
                endpoint={`/api/company/profile?lang=${locale}`}
                feedback={{
                  title: isRu ? "Профиль компании обновлён" : "Company profile updated",
                  text:
                    isRu
                      ? "Изменения сохранены. После подготовки документов переведите профиль в проверку и публикуйте листинги."
                      : "Changes were saved. After preparing the documents, move the profile into review and start publishing listings.",
                  buttonLabel: isRu ? "Понятно" : "Got it",
                  dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                  tone: "success"
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <Input label={isRu ? "Публичное название" : "Public display name"} name="displayName" defaultValue={organization.displayName} required />
                  <Input label={isRu ? "Юридическое название" : "Legal name"} name="legalName" defaultValue={organization.legalName} required />
                  <Input label={isRu ? "Публичный адрес" : "Public slug"} name="publicSlug" defaultValue={organization.publicSlug} required />
                  <Input label={isRu ? "Тип компании" : "Company type"} name="typeLabel" defaultValue={organization.typeLabel || ""} placeholder={isRu ? "Фонд, девелопер, торговая компания..." : "Fund, developer, trading company..."} />
                  <Input label={isRu ? "Страна" : "Country"} name="country" defaultValue={organization.country || ""} />
                  <Input label={isRu ? "Город" : "City"} name="city" defaultValue={organization.city || ""} />
                  <Input label={isRu ? "Сайт" : "Website"} name="website" defaultValue={organization.website || ""} placeholder="https://example.com" />
                  <Input label={isRu ? "Контактный email" : "Contact email"} name="contactEmail" defaultValue={organization.contactEmail || ""} />
                  <Input label={isRu ? "Контактный телефон" : "Contact phone"} name="contactPhone" defaultValue={organization.contactPhone || ""} />
                  <Input label={isRu ? "Представитель компании" : "Representative name"} name="representativeName" defaultValue={organization.representativeName || ""} />
                  <Input label={isRu ? "Роль представителя" : "Representative role"} name="representativeRole" defaultValue={organization.representativeRole || ""} />
                  <Input label={isRu ? "Ссылка на логотип" : "Logo URL"} name="logoUrl" defaultValue={organization.logoUrl || ""} placeholder="/assets/brand/qidra-logo-dark.png" />
                  <div className="md:col-span-2">
                    <Input label={isRu ? "Hero image URL" : "Hero image URL"} name="heroImageUrl" defaultValue={organization.heroImageUrl || ""} placeholder="/assets/hero/qidra-hero-blue.png" />
                  </div>
                </div>

                <TextBlock defaultValue={organization.overview || ""} label={isRu ? "Обзор компании" : "Company overview"} name="overview" />
                <TextBlock defaultValue={organization.valueProposition || ""} label={isRu ? "Ценность для рынка" : "Value proposition"} name="valueProposition" />
                <TextBlock defaultValue={organization.targetAudience || ""} label={isRu ? "Для кого предназначены продукты" : "Target audience"} name="targetAudience" />
                <TextBlock defaultValue={organization.productSummary || ""} label={isRu ? "Кратко о продуктах и предложениях" : "Products and offerings summary"} name="productSummary" />

                <div className="grid gap-3 rounded-[18px] bg-qidra-grayLight p-5">
                  <p className="text-15 font-medium text-qidra-dark">{isRu ? "Статус профиля" : "Profile status"}</p>
                  <label className="flex items-center gap-3 text-14 text-qidra-grayBlue">
                    <input checked={organization.status === "REVIEW"} className="size-4 accent-qidra-accent" name="submitForReview" type="checkbox" value="on" />
                    <span>{isRu ? "Отправить профиль компании на проверку после сохранения" : "Move the company profile into review after saving"}</span>
                  </label>
                </div>

                <Button className="w-full sm:w-auto" type="submit">
                  {isRu ? "Сохранить профиль компании" : "Save company profile"}
                </Button>
              </FeedbackForm>

              <aside className="grid content-start gap-5">
                <NotificationCard
                  title={isRu ? "Что важно для конверсии" : "What matters for conversion"}
                  text={
                    isRu
                      ? "Не просто перечисляйте факты. Объясните, для кого ваш продукт, в чём его ценность, как выстроен процесс взаимодействия и почему компании можно доверять."
                      : "Do not just list facts. Explain who the product is for, where the value lies, how the engagement works, and why the company is trustworthy."
                  }
                  tone="info"
                />
                <section className="premium-card p-6 sm:p-8">
                  <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Нужные материалы" : "Required materials"}</h2>
                  <div className="mt-5 grid gap-3 text-16 text-qidra-grayBlue">
                    <ChecklistItem text={isRu ? "Документы регистрации компании" : "Company registration documents"} />
                    <ChecklistItem text={isRu ? "Лицензии и разрешения, если применимо" : "Licenses and permits where applicable"} />
                    <ChecklistItem text={isRu ? "Описание продукта и целевой аудитории" : "Product and target audience summary"} />
                    <ChecklistItem text={isRu ? "Публичные контакты и представитель" : "Public contacts and representative"} />
                  </div>
                  <div className="mt-6">
                    <a className="text-14 font-medium text-qidra-accent hover:text-qidra-dark" href={withLocale(`/companies/${organization.publicSlug}`, locale)}>
                      {isRu ? "Предпросмотр публичной страницы компании" : "Preview public company page"}
                    </a>
                  </div>
                </section>
              </aside>
            </div>
          </CompanyWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function TextBlock({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return (
    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
      <span>{label}</span>
      <textarea className="field-shell min-h-[140px] rounded-qidra px-4 py-3 text-16 outline-none" defaultValue={defaultValue} name={name} />
    </label>
  );
}

function ChecklistItem({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-2 size-2 shrink-0 rounded-full bg-qidra-accent" />
      <span>{text}</span>
    </div>
  );
}
