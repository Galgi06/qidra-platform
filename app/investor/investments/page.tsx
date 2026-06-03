import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { Tabs } from "@/components/Tabs";
import { ButtonLink } from "@/components/ui/Button";
import { ProjectStatusBadge, type BadgeStatus } from "@/components/ui/ProjectStatusBadge";
import { requireAuth } from "@/lib/access";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function InvestmentsPage({ searchParams }: { searchParams?: SearchParams }) {
  const locale = await getLocale(searchParams);
  const session = await requireAuth(locale, "/investor/investments");
  const isRu = locale === "ru";
  const userId = session.user?.id ?? "";
  const applications = await prisma.investmentApplication.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { createdAt: "desc" }
  });

  return (
    <>
      <Header locale={locale} path="/investor/investments" />
      <main>
        <section className="bg-qidra-grayLight px-5 py-10 sm:px-8 lg:px-11 lg:py-14">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div>
              <p className="text-14 font-medium uppercase text-qidra-accent">{isRu ? "Кабинет участника" : "Participant cabinet"}</p>
              <h1 className="mt-3 max-w-4xl text-[42px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[56px]">
                {isRu ? "Моё участие" : "My participation"}
              </h1>
              <p className="mt-4 max-w-3xl text-20 text-qidra-grayBlue">
                {isRu
                  ? "Здесь отображаются заявки на участие, которые вы отправили через страницы проектов."
                  : "This page shows participation applications submitted from project pages."}
              </p>
            </div>
            <Tabs
              items={[
                { label: isRu ? "Обзор" : "Overview", href: withLocale("/investor", locale) },
                { label: isRu ? "Проверка" : "Review", href: withLocale("/investor/kyc", locale) },
                { label: isRu ? "Кошелек" : "Wallet", href: withLocale("/investor/wallet", locale) },
                { label: isRu ? "Участие" : "Participation", href: withLocale("/investor/investments", locale), active: true }
              ]}
            />
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-5">
            {applications.length ? (
              <div className="grid gap-4">
                {applications.map((application) => (
                  <article key={application.id} className="rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8">
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.7fr_0.7fr_auto] lg:items-center">
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{formatDate(application.createdAt, locale)}</p>
                        <Link className="mt-2 block text-[24px] font-medium leading-tight tracking-[0] text-qidra-dark hover:text-qidra-accent" href={withLocale(`/projects/${application.project.slug}`, locale)}>
                          {locale === "ru" ? application.project.titleRu : application.project.titleEn}
                        </Link>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{isRu ? "Сумма" : "Amount"}</p>
                        <p className="mt-1 text-18 font-medium text-qidra-dark">{formatUsdt(application.amountUsdt)}</p>
                      </div>
                      <div>
                        <p className="text-14 text-qidra-grayBlue">{isRu ? "Статус" : "Status"}</p>
                        <div className="mt-2">
                          <ProjectStatusBadge status={investmentStatus(application.status)} locale={locale} />
                        </div>
                      </div>
                      <ButtonLink href={withLocale(`/projects/${application.project.slug}/documents`, locale)} variant="outline" size="sm">
                        {isRu ? "Документы" : "Documents"}
                      </ButtonLink>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <section className="grid gap-5 rounded-[20px] bg-white p-6 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <NotificationCard
                  title={isRu ? "Заявок пока нет" : "No applications yet"}
                  text={isRu ? "Выберите проект, изучите документы и отправьте заявку на участие." : "Choose a project, review documents and submit a participation application."}
                />
                <ButtonLink href={withLocale("/projects", locale)}>{isRu ? "Открыть проекты" : "Open projects"}</ButtonLink>
              </section>
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function investmentStatus(status: string): BadgeStatus {
  if (status === "CONFIRMED") return "confirmed";
  if (status === "REJECTED" || status === "CANCELLED") return "rejected";
  return "pending";
}

function formatUsdt(value: { toString(): string }) {
  const amount = Number(value.toString());
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} USDT`;
}

function formatDate(date: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}
