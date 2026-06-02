import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale, path }: { locale: Locale; path: string }) {
  return (
    <div className="inline-flex rounded-qidra border border-qidra-grayLight p-1 text-14" aria-label="Language">
      <Link className={`rounded px-3 py-1 ${locale === "ru" ? "bg-qidra-dark text-white" : "text-qidra-grayBlue"}`} href={`${path}?lang=ru`}>
        RU
      </Link>
      <Link className={`rounded px-3 py-1 ${locale === "en" ? "bg-qidra-dark text-white" : "text-qidra-grayBlue"}`} href={`${path}?lang=en`}>
        EN
      </Link>
    </div>
  );
}
