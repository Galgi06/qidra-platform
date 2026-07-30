"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { CatalogProject } from "@/lib/project-catalog";
import type { Locale } from "@/lib/i18n";

type TouchPoint = { x: number; y: number } | null;

export function ProjectGallery({ project, locale }: { project: CatalogProject; locale: Locale }) {
  const isRu = locale === "ru";
  const title = project.title[locale];
  const media = useMemo(
    () =>
      [project.realEstate?.coverImage, ...(project.realEstate?.gallery || []), project.coverImage].filter(
        (value, index, array): value is string => Boolean(value) && array.indexOf(value) === index
      ),
    [project.coverImage, project.realEstate?.coverImage, project.realEstate?.gallery]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<TouchPoint>(null);

  const selectedIndex = media[activeIndex] ? activeIndex : 0;
  const mainImage = media[selectedIndex] || "/assets/hero/qidra-hero-blue.png";
  const secondary = media
    .map((image, index) => ({ image, index }))
    .filter((item) => item.index !== selectedIndex)
    .slice(0, 2);

  useEffect(() => {
    if (!lightboxOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLightboxOpen(false);
        return;
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current - 1 + media.length) % media.length);
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % media.length);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lightboxOpen, media.length]);

  function openLightbox(index: number) {
    setActiveIndex(media[index] ? index : 0);
    setLightboxOpen(true);
  }

  function showPrevious() {
    setActiveIndex((current) => (current - 1 + media.length) % media.length);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % media.length);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const horizontalSwipe = Math.abs(deltaX) > 48 && Math.abs(deltaY) < 72;

    if (horizontalSwipe) {
      if (deltaX > 0) {
        showPrevious();
      } else {
        showNext();
      }
    }

    setTouchStart(null);
  }

  return (
    <>
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <button
            aria-label={isRu ? "Открыть галерею объекта" : "Open property gallery"}
            className="relative min-h-[300px] min-w-0 overflow-hidden rounded-[20px] bg-[#2418f2] p-6 text-left text-white transition-transform duration-300 hover:scale-[1.01] lg:min-h-[420px]"
            onClick={() => openLightbox(selectedIndex)}
            type="button"
          >
            <Image
              src={mainImage}
              alt={title}
              fill
              sizes="(min-width: 992px) 56vw, 100vw"
              className="object-cover object-[76%_center]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,30,41,0.86)_0%,rgba(11,30,41,0.24)_60%,rgba(11,30,41,0.02)_100%)]" />
            <div className="relative z-10 max-w-[420px]">
              <span className="text-14 font-medium text-white/82">{project.realEstate ? (isRu ? "Объект недвижимости" : "Real estate asset") : title}</span>
              <p className="mt-4 text-[32px] font-medium leading-tight text-white">{project.realEstate?.objectName || title}</p>
              <p className="mt-3 text-15 text-white/82">
                {project.realEstate?.country && project.realEstate?.city ? `${project.realEstate.country}, ${project.realEstate.city}` : project.location}
              </p>
            </div>
          </button>
          <div className="grid min-w-0 gap-4">
            {secondary.map((item, index) => (
              <button
                key={`${item.image}-${item.index}`}
                aria-label={isRu ? `Открыть фото ${item.index + 1}` : `Open image ${item.index + 1}`}
                className="group relative min-h-[148px] overflow-hidden rounded-[20px] bg-qidra-grayLight text-left"
                onClick={() => openLightbox(item.index)}
                type="button"
              >
                <Image
                  src={item.image}
                  alt={`${title} ${index + 2}`}
                  fill
                  sizes="(min-width: 992px) 24vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-qidra-dark/35 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              </button>
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
        {media.length > 1 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {media.map((image, index) => {
              const isActive = index === selectedIndex;

              return (
                <button
                  key={`${image}-${index}`}
                  aria-label={isRu ? `Открыть фото ${index + 1}` : `Open image ${index + 1}`}
                  aria-pressed={isActive}
                  className={`group relative min-h-[112px] overflow-hidden rounded-[18px] border bg-white transition ${
                    isActive
                      ? "border-qidra-accent shadow-[0_0_0_3px_rgba(79,70,229,0.12)]"
                      : "border-qidra-line hover:border-qidra-accent/45"
                  }`}
                  onClick={() => openLightbox(index)}
                  type="button"
                >
                  <Image
                    src={image}
                    alt={`${title} ${index + 1}`}
                    fill
                    sizes="(min-width: 1200px) 16vw, (min-width: 768px) 24vw, 44vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className={`absolute inset-0 transition-colors ${isActive ? "bg-qidra-dark/10" : "bg-qidra-dark/0 group-hover:bg-qidra-dark/10"}`} />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      {lightboxOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-center justify-center bg-qidra-dark/88 px-4 py-6"
          role="dialog"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="relative flex h-full max-h-[92vh] w-full max-w-[1320px] items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onTouchEnd={handleTouchEnd}
            onTouchStart={handleTouchStart}
          >
            <button
              aria-label={isRu ? "Закрыть галерею" : "Close gallery"}
              className="absolute right-0 top-0 z-20 flex size-11 items-center justify-center rounded-full border border-white/18 bg-qidra-dark/52 text-white transition-colors hover:bg-white/12"
              onClick={() => setLightboxOpen(false)}
              type="button"
            >
              <CloseIcon />
            </button>
            {media.length > 1 ? (
              <>
                <button
                  aria-label={isRu ? "Предыдущее фото" : "Previous image"}
                  className="absolute left-2 z-20 flex size-12 items-center justify-center rounded-full border border-white/18 bg-qidra-dark/52 text-white transition-colors hover:bg-white/12 sm:left-4"
                  onClick={showPrevious}
                  type="button"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  aria-label={isRu ? "Следующее фото" : "Next image"}
                  className="absolute right-2 z-20 flex size-12 items-center justify-center rounded-full border border-white/18 bg-qidra-dark/52 text-white transition-colors hover:bg-white/12 sm:right-4"
                  onClick={showNext}
                  type="button"
                >
                  <ChevronRightIcon />
                </button>
              </>
            ) : null}
            <div className="relative h-full max-h-[82vh] w-full overflow-hidden rounded-[24px] bg-qidra-dark/40 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
              <Image
                priority
                src={mainImage}
                alt={`${title} ${selectedIndex + 1}`}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>
            <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-qidra-dark/62 px-4 py-2 text-13 font-medium text-white/92">
              {selectedIndex + 1} / {media.length}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 16 16">
      <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="m15 5-7 7 7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path d="m9 5 7 7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}
