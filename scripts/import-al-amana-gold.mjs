#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { InvestmentStatus, PayoutFrequency, Prisma, ProjectStatus, Role } from "@prisma/client";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));

const options = parseArgs(process.argv.slice(2));
const workbookPath = options.workbook ?? options._[0];
const pythonBin = options.python ?? process.env.AL_AMANA_PYTHON ?? "python3";
const apply = Boolean(options.apply);
const verbose = Boolean(options.verbose);
const projectSlug = options["project-slug"] ?? "al-amana-gold";
const projectTitleRu = options["project-title-ru"] ?? "Al Amana Gold";
const projectTitleEn = options["project-title-en"] ?? "Al Amana Gold";
const generatedEmailDomain = options["email-domain"] ?? "qidra.import";

if (!workbookPath) {
  printUsage();
  process.exit(1);
}

loadEnvLocal();

const parsed = parseWorkbook({ pythonBin, workbookPath });

printPreview(parsed, { apply, verbose });

if (!apply) {
  console.log("\nDry-run only. Add --apply to write this import into the database.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local or export it before running --apply.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  await importIntoDatabase(parsed);
} finally {
  await prisma.$disconnect();
}

async function importIntoDatabase(report) {
  const periodStart = new Date(`${report.period.start}T00:00:00.000Z`);
  const periodEnd = new Date(`${report.period.end}T00:00:00.000Z`);
  const targetUsdt = toDecimal(options["target-usdt"] ?? report.totals.totalInvestedUsdt);
  const project = await prisma.project.upsert({
    where: { slug: projectSlug },
    create: {
      slug: projectSlug,
      titleRu: projectTitleRu,
      titleEn: projectTitleEn,
      summaryRu: "Золотой товарный проект с квартальной отчётностью и распределением результата по подтверждённым периодам.",
      summaryEn: "Gold commodity project with quarterly reporting and result distribution by approved periods.",
      descriptionRu:
        "Al Amana Gold учитывается как проект с реальными операциями покупки и продажи золота. Участие фиксируется по сумме и дате входа, квартальная выплата рассчитывается пропорционально весу участия.",
      descriptionEn:
        "Al Amana Gold is tracked as a project with real gold purchase and sale operations. Participation is recorded by amount and entry date, and quarterly payouts are calculated by participation weight.",
      expectedReturnRu: "Зависит от фактической чистой прибыли квартала и утверждённой доли участников.",
      expectedReturnEn: "Depends on the actual quarterly net profit and the approved participant share.",
      expectedYieldRu: "Не фиксируется и не гарантируется; квартальный расчёт по отчёту проекта.",
      expectedYieldEn: "Not fixed and not guaranteed; quarterly calculation based on project reporting.",
      stageRu: "Действующий товарный проект",
      stageEn: "Operating commodity project",
      currentProgressRu: "Квартальный учёт ведётся по операциям покупки, продажи и расходам проекта.",
      currentProgressEn: "Quarterly accounting is based on purchase, sale and expense records.",
      status: ProjectStatus.ACTIVE,
      targetUsdt,
      fundedUsdt: 0,
      location: "UAE",
      structure: "Mudaraba",
      riskLevel: "Medium",
      payoutFrequency: PayoutFrequency.QUARTERLY,
      fundraisingStartAt: periodStart,
      fundraisingEndAt: periodEnd,
      plannedDividendAt: periodEnd,
      participationTermRu: "Квартальная отчётность, условия участия фиксируются в договоре.",
      participationTermEn: "Quarterly reporting; participation terms are fixed in the agreement.",
    },
    update: {
      payoutFrequency: PayoutFrequency.QUARTERLY,
      expectedReturnRu: "Зависит от фактической чистой прибыли квартала и утверждённой доли участников.",
      expectedReturnEn: "Depends on the actual quarterly net profit and the approved participant share.",
      expectedYieldRu: "Не фиксируется и не гарантируется; квартальный расчёт по отчёту проекта.",
      expectedYieldEn: "Not fixed and not guaranteed; quarterly calculation based on project reporting.",
    },
  });

  const applicationByInvestorKey = new Map();
  let createdUsers = 0;
  let createdApplications = 0;
  let reusedApplications = 0;

  for (const investor of report.investors) {
    const email = generatedInvestorEmail(investor);
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: investor.name,
        role: Role.INVESTOR,
      },
      update: {
        name: investor.name,
      },
    });

    if (user.createdAt.getTime() === user.updatedAt.getTime()) {
      createdUsers += 1;
    }

    await prisma.wallet.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    const amountUsdt = toDecimal(investor.amountUsdt);
    const contractAcceptedAt = new Date(`${investor.entryDate}T00:00:00.000Z`);
    const existingApplication = await prisma.investmentApplication.findFirst({
      where: {
        userId: user.id,
        projectId: project.id,
        amountUsdt,
        contractAcceptedAt,
        status: InvestmentStatus.CONFIRMED,
      },
      select: { id: true },
    });

    const application =
      existingApplication ??
      (await prisma.investmentApplication.create({
        data: {
          userId: user.id,
          projectId: project.id,
          amountUsdt,
          reservedUsdt: 0,
          status: InvestmentStatus.CONFIRMED,
          termsAcceptedAt: contractAcceptedAt,
          contractAcceptedAt,
          createdAt: contractAcceptedAt,
          adminNote: `Imported from Al Amana Gold workbook: ${report.period.label}`,
        },
        select: { id: true },
      }));

    if (existingApplication) {
      reusedApplications += 1;
    } else {
      createdApplications += 1;
    }

    applicationByInvestorKey.set(investor.key, {
      id: application.id,
      userId: user.id,
      amountUsdt,
    });
  }

  const totalConfirmed = await prisma.investmentApplication.aggregate({
    where: { projectId: project.id, status: InvestmentStatus.CONFIRMED },
    _sum: { amountUsdt: true },
  });

  const fundedUsdt = totalConfirmed._sum.amountUsdt ?? new Prisma.Decimal(0);

  await prisma.project.update({
    where: { id: project.id },
    data: {
      fundedUsdt,
      ...(fundedUsdt.gte(targetUsdt) ? { status: ProjectStatus.FUNDED } : {}),
    },
  });

  const existingPeriod = await prisma.projectDividendPeriod.findUnique({
    where: {
      projectId_periodLabel: {
        projectId: project.id,
        periodLabel: report.period.label,
      },
    },
  });

  if (existingPeriod?.status === "PAID") {
    throw new Error(`Dividend period ${report.period.label} is already paid and cannot be overwritten.`);
  }

  const periodPayload = {
    titleRu: `${project.titleRu}: ${report.period.label}`,
    titleEn: `${project.titleEn}: ${report.period.label}`,
    periodLabel: report.period.label,
    periodStart,
    periodEnd,
    grossRevenueUsdt: toDecimal(report.totals.grossRevenueUsdt),
    directCostUsdt: toDecimal(report.totals.directCostUsdt),
    operatingExpenseUsdt: toDecimal(report.totals.operatingExpenseUsdt),
    netProfitUsdt: toDecimal(report.totals.netProfitUsdt),
    investorPoolUsdt: toDecimal(report.totals.investorPoolUsdt),
    investorSharePercent: toDecimal(report.period.investorSharePercent),
    status: "DRAFT",
    adminNote: `Imported from ${report.workbook}`,
  };

  const period =
    existingPeriod ??
    (await prisma.projectDividendPeriod.create({
      data: {
        projectId: project.id,
        ...periodPayload,
      },
    }));

  await prisma.$transaction(async (tx) => {
    await tx.dividendPayment.deleteMany({ where: { periodId: period.id } });
    await tx.projectDividendPeriod.update({
      where: { id: period.id },
      data: periodPayload,
    });

    const payments = report.investors
      .filter((investor) => Number(investor.dividendUsdt) > 0)
      .map((investor) => {
        const application = applicationByInvestorKey.get(investor.key);

        if (!application) {
          throw new Error(`Missing imported application for investor key ${investor.key}`);
        }

        return {
          periodId: period.id,
          investmentId: application.id,
          userId: application.userId,
          amountUsdt: toDecimal(investor.dividendUsdt),
          investmentAmountUsdt: application.amountUsdt,
          weight: toDecimal(investor.weight),
          eligibleDays: investor.eligibleDays,
        };
      });

    if (payments.length) {
      await tx.dividendPayment.createMany({ data: payments });
    }

    await tx.adminAuditLog.create({
      data: {
        actorId: null,
        action: "dividend.import.al_amana_gold",
        entityType: "ProjectDividendPeriod",
        entityId: period.id,
        payload: {
          workbook: report.workbook,
          periodLabel: report.period.label,
          projectId: project.id,
          createdApplications,
          reusedApplications,
          payments: payments.length,
          netProfitUsdt: report.totals.netProfitUsdt,
          investorPoolUsdt: report.totals.investorPoolUsdt,
        },
      },
    });
  });

  console.log(
    `\nImported Al Amana Gold: project=${project.slug}, users created≈${createdUsers}, applications created=${createdApplications}, applications reused=${reusedApplications}, dividend period=${report.period.label}.`
  );
}

