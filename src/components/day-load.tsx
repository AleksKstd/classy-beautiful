import { cn } from "@/lib/utils";

/** Gentle sine wave, drawn left to right. */
const WAVE_PATH = "M1 3 C3 0.5 5 0.5 7 3 S11 5.5 13 3 S17 0.5 19 3 S23 5.5 25 3";

export function loadLabel(occupancy: number): string {
  if (occupancy >= 0.85) return "почти пълен";
  if (occupancy >= 0.5) return "натоварен";
  if (occupancy > 0) return "има свободни часове";
  return "свободен";
}

/**
 * A small wavy line under a calendar date. The gold part grows with how
 * much of the day is already booked; the faint wave behind it is the day.
 */
export function DayLoadWave({ occupancy, className }: { occupancy: number; className?: string }) {
  const filled = Math.max(0, Math.min(occupancy, 1));
  return (
    <svg
      viewBox="0 0 26 6"
      className={cn("h-1.5 w-[26px] overflow-visible", className)}
      aria-hidden="true"
      focusable="false"
    >
      <path d={WAVE_PATH} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1.1} strokeLinecap="round" />
      {filled > 0 && (
        <path
          d={WAVE_PATH}
          fill="none"
          className="stroke-gold"
          strokeWidth={1.4}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={`${filled} 1`}
        />
      )}
    </svg>
  );
}
