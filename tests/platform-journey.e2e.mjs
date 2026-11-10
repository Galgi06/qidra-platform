import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:8092";
const mailpitApiUrl = process.env.MAILPIT_API_URL || "http://127.0.0.1:58025";
const databaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !/(?:test|staging)/i.test(new URL(databaseUrl).pathname)) {
  throw new Error("A safe TEST_DATABASE_URL containing test or staging is required.");
}

process.env.DATABASE_URL = databaseUrl;

const prisma = new PrismaClient();
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const investorEmail = `journey-investor-${suffix}@qidra.invalid`;
const adminEmail = `journey-admin-${suffix}@qidra.invalid`;
const investorPassword = "Journey-Strong-2026!";
const investorResetPassword = "Journey-Reset-2026!";
const adminPassword = "Journey-Admin-2026!";
const projectSlugs = [`journey-origin-${suffix}`, `journey-once-${suffix}`, `journey-auto-${suffix}`];
const createdUserIds = [];
const createdProjectIds = [];
let investorUserId = "";

before(async () => {
  await prisma.$connect();
});

after(async () => {
  await prisma.project.deleteMany({ where: { id: { in: createdProjectIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  if (investorUserId) {
    await rm(path.join(process.cwd(), "storage", "kyc", investorUserId), { force: true, recursive: true });
  }
  await prisma.$disconnect();
});

test("complete investor journey through HTTP APIs", async () => {
  const fixtures = await createFixtures();
  const investor = new HttpSession(baseUrl);
  const admin = new HttpSession(baseUrl);

  await expectJson(investor.request("/api/auth/register?lang=en", {
    method: "POST",
    json: {
      accountType: "investor",
      email: investorEmail,
      name: "Journey Investor",
      password: investorPassword,
      passwordConfirm: investorPassword
    }
  }), 200);

  const verificationUrl = await waitForVerificationUrl(investorEmail);
  const verificationResponse = await fetch(verificationUrl);
  assert.equal(verificationResponse.status, 200);
  assert.match(await verificationResponse.text(), /Email confirmed/);

  await expectJson(investor.request("/api/auth/forgot-password?lang=en", {
    method: "POST",
    json: { email: investorEmail }
  }), 200);

  const resetUrl = new URL(await waitForEmailUrl(investorEmail, "/auth/reset-password"));
  const resetPayload = {
    email: resetUrl.searchParams.get("email"),
    password: investorResetPassword,
    passwordConfirm: investorResetPassword,
    token: resetUrl.searchParams.get("token")
  };
  assert.equal(resetPayload.email, investorEmail);
  assert.ok(resetPayload.token);

  await expectJson(investor.request("/api/auth/reset-password?lang=en", {
    method: "POST",
    json: resetPayload
  }), 200);
  await expectJson(investor.request("/api/auth/reset-password?lang=en", {
    method: "POST",
    json: resetPayload
  }), 400);

  await assertSignInRejected(investorEmail, investorPassword);
  await signIn(investor, investorEmail, investorResetPassword);
  await signIn(admin, adminEmail, adminPassword);

  const investorUser = await prisma.user.findUniqueOrThrow({ where: { email: investorEmail } });
  investorUserId = investorUser.id;
  createdUserIds.push(investorUser.id);

  const kycForm = new FormData();
  kycForm.set("phone", "501234567");
  kycForm.set("phoneDialCode", "+971");
  kycForm.set("country", "AE");
  kycForm.set("city", "Dubai");
  kycForm.set("citizenship", "AE");
  kycForm.set("dateOfBirth", "1990-01-01");
  kycForm.set("address", "Business Bay, Building 10, Dubai");
  kycForm.set("sourceOfFunds", "salary");
  kycForm.set("occupation", "Software engineer");
  kycForm.set("identityDocument", pdfBlob(), "identity.pdf");
  kycForm.set("addressProof", pdfBlob(), "address-proof.pdf");
  await expectJson(investor.request("/api/investor/kyc?lang=en", { method: "POST", body: kycForm }), 200);

  const kyc = await prisma.kycApplication.findFirstOrThrow({
    where: { userId: investorUser.id, status: "SUBMITTED" },
    orderBy: { createdAt: "desc" }
  });
  await expectJson(admin.request(`/api/admin/kyc/${kyc.id}?lang=en`, {
    method: "POST",
    json: { action: "approve", note: "Staging E2E approval" }
  }), 200);

  const wallet = await prisma.wallet.update({
    where: { userId: investorUser.id },
    data: { availableUsdt: 3000 }
  });
  await prisma.walletTransaction.create({
    data: {
      amountUsdt: 3000,
      note: "Staging E2E mocked confirmed blockchain deposit",
      status: "CONFIRMED",
      type: "DEPOSIT",
      walletId: wallet.id
    }
  });

  await expectJson(investor.request("/api/investments?lang=en", {
    method: "POST",
    json: {
      amount: "1000",
      contractAccepted: "on",
      projectSlug: fixtures.origin.slug,
      termsAccepted: "on"
    }
  }), 200);

  const originalInvestment = await prisma.investmentApplication.findFirstOrThrow({
    where: { projectId: fixtures.origin.id, userId: investorUser.id, status: "CONFIRMED" }
  });
  assert.equal(originalInvestment.amountUsdt.toString(), "1000");

  const firstPayment = await createAndPayDividend({
    admin,
    periodLabel: `first-${suffix.slice(0, 24)}`,
    periodStart: "2026-11-01",
    periodEnd: "2026-11-30",
    projectId: fixtures.origin.id
  });
  await prisma.project.update({
    where: { id: fixtures.origin.id },
    data: { fundedUsdt: 10000, status: "FUNDED" }
  });
  await expectJson(investor.request("/api/reinvestments?lang=en", {
    method: "POST",
    json: {
      amount: "100",
      sourceDividendPaymentId: firstPayment.id,
      targetProjectId: fixtures.origin.id,
      termsAccepted: "on"
    }
  }), 200);

  await expectJson(investor.request("/api/reinvestment-preference?lang=en", {
    method: "POST",
    json: {
      action: "enable",
      allocationPercent: 100,
      targetProjectId: fixtures.automatic.id,
      termsAccepted: "on"
    }
  }), 200);

  const secondPayment = await createAndPayDividend({
    admin,
    periodLabel: `second-${suffix.slice(0, 23)}`,
    periodStart: "2026-12-01",
    periodEnd: "2026-12-31",
    projectId: fixtures.origin.id
  });

  const automaticOrders = await prisma.reinvestmentOrder.findMany({
    where: {
      mode: "AUTOMATIC",
      sourceDividendPayment: { periodId: secondPayment.periodId },
      status: "COMPLETED",
      userId: investorUser.id
    }
  });
  assert.equal(automaticOrders.reduce((total, order) => total + Number(order.investedAmountUsdt.toString()), 0), 200);

  const destinationAddress = `T${"A".repeat(33)}`;
  await expectJson(investor.request("/api/wallet/withdrawals?lang=en", {
    method: "POST",
    json: { amount: "100", destinationAddress }
  }), 200);
  const withdrawal = await prisma.walletTransaction.findFirstOrThrow({
    where: { walletId: wallet.id, type: "WITHDRAWAL", status: "PENDING" },
    orderBy: { createdAt: "desc" }
  });
  await expectJson(admin.request(`/api/admin/payments/${withdrawal.id}?lang=en`, {
    method: "POST",
    json: { action: "reject", note: "Staging E2E avoids real TRON transfer" }
  }), 200);

  const [finalWallet, investments, orders, savedWithdrawal] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { id: wallet.id } }),
    prisma.investmentApplication.findMany({ where: { userId: investorUser.id, status: "CONFIRMED" } }),
    prisma.reinvestmentOrder.findMany({ where: { userId: investorUser.id, status: "COMPLETED" } }),
    prisma.walletTransaction.findUniqueOrThrow({ where: { id: withdrawal.id } })
  ]);

  assert.equal(finalWallet.availableUsdt.toString(), "2100");
  assert.equal(finalWallet.pendingUsdt.toString(), "0");
  assert.equal(finalWallet.reservedUsdt.toString(), "0");
  assert.equal(investments.length, 4);
  assert.equal(orders.length, 3);
  assert.equal(savedWithdrawal.status, "REJECTED");
});

