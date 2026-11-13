"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryItem {
  src: string;
  alt: string;
  caption: string | null;
  procedure: { id: string; name: string; type: string } | null;
}

const ALL = "Всички";

/** Filterable photo grid; photos linked to a procedure link to its booking. */
export function GalleryGrid({ images }: { images: GalleryItem[] }) {
  const categories = useMemo(() => {
    const types = new Set<string>();
    for (const img of images) if (img.procedure) types.add(img.procedure.type);
    return [ALL, ...Array.from(types).sort((a, b) => a.localeCompare(b, "bg"))];
  }, [images]);
  const [filter, setFilter] = useState(ALL);

  const visible = filter === ALL ? images : images.filter((img) => img.procedure?.type === filter);

  return (
    <div>
      {categories.length > 2 && (
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Филтър по категория">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setFilter(category)}
              aria-pressed={filter === category}
              className={cn(
                "rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                filter === category ? "bg-cocoa text-white" : "bg-blush-light text-cocoa hover:bg-blush"
              )}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      <ul className="columns-1 sm:columns-2 lg:columns-3 gap-5 [&>li]:mb-5">
        {visible.map((img) => {
          const label = img.caption || img.procedure?.name;
          return (
            <li key={img.src} className="break-inside-avoid">
              <figure className="group overflow-hidden rounded-2xl bg-blush-light">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={img.src}
                    alt={img.alt}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transform-none"
                  />
                </div>
                {(label || img.procedure) && (
                  <figcaption className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="font-display text-lg leading-snug text-cocoa">{label}</span>
                    {img.procedure && (
                      <Link
                        href={`/rezervacii?procedureId=${img.procedure.id}`}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-dark hover:text-cocoa"
                        aria-label={`Запази час за ${img.procedure.name}`}
                      >
                        Запази
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    )}
                  </figcaption>
                )}
              </figure>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
