"use client";

import { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { cn } from "@/lib/utils";

interface CarouselImage {
  src: string;
  alt: string;
}

interface HeroCarouselProps {
  images: CarouselImage[];
}

export function HeroCarousel({ images }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { 
      loop: true, 
      align: "start",
      dragFree: true,
      containScroll: false,
    },
    [AutoScroll({ 
      speed: 1, 
      stopOnInteraction: false, 
      stopOnMouseEnter: true,
      playOnInit: true 
    })]
  );

  // Duplicate images for seamless infinite scroll effect
  const displayImages = images.length > 0 ? [...images, ...images, ...images] : [];

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="relative overflow-hidden">
      {/* Carousel container */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {displayImages.map((image, index) => (
            <div
              key={index}
              className="flex-[0_0_280px] sm:flex-[0_0_320px] md:flex-[0_0_360px] min-w-0 px-2"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-lg">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                  loading="lazy"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fade edges for seamless look */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
    </div>
  );
}
