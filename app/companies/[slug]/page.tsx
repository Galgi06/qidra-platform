import Image from "next/image";
import { getServerSession } from "next-auth";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { ButtonLink } from "@/components/ui/Button";
import { recordOrganizationEvent } from "@/lib/company-workspace";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { authOptions } from "@/lib/next-auth";
import { companyStatusLabel } from "@/lib/organizations";
import { getPublicProjects } from "@/lib/project-catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function CompanyPublicPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<SearchParams> }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = (await getServerSession(authOptions)) as { user?: { id?: string } } | null;
  const organization = await prisma.organization.findUnique({
    where: { publicSlug: slug },
    include: {
      _count: {
        select: {
          members: true,
          projects: true
        }
      }
    }
  });

  if (!organization) notFound();

  const isRu = locale === "ru";
  const projects = (await getPublicProjects()).filter((project) => project.organization?.publicSlug === slug);

  await recordOrganizationEvent({
    organizationId: organization.id,
    path: `/companies/${slug}`,
    type: "COMPANY_PAGE_VIEW",
    userId: session?.user?.id
  });

  return (
    <>
      <Header locale={locale} path={`/companies/${slug}`} />
      <main className="premium-page">
        <section className="relative overflow-hidden bg-qidra-dark px-5 py-14 text-white sm:px-8 lg:px-11 lg:py-20">
          {organization.heroImageUrl ? (
            <Image alt={organization.displayName} className="object-cover opacity-35" fill priority sizes="100vw" src={organization.heroImageUrl} />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(18,20,23,0.94)_0%,rgba(20,70,60,0.78)_52%,rgba(18,20,23,0.92)_100%)]" />
          <div className="relative z-10 mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="section-kicker border-white/18 bg-white/10 text-white">{isRu ? "Публичный профиль компании" : "Public company profile"}</p>
              <h1 className="mt-6 text-[44px] font-medium leading-[1.08] tracking-[0] sm:text-[58px] lg:text-[72px]">{organization.displayName}</h1>
              <p className="mt-5 max-w-4xl text-[20px] leading-[1.4] text-white/82 sm:text-[24px]">
                {organization.valueProposition ||
                  (isRu
                    ? "Компания использует Qidra как технологическую и информационную платформу для публичного позиционирования, листинга предложений и получения лидов."
                    : "The company uses Qidra as an informational and technology platform for public positioning, listings, and inbound lead generation.")}
              </p>
            </div>
            <div className="rounded-[22px] bg-white/10 p-6 backdrop-blur">
              <div className="grid gap-3 text-14 text-white/82">
                <InfoRow label={isRu ? "Статус" : "Status"} value={companyStatusLabel(organization.status, locale)} />
                <InfoRow label={isRu ? "Страна" : "Country"} value={organization.country || (isRu ? "Не указана" : "Not set")} />
                <InfoRow label={isRu ? "Город" : "City"} value={organization.city || (isRu ? "Не указан" : "Not set")} />
                <InfoRow label={isRu ? "Контакт" : "Contact"} value={organization.contactEmail || (isRu ? "Через форму листинга" : "Through listing flow")} />
                <InfoRow label={isRu ? "Представитель" : "Representative"} value={organization.representativeName || (isRu ? "Не указан" : "Not set")} />
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <section className="premium-card p-6 sm:p-8">
              <h2 className="text-[32px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "О компании" : "About the company"}</h2>
              <p className="mt-5 whitespace-pre-line text-18 leading-8 text-qidra-grayBlue">
                {organization.overview ||
                  (isRu
                    ? "Компания ещё завершает оформление профиля. Скоро здесь появится полное описание, документы и продуктовые направления."
                    : "The company is still completing its profile. A full overview, documents, and product directions will appear here soon.")}
              </p>
              {organization.targetAudience ? (
                <>
                  <h3 className="mt-8 text-[24px] font-medium leading-tight text-qidra-dark">{isRu ? "Для кого" : "Who it serves"}</h3>
                  <p className="mt-3 whitespace-pre-line text-16 leading-7 text-qidra-grayBlue">{organization.targetAudience}</p>
                </>
              ) : null}
              {organization.productSummary ? (
                <>
                  <h3 className="mt-8 text-[24px] font-medium leading-tight text-qidra-dark">{isRu ? "Продукты и направления" : "Products and directions"}</h3>
                  <p className="mt-3 whitespace-pre-line text-16 leading-7 text-qidra-grayBlue">{organization.productSummary}</p>
                </>
              ) : null}
            </section>

            <aside className="grid content-start gap-5">
              <div className="grid gap-5 sm:grid-cols-3">
                <MetricCard label={isRu ? "Команда" : "Team"} value={organization._count.members.toString()} />
                <MetricCard label={isRu ? "Проекты" : "Projects"} value={organization._count.projects.toString()} />
                <MetricCard label={isRu ? "В каталоге" : "Marketplace"} value={projects.length.toString()} />
              </div>
              <div className="premium-card p-6 sm:p-8">
                <h2 className="text-[26px] font-medium leading-tight tracking-[0] text-qidra-dark">{isRu ? "Контакты и доверие" : "Contacts and trust"}</h2>
                <div className="mt-5 grid gap-3 text-15 text-qidra-grayBlue">
                  <InfoLine label={isRu ? "Юридическое имя" : "Legal name"} value={organization.legalName} />
                  <InfoLine label={isRu ? "Тип компании" : "Company type"} value={organization.typeLabel || (isRu ? "Не указан" : "Not set")} />
                  <InfoLine label="Website" value={organization.website || (isRu ? "Не указан" : "Not set")} />
                  <InfoLine label={isRu ? "Контактный email" : "Contact email"} value={organization.contactEmail || (isRu ? "Не указан" : "Not set")} />
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:px-11 lg:pb-28">
          <div className="mx-auto grid max-w-[1840px] gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[44px]">{isRu ? "Предложения компании" : "Company offerings"}</h2>
                <p className="mt-3 max-w-4xl text-18 text-qidra-grayBlue">
                  {isRu ? "Публичные проекты и продукты, размещённые компанией через платформу Qidra." : "Public projects and products listed by the company through the Qidra platform."}
                </p>
              </div>
              <ButtonLink href={withLocale("/projects", locale)} variant="outline">
                {isRu ? "Все проекты платформы" : "All platform projects"}
              </ButtonLink>
            </div>
            {projects.length ? (
              <div className="grid gap-5 lg:grid-cols-2">
                {projects.map((project) => (
                  <ProjectCard key={project.slug} locale={locale} project={project} />
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] bg-white p-6 text-16 text-qidra-grayBlue shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
                {isRu ? "Компания пока не опубликовала активные предложения на платформе." : "The company has not published active offerings on the platform yet."}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(18,20,23,0.08)]">
      <p className="text-14 text-qidra-grayBlue">{label}</p>
      <p className="mt-3 text-[28px] font-medium leading-none text-qidra-dark">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-wrap justify-between gap-2 border-b border-white/10 pb-2 last:border-b-0">
      <span>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-13 text-qidra-grayBlue">{label}</p>
      <p className="mt-1 font-medium text-qidra-dark">{value}</p>
    </div>
  );
}
