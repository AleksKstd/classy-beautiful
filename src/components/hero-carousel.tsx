"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroImage {
  src: string;
  alt: string;
  caption?: string | null;
  procedure?: { id: string; name: string } | null;
}

interface HeroCarouselProps {
  images: HeroImage[];
}

const INTERVAL_MS = 5500;

/**
 * Self-running photo gallery: photos cross-fade one after another forever.
 * A soft arch window sits inside an evenly spaced gold frame. Photos linked
 * to a procedure show a small "book this" caption. Hovering or focusing the
 * caption link pauses the rotation so it can be clicked.
 */
export function HeroCarousel({ images }: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = images.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  if (count === 0) return null;

  return (
    <div
      className="relative mx-auto w-full max-w-md lg:max-w-[440px] lg:ml-auto lg:mr-0"
      role="region"
      aria-roledescription="carousel"
      aria-label="Снимки от салона"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Gold frame: same shape as the photo, evenly spaced around it */}
      <div className="rounded-t-[calc(8rem_+_12px)] sm:rounded-t-[calc(10rem_+_12px)] rounded-b-[calc(1.25rem_+_12px)] border border-gold/70 p-3 bg-white/40 backdrop-blur-[2px]">
        {/* Soft arch window */}
        <div className="relative aspect-[4/5] overflow-hidden isolate rounded-t-[8rem] sm:rounded-t-[10rem] rounded-b-[1.25rem] bg-blush shadow-[0_30px_60px_-30px_rgba(51,36,31,0.45)]">
          {images.map((image, index) => {
            const isActive = index === active;
            const label = image.caption || image.procedure?.name;
            return (
              <div
                key={image.src}
                className={cn(
                  "absolute inset-0 transition-opacity duration-[1600ms] ease-in-out",
                  isActive ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                aria-hidden={!isActive}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} от ${count}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(min-width: 1024px) 440px, (min-width: 640px) 448px, 90vw"
                  priority={index === 0}
                  className={cn(
                    "object-cover transition-transform duration-[7000ms] ease-out motion-reduce:transform-none",
                    isActive ? "scale-100" : "scale-[1.05]"
                  )}
                />

                {label && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-cocoa/75 via-cocoa/30 to-transparent px-5 pb-5 pt-16 text-white">
                    <p className="font-display text-lg leading-snug">{label}</p>
                    {image.procedure && (
                      <Link
                        href={`/rezervacii?procedureId=${image.procedure.id}`}
                        tabIndex={isActive ? 0 : -1}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold hover:text-white focus-visible:outline-none focus-visible:underline"
                      >
                        Запази тази процедура
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
