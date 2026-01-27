import { Schedule, Reservation } from "@/types/database";
import {
  addMinutes,
  setHours,
  setMinutes,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO,
  format,
  startOfDay,
  endOfDay,
} from "date-fns";

const OPENING_HOUR = 9;
const CLOSING_HOUR = 19;
const SLOT_INTERVAL = 30;

export interface TimeSlot {
  time: string;
  datetime: Date;
  available: boolean;
}

export function generateTimeSlots(
  date: Date,
  durationMinutes: number,
  closedRanges: Schedule[],
  existingReservations: Reservation[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  let currentTime = setMinutes(setHours(dayStart, OPENING_HOUR), 0);
  const closingTime = setMinutes(setHours(dayStart, CLOSING_HOUR), 0);

  while (isBefore(currentTime, closingTime) || currentTime.getTime() === closingTime.getTime()) {
    const slotEnd = addMinutes(currentTime, durationMinutes);
    
    let available = true;

    if (isAfter(slotEnd, addMinutes(closingTime, 1))) {
      available = false;
    }

    if (available) {
      for (const closed of closedRanges) {
        const closedStart = parseISO(closed.closed_date_start);
        const closedEnd = parseISO(closed.closed_date_end);
        
        if (
          isWithinInterval(currentTime, { start: closedStart, end: closedEnd }) ||
          isWithinInterval(slotEnd, { start: closedStart, end: closedEnd }) ||
          (isBefore(currentTime, closedStart) && isAfter(slotEnd, closedEnd))
        ) {
          available = false;
          break;
        }
      }
    }

    if (available) {
      for (const reservation of existingReservations) {
        const resStart = parseISO(reservation.start_at);
        const resEnd = parseISO(reservation.end_at);

        const overlaps =
          (isWithinInterval(currentTime, { start: resStart, end: addMinutes(resEnd, -1) })) ||
          (isWithinInterval(addMinutes(slotEnd, -1), { start: resStart, end: addMinutes(resEnd, -1) })) ||
          (isBefore(currentTime, resStart) && isAfter(slotEnd, resEnd));

        if (overlaps) {
          available = false;
          break;
        }
      }
    }

    if (isBefore(currentTime, new Date())) {
      available = false;
    }

    slots.push({
      time: format(currentTime, "HH:mm"),
      datetime: currentTime,
      available,
    });

    currentTime = addMinutes(currentTime, SLOT_INTERVAL);
  }

  return slots;
}

export function isDateClosed(date: Date, closedRanges: Schedule[]): boolean {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  for (const closed of closedRanges) {
    const closedStart = parseISO(closed.closed_date_start);
    const closedEnd = parseISO(closed.closed_date_end);

    if (isBefore(dayStart, closedEnd) && isAfter(dayEnd, closedStart)) {
      if (isBefore(dayStart, closedStart) || isAfter(dayEnd, closedEnd)) {
        continue;
      }
      return true;
    }
  }

  return false;
}
