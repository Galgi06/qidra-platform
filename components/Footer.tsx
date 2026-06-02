import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { legalPages } from "@/lib/content";
import { withLocale } from "@/lib/i18n";

export function Footer({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <footer className="border-t border-qidra-grayMedium/20 bg-[#f4f4f5] text-qidra-dark">
      <div className="mx-auto grid max-w-[1840px] gap-14 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:px-11 lg:py-20">
        <div className="grid content-start gap-10">
          <Image src="/assets/brand/qidra-logo-dark.png" alt="Qidra" width={190} height={76} className="h-14 w-auto object-contain" />
          <div className="flex gap-5">
            <SocialLink label="TG" href="#" />
            <SocialLink label="IG" href="#" />
            <SocialLink label="WA" href="#" />
          </div>
        </div>
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="grid content-start gap-4 text-[22px] leading-[1.35]">
            <strong className="font-medium">{isRu ? "Проекты" : "Projects"}</strong>
            <Link href={withLocale("/projects", locale)}>{isRu ? "Открытые" : "Open"}</Link>
            <Link href={withLocale("/projects", locale)}>{isRu ? "Избранные" : "Selected"}</Link>
          </div>
          <div className="grid content-start gap-4 text-[22px] leading-[1.35]">
            <strong className="font-medium">{isRu ? "О платформе" : "About platform"}</strong>
            <Link href={withLocale("/faq", locale)}>{isRu ? "Работа платформы" : "How it works"}</Link>
            <Link href={withLocale("/legal/sharia-compliance", locale)}>{isRu ? "Шариатский совет" : "Sharia board"}</Link>
            <Link href={withLocale("/auth/sign-up", locale)}>{isRu ? "Предпринимателям" : "For entrepreneurs"}</Link>
            <Link href={withLocale("/auth/sign-up", locale)}>{isRu ? "Партнерам" : "For partners"}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-qidra-grayMedium/20">
        <div className="mx-auto grid max-w-[1840px] gap-8 px-5 py-8 text-18 text-qidra-grayBlue sm:px-8 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end lg:px-11">
          <p className="max-w-2xl">
            {isRu
              ? "QIDRA LLC, Sharjah Media City (Shams), P.O. Box 839, Sharjah, United Arab Emirates, License No: 2539733.01, Formation Date: 04 August 2025"
              : "QIDRA LLC, Sharjah Media City (Shams), P.O. Box 839, Sharjah, United Arab Emirates, License No: 2539733.01, Formation Date: 04 August 2025"}
          </p>
          <p>
            {isRu ? "Сотрудничество" : "Cooperation"} <a className="text-qidra-dark" href="mailto:info@qidra.io">info@qidra.io</a>
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <span>{isRu ? "Русский" : "English"}</span>
            <Link href={withLocale(`/legal/${legalPages.find((page) => page.slug === "privacy")?.slug ?? "privacy"}`, locale)}>
              {isRu ? "Конфиденциальность" : "Privacy"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href} className="flex h-12 w-12 items-center justify-center rounded-full border border-qidra-dark text-14 font-semibold" aria-label={label}>
      {label}
    </Link>
  );
}
