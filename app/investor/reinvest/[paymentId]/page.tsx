import { DividendPaymentStatus, ProjectStatus, ReinvestmentStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { FeedbackForm } from "@/components/ActionFeedback";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function ReinvestPage({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ paymentId }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = await requireAuth(locale, `/investor/reinvest/${paymentId}`);
  const userId = session.user?.id ?? "";
  const isRu = locale === "ru";
  const [payment, wallet, projects] = await Promise.all([
    prisma.dividendPayment.findFirst({
      where: { id: paymentId, userId, status: DividendPaymentStatus.PAID },
      include: { investment: { include: { project: true } }, reinvestmentOrders: { where: { status: ReinvestmentStatus.COMPLETED } } }
    }),
    prisma.wallet.findUnique({ where: { userId }, select: { availableUsdt: true } }),
    prisma.project.findMany({
      where: { status: ProjectStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      select: { fundedUsdt: true, id: true, targetUsdt: true, titleEn: true, titleRu: true }
    })
  ]);
  if (!payment) notFound();

  const activeProjects = projects.filter((project) => project.fundedUsdt.lt(project.targetUsdt));
  const availableUsdt = Number(wallet?.availableUsdt.toString() ?? 0);
  const paymentUsdt = Number(payment.amountUsdt.toString());
  const maximumUsdt = Math.min(availableUsdt, paymentUsdt);
  const defaultTarget = activeProjects.find((project) => project.id === payment.investment.projectId) ?? activeProjects[0];
  const canReinvest = !payment.reinvestmentOrders.length && maximumUsdt >= 100 && Boolean(defaultTarget);

  return (
    <>
      <Header locale={locale} path={`/investor/reinvest/${payment.id}`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-4xl gap-6">
            <Breadcrumbs items={[
              { label: isRu ? "Моё участие" : "My participation", href: withLocale("/investor/investments", locale) },
              { label: isRu ? "Разовый реинвест" : "One-time reinvestment" }
            ]} />
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "По вашему желанию" : "Your choice"}</p>
              <h1 className="mt-3 text-[42px] font-medium leading-tight text-qidra-dark sm:text-[56px]">{isRu ? "Реинвестировать дивиденды" : "Reinvest dividends"}</h1>
              <p className="mt-4 text-18 text-qidra-grayBlue">
                {isRu ? `Выплата ${formatUsdt(paymentUsdt)} по проекту «${payment.investment.project.titleRu}».` : `${formatUsdt(paymentUsdt)} payout from ${payment.investment.project.titleEn}.`}
              </p>
            </div>
          </div>
        </section>
        <section className="px-5 py-12 sm:px-8 lg:px-11">
          <div className="mx-auto grid max-w-4xl gap-6">
            {payment.reinvestmentOrders.length ? (
              <NotificationCard title={isRu ? "Выплата уже обработана" : "Payout already processed"} text={isRu ? "Для одной дивидендной выплаты допускается только один реинвест." : "Only one reinvestment is allowed per dividend payment."} tone="warning" />
            ) : canReinvest ? (
              <FeedbackForm
                confirm={{
                  title: isRu ? "Подтвердить реинвест?" : "Confirm reinvestment?",
                  text: isRu ? "Средства будут списаны с доступного баланса и направлены в выбранный проект. Операция создаст новый партнёрский контракт." : "Funds will be debited from your available balance and directed to the selected project. The operation creates a new partnership contract.",
                  confirmLabel: isRu ? "Реинвестировать" : "Reinvest",
                  cancelLabel: isRu ? "Отмена" : "Cancel"
                }}
                endpoint={`/api/reinvestments?lang=${locale}`}
                feedback={{ title: isRu ? "Реинвест выполнен" : "Reinvestment completed", text: isRu ? "Новый контракт создан." : "A new contract was created.", buttonLabel: isRu ? "Понятно" : "Got it", dismissLabel: isRu ? "Закрыть уведомление" : "Close notification", tone: "success" }}
              >
                <input name="sourceDividendPaymentId" type="hidden" value={payment.id} />
                <div className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                  <label className="grid gap-2 text-14 font-semibold text-qidra-dark">
                    {isRu ? "Проект" : "Project"}
                    <select className="field-shell h-12 rounded-qidra px-4 text-16 outline-none" defaultValue={defaultTarget?.id} name="targetProjectId" required>
                      {activeProjects.map((project) => <option key={project.id} value={project.id}>{isRu ? project.titleRu : project.titleEn}</option>)}
                    </select>
                  </label>
                  <Input hint={isRu ? `Доступно из этой выплаты: ${formatUsdt(maximumUsdt)}. Минимум 100 USDT.` : `Available from this payout: ${formatUsdt(maximumUsdt)}. Minimum 100 USDT.`} label={isRu ? "Сумма реинвеста" : "Reinvestment amount"} max={maximumUsdt} min="100" name="amount" required step="0.000001" type="number" defaultValue={maximumUsdt} />
                  <Checkbox name="termsAccepted" required>
                    {isRu ? "Я изучил документы и риски выбранного проекта, добровольно подтверждаю новый реинвест и понимаю, что доходность и возврат капитала не гарантируются." : "I reviewed the selected project's documents and risks, voluntarily confirm this new reinvestment, and understand that returns and capital repayment are not guaranteed."}
                  </Checkbox>
                  <div className="flex flex-wrap gap-3">
                    <Button type="submit">{isRu ? "Реинвестировать" : "Reinvest"}</Button>
                    <ButtonLink href={withLocale("/investor/investments", locale)} variant="outline">{isRu ? "Отмена" : "Cancel"}</ButtonLink>
                  </div>
                </div>
              </FeedbackForm>
            ) : (
              <NotificationCard title={isRu ? "Реинвест сейчас недоступен" : "Reinvestment is currently unavailable"} text={isRu ? "Нужен доступный баланс не менее 100 USDT и хотя бы один активный проект со свободным объёмом." : "At least 100 USDT of available balance and an active project with remaining capacity are required."} tone="warning" />
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function formatUsdt(value: number) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value)} USDT`;
}