async function createFixtures() {
  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      emailVerified: new Date(),
      name: "Journey Admin",
      passwordHash: await bcrypt.hash(adminPassword, 4),
      role: "SUPER_ADMIN"
    }
  });
  createdUserIds.push(admin.id);

  const [origin, oneTime, automatic] = await Promise.all(projectSlugs.map((slug, index) => prisma.project.create({
    data: {
      descriptionEn: "Staging E2E project",
      descriptionRu: "Проект staging E2E",
      fundedUsdt: 0,
      slug,
      status: "ACTIVE",
      summaryEn: "Staging E2E project",
      summaryRu: "Проект staging E2E",
      targetUsdt: 10000,
      titleEn: `Journey project ${index + 1}`,
      titleRu: `Проект сценария ${index + 1}`
    }
  })));
  createdProjectIds.push(origin.id, oneTime.id, automatic.id);
  return { automatic, oneTime, origin };
}

async function createAndPayDividend({ admin, periodLabel, periodStart, periodEnd, projectId }) {
  await expectJson(admin.request("/api/admin/dividends?lang=en", {
    method: "POST",
    json: {
      action: "calculate",
      calculationMode: "READY_POOL",
      confirmation: "CONFIRM",
      periodEnd,
      periodLabel,
      periodStart,
      projectId,
      qidraParticipantPoolUsdt: 200
    }
  }), 200);

  const period = await prisma.projectDividendPeriod.findUniqueOrThrow({
    where: { projectId_periodLabel: { periodLabel, projectId } }
  });
  await prisma.projectReport.create({
    data: {
      fileUrl: `storage/project-submissions/e2e-${period.id}.pdf`,
      period: periodLabel,
      projectId,
      titleEn: "Staging E2E report",
      titleRu: "Отчёт staging E2E"
    }
  });
  await expectJson(admin.request("/api/admin/dividends?lang=en", {
    method: "POST",
    json: { action: "approve", confirmation: "CONFIRM", periodId: period.id }
  }), 200);
  await expectJson(admin.request("/api/admin/dividends?lang=en", {
    method: "POST",
    json: { action: "pay", confirmation: "CONFIRM", periodId: period.id }
  }), 200);

  return prisma.dividendPayment.findFirstOrThrow({
    where: { periodId: period.id, userId: investorUserId, status: "PAID" }
  });
}

