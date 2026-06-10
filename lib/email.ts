import nodemailer from "nodemailer";

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
  name?: string;
};

export function getAppBaseUrl() {
  return process.env.NEXTAUTH_URL || "http://localhost:8091";
}

function getEmailProvider() {
  return (process.env.EMAIL_PROVIDER || "smtp").trim().toLowerCase();
}

export async function sendEmail({ to, subject, text, html }: EmailPayload) {
  const from = process.env.SMTP_FROM || "Qidra <no-reply@qidra.io>";
  const isProduction = process.env.NODE_ENV === "production";
  const provider = getEmailProvider();

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;

    if (isProduction && (!process.env.SMTP_FROM || !apiKey)) {
      throw new Error("production_resend_credentials_not_configured");
    }

    if (!apiKey) {
      console.info(`\n[Qidra email dev]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
      return { mode: "console" as const };
    }

    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from,
        to,
        subject,
        text,
        html
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => null)) as ResendResponse | null;
      throw new Error(error?.message || error?.name || `resend_email_failed_${response.status}`);
    }

    return { mode: "resend" as const };
  }

  const host = process.env.SMTP_HOST;

  if (!host) {
    if (isProduction) {
      throw new Error("production_smtp_not_configured");
    }

    console.info(`\n[Qidra email dev]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return { mode: "console" as const };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (isProduction && (!process.env.SMTP_FROM || !user || !pass)) {
    throw new Error("production_smtp_credentials_not_configured");
  }

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
