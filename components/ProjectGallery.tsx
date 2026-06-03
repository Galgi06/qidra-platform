import Image from "next/image";
import type { Locale } from "@/lib/i18n";

export function ProjectGallery({ title, locale }: { title: string; locale: Locale }) {
  const isRu = locale === "ru";

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="relative min-h-[300px] min-w-0 overflow-hidden rounded-[20px] bg-[#2418f2] p-6 text-white lg:min-h-[420px]">
        <Image
          src="/assets/hero/qidra-hero-blue.png"
          alt={title}
          fill
          sizes="(min-width: 992px) 56vw, 100vw"
          className="object-cover object-[76%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(36,24,242,0.88)_0%,rgba(36,24,242,0.34)_58%,rgba(36,24,242,0)_100%)]" />
        <span className="relative z-10 text-14 font-medium text-white/82">{title}</span>
      </div>
      <div className="grid min-w-0 gap-4">
        <div className="min-w-0 rounded-[20px] bg-qidra-grayLight p-6">
          <p className="text-14 text-qidra-grayBlue">Mudaraba / Musharaka</p>
          <p className="mt-4 break-words text-[26px] font-medium leading-tight text-qidra-dark [overflow-wrap:anywhere]">
            {isRu ? "Структурированное участие" : "Structured participation"}
          </p>
        </div>
        <div className="min-w-0 rounded-[20px] bg-[#2418f2] p-6 text-white">
          <p className="text-14 text-white/70">{isRu ? "Проверка Qidra" : "Qidra review"}</p>
          <p className="mt-4 break-words text-[26px] font-medium leading-tight [overflow-wrap:anywhere]">
            {isRu ? "Сначала документы и условия" : "Documents and terms first"}
          </p>
        </div>
      </div>
    </div>
  );
}
