import { SignInForm } from "@/components/auth/SignInForm";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getLocale, type SearchParams } from "@/lib/i18n";
import { readParam } from "@/lib/tokens";

type SignInSearchParams = SearchParams & {
  next?: string | string[];
};

function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/investor";
  }

  return value;
}

export default async function SignInPage({ searchParams }: { searchParams?: SignInSearchParams | Promise<SignInSearchParams> }) {
  const params = await searchParams;
  const locale = await getLocale(params);
  const nextPath = safeNextPath(readParam(params?.next));

  return (
    <>
      <Header locale={locale} path="/auth/sign-in" />
      <main className="section">
        <SignInForm locale={locale} nextPath={nextPath} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
