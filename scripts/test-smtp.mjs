import nodemailer from "nodemailer";
import { loadLocalEnv } from "./load-local-env.mjs";

loadLocalEnv();

const provider = (process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASSWORD;
const from = process.env.SMTP_FROM;
const to = process.env.SMTP_TEST_TO || user;

if (provider === "resend") {
  if (!process.env.RESEND_API_KEY || !from || !to) {
    console.error("Email API test failed: RESEND_API_KEY, SMTP_FROM and SMTP_TEST_TO are required.");
    process.exit(1);
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        html: "<p>Qidra email API smoke test passed.</p>",
        subject: "Qidra email API smoke test",
        text: "Qidra email API smoke test passed.",
        to
      }),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(body?.message || body?.name || `HTTP ${response.status}`);
    }

    console.log(`Email API smoke test passed. Message id: ${body?.id || "sent"}`);
  } catch (error) {
    console.error("Email API test failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  process.exit(0);
}

if (!host || !from || !to) {
  console.error("SMTP test failed: SMTP_HOST, SMTP_FROM and SMTP_TEST_TO or SMTP_USER are required.");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  auth: user && pass ? { user, pass } : undefined,
  host,
  port,
  secure: process.env.SMTP_SECURE === "true" || port === 465
});

try {
  await transporter.verify();

  const info = await transporter.sendMail({
    from,
    html: "<p>Qidra SMTP smoke test passed.</p>",
    subject: "Qidra SMTP smoke test",
    text: "Qidra SMTP smoke test passed.",
    to
  });

  console.log(`SMTP smoke test passed. Message id: ${info.messageId || "sent"}`);
} catch (error) {
  console.error("SMTP test failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
