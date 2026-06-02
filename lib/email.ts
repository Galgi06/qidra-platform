import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:8091";
}

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM || "Qidra <no-reply@qidra.io>";

  if (!host) {
    console.info(`\n[Qidra email dev]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { mode: "console" as const };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    auth: user && pass ? { user, pass } : undefined
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });

  return { mode: "smtp" as const };
}
