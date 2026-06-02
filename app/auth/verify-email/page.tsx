import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { NotificationCard } from "@/components/NotificationCard";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { hashToken, readParam } from "@/lib/tokens";

type VerifyEmailSearchParams = SearchParams & {
  email?: string | string[];
  token?: string | string[];
};

export default async function VerifyEmailPage({ searchParams }: { searchParams?: VerifyEmailSearchParams | Promise<VerifyEmailSearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const email = readParam(params?.email)?.toLowerCase();
  const token = readParam(params?.token);
  let state: "idle" | "success" | "invalid" = "idle";

  if (email && token) {
    const tokenHash = hashToken(token);
    const identifier = `email-verify:${email}`;
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: tokenHash }
    });

    if (verificationToken && verificationToken.identifier === identifier && verificationToken.expires >= new Date()) {
      await prisma.$transaction([
        prisma.user.update({
          where: { email },
          data: { emailVerified: new Date() }
        }),
        prisma.verificationToken.delete({
          where: { token: tokenHash }
        })
      ]);
      state = "success";
    } else {
      state = "invalid";
    }
  }

  const content = {
    idle: {
      tone: "info" as const,
      title: locale === "ru" ? "Подтверждение email" : "Email verification",
      text: locale === "ru" ? "Откройте ссылку из письма, чтобы подтвердить электронную почту." : "Open the link from your email to confirm your address."
    },
    success: {
      tone: "success" as const,
      title: locale === "ru" ? "Email подтвержден" : "Email confirmed",
      text: locale === "ru" ? "Электронная почта подтверждена. Теперь вы можете войти в Qidra." : "Your email is confirmed. You can now sign in to Qidra."
    },
    invalid: {
      tone: "error" as const,
      title: locale === "ru" ? "Ссылка недействительна" : "Invalid link",
      text: locale === "ru" ? "Ссылка подтверждения истекла или уже была использована. Зарегистрируйтесь заново или запросите новое письмо." : "This confirmation link expired or was already used. Register again or request a new message."
    }
  }[state];

  return (
    <>
      <Header locale={locale} path="/auth/verify-email" />
      <main className="section">
        <div className="container-qidra max-w-xl">
          <NotificationCard title={content.title} text={content.text} tone={content.tone} />
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