async function signIn(session, email, password) {
  const csrfResponse = await session.request("/api/auth/csrf");
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json();
  const body = new URLSearchParams({ callbackUrl: `${baseUrl}/investor`, csrfToken, email, json: "true", password });
  const response = await session.request("/api/auth/callback/credentials?json=true", {
    method: "POST",
    body,
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });
  assert.ok([200, 302].includes(response.status), `Sign-in failed with ${response.status}`);

  const sessionResponse = await session.request("/api/auth/session");
  const payload = await sessionResponse.json();
  assert.equal(payload.user?.email, email);
}

async function assertSignInRejected(email, password) {
  const session = new HttpSession(baseUrl);
  const csrfResponse = await session.request("/api/auth/csrf");
  assert.equal(csrfResponse.status, 200);
  const { csrfToken } = await csrfResponse.json();
  const body = new URLSearchParams({ callbackUrl: `${baseUrl}/investor`, csrfToken, email, json: "true", password });
  await session.request("/api/auth/callback/credentials?json=true", {
    method: "POST",
    body,
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" }
  });

  const sessionResponse = await session.request("/api/auth/session");
  const payload = await sessionResponse.json();
  assert.equal(payload.user, undefined, "The previous password must no longer authenticate");
}

async function waitForVerificationUrl(email) {
  return waitForEmailUrl(email, "/auth/verify-email");
}

async function waitForEmailUrl(email, pathname) {
  const encodedEmail = encodeURIComponent(email);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const listResponse = await fetch(`${mailpitApiUrl}/api/v1/messages`);
    if (listResponse.ok) {
      const list = await listResponse.json();
      for (const message of list.messages || []) {
        const detailResponse = await fetch(`${mailpitApiUrl}/api/v1/message/${message.ID}`);
        if (!detailResponse.ok) continue;
        const detail = await detailResponse.json();
        const content = `${detail.Text || ""}\n${detail.HTML || ""}`;
        if (!content.includes(email) && !content.includes(encodedEmail)) continue;
        const candidates = content.replaceAll("&amp;", "&").match(/https?:\/\/[^\s"'<>]+/g) || [];
        for (const candidate of candidates) {
          const url = new URL(candidate);
          if (url.pathname === pathname && url.searchParams.get("email") === email) return url.toString();
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Email link ${pathname} was not received for ${email}`);
}

async function expectJson(responsePromise, expectedStatus) {
  const response = await responsePromise;
  const payload = await response.json().catch(() => null);
  assert.equal(response.status, expectedStatus, JSON.stringify(payload));
  return payload;
}

function pdfBlob() {
  return new Blob(["%PDF-1.4\n% staging e2e\n"], { type: "application/pdf" });
}

class HttpSession {
  constructor(origin) {
    this.origin = origin;
    this.cookies = new Map();
  }

  async request(pathname, options = {}) {
    const headers = new Headers(options.headers || {});
    if (this.cookies.size) {
      headers.set("cookie", [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; "));
    }
    let body = options.body;
    if (Object.hasOwn(options, "json")) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.json);
    }
    const response = await fetch(new URL(pathname, this.origin), { ...options, body, headers });
    this.captureCookies(response.headers);
    return response;
  }

  captureCookies(headers) {
    const values = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [headers.get("set-cookie")].filter(Boolean);
    for (const value of values) {
      const [pair] = value.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator < 1) continue;
      const name = pair.slice(0, separator);
      const cookieValue = pair.slice(separator + 1);
      if (cookieValue) this.cookies.set(name, cookieValue);
      else this.cookies.delete(name);
    }
  }
}
