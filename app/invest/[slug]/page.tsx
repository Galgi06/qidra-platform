import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { InvestmentApplicationForm } from "@/components/InvestmentApplicationForm";
import { requireAuth } from "@/lib/access";
import { dictionary, getLocale, type SearchParams } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { getProjectBySlug } from "@/lib/project-catalog";

export const dynamic = "force-dynamic";

export default async function InvestPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: SearchParams }) {
  const [{ slug }, locale] = await Promise.all([params, getLocale(searchParams)]);
  const session = await requireAuth(locale, `/invest/${slug}`);
  const userId = session.user?.id ?? "";
  const project = await getProjectBySlug(slug);
  if (!project) notFound();
  const [latestKyc, wallet, activeApplication] = await Promise.all([
    prisma.kycApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { status: true }
    }),
    prisma.wallet.findUnique({
      where: { userId },
      select: { availableUsdt: true }
    }),
    prisma.investmentApplication.findFirst({
      where: {
        userId,
        project: { slug },
        status: "PENDING"
      },
      orderBy: { createdAt: "desc" },
      select: { amountUsdt: true, id: true, reservedUsdt: true }
    })
  ]);
  const availableUsdt = Number(wallet?.availableUsdt?.toString() ?? 0);
  const activeApplicationAmountUsdt = Number(activeApplication?.amountUsdt?.toString() ?? 0);
  const activeReservedUsdt = Number(activeApplication?.reservedUsdt?.toString() ?? 0);
  const freeUsdt = Math.max(availableUsdt + activeReservedUsdt, 0);
  const kycApproved = latestKyc?.status === "APPROVED";

  return (
    <>
      <Header locale={locale} path={`/invest/${project.slug}`} />
      <main className="section">
        <InvestmentApplicationForm
          endpoint={`/api/investments?lang=${locale}`}
          activeApplicationAmountUsdt={activeApplicationAmountUsdt}
          activeReservedUsdt={activeReservedUsdt}
          freeUsdt={freeUsdt}
          kycApproved={kycApproved}
          locale={locale}
          noFixedYieldText={dictionary[locale].common.noFixedYield}
          projectSlug={project.slug}
          projectTitle={project.title[locale]}
        />
      </main>
      <Footer locale={locale} />
    </>
  );
}
