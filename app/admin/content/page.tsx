import type { ReactNode } from "react";
import { AdminTabs } from "@/components/AdminTabs";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedbackForm } from "@/components/ActionFeedback";
import { FileUpload } from "@/components/FileUpload";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { requireAdmin } from "@/lib/access";
import { getLocale, t, type SearchParams, withLocale } from "@/lib/i18n";
import { getSiteContent, legalAssetHref } from "@/lib/site-content";

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const locale = await getLocale(searchParams);
  await requireAdmin(locale, "/admin/content");
  const content = await getSiteContent();
  const isRu = locale === "ru";

  return (
    <>
      <Header locale={locale} path="/admin/content" />
      <main>
        <section className="section bg-qidra-grayLight">
          <div className="container-qidra">
            <Breadcrumbs
              items={[
                { label: t(locale, "nav.home"), href: withLocale("/", locale) },
                { label: "Admin", href: withLocale("/admin", locale) },
                { label: isRu ? "Контент сайта" : "Site content" }
              ]}
            />
            <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Публичный сайт" : "Public website"}</p>
                <h1 className="mt-4 title-48 text-qidra-dark">{isRu ? "Контент и документы" : "Content and documents"}</h1>
                <p className="mt-5 max-w-3xl text-20 text-qidra-grayBlue">
                  {isRu
                    ? "Здесь администратор обновляет тексты главной страницы, контакты, ссылки футера, FAQ и юридические документы без ручного редактирования кода."
                    : "Here administrators can update home-page copy, contacts, footer links, FAQ, and legal documents without editing code."}
                </p>
              </div>
              <NotificationCard
                tone="warning"
                title={isRu ? "Проверяйте тексты перед публикацией" : "Review content before publishing"}
                text={
                  isRu
                    ? "Изменения на этой странице сразу влияют на публичный сайт. Для юридических файлов используйте только финальные версии."
                    : "Changes on this page affect the public site immediately. Upload final versions only for legal files."
                }
              />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-qidra">
            <AdminTabs activePath="/admin/content" locale={locale} />

            <div className="mt-8 grid gap-6">
              <section className="surface p-6">
                <h2 className="text-24 font-medium text-qidra-dark">{isRu ? "Главная страница" : "Home page"}</h2>
                <p className="mt-2 text-15 text-qidra-grayBlue">{isRu ? "Ключевые публичные блоки: hero, описание платформы, безопасность, проекты, бизнес-этапы и финальный CTA." : "Core public sections: hero, platform overview, safety, projects, business steps, and final CTA."}</p>
                <div className="mt-5">
                  <FeedbackForm
                    className="grid gap-8"
                    endpoint={`/api/admin/site-content/home?lang=${locale}`}
                    feedback={{
                      title: isRu ? "Главная обновлена" : "Home page updated",
                      text: isRu ? "Тексты и ссылки на главной сохранены." : "Home-page copy and links were saved.",
                      buttonLabel: isRu ? "Понятно" : "Got it",
                      dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                      tone: "success"
                    }}
                    refreshOnSuccess
                  >
                    <ContentGrid>
                      <Input label="Hero kicker RU" name="heroKickerRu" defaultValue={content.home.hero.kicker.ru} />
                      <Input label="Hero kicker EN" name="heroKickerEn" defaultValue={content.home.hero.kicker.en} />
                      <TextArea label="Hero title RU" name="heroTitleRu" defaultValue={content.home.hero.title.ru} />
                      <TextArea label="Hero title EN" name="heroTitleEn" defaultValue={content.home.hero.title.en} />
                      <TextArea label="Hero subtitle RU" name="heroSubtitleRu" defaultValue={content.home.hero.subtitle.ru} />
                      <TextArea label="Hero subtitle EN" name="heroSubtitleEn" defaultValue={content.home.hero.subtitle.en} />
                      <Input label="Hero CTA RU" name="heroCtaLabelRu" defaultValue={content.home.hero.ctaLabel.ru} />
                      <Input label="Hero CTA EN" name="heroCtaLabelEn" defaultValue={content.home.hero.ctaLabel.en} />
                    </ContentGrid>

                    <ContentGrid>
                      <TextArea label="Intro title RU" name="introTitleRu" defaultValue={content.home.intro.title.ru} />
                      <TextArea label="Intro title EN" name="introTitleEn" defaultValue={content.home.intro.title.en} />
                      <TextArea label="Intro subtitle RU" name="introSubtitleRu" defaultValue={content.home.intro.subtitle.ru} />
                      <TextArea label="Intro subtitle EN" name="introSubtitleEn" defaultValue={content.home.intro.subtitle.en} />
                      <Input label="Process kicker RU" name="processKickerRu" defaultValue={content.home.intro.process.kicker.ru} />
                      <Input label="Process kicker EN" name="processKickerEn" defaultValue={content.home.intro.process.kicker.en} />
                      <TextArea label="Process title RU" name="processTitleRu" defaultValue={content.home.intro.process.title.ru} />
                      <TextArea label="Process title EN" name="processTitleEn" defaultValue={content.home.intro.process.title.en} />
                    </ContentGrid>

                    <ContentGrid>
                      {content.home.intro.featurePanels.map((panel, index) => (
                        <FieldGroup key={`intro-feature-${index}`} title={`${isRu ? "Блок" : "Panel"} ${index + 1}`}>
                          <Input label="Title RU" name={`introFeature${index}TitleRu`} defaultValue={panel.title.ru} />
                          <Input label="Title EN" name={`introFeature${index}TitleEn`} defaultValue={panel.title.en} />
                          <TextArea label="Text RU" name={`introFeature${index}TextRu`} defaultValue={panel.text.ru} />
                          <TextArea label="Text EN" name={`introFeature${index}TextEn`} defaultValue={panel.text.en} />
                        </FieldGroup>
                      ))}
                    </ContentGrid>

                    <ContentGrid>
                      <TextArea label="Safety title RU" name="safetyTitleRu" defaultValue={content.home.safety.title.ru} />
                      <TextArea label="Safety title EN" name="safetyTitleEn" defaultValue={content.home.safety.title.en} />
                      <TextArea label="Safety subtitle RU" name="safetySubtitleRu" defaultValue={content.home.safety.subtitle.ru} />
                      <TextArea label="Safety subtitle EN" name="safetySubtitleEn" defaultValue={content.home.safety.subtitle.en} />
                    </ContentGrid>

                    <ContentGrid>
                      {content.home.safety.panels.map((panel, index) => (
                        <FieldGroup key={`safety-panel-${index}`} title={`${isRu ? "Карточка безопасности" : "Safety card"} ${index + 1}`}>
                          <Input label="Title RU" name={`safetyPanel${index}TitleRu`} defaultValue={panel.title.ru} />
                          <Input label="Title EN" name={`safetyPanel${index}TitleEn`} defaultValue={panel.title.en} />
                          <TextArea label="Text RU" name={`safetyPanel${index}TextRu`} defaultValue={panel.text.ru} />
                          <TextArea label="Text EN" name={`safetyPanel${index}TextEn`} defaultValue={panel.text.en} />
                        </FieldGroup>
                      ))}
                    </ContentGrid>

                    <ContentGrid>
                      {content.home.safety.principles.map((item, index) => (
                        <FieldGroup key={`principle-${index}`} title={`${isRu ? "Принцип" : "Principle"} ${index + 1}`}>
                          <Input label="Title RU" name={`safetyPrinciple${index}TitleRu`} defaultValue={item.title.ru} />
                          <Input label="Title EN" name={`safetyPrinciple${index}TitleEn`} defaultValue={item.title.en} />
                          <TextArea label="Text RU" name={`safetyPrinciple${index}TextRu`} defaultValue={item.text.ru} />
                          <TextArea label="Text EN" name={`safetyPrinciple${index}TextEn`} defaultValue={item.text.en} />
                        </FieldGroup>
                      ))}
                    </ContentGrid>

                    <ContentGrid>
                      <TextArea label="Open projects title RU" name="openProjectsTitleRu" defaultValue={content.home.openProjects.title.ru} />
                      <TextArea label="Open projects title EN" name="openProjectsTitleEn" defaultValue={content.home.openProjects.title.en} />
                      <TextArea label="Open projects subtitle RU" name="openProjectsSubtitleRu" defaultValue={content.home.openProjects.subtitle.ru} />
                      <TextArea label="Open projects subtitle EN" name="openProjectsSubtitleEn" defaultValue={content.home.openProjects.subtitle.en} />
                      <Input label="Catalog button RU" name="openProjectsCatalogLabelRu" defaultValue={content.home.openProjects.buttonLabels.catalog.ru} />
                      <Input label="Catalog button EN" name="openProjectsCatalogLabelEn" defaultValue={content.home.openProjects.buttonLabels.catalog.en} />
                      <Input label="List project button RU" name="openProjectsListLabelRu" defaultValue={content.home.openProjects.buttonLabels.listProject.ru} />
                      <Input label="List project button EN" name="openProjectsListLabelEn" defaultValue={content.home.openProjects.buttonLabels.listProject.en} />
                    </ContentGrid>

                    <ContentGrid>
                      {content.home.openProjects.sectors.map((sector, index) => (
                        <FieldGroup key={`sector-${index}`} title={`${isRu ? "Направление" : "Sector"} ${index + 1}`}>
                          <Input label="Link" name={`sector${index}Href`} defaultValue={sector.href} />
                          <Input label="Title RU" name={`sector${index}TitleRu`} defaultValue={sector.title.ru} />
                          <Input label="Title EN" name={`sector${index}TitleEn`} defaultValue={sector.title.en} />
                          <TextArea label="Text RU" name={`sector${index}TextRu`} defaultValue={sector.text.ru} />
                          <TextArea label="Text EN" name={`sector${index}TextEn`} defaultValue={sector.text.en} />
                        </FieldGroup>
                      ))}
                    </ContentGrid>

                    <ContentGrid>
                      <TextArea label="Business title RU" name="businessTitleRu" defaultValue={content.home.business.title.ru} />
                      <TextArea label="Business title EN" name="businessTitleEn" defaultValue={content.home.business.title.en} />
                    </ContentGrid>

                    <ContentGrid>
                      {content.home.business.steps.map((step, index) => (
                        <FieldGroup key={`business-step-${index}`} title={`${isRu ? "Шаг" : "Step"} ${index + 1}`}>
                          <TextArea label="Title RU" name={`businessStep${index}TitleRu`} defaultValue={step.title.ru} />
                          <TextArea label="Title EN" name={`businessStep${index}TitleEn`} defaultValue={step.title.en} />
                          {step.items.map((item, itemIndex) => (
                            <div key={`business-step-${index}-item-${itemIndex}`} className="grid gap-4 lg:grid-cols-2">
                              <Input label={`Item ${itemIndex + 1} RU`} name={`businessStep${index}Item${itemIndex}Ru`} defaultValue={item.ru} />
                              <Input label={`Item ${itemIndex + 1} EN`} name={`businessStep${index}Item${itemIndex}En`} defaultValue={item.en} />
                            </div>
                          ))}
                          {step.actionLabel ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                              <Input label="Action RU" name={`businessStep${index}ActionRu`} defaultValue={step.actionLabel.ru} />
                              <Input label="Action EN" name={`businessStep${index}ActionEn`} defaultValue={step.actionLabel.en} />
                            </div>
                          ) : null}
                        </FieldGroup>
                      ))}
                    </ContentGrid>

                    <ContentGrid>
                      <TextArea label="Final CTA title RU" name="finalCtaTitleRu" defaultValue={content.home.finalCta.title.ru} />
                      <TextArea label="Final CTA title EN" name="finalCtaTitleEn" defaultValue={content.home.finalCta.title.en} />
                      <TextArea label="Final CTA text RU" name="finalCtaTextRu" defaultValue={content.home.finalCta.text.ru} />
                      <TextArea label="Final CTA text EN" name="finalCtaTextEn" defaultValue={content.home.finalCta.text.en} />
                      <Input label="Final CTA button RU" name="finalCtaButtonLabelRu" defaultValue={content.home.finalCta.buttonLabel.ru} />
                      <Input label="Final CTA button EN" name="finalCtaButtonLabelEn" defaultValue={content.home.finalCta.buttonLabel.en} />
                    </ContentGrid>

                    <Button className="w-full sm:w-fit" type="submit">
                      {isRu ? "Сохранить главную" : "Save home page"}
                    </Button>
                  </FeedbackForm>
                </div>
              </section>

              <section className="surface p-6">
                <h2 className="text-24 font-medium text-qidra-dark">{isRu ? "Футер, контакты и ссылки" : "Footer, contacts, and links"}</h2>
                <div className="mt-5">
                  <FeedbackForm
                    className="grid gap-8"
                    endpoint={`/api/admin/site-content/footer?lang=${locale}`}
                    feedback={{
                      title: isRu ? "Футер обновлён" : "Footer updated",
                      text: isRu ? "Контакты, ссылки и блоки футера сохранены." : "Footer links, contact data, and blocks were saved.",
                      buttonLabel: isRu ? "Понятно" : "Got it",
                      dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                      tone: "success"
                    }}
                    refreshOnSuccess
                  >
                    <ContentGrid>
                      <TextArea label="Company text" name="companyText" defaultValue={content.footer.companyText} />
                      <Input label="Cooperation email" name="cooperationEmail" defaultValue={content.footer.cooperationEmail} />
                      <Input label="Cooperation label RU" name="cooperationLabelRu" defaultValue={content.footer.cooperationLabel.ru} />
                      <Input label="Cooperation label EN" name="cooperationLabelEn" defaultValue={content.footer.cooperationLabel.en} />
                      <Input label="Privacy slug" name="privacySlug" defaultValue={content.footer.privacySlug} />
                      <Input label="Telegram URL" name="socialTelegram" defaultValue={content.footer.socialLinks.telegram} />
                      <Input label="Instagram URL" name="socialInstagram" defaultValue={content.footer.socialLinks.instagram} />
                      <Input label="WhatsApp URL" name="socialWhatsapp" defaultValue={content.footer.socialLinks.whatsapp} />
                    </ContentGrid>

                    <ContentGrid>
                      {content.footer.projectLinks.map((item, index) => (
                        <FieldGroup key={`footer-project-${index}`} title={`${isRu ? "Проекты" : "Projects"} ${index + 1}`}>
                          <Input label="Label RU" name={`projectLink${index}LabelRu`} defaultValue={item.label.ru} />
                          <Input label="Label EN" name={`projectLink${index}LabelEn`} defaultValue={item.label.en} />
                          <Input label="Href" name={`projectLink${index}Href`} defaultValue={item.href} />
                        </FieldGroup>
                      ))}
                      {content.footer.aboutLinks.map((item, index) => (
                        <FieldGroup key={`footer-about-${index}`} title={`${isRu ? "О платформе" : "About"} ${index + 1}`}>
                          <Input label="Label RU" name={`aboutLink${index}LabelRu`} defaultValue={item.label.ru} />
                          <Input label="Label EN" name={`aboutLink${index}LabelEn`} defaultValue={item.label.en} />
                          <Input label="Href" name={`aboutLink${index}Href`} defaultValue={item.href} />
                        </FieldGroup>
                      ))}
                    </ContentGrid>

                    <Button className="w-full sm:w-fit" type="submit">
                      {isRu ? "Сохранить футер" : "Save footer"}
                    </Button>
                  </FeedbackForm>
                </div>
              </section>

              <section className="surface p-6">
                <h2 className="text-24 font-medium text-qidra-dark">FAQ</h2>
                <div className="mt-5">
                  <FeedbackForm
                    className="grid gap-8"
                    endpoint={`/api/admin/site-content/faq?lang=${locale}`}
                    feedback={{
                      title: isRu ? "FAQ обновлён" : "FAQ updated",
                      text: isRu ? "Вопросы и ответы сохранены." : "Questions and answers were saved.",
                      buttonLabel: isRu ? "Понятно" : "Got it",
                      dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                      tone: "success"
                    }}
                    refreshOnSuccess
                  >
                    <ContentGrid>
                      {content.faqItems.map((item, index) => (
                        <FieldGroup key={`faq-${index}`} title={`FAQ ${index + 1}`}>
                          <TextArea label="Question RU" name={`faq${index}QuestionRu`} defaultValue={item.question.ru} />
                          <TextArea label="Question EN" name={`faq${index}QuestionEn`} defaultValue={item.question.en} />
                          <TextArea label="Answer RU" name={`faq${index}AnswerRu`} defaultValue={item.answer.ru} />
                          <TextArea label="Answer EN" name={`faq${index}AnswerEn`} defaultValue={item.answer.en} />
                        </FieldGroup>
                      ))}
                    </ContentGrid>
                    <Button className="w-full sm:w-fit" type="submit">
                      {isRu ? "Сохранить FAQ" : "Save FAQ"}
                    </Button>
                  </FeedbackForm>
                </div>
              </section>

              <section className="surface p-6">
                <h2 className="text-24 font-medium text-qidra-dark">{isRu ? "Юридические документы" : "Legal documents"}</h2>
                <p className="mt-2 text-15 text-qidra-grayBlue">{isRu ? "Для каждой страницы можно обновить заголовок, текст и загрузить новый PDF/DOC/DOCX." : "Each legal page can update its title, body, and upload a new PDF/DOC/DOCX file."}</p>
                <div className="mt-5 grid gap-5">
                  {content.legalPages.map((page) => (
                    <FeedbackForm
                      key={page.slug}
                      className="rounded-qidra border border-qidra-line bg-qidra-panel p-5"
                      endpoint={`/api/admin/site-content/legal/${page.slug}?lang=${locale}`}
                      payload="form-data"
                      feedback={{
                        title: isRu ? "Документ обновлён" : "Document updated",
                        text: isRu ? "Юридический раздел и файл сохранены." : "The legal page and file were saved.",
                        buttonLabel: isRu ? "Понятно" : "Got it",
                        dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                        tone: "success"
                      }}
                      refreshOnSuccess
                    >
                      <div className="grid gap-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="text-20 font-medium text-qidra-dark">{page.slug}</h3>
                            <div className="mt-1 grid gap-1 text-14 text-qidra-grayBlue">
                                <span>
                                  {legalAssetHref(page, "ru") ? (
                                    <a className="text-qidra-accent hover:text-qidra-dark" href={legalAssetHref(page, "ru") ?? "#"} target="_blank" rel="noreferrer">
                                      {isRu ? "Открыть RU-файл" : "Open RU file"}
                                    </a>
                                  ) : isRu ? "RU-файл пока не загружен" : "No RU file uploaded yet"}
                                </span>
                                <span>
                                  {legalAssetHref(page, "en") ? (
                                    <a className="text-qidra-accent hover:text-qidra-dark" href={legalAssetHref(page, "en") ?? "#"} target="_blank" rel="noreferrer">
                                      {isRu ? "Открыть EN-файл" : "Open EN file"}
                                    </a>
                                  ) : isRu ? "EN-файл пока не загружен" : "No EN file uploaded yet"}
                                </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <Input label="Title RU" name="titleRu" defaultValue={page.title.ru} />
                          <Input label="Title EN" name="titleEn" defaultValue={page.title.en} />
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <TextArea label="Body RU" name="bodyRu" defaultValue={page.body.ru} />
                          <TextArea label="Body EN" name="bodyEn" defaultValue={page.body.en} />
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                          <FileUpload
                            label={isRu ? "Новый RU-файл" : "New RU file"}
                            name="fileRu"
                            chooseLabel={isRu ? "Выбрать RU-файл" : "Select RU file"}
                            selectedLabel={isRu ? "Выбрано" : "Selected"}
                            hint={isRu ? "PDF, DOC, DOCX" : "PDF, DOC, DOCX"}
                            accept=".pdf,.doc,.docx"
                          />
                          <FileUpload
                            label={isRu ? "Новый EN-файл" : "New EN file"}
                            name="fileEn"
                            chooseLabel={isRu ? "Выбрать EN-файл" : "Select EN file"}
                            selectedLabel={isRu ? "Выбрано" : "Selected"}
                            hint={isRu ? "PDF, DOC, DOCX" : "PDF, DOC, DOCX"}
                            accept=".pdf,.doc,.docx"
                          />
                        </div>
                        <Button className="w-full sm:w-fit" type="submit">
                          {isRu ? "Сохранить документ" : "Save document"}
                        </Button>
                      </div>
                    </FeedbackForm>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function ContentGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5">{children}</div>;
}

function FieldGroup({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="grid gap-4 rounded-qidra border border-qidra-line bg-qidra-panel p-4">
      <h3 className="text-16 font-medium text-qidra-dark">{title}</h3>
      {children}
    </div>
  );
}

function TextArea({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return (
    <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
      <span>{label}</span>
      <textarea
        className="field-shell min-h-28 rounded-qidra px-4 py-3 text-16 outline-none placeholder:text-qidra-grayMedium"
        defaultValue={defaultValue}
        maxLength={5000}
        name={name}
      />
    </label>
  );
}
