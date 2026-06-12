import { DocumentKind } from "@prisma/client";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { FeedbackForm } from "@/components/ActionFeedback";
import { CompanyWorkspace } from "@/components/CompanyTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireCompanyAccess } from "@/lib/access";
import { getLocale, type SearchParams } from "@/lib/i18n";

const documentKinds = [
  { value: DocumentKind.LEGAL, label: { ru: "Юридический", en: "Legal" } },
  { value: DocumentKind.COMPLIANCE, label: { ru: "Compliance", en: "Compliance" } },
  { value: DocumentKind.REPORT, label: { ru: "Отчёт", en: "Report" } },
  { value: DocumentKind.CONTRACT, label: { ru: "Договор", en: "Contract" } },
  { value: DocumentKind.PROJECT, label: { ru: "Product sheet", en: "Product sheet" } }
] as const;

export default async function CompanyDocumentsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  const isRu = locale === "ru";
  const { membership } = await requireCompanyAccess(locale, "/company/documents");
  const organization = membership.organization;
  const documents = [...organization.documents].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <>
      <Header locale={locale} path="/company/documents" />
      <main className="premium-page">
        <section className="px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto max-w-[1840px]">
            <div className="premium-card p-6 sm:p-8">
              <p className="eyebrow">{isRu ? "Company files" : "Company files"}</p>
              <h1 className="mt-3 text-[40px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[54px]">{isRu ? "Документы компании" : "Company documents"}</h1>
              <p className="mt-4 max-w-4xl text-18 text-qidra-grayBlue">
                {isRu
                  ? "Отдельный раздел для регистрационных, compliance и product-документов компании. Эти файлы поддерживают модерацию, доверие и дальнейшие продажи."
                  : "A dedicated section for registration, compliance, and product documents. These files support moderation, trust, and downstream sales."}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <CompanyWorkspace activePath="/company/documents" locale={locale}>
            <div className="grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
              <FeedbackForm
                className="premium-card grid gap-5 p-6 sm:p-8"
                endpoint={`/api/company/documents?lang=${locale}`}
                feedback={{
                  title: isRu ? "Документ загружен" : "Document uploaded",
                  text: isRu ? "Файл сохранён в кабинете компании." : "The file was saved in the company workspace.",
                  buttonLabel: isRu ? "Понятно" : "Got it",
                  dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                  tone: "success"
                }}
                payload="form-data"
                refreshOnSuccess
              >
                <Input label={isRu ? "Название документа" : "Document title"} name="title" required />
                <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                  <span>{isRu ? "Тип документа" : "Document type"}</span>
                  <select className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" name="kind">
                    {documentKinds.map((kind) => (
                      <option key={kind.value} value={kind.value}>
                        {kind.label[locale]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                  <span>{isRu ? "Комментарий" : "Comment"}</span>
                  <textarea className="field-shell min-h-[140px] rounded-qidra px-4 py-3 text-16 outline-none" name="note" />
                </label>
                <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                  <span>{isRu ? "Файл" : "File"}</span>
                  <input className="field-shell rounded-qidra px-4 py-3 text-14" name="file" required type="file" />
                </label>
                <Button className="w-full sm:w-auto" type="submit">
                  {isRu ? "Загрузить документ" : "Upload document"}
                </Button>
              </FeedbackForm>

              <div className="grid content-start gap-5">
                <NotificationCard
                  title={isRu ? "Что сюда складывать" : "What belongs here"}
                  text={
                    isRu
                      ? "Уставные документы, лицензии, разрешения, презентации продукта, финансовые отчёты, term sheets и маркетинговые PDF."
                      : "Corporate registration docs, licenses, permits, product decks, financial reports, term sheets, and marketing PDFs."
                  }
                  tone="info"
                />
                <section className="premium-card p-6 sm:p-8">
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-[28px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Загруженные файлы" : "Uploaded files"}</h2>
                    <span className="rounded-full bg-qidra-grayLight px-3 py-1 text-12 font-medium text-qidra-accent">{documents.length}</span>
                  </div>
                  <div className="mt-6 grid gap-3">
                    {documents.length ? (
                      documents.map((document) => (
                        <article key={document.id} className="rounded-[18px] bg-qidra-grayLight p-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-17 font-medium text-qidra-dark">{document.title}</p>
                              <p className="mt-1 text-13 text-qidra-grayBlue">{document.kind}</p>
                            </div>
                            <a className="text-14 font-medium text-qidra-accent hover:text-qidra-dark" href={`/api/company/documents/${document.id}`}>
                              {isRu ? "Открыть файл" : "Open file"}
                            </a>
                          </div>
                          {document.note ? <p className="mt-3 whitespace-pre-line text-14 text-qidra-grayBlue">{document.note}</p> : null}
                        </article>
                      ))
                    ) : (
                      <p className="text-15 text-qidra-grayBlue">{isRu ? "Документы пока не загружены." : "No documents uploaded yet."}</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </CompanyWorkspace>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}
