import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get all confirmed and pending reservations for the next 90 days
    const now = new Date();
    const futureDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const { data: reservations, error } = await supabase
      .from("reservations")
      .select(`
        *,
        procedure:procedures(name, duration_minutes, technician)
      `)
      .in("status", ["pending", "confirmed"])
      .gte("start_at", now.toISOString())
      .lte("start_at", futureDate.toISOString())
      .order("start_at", { ascending: true });

    if (error) {
      console.error("Error fetching reservations for calendar:", error);
      return new NextResponse("Error fetching reservations", { status: 500 });
    }

    // Generate ICS content
    const icsEvents = (reservations || []).map((res) => {
      const procedure = res.procedure as any;
      const startAt = parseISO(res.start_at);
      const endAt = parseISO(res.end_at);
      
      const statusEmoji = res.status === "pending" ? "⏳" : "✅";
      const statusText = res.status === "pending" ? "ЧАКАЩА" : "ПОТВЪРДЕНА";
      
      // Format dates for ICS (YYYYMMDDTHHMMSS)
      const formatICSDate = (date: Date) => {
        return format(date, "yyyyMMdd'T'HHmmss");
      };

      const summary = `${statusEmoji} ${procedure?.name || "Процедура"} - ${res.customer_first_name} ${res.customer_last_name}`;
      const description = [
        `Статус: ${statusText}`,
        `Клиент: ${res.customer_first_name} ${res.customer_last_name}`,
        `Телефон: ${res.customer_phone}`,
        `Имейл: ${res.customer_email}`,
        res.customer_note ? `Бележка: ${res.customer_note}` : "",
        `Техник: ${procedure?.technician || "N/A"}`,
      ].filter(Boolean).join("\\n");

      const location = res.office_name === "София" 
        ? "Classy & Beautiful - София" 
        : "Classy & Beautiful - Лом";

      return [
        "BEGIN:VEVENT",
        `UID:${res.id}@classybeautiful.bg`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(startAt)}`,
        `DTEND:${formatICSDate(endAt)}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${description}`,
        `LOCATION:${location}`,
        `STATUS:${res.status === "confirmed" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT",
      ].join("\r\n");
    });

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Classy & Beautiful//Reservations//BG",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:Classy & Beautiful Резервации",
      "X-WR-TIMEZONE:Europe/Sofia",
      "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      ...icsEvents,
      "END:VCALENDAR",
    ].join("\r\n");

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reservations.ics"',
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating calendar feed:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
