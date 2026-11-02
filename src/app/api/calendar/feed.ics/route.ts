import { NextRequest, NextResponse } from "next/server";
import { safeEqual } from "@/lib/auth/session";
import { buildIcsCalendar, escapeIcsText, formatIcsDate } from "@/lib/ics";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Private iCalendar feed of upcoming bookings for the admin's calendar app.
 * Requires ?token=<CALENDAR_FEED_TOKEN>; anything else gets a 404.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CALENDAR_FEED_TOKEN;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  if (!expected || expected.length < 32 || !safeEqual(token, expected)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const now = new Date();
    const until = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const { data: reservations, error } = await createAdminClient()
      .from("reservations")
      .select("*, procedure:procedures(name, technician)")
      .in("status", ["pending", "confirmed"])
      .gte("start_at", now.toISOString())
      .lte("start_at", until.toISOString())
      .order("start_at", { ascending: true });

    if (error) {
      console.error("Error fetching reservations for calendar:", error);
      return new NextResponse("Error fetching reservations", { status: 500 });
    }

    const stamp = formatIcsDate(now);
    const events = (reservations ?? []).map((res) => {
      const procedure = res.procedure as unknown as { name: string; technician: string } | null;
      const pending = res.status === "pending";
      const customer = `${res.customer_first_name} ${res.customer_last_name}`;

      const description = [
        `Статус: ${pending ? "ЧАКАЩА" : "ПОТВЪРДЕНА"}`,
        `Клиент: ${customer}`,
        `Телефон: ${res.customer_phone}`,
        `Имейл: ${res.customer_email}`,
        res.customer_note ? `Бележка: ${res.customer_note}` : "",
        `Техник: ${procedure?.technician || "N/A"}`,
      ]
        .filter(Boolean)
        .join("\n");

      return [
        `UID:${res.id}@classybeautiful.bg`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${formatIcsDate(new Date(res.start_at))}`,
        `DTEND:${formatIcsDate(new Date(res.end_at))}`,
        `SUMMARY:${escapeIcsText(`${pending ? "⏳" : "✅"} ${procedure?.name || "Процедура"} - ${customer}`)}`,
        `DESCRIPTION:${escapeIcsText(description)}`,
        `LOCATION:${escapeIcsText(`Classy & Beautiful - ${res.office_name}`)}`,
        `STATUS:${pending ? "TENTATIVE" : "CONFIRMED"}`,
      ];
    });

    const ics = buildIcsCalendar(
      [
        "VERSION:2.0",
        "PRODID:-//Classy & Beautiful//Reservations//BG",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Classy & Beautiful Резервации",
        "X-WR-TIMEZONE:Europe/Sofia",
        "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
      ],
      events
    );

    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="reservations.ics"',
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("Error generating calendar feed:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
