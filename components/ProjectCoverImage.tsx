"use client";

import Image from "next/image";
import { useState } from "react";

const fallbackImage = "/assets/hero/qidra-hero-blue.png";

export function ProjectCoverImage({
  alt,
  className = "object-cover transition-transform duration-700 group-hover:scale-[1.035]",
  priority = false,
  sizes = "(min-width: 1280px) 34vw, (min-width: 992px) 42vw, 100vw",
  src
}: {
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  src?: string | null;
}) {
  const requestedSrc = src || fallbackImage;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageSrc = failedSrc === requestedSrc ? fallbackImage : requestedSrc;

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => setFailedSrc(requestedSrc)}
      priority={priority}
      sizes={sizes}
      src={imageSrc}
    />
  );
}
