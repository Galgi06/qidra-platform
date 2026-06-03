import { notFound } from "next/navigation";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Checkbox } from "@/components/ui/Checkbox";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestmentAmountInput } from "@/components/InvestmentAmountInput";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { requireAuth } from "@/lib/access";
import { projects } from "@/lib/content";
import { dictionary, getLocale, type SearchParams } from "@/lib/i18n";

export default async function InvestPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: SearchParams }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  await requireAuth(locale, `/invest/${slug}`);
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();

  return (
    <>
      <Header locale={locale} path={`/invest/${project.slug}`} />
      <main className="section">
        <FeedbackForm
          className="container-qidra grid max-w-2xl gap-5"
          endpoint={`/api/investments?lang=${locale}`}
          feedback={{
            title: locale === "ru" ? "Заявка создана" : "Application created",
            text:
              locale === "ru"
                ? "Мы приняли заявку на участие. Проверьте кабинет: статус появится после рассмотрения проекта и условий."
                : "We received your participation application. Check your cabinet: the status will appear after the project and terms are reviewed.",
            buttonLabel: locale === "ru" ? "Понятно" : "Got it",
            dismissLabel: locale === "ru" ? "Закрыть уведомление" : "Close notification",
            tone: "success"
          }}
          resetOnSubmit
        >
          <h1 className="subtitle-28">{locale === "ru" ? "Заявка на участие" : "Participation application"}</h1>
          <p className="text-18 text-qidra-grayBlue">{project.title[locale]}</p>
          <input name="projectSlug" type="hidden" value={project.slug} />
          <InvestmentAmountInput locale={locale} />
          <NotificationCard title={locale === "ru" ? "Без гарантии доходности" : "No guaranteed returns"} text={dictionary[locale].common.noFixedYield} />
          <Checkbox name="termsAccepted" required>
            {locale === "ru" ? "Я изучил условия проекта и предупреждение о рисках." : "I reviewed project terms and the risk notice."}
          </Checkbox>
          <Checkbox name="contractAccepted" required>
            {locale === "ru" ? "Я принимаю договорную структуру Mudaraba/Musharaka." : "I accept the Mudaraba/Musharaka contractual structure."}
          </Checkbox>
          <Button type="submit">{locale === "ru" ? "Создать заявку" : "Create application"}</Button>
        </FeedbackForm>
      </main>
      <Footer locale={locale} />
    </>
  );
}
