import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ProjectCard } from "@/components/ProjectCard";
import { getLocale, type SearchParams, withLocale } from "@/lib/i18n";
import { mapProject } from "@/lib/project-catalog";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
  searchParams
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const [{ userId }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const isRu = locale === "ru";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      investorProfile: {
        select: {
          city: true,
          country: true
        }
      },
      projectSubmissions: {
        where: {
          status: "APPROVED",
          projectId: { not: null }
        },
        include: {
          project: {
            include: {
              documents: true,
              projectSubmissions: {
                where: { status: "APPROVED" },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      investorProfile: {
                        select: {
                          city: true,
                          country: true
                        }
                      }
                    }
                  }
                },
                take: 1
              }
            }
          }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  });

  if (!user) notFound();

  const projects = user.projectSubmissions.flatMap((submission) => (submission.project ? [mapProject(submission.project)] : []));
  if (!projects.length) notFound();

  const displayName = user.name || (isRu ? "Участник Qidra" : "Qidra participant");
  const location = [user.investorProfile?.country, user.investorProfile?.city].filter(Boolean).join(", ");

  return (
    <>
      <Header locale={locale} path={`/profiles/${user.id}`} />
      <main>
        <section className="bg-qidra-grayLight px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <Breadcrumbs
              items={[
                { label: "Qidra", href: withLocale("/", locale) },
                { label: isRu ? "Проекты" : "Projects", href: withLocale("/projects", locale) },
                { label: displayName }
              ]}
            />
            <div className="grid gap-8 rounded-[24px] bg-white p-7 shadow-[0_0_0_1px_rgba(18,20,23,0.08)] sm:p-10 lg:grid-cols-[1fr_420px] lg:items-end">
              <div className="grid gap-5">
                <p className="text-14 font-semibold uppercase text-qidra-accent">{isRu ? "Публичный профиль инициатора" : "Public initiator profile"}</p>
                <h1 className="text-[44px] font-medium leading-[1.05] tracking-[0] text-qidra-dark sm:text-[64px]">{displayName}</h1>
                <p className="max-w-3xl text-20 text-qidra-grayBlue">
                  {isRu
                    ? "Профиль показывает проекты, которые инициатор разместил через Qidra и которые прошли первичную проверку платформы."
                    : "This profile shows projects submitted through Qidra that passed the platform's initial review."}
                </p>
              </div>
              <dl className="grid gap-3 rounded-[18px] bg-qidra-grayLight p-5 text-15">
                <ProfileFact label={isRu ? "Статус" : "Status"} value={isRu ? "Инициатор проекта" : "Project initiator"} />
                <ProfileFact label={isRu ? "Локация" : "Location"} value={location || (isRu ? "Не указана" : "Not specified")} />
                <ProfileFact label={isRu ? "На платформе" : "On platform"} value={formatDate(user.createdAt, locale)} />
                <ProfileFact label={isRu ? "Залистенные проекты" : "Listed projects"} value={String(projects.length)} />
              </dl>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:px-11 lg:py-16">
          <div className="mx-auto grid max-w-[1840px] gap-8">
            <div className="grid gap-3">
              <h2 className="text-[36px] font-medium leading-tight tracking-[0] text-qidra-dark sm:text-[48px]">
                {isRu ? "Проекты инициатора" : "Initiator projects"}
              </h2>
              <p className="max-w-3xl text-18 text-qidra-grayBlue">
                {isRu
                  ? "Откройте карточку проекта, чтобы изучить документы, условия участия, план запуска и текущий статус сбора."
                  : "Open a project card to review documents, participation terms, launch plan and current raise status."}
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} locale={locale} />
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer locale={locale} />
    </>
  );
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-qidra-grayMedium/20 pb-3 last:border-b-0 last:pb-0">
      <dt className="text-qidra-grayBlue">{label}</dt>
      <dd className="text-right font-medium text-qidra-dark">{value}</dd>
    </div>
  );
}

function formatDate(value: Date, locale: "ru" | "en") {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-US", { dateStyle: "medium" }).format(value);
}
