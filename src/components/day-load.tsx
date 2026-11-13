import { cn } from "@/lib/utils";

export function loadLabel(occupancy: number): string {
  if (occupancy >= 0.85) return "почти пълен";
  if (occupancy >= 0.5) return "натоварен";
  if (occupancy > 0) return "има свободни часове";
  return "свободен";
}

/**
 * "Glass" fill for a calendar day box: the liquid rises from the bottom
 * with how much of the day is already booked, topped by a gold line.
 * Place inside a `relative overflow-hidden` box.
 */
export function GlassFill({ occupancy, className }: { occupancy: number; className?: string }) {
  const level = Math.max(0, Math.min(occupancy, 1));
  if (level === 0) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-gold bg-gradient-to-t from-gold/45 to-gold/20 transition-[height] duration-500",
        className
      )}
      style={{ height: `${Math.max(level * 100, 8)}%` }}
    />
  );
}

/** Small sample box for the calendar legend. */
export function GlassSample({ occupancy }: { occupancy: number }) {
  return (
    <span className="relative inline-block h-5 w-4 overflow-hidden rounded-[4px] border border-cocoa/25 bg-white" aria-hidden="true">
      <GlassFill occupancy={occupancy} />
    </span>
  );
}
