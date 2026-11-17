/**
 * Minimal RFC 5545 (iCalendar) helpers.
 */

/** Escapes a TEXT value: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: unknown): string {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** UTC timestamp in iCalendar form, e.g. 20260105T080000Z */
export function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Folds a content line to max 75 octets per physical line. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = "";
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (currentBytes + bytes > limit) {
      out.push(current);
      current = "";
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildIcsCalendar(headerLines: string[], events: string[][]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    ...headerLines,
    ...events.flatMap((event) => ["BEGIN:VEVENT", ...event, "END:VEVENT"]),
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}

export interface Appointment {
  /** Stable id, used as the event UID so re-importing updates the same event. */
  id: string;
  start: Date;
  end: Date;
  title: string;
  location: string;
  description?: string;
}

/** A one-event .ics file for the customer's own calendar app. */
export function appointmentIcs(appointment: Appointment, now: Date = new Date()): string {
  return buildIcsCalendar(
    ["VERSION:2.0", "PRODID:-//Classy & Beautiful//Booking//BG", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"],
    [
      [
        `UID:${appointment.id}@cbclassyandbeautiful.com`,
        `DTSTAMP:${formatIcsDate(now)}`,
        `DTSTART:${formatIcsDate(appointment.start)}`,
        `DTEND:${formatIcsDate(appointment.end)}`,
        `SUMMARY:${escapeIcsText(appointment.title)}`,
        `LOCATION:${escapeIcsText(appointment.location)}`,
        ...(appointment.description ? [`DESCRIPTION:${escapeIcsText(appointment.description)}`] : []),
      ],
    ]
  );
}

/** "Add to Google Calendar" link with the event pre-filled. */
export function googleCalendarUrl(appointment: Appointment): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: appointment.title,
    dates: `${formatIcsDate(appointment.start)}/${formatIcsDate(appointment.end)}`,
    location: appointment.location,
    ...(appointment.description ? { details: appointment.description } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
