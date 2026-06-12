import Image from "next/image";
import type { CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";

export function ProjectGallery({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const isRu = locale === "ru";
  const title = project.title[locale];
  const gallery = project.realEstate?.gallery?.length ? project.realEstate.gallery : [project.coverImage || "/assets/hero/qidra-hero-blue.png"];
  const mainImage = gallery[0] || "/assets/hero/qidra-hero-blue.png";
  const secondary = gallery.slice(1, 3);

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="relative min-h-[300px] min-w-0 overflow-hidden rounded-[20px] bg-[#2418f2] p-6 text-white lg:min-h-[420px]">
        <Image
          src={mainImage}
          alt={title}
          fill
          sizes="(min-width: 992px) 56vw, 100vw"
          className="object-cover object-[76%_center]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,30,41,0.86)_0%,rgba(11,30,41,0.2)_62%,rgba(11,30,41,0)_100%)]" />
        <div className="relative z-10 max-w-[420px]">
          <span className="text-14 font-medium text-white/82">{project.realEstate ? (isRu ? "Объект недвижимости" : "Real estate asset") : title}</span>
          <p className="mt-4 text-[32px] font-medium leading-tight text-white">{project.realEstate?.objectName || title}</p>
          <p className="mt-3 text-15 text-white/82">
            {project.realEstate?.country && project.realEstate?.city ? `${project.realEstate.country}, ${project.realEstate.city}` : project.location}
          </p>
        </div>
      </div>
      <div className="grid min-w-0 gap-4">
        {secondary.map((image, index) => (
          <div key={`${image}-${index}`} className="relative min-h-[148px] overflow-hidden rounded-[20px] bg-qidra-grayLight">
            <Image src={image} alt={`${title} ${index + 2}`} fill sizes="(min-width: 992px) 24vw, 100vw" className="object-cover" />
          </div>
        ))}
        {!secondary.length ? (
          <>
            <div className="min-w-0 rounded-[20px] bg-qidra-grayLight p-6">
              <p className="text-14 text-qidra-grayBlue">{project.structure}</p>
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
          </>
        ) : null}
      </div>
    </div>
  );
}
