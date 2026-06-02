import { FileUpload } from "@/components/FileUpload";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams } from "@/lib/i18n";

export default async function KycPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  await requireAuth(locale, "/investor/kyc");

  return (
    <>
      <Header locale={locale} path="/investor/kyc" />
      <main className="section">
        <FeedbackForm
          className="container-qidra grid max-w-3xl gap-5"
          feedback={{
            title: locale === "ru" ? "Анкета отправлена" : "Profile submitted",
            text:
              locale === "ru"
                ? "Документы профиля отправлены на проверку. Уведомление о статусе появится после рассмотрения данных."
                : "Your profile documents were submitted for review. A status notification will appear after the details are reviewed.",
            buttonLabel: locale === "ru" ? "Понятно" : "Got it",
            dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
            tone: "success"
          }}
          resetOnSubmit
        >
          <h1 className="subtitle-28">{locale === "ru" ? "Проверка профиля" : "Profile review"}</h1>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label={locale === "ru" ? "Страна" : "Country"} name="country" required />
            <Input label={locale === "ru" ? "Город" : "City"} name="city" required />
            <Select
              label={locale === "ru" ? "Источник средств" : "Source of funds"}
              name="source"
              options={[
                { value: "", label: locale === "ru" ? "Выберите" : "Select" },
                { value: "salary", label: locale === "ru" ? "Доход от работы" : "Salary" },
                { value: "business", label: locale === "ru" ? "Бизнес" : "Business" }
              ]}
              required
            />
            <Input label={locale === "ru" ? "Профессия" : "Occupation"} name="occupation" required />
          </div>
          <FileUpload label={locale === "ru" ? "Документ личности" : "Identity document"} />
          <FileUpload label={locale === "ru" ? "Подтверждение адреса" : "Proof of address"} />
          <Button type="submit">{locale === "ru" ? "Отправить на проверку" : "Submit for review"}</Button>
        </FeedbackForm>
      </main>
      <Footer locale={locale} />
    </>
  );
}
