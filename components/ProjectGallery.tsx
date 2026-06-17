"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";

type MediaItem = {
  href: string;
  name: string;
};

export function ProjectGallery({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const isRu = locale === "ru";
  const title = project.title[locale];
  const realEstate = project.realEstate;
  const fallbackImage = project.coverImage || "/assets/hero/qidra-hero-blue.png";
  const gallery = uniqueMedia([
    ...(realEstate?.gallery?.map((href, index) => ({ href, name: `${title} ${index + 1}` })) || []),
    ...(realEstate?.coverImage ? [{ href: realEstate.coverImage, name: title }] : []),
    { href: fallbackImage, name: title }
  ]);
  const floorPlans = uniqueMedia(
    (realEstate?.documents || [])
      .filter((document) => document.category === "floor-plan")
      .map((document) => ({ href: document.href, name: document.name }))
  );
  const visuals = uniqueMedia([
    ...(realEstate?.visuals?.map((href, index) => ({ href, name: `${title} render ${index + 1}` })) || []),
    ...(realEstate?.documents || [])
      .filter((document) => document.category === "render")
      .map((document) => ({ href: document.href, name: document.name }))
  ]);
  const brochures = uniqueMedia(
    (realEstate?.documents || [])
      .filter((document) => document.category === "brochure")
      .map((document) => ({ href: document.href, name: document.name }))
  );

  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeImage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveImage(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage]);

  if (!realEstate) {
    const mainImage = gallery[0]?.href || fallbackImage;
    const secondary = gallery.slice(1, 3);

    return (
      <>
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <button className="relative min-h-[300px] min-w-0 overflow-hidden rounded-[20px] bg-[#2418f2] text-left text-white lg:min-h-[420px]" onClick={() => setActiveImage(mainImage)} type="button">
            <Image alt={title} src={mainImage} fill sizes="(min-width: 992px) 56vw, 100vw" className="object-cover object-[76%_center]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,30,41,0.86)_0%,rgba(11,30,41,0.2)_62%,rgba(11,30,41,0)_100%)]" />
            <div className="relative z-10 max-w-[420px] p-6">
              <span className="text-14 font-medium text-white/82">{title}</span>
              <p className="mt-4 text-[32px] font-medium leading-tight text-white">{title}</p>
              <p className="mt-3 text-15 text-white/82">{project.location}</p>
            </div>
          </button>
          <div className="grid min-w-0 gap-4">
            {secondary.map((image, index) => (
              <button key={`${image.href}-${index}`} className="relative min-h-[148px] overflow-hidden rounded-[20px] bg-qidra-grayLight" onClick={() => setActiveImage(image.href)} type="button">
                <Image src={image.href} alt={`${title} ${index + 2}`} fill sizes="(min-width: 992px) 24vw, 100vw" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
        <ImageLightbox image={activeImage} title={title} onClose={() => setActiveImage(null)} />
      </>
    );
  }

  return (
    <>
      <section className="grid gap-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)]">
          <button className="group relative min-h-[320px] overflow-hidden rounded-[24px] bg-qidra-dark text-left text-white lg:min-h-[520px]" onClick={() => setActiveImage(gallery[0]?.href || fallbackImage)} type="button">
            <Image
              alt={realEstate.objectName || title}
              src={gallery[0]?.href || fallbackImage}
              fill
              sizes="(min-width: 1280px) 64vw, 100vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,30,41,0.08)_0%,rgba(11,30,41,0.76)_100%)]" />
            <div className="relative z-10 flex h-full items-end p-6 sm:p-8">
              <div className="max-w-2xl">
                <p className="text-13 uppercase tracking-[0.18em] text-white/70">{isRu ? "Главное изображение объекта" : "Primary asset image"}</p>
                <p className="mt-3 text-[28px] font-medium leading-tight sm:text-[40px]">{realEstate.objectName || title}</p>
                <p className="mt-3 text-15 text-white/82">
                  {[realEstate.titleComplex, realEstate.city, realEstate.district].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </button>
          <div className="grid gap-4">
            <MediaStatCard
              label={isRu ? "Фотографии" : "Photos"}
              value={String(gallery.length)}
              text={isRu ? "Главное изображение и дополнительные фотографии объекта." : "Primary asset image and additional property photos."}
            />
            <MediaStatCard
              label={isRu ? "Планировки" : "Floor plans"}
              value={String(floorPlans.length)}
              text={isRu ? "Планы помещений и схемы объекта." : "Layouts, floor plans and scheme materials."}
            />
            <MediaStatCard
              label={isRu ? "Визуализации" : "Visuals"}
              value={String(visuals.length)}
              text={isRu ? "Render-материалы и визуальные презентации." : "Render materials and visual presentations."}
            />
            <MediaStatCard
              label={isRu ? "PDF-брошюры" : "PDF brochures"}
              value={String(brochures.length)}
              text={isRu ? "Брошюры и подготовленные маркетинговые материалы." : "Brochures and prepared marketing materials."}
            />
          </div>
        </div>

        <MediaSection
          locale={locale}
          title={isRu ? "Галерея" : "Gallery"}
          items={gallery}
          onOpen={setActiveImage}
          emptyText={isRu ? "Изображения объекта появятся после публикации медиа." : "Property images will appear after media is published."}
        />
        <MediaSection
          locale={locale}
          title={isRu ? "Планировки" : "Floor plans"}
          items={floorPlans}
          onOpen={setActiveImage}
          emptyText={isRu ? "Планировки пока не загружены." : "Floor plans are not uploaded yet."}
        />
        <MediaSection
          locale={locale}
          title={isRu ? "Визуализации" : "Visualizations"}
          items={visuals}
          onOpen={setActiveImage}
          emptyText={isRu ? "Визуализации пока не загружены." : "Visualizations are not uploaded yet."}
        />
        <BrochureSection locale={locale} items={brochures} />
      </section>
      <ImageLightbox image={activeImage} title={title} onClose={() => setActiveImage(null)} />
    </>
  );
}

function MediaSection({
  title,
  items,
  onOpen,
  emptyText,
  locale
}: {
  title: string;
  items: MediaItem[];
  onOpen: (href: string) => void;
  emptyText: string;
  locale: Locale;
}) {
  if (!items.length) {
    return (
      <section className="grid gap-3">
        <h3 className="text-[24px] font-medium leading-tight text-qidra-dark sm:text-[28px]">{title}</h3>
        <p className="rounded-[20px] bg-qidra-grayLight px-5 py-4 text-15 text-qidra-grayBlue">{emptyText}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[24px] font-medium leading-tight text-qidra-dark sm:text-[28px]">{title}</h3>
        <p className="text-13 uppercase tracking-[0.18em] text-qidra-grayBlue">{items.length} {locale === "ru" ? "файлов" : "items"}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => (
          <button
            key={`${item.href}-${index}`}
            className="group relative min-h-[220px] overflow-hidden rounded-[20px] bg-qidra-grayLight text-left"
            onClick={() => onOpen(item.href)}
            type="button"
          >
            <Image src={item.href} alt={item.name} fill sizes="(min-width: 1280px) 24vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,30,41,0.02)_0%,rgba(11,30,41,0.66)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 z-10 p-4">
              <p className="text-15 font-medium text-white">{item.name}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function BrochureSection({ items, locale }: { items: MediaItem[]; locale: Locale }) {
  const isRu = locale === "ru";
  return (
    <section className="grid gap-3">
      <h3 className="text-[24px] font-medium leading-tight text-qidra-dark sm:text-[28px]">{isRu ? "PDF-брошюры" : "PDF brochures"}</h3>
      {items.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <a
              key={`${item.href}-${index}`}
              className="rounded-[20px] border border-qidra-grayMedium/20 bg-white p-5 transition-colors hover:border-qidra-accent/50"
              href={item.href}
              rel="noreferrer"
              target="_blank"
            >
              <p className="text-13 uppercase tracking-[0.16em] text-qidra-accent">PDF</p>
              <p className="mt-3 text-18 font-medium leading-tight text-qidra-dark">{item.name}</p>
              <p className="mt-4 text-14 text-qidra-grayBlue">{isRu ? "Открыть или скачать брошюру" : "Open or download brochure"}</p>
            </a>
          ))}
        </div>
      ) : (
        <p className="rounded-[20px] bg-qidra-grayLight px-5 py-4 text-15 text-qidra-grayBlue">{isRu ? "Брошюры пока не загружены." : "Brochures are not uploaded yet."}</p>
      )}
    </section>
  );
}

function MediaStatCard({ label, value, text }: { label: string; value: string; text: string }) {
  return (
    <article className="rounded-[20px] bg-qidra-grayLight p-5">
      <p className="text-13 uppercase tracking-[0.18em] text-qidra-grayBlue">{label}</p>
      <p className="mt-2 text-[34px] font-medium leading-none text-qidra-dark">{value}</p>
      <p className="mt-3 text-14 text-qidra-grayBlue">{text}</p>
    </article>
  );
}

function ImageLightbox({ image, title, onClose }: { image: string | null; title: string; onClose: () => void }) {
  if (!image) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-qidra-dark/86 px-4 py-6" onClick={onClose} role="presentation">
      <button
        aria-label="Close image preview"
        className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-2xl text-white transition-colors hover:bg-white/20"
        onClick={onClose}
        type="button"
      >
        ×
      </button>
      <div className="relative h-[76vh] w-full max-w-[1240px]" onClick={(event) => event.stopPropagation()} role="presentation">
        <Image src={image} alt={title} fill sizes="100vw" className="object-contain" />
      </div>
    </div>
  );
}

function uniqueMedia(items: MediaItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.href || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
