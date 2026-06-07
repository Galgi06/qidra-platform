import { SupportQueue, SupportThreadStatus } from "@prisma/client";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestorTabs } from "@/components/InvestorTabs";
import { NotificationCard } from "@/components/NotificationCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SupportAutoRefresh } from "@/components/support/SupportAutoRefresh";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function InvestorSupportPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor/support");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const latestThread = await prisma.supportThread.findFirst({
    where: { userId },
    include: {
      assignedTo: {
        select: {
          name: true,
          email: true
        }
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 30
      }
    },
    orderBy: { updatedAt: "desc" }
  });
  const thread = latestThread?.status === SupportThreadStatus.CLOSED ? null : latestThread;
  const closedThread = latestThread?.status === SupportThreadStatus.CLOSED ? latestThread : null;
  const messages = [...(thread?.messages ?? [])].reverse();

  return (
    <>
      <SupportAutoRefresh />
      <Header locale={locale} path="/investor/support" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Профиль участника" : "Participant profile"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Поддержка Qidra" : "Qidra support"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Отправляйте вопросы по профилю, платежам, проектам и документам. Ответы команды будут сохраняться в этом диалоге."
                  : "Send questions about your profile, payments, projects and documents. Team replies will be stored in this thread."}
              </p>
            </div>
            <InvestorTabs activePath="/investor/support" locale={locale} />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[1fr_0.42fr]">
            <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
              <div>
                <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Личный диалог" : "Personal thread"}</h2>
                <p className="mt-2 text-16 text-qidra-grayBlue">
                  {thread
                    ? isRu
                      ? `Статус: ${supportStatusLabel(thread.status, locale)}. Направление: ${supportQueueLabel(thread.queue, locale)}.`
                      : `Status: ${supportStatusLabel(thread.status, locale)}. Queue: ${supportQueueLabel(thread.queue, locale)}.`
                    : isRu
                      ? "Диалог будет создан после первого сообщения."
                      : "A thread will be created after the first message."}
                </p>
              </div>

              {messages.length ? (
                <div className="grid gap-3">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      align={message.senderId === userId ? "right" : "left"}
                      author={message.senderId === userId ? (isRu ? "Вы" : "You") : message.sender?.name || "Qidra"}
                      body={message.body}
                      date={formatDateTime(message.createdAt, locale)}
                    />
                  ))}
                </div>
              ) : (
                <NotificationCard
                  title={isRu ? "Сообщений пока нет" : "No messages yet"}
                  text={isRu ? "Напишите первый вопрос команде Qidra." : "Write the first question to the Qidra team."}
                />
              )}

              {closedThread ? (
                closedThread.rating ? (
                  <NotificationCard
                    title={isRu ? "Оценка поддержки сохранена" : "Support rating saved"}
                    text={
                      isRu
                        ? `Вы оценили работу поддержки на ${closedThread.rating} из 5. Спасибо за обратную связь.`
                        : `You rated support ${closedThread.rating} out of 5. Thank you for the feedback.`
                    }
                    tone="success"
                  />
                ) : (
                  <FeedbackForm
                    className="grid gap-4 rounded-[18px] bg-qidra-grayLight p-5"
                    endpoint={`/api/support/threads/${closedThread.id}/rating?lang=${locale}`}
                    feedback={{
                      title: isRu ? "Спасибо за оценку" : "Thanks for the rating",
                      text: isRu ? "Оценка сохранена и попадёт в статистику качества поддержки." : "The rating was saved and will appear in support quality statistics.",
                      buttonLabel: isRu ? "Понятно" : "Got it",
                      dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                      tone: "success"
                    }}
                    refreshOnSuccess
                    popupPlacement="center"
                  >
                    <fieldset className="grid gap-3">
                      <legend className="text-18 font-medium text-qidra-dark">{isRu ? "Оцените работу поддержки" : "Rate support"}</legend>
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <label key={rating} className="flex cursor-pointer items-center gap-2 rounded-qidra bg-white px-4 py-3 text-18 font-medium text-qidra-dark shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
                            <input className="accent-qidra-accent" name="rating" required type="radio" value={rating} />
                            <span aria-hidden="true">{"★".repeat(rating)}</span>
                            <span className="sr-only">{rating}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                      {isRu ? "Комментарий" : "Comment"}
                      <textarea
                        className="min-h-24 rounded-qidra border border-transparent bg-white px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
                        maxLength={1000}
                        name="ratingComment"
                        placeholder={isRu ? "Что можно улучшить или что понравилось" : "What could be improved or what worked well"}
                      />
                    </label>
                    <Button type="submit">{isRu ? "Сохранить оценку" : "Save rating"}</Button>
                  </FeedbackForm>
                )
              ) : null}

              {closedThread ? (
                <NotificationCard
                  title={isRu ? "Последний диалог закрыт" : "Last thread closed"}
                  text={
                    isRu
                      ? "Предыдущее обращение завершено. Для нового вопроса выберите направление и отправьте новое сообщение."
                      : "The previous request is resolved. Choose a department and send a new message for a new question."
                  }
                  tone="success"
                />
              ) : null}

              <FeedbackForm
                className="grid gap-4 border-t border-qidra-grayLight pt-5"
                endpoint={`/api/support/messages?lang=${locale}`}
                feedback={{
                  title: isRu ? "Сообщение отправлено" : "Message sent",
                  text: isRu ? "Команда Qidra увидит обращение в панели коммуникаций." : "The Qidra team will see it in the communications panel.",
                  buttonLabel: isRu ? "Понятно" : "Got it",
                  dismissLabel: isRu ? "Закрыть уведомление" : "Close notification",
                  tone: "success"
                }}
                refreshOnSuccess
                resetOnSubmit
                popupPlacement="center"
              >
                {!thread ? <Input label={isRu ? "Тема" : "Subject"} name="subject" placeholder={isRu ? "Например: вопрос по платежу" : "For example: payment question"} /> : null}
                {!thread ? (
                  <Select
                    label={isRu ? "Направление" : "Department"}
                    name="queue"
                    defaultValue={SupportQueue.TECH_SUPPORT}
                    options={[
                      { value: SupportQueue.TECH_SUPPORT, label: isRu ? "Техподдержка" : "Technical support" },
                      { value: SupportQueue.SALES, label: isRu ? "Отдел продаж / проекты" : "Sales / projects" }
                    ]}
                  />
                ) : null}
                <label className="grid gap-2 text-14 font-medium text-qidra-dark">
                  {isRu ? "Сообщение" : "Message"}
                  <textarea
                    className="min-h-36 rounded-qidra border border-transparent bg-qidra-grayLight px-4 py-3 text-16 outline-none transition-colors placeholder:text-qidra-grayMedium focus:border-qidra-accent"
                    maxLength={3000}
                    name="body"
                    placeholder={isRu ? "Опишите вопрос или ситуацию" : "Describe the question or situation"}
                    required
                  />
                </label>
                <Button type="submit">{isRu ? "Отправить сообщение" : "Send message"}</Button>
              </FeedbackForm>
            </section>

            <aside className="grid content-start gap-5">
              <NotificationCard
                title={isRu ? "Когда писать сюда" : "When to use this"}
                text={isRu ? "Используйте поддержку для вопросов по KYC, пополнениям, заявкам участия и документам проектов." : "Use support for KYC, deposits, participation applications and project documents."}
                tone="info"
              />
              <NotificationCard
                title={isRu ? "Назначенный менеджер" : "Assigned manager"}
                text={thread?.assignedTo ? thread.assignedTo.name || thread.assignedTo.email : isRu ? "Менеджер будет назначен после обработки обращения." : "A manager will be assigned after the request is reviewed."}
              />
              <NotificationCard
                title={isRu ? "Направление обращения" : "Request department"}
                text={
                  thread
                    ? supportQueueLabel(thread.queue, locale)
                    : isRu
                      ? "Выберите направление при первом сообщении: техподдержка или отдел продаж."
                      : "Choose a department with your first message: technical support or sales."
                }
              />
            </aside>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function MessageBubble({ align, author, body, date }: { align: "left" | "right"; author: string; body: string; date: string }) {
  const own = align === "right";

  return (
    <article className={`max-w-3xl rounded-[18px] p-4 ${own ? "justify-self-end bg-qidra-accent text-white" : "justify-self-start bg-qidra-grayLight text-qidra-dark"}`}>
      <div className="flex flex-wrap items-center gap-2 text-12 font-medium">
        <span>{author}</span>
        <span className={own ? "text-white/70" : "text-qidra-grayBlue"}>{date}</span>
      </div>
      <p className={`mt-2 whitespace-pre-wrap text-15 ${own ? "text-white" : "text-qidra-grayBlue"}`}>{body}</p>
    </article>
  );
}

function supportStatusLabel(status: string, locale: "ru" | "en") {
  if (status === "CLOSED") return locale === "ru" ? "закрыт" : "closed";
  if (status === "PENDING") return locale === "ru" ? "ожидает ответа участника" : "waiting for participant";
  return locale === "ru" ? "открыт" : "open";
}

function supportQueueLabel(queue: string, locale: "ru" | "en") {
  if (queue === SupportQueue.SALES) return locale === "ru" ? "Отдел продаж / проекты" : "Sales / projects";
  return locale === "ru" ? "Техподдержка" : "Technical support";
}

function formatDateTime(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  }).format(date);
}
