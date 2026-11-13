"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroImage {
  src: string;
  alt: string;
}

interface HeroCarouselProps {
  images: HeroImage[];
}

const INTERVAL_MS = 6000;

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true // server: assume no motion until the browser says otherwise
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Portrait gallery with a slow cross-fade, an offset gold frame and
 * minimal controls. Autoplay pauses on hover/focus and is off for visitors
 * who prefer reduced motion.
 */
export function HeroCarousel({ images }: HeroCarouselProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const count = images.length;

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [count, paused, reducedMotion]);

  if (count === 0) return null;

  const go = (delta: number) => setActive((i) => (i + delta + count) % count);

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
      <div className="relative pr-4 pb-4 sm:pr-6 sm:pb-6">
        {/* Offset hairline frame */}
        <div
          aria-hidden="true"
          className="absolute left-4 top-4 right-0 bottom-0 sm:left-6 sm:top-6 rounded-tl-[50%_40%] rounded-tr-[50%_40%] rounded-b-[2rem] border border-gold"
        />

        {/* Arch-shaped window */}
        <div className="relative aspect-[4/5] overflow-hidden isolate rounded-tl-[50%_40%] rounded-tr-[50%_40%] rounded-b-[2rem] bg-blush shadow-[0_30px_60px_-30px_rgba(51,36,31,0.45)]">
          {images.map((image, index) => {
            const isActive = index === active;
            return (
              <div
                key={image.src}
                className={cn(
                  "absolute inset-0 transition-opacity duration-[1400ms] ease-in-out",
                  isActive ? "opacity-100" : "opacity-0"
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
                    "object-cover transition-transform duration-[7000ms] ease-out",
                    isActive && !reducedMotion ? "scale-100" : "scale-[1.04]"
                  )}
                />
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-between pr-4 sm:pr-6">
          <p className="font-display text-lg tracking-wide text-cocoa">
            {pad(active + 1)}
            <span className="mx-2 text-gray-400">/</span>
            <span className="text-gray-500">{pad(count)}</span>
          </p>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
              {images.map((image, index) => (
                <span
                  key={image.src}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    index === active ? "w-6 bg-gold" : "w-1.5 bg-cocoa/20"
                  )}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cocoa/25 bg-white text-cocoa transition-colors hover:bg-cocoa hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark"
                aria-label="Предишна снимка"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-cocoa/25 bg-white text-cocoa transition-colors hover:bg-cocoa hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark"
                aria-label="Следваща снимка"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
