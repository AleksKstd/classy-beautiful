"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { parseISO } from "date-fns";
import { formatPrice, formatDuration } from "@/lib/utils";
import { formatInSalonTz, toTimeOfDay } from "@/lib/time";
import { buildIcsCalendar, escapeIcsText, formatIcsDate } from "@/lib/ics";
import type { CreateReservationResult } from "@/app/actions/booking";
import { BUSINESS, OFFICE_DETAILS, mapsUrl, type OfficeName } from "@/config/site";

interface ReservationSuccessProps {
  reservation: NonNullable<CreateReservationResult["reservation"]>;
  onNewReservation: () => void;
}

export function ReservationSuccess({
  reservation,
  onNewReservation,
}: ReservationSuccessProps) {
  const startDate = parseISO(reservation.startAt);

  // Download an .ics file so the customer can add the visit to their own calendar
  const addToCalendar = () => {
    const ics = buildIcsCalendar(
      ["VERSION:2.0", "PRODID:-//Classy & Beautiful//Booking//BG", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"],
      [
        [
          `UID:${reservation.id}@cbclassyandbeautiful.com`,
          `DTSTAMP:${formatIcsDate(new Date())}`,
          `DTSTART:${formatIcsDate(new Date(reservation.startAt))}`,
          `DTEND:${formatIcsDate(new Date(reservation.endAt))}`,
          `SUMMARY:${escapeIcsText(`${reservation.procedureName} - Classy & Beautiful`)}`,
          `LOCATION:${escapeIcsText(`Classy & Beautiful - ${reservation.officeName}`)}`,
          `DESCRIPTION:${escapeIcsText(`Специалист: ${reservation.technician}`)}`,
        ],
      ]
    );
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "classy-beautiful-rezervaciya.ics";
    link.click();
    URL.revokeObjectURL(url);
  };

  const office = reservation.officeName as OfficeName;
  const address = OFFICE_DETAILS[office]?.address ?? null;
  const map = OFFICE_DETAILS[office] ? mapsUrl(office) : null;

  const rows = [
    { label: "Салон", value: address ? `${reservation.officeName}, ${address}` : reservation.officeName },
    { label: "Процедура", value: reservation.procedureName, sub: `Специалист: ${reservation.technician}` },
    { label: "Дата", value: formatInSalonTz(startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) },
    {
      label: "Час",
      value: `${toTimeOfDay(startDate)} - ${toTimeOfDay(parseISO(reservation.endAt))}`,
      sub: formatDuration(reservation.durationMinutes),
    },
  ];

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-xl">
        <p className="eyebrow mb-4">Очаква потвърждение</p>
        <h1 className="mb-4 text-4xl italic sm:text-5xl">Благодарим ви, {reservation.firstName}.</h1>
        <p className="mb-6 text-taupe-600">
          Получихме заявката ви. Часът <strong className="font-semibold text-cocoa">все още не е потвърден</strong>:
          ще го прегледаме и ще ви пишем веднага щом го потвърдим.
        </p>

        <ol className="mb-10 space-y-3 border-l border-gold/60 pl-5 text-sm text-taupe-600">
          <li>
            <span className="block text-cocoa">Заявката е изпратена</span>
            Ще получите копие на <span className="break-all text-cocoa">{reservation.email}</span>.
          </li>
          <li>
            <span className="block text-cocoa">Потвърждение от салона</span>
            Ще получите втори имейл, когато часът бъде потвърден или ако се наложи промяна.
          </li>
        </ol>

        {/* Ticket-style summary */}
        <div className="rounded-2xl border border-gold/40 bg-blush-light">
          <dl className="space-y-4 p-6 sm:p-8">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[6.5rem_1fr] gap-4">
                <dt className="pt-0.5 text-xs uppercase tracking-[0.14em] text-taupe-500">{row.label}</dt>
                <dd>
                  <span className="block text-cocoa">{row.value}</span>
                  {row.sub && <span className="block text-sm text-taupe-500">{row.sub}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex items-baseline justify-between border-t-2 border-dashed border-gold/50 px-6 py-5 sm:px-8">
            <span className="text-xs uppercase tracking-[0.14em] text-taupe-500">Цена</span>
            <span className="font-display text-3xl text-cocoa">{formatPrice(reservation.price)}</span>
          </div>
        </div>

        {/* Before the visit */}
        <div className="mt-10">
          <h2 className="mb-4 text-2xl">Преди посещението</h2>
          <ul className="space-y-3 text-taupe-600">
            <li className="flex gap-3">
              <span className="mt-3 h-px w-4 shrink-0 bg-gold" aria-hidden="true" />
              Елате около 5 минути по-рано, за да започнем навреме.
            </li>
            <li className="flex gap-3">
              <span className="mt-3 h-px w-4 shrink-0 bg-gold" aria-hidden="true" />
              <span>
                Ако не можете да дойдете, обадете се на{" "}
                <a href={`tel:${BUSINESS.phone}`} className="text-cocoa underline underline-offset-2">
                  {BUSINESS.phoneDisplay}
                </a>
                , за да освободим часа за друг клиент.
              </span>
            </li>
            {map && (
              <li className="flex gap-3">
                <span className="mt-3 h-px w-4 shrink-0 bg-gold" aria-hidden="true" />
                <a href={map} target="_blank" rel="noopener noreferrer" className="text-cocoa underline underline-offset-2">
                  Вижте как да стигнете до салона
                </a>
              </li>
            )}
          </ul>
        </div>

        <Button onClick={addToCalendar} variant="outline" className="mt-10 w-full">
          <CalendarPlus className="w-4 h-4 mr-2" aria-hidden="true" />
          Добави в календара
        </Button>

        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <Button onClick={onNewReservation} variant="outline" className="flex-1">
            Нова резервация
          </Button>
          <Button asChild className="flex-1">
            <Link href="/">Към началото</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
