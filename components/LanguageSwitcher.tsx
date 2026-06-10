import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale, path, tone = "light" }: { locale: Locale; path: string; tone?: "light" | "dark" }) {
  const isDark = tone === "dark";
  const baseClass = isDark ? "border-white/20 bg-white/10 text-white shadow-[0_12px_30px_rgba(0,0,0,0.12)]" : "border-qidra-grayLight bg-white text-qidra-grayBlue";
  const inactiveClass = isDark ? "text-white/78 hover:bg-white/12 hover:text-white" : "text-qidra-grayBlue hover:bg-qidra-grayLight hover:text-qidra-dark";

  return (
    <div className={`inline-flex rounded-qidra border p-1 text-14 font-semibold ${baseClass}`} aria-label="Language">
      <Link className={`rounded px-3 py-1.5 transition-colors ${locale === "ru" ? "bg-qidra-dark text-white" : inactiveClass}`} href={`${path}?lang=ru`}>
        RU
      </Link>
      <Link className={`rounded px-3 py-1.5 transition-colors ${locale === "en" ? "bg-qidra-dark text-white" : inactiveClass}`} href={`${path}?lang=en`}>
        EN
      </Link>
    </div>
  );
}
