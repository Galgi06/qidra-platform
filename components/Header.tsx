import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { dictionary, withLocale } from "@/lib/i18n";
import { ButtonLink } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Header({ locale, path = "/" }: { locale: Locale; path?: string }) {
  const t = dictionary[locale].nav;
  const links = [
    { href: "/projects", label: t.projects },
    { href: "/faq", label: t.faq },
    { href: "/legal/terms", label: t.legal }
  ];

  return (
    <header className="border-b border-qidra-grayLight bg-white">
      <div className="container-qidra flex min-h-20 items-center justify-between gap-5 py-4">
        <Link href={withLocale("/", locale)} className="flex shrink-0 items-center gap-3" aria-label="Qidra">
          <Image src="/assets/brand/qidra-logo-dark.png" alt="Qidra" width={122} height={48} priority className="h-10 w-auto object-contain" />
        </Link>
        <nav className="hidden items-center gap-7 text-16 font-medium text-qidra-grayBlue lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={withLocale(link.href, locale)}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher locale={locale} path={path} />
          <div className="hidden sm:block">
            <ButtonLink href={withLocale("/auth/sign-up", locale)} size="sm" variant="outline" className="shrink-0">
              {t.signUp}
            </ButtonLink>
          </div>
          <ButtonLink href={withLocale("/auth/sign-in", locale)} size="sm" variant="dark" className="shrink-0">
            {t.signIn}
          </ButtonLink>
        </div>
      </div>
      <nav className="container-qidra flex gap-5 overflow-x-auto border-t border-qidra-grayLight py-3 text-14 font-medium text-qidra-grayBlue lg:hidden">
        {links.map((link) => (
          <Link key={link.href} href={withLocale(link.href, locale)} className="shrink-0">
            {link.label}
          </Link>
        ))}
        <Link href={withLocale("/auth/sign-up", locale)} className="shrink-0 font-semibold text-qidra-accent sm:hidden">
          {t.signUp}
        </Link>
      </nav>
    </header>
  );
}