function parseWorkbook({ pythonBin, workbookPath }) {
  const scriptPath = resolve(__dirname, "parse-al-amana-gold.py");
  const parsedWorkbookPath = resolve(workbookPath);
  const result = spawnSync(pythonBin, [scriptPath, parsedWorkbookPath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
  });

  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    console.error(`Failed to parse workbook with ${pythonBin}. Pass --python /path/to/python that has openpyxl installed.`);
    process.exit(result.status ?? 1);
  }

  return JSON.parse(result.stdout);
}

function printPreview(report, { apply, verbose }) {
  console.log("Al Amana Gold workbook preview");
  console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);
  console.log(`Workbook: ${report.workbook}`);
  console.log(`Period: ${report.period.label} (${report.period.start} - ${report.period.end})`);
  console.log(`Investor share: ${report.period.investorSharePercent}%`);
  console.log(`Investors: ${report.totals.investorCount} total, ${report.totals.eligibleInvestorCount} eligible in period`);
  console.log(`Total invested: ${formatUsdt(report.totals.totalInvestedUsdt)}`);
  console.log(`Revenue: ${formatUsdt(report.totals.grossRevenueUsdt)}`);
  console.log(`Direct cost: ${formatUsdt(report.totals.directCostUsdt)}`);
  console.log(`Operating expenses: ${formatUsdt(report.totals.operatingExpenseUsdt)}`);
  console.log(`Net profit: ${formatUsdt(report.totals.netProfitUsdt)}`);
  console.log(`Investor pool: ${formatUsdt(report.totals.investorPoolUsdt)}`);

  if (verbose) {
    console.log("\nInvestor rows:");
    for (const investor of report.investors) {
      console.log(
        `- row ${investor.row}: ${investor.name} · amount=${formatUsdt(investor.amountUsdt)} · days=${investor.eligibleDays} · dividend=${formatUsdt(investor.dividendUsdt)}`
      );
    }
  }
}

function generatedInvestorEmail(investor) {
  const hash = createHash("sha256").update(`${investor.key}:${investor.name}:${investor.entryDate}:${investor.amountUsdt}`).digest("hex").slice(0, 16);
  return `al-amana-${hash}@${generatedEmailDomain}`.toLowerCase();
}

function toDecimal(value) {
  return new Prisma.Decimal(value ?? 0).toDecimalPlaces(6);
}

function formatUsdt(value) {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(value))} USDT`;
}

function loadEnvLocal() {
  if (process.env.DATABASE_URL || !existsSync(".env.local")) return;

  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
    if (!match) continue;
    process.env.DATABASE_URL = match[1].replace(/^["']|["']$/g, "");
  }
}

function parseArgs(args) {
  const parsed = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      parsed._.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function printUsage() {
  console.log(`Usage:
  node scripts/import-al-amana-gold.mjs --workbook "/path/to/report.xlsx" [--python /path/to/python] [--apply]

Options:
  --apply                 Write users, confirmed applications and a dividend period to the database.
  --verbose               Show investor rows in the preview output.
  --project-slug          Project slug, default: al-amana-gold.
  --target-usdt           Target amount for a newly created project.
  --email-domain          Internal generated email domain, default: qidra.import.
`);
}
