import { cn } from "@/lib/utils";

export function loadLabel(occupancy: number, fewLeft = false): string {
  if (fewLeft) return "малко свободни часове";
  if (occupancy >= 0.85) return "почти пълен";
  if (occupancy >= 0.5) return "натоварен";
  if (occupancy > 0) return "има свободни часове";
  return "свободен";
}

/** One gentle wave across the box width; drawn as the liquid's surface. */
const SURFACE_LINE = "M0 4 C 6 0.5, 14 0.5, 20 4 S 34 7.5, 40 4";
const SURFACE_FILL = `${SURFACE_LINE} V 8 H 0 Z`;

/**
 * "Glass" fill for a calendar day box: the liquid rises from the bottom with
 * how much of the day is already booked. Its surface is a soft wave, so it
 * never looks like the straight strike-through used for unavailable days.
 * Place inside a `relative overflow-hidden` box.
 */
export function GlassFill({ occupancy, className }: { occupancy: number; className?: string }) {
  const level = Math.max(0, Math.min(occupancy, 1));
  if (level === 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-x-0 bottom-0 transition-[height] duration-500", className)}
      style={{ height: `${Math.max(level * 100, 10)}%` }}
    >
      <svg
        viewBox="0 0 40 8"
        preserveAspectRatio="none"
        className="absolute inset-x-0 -top-[5px] h-[6px] w-full overflow-visible"
      >
        <path d={SURFACE_FILL} fill="rgb(196 163 90 / 0.22)" />
        <path d={SURFACE_LINE} fill="none" stroke="#C4A35A" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute inset-0 bg-gradient-to-t from-gold/40 to-gold/[0.22]" />
    </span>
  );
}

/** Small sample box for the calendar legend. */
export function GlassSample({ occupancy, fewLeft = false }: { occupancy: number; fewLeft?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block h-5 w-4 overflow-hidden rounded-[4px] border bg-white",
        fewLeft ? "border-gold border-[1.5px]" : "border-cocoa/25"
      )}
      aria-hidden="true"
    >
      <GlassFill occupancy={occupancy} />
    </span>
  );
}
