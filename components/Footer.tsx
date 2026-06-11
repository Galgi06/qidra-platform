import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { withLocale } from "@/lib/i18n";
import { getSiteContent } from "@/lib/site-content";

export async function Footer({ locale }: { locale: Locale }) {
  const isRu = locale === "ru";
  const content = await getSiteContent();

  return (
    <footer className="border-t border-qidra-grayMedium/20 bg-[#f4f4f5] text-qidra-dark">
      <div className="mx-auto grid max-w-[1840px] gap-14 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:px-11 lg:py-20">
        <div className="grid content-start gap-10">
          <Image src="/assets/brand/qidra-logo-dark.png" alt="Qidra" width={190} height={76} className="h-14 w-auto object-contain" />
          <div className="flex gap-5">
            <SocialLink kind="telegram" label="Telegram" href={content.footer.socialLinks.telegram} />
            <SocialLink kind="instagram" label="Instagram" href={content.footer.socialLinks.instagram} />
            <SocialLink kind="whatsapp" label="WhatsApp" href={content.footer.socialLinks.whatsapp} />
          </div>
        </div>
        <div className="grid gap-10 sm:grid-cols-2">
          <div className="grid content-start gap-4 text-[22px] leading-[1.35]">
            <strong className="font-medium">{isRu ? "Проекты" : "Projects"}</strong>
            {content.footer.projectLinks.map((item) => (
              <Link key={`${item.href}-${item.label.en}`} href={localizedHref(item.href, locale)}>
                {item.label[locale]}
              </Link>
            ))}
          </div>
          <div className="grid content-start gap-4 text-[22px] leading-[1.35]">
            <strong className="font-medium">{isRu ? "О платформе" : "About platform"}</strong>
            {content.footer.aboutLinks.map((item) => (
              <Link key={`${item.href}-${item.label.en}`} href={localizedHref(item.href, locale)}>
                {item.label[locale]}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="border-t border-qidra-grayMedium/20">
        <div className="mx-auto grid max-w-[1840px] gap-8 px-5 py-8 text-18 text-qidra-grayBlue sm:px-8 lg:grid-cols-[1.2fr_1fr_auto] lg:items-end lg:px-11">
          <p className="max-w-2xl">{content.footer.companyText}</p>
          <p>
            {content.footer.cooperationLabel[locale]}{" "}
            <a className="text-qidra-dark" href={`mailto:${content.footer.cooperationEmail}`}>
              {content.footer.cooperationEmail}
            </a>
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <span>{isRu ? "Русский" : "English"}</span>
            <Link href={withLocale(`/legal/${content.footer.privacySlug || "privacy"}`, locale)}>
              {isRu ? "Конфиденциальность" : "Privacy"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ kind, label, href }: { kind: "telegram" | "instagram" | "whatsapp"; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex h-12 w-12 items-center justify-center rounded-full border border-qidra-dark text-qidra-dark transition-colors hover:border-qidra-accent hover:text-qidra-accent"
      aria-label={label}
    >
      <SocialIcon kind={kind} />
    </Link>
  );
}

function SocialIcon({ kind }: { kind: "telegram" | "instagram" | "whatsapp" }) {
  if (kind === "telegram") {
    return (
      <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 28 28">
        <path d="M24.5 4.7 3.8 12.9c-1.1.5-1.1 2.1.1 2.4l5.2 1.5 2 6.3c.4 1.2 1.9 1.5 2.7.5l3-3.8 5.3 3.9c1 .7 2.4.1 2.6-1.2l2.5-15.7c.2-1.4-1.2-2.6-2.7-2.1Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        <path d="m9.4 16.7 10-6.3-7.8 8.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    );
  }

  if (kind === "instagram") {
    return (
      <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 28 28">
        <rect height="20" rx="6" stroke="currentColor" strokeWidth="2" width="20" x="4" y="4" />
        <circle cx="14" cy="14" r="4.6" stroke="currentColor" strokeWidth="2" />
        <circle cx="20" cy="8.4" fill="currentColor" r="1.3" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-7" fill="none" viewBox="0 0 28 28">
      <path d="M5.8 23.1 7 18.8a9.2 9.2 0 1 1 3.8 3.5l-5 1.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      <path d="M11 9.9c.3-.7.7-.7 1.1-.7h.8c.3 0 .6.1.8.6l1 2.3c.1.4.1.7-.1.9l-.7.9c-.2.3-.2.5 0 .8.8 1.4 1.9 2.4 3.4 3 .3.1.6.1.8-.2l1-1.1c.2-.3.6-.4 1-.2l2.2 1c.4.2.6.5.6.8 0 1.2-.9 2.5-2.2 2.8-1.4.3-4.6-.3-7.3-3-2.8-2.8-3.6-6.1-3.2-7.5.1-.4.4-.7.8-.9Z" fill="currentColor" />
    </svg>
  );
}

function localizedHref(href: string, locale: Locale) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") ? href : withLocale(href, locale);
}
