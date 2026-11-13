import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, MapPin, Scissors, CalendarDays, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import { formatPrice, formatDuration } from "@/lib/utils";
import { toTimeOfDay } from "@/lib/time";
import type { CreateReservationResult } from "@/app/actions/booking";

interface ReservationSuccessProps {
  reservation: NonNullable<CreateReservationResult["reservation"]>;
  onNewReservation: () => void;
}

export function ReservationSuccess({
  reservation,
  onNewReservation,
}: ReservationSuccessProps) {
  const startDate = parseISO(reservation.startAt);

  return (
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full border border-gold flex items-center justify-center mx-auto mb-6">
            <Check className="w-6 h-6 text-gold-dark" aria-hidden="true" />
          </div>
          <h1 className="text-4xl sm:text-5xl mb-3">Благодарим ви</h1>
          <p className="text-gray-600">
            Резервацията е изпратена и очаква потвърждение от салона.
          </p>
        </div>

        <div className="bg-ivory p-6 sm:p-8 border border-gray-200 space-y-4">
          <h2 className="text-2xl border-b border-gray-200 pb-3">
            Детайли на резервацията
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 mt-1 text-gold-dark flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-500">Клиент</p>
                <p className="font-medium">
                  {reservation.firstName} {reservation.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-1 text-gold-dark flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-500">Локация</p>
                <p className="font-medium">{reservation.officeName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Scissors className="w-4 h-4 mt-1 text-gold-dark flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-500">Процедура</p>
                <p className="font-medium">{reservation.procedureName}</p>
                <p className="text-sm text-gray-500">
                  Специалист: {reservation.technician}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarDays className="w-4 h-4 mt-1 text-gold-dark flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-500">Дата</p>
                <p className="font-medium">
                  {format(startDate, "EEEE, d MMMM yyyy", { locale: bg })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-1 text-gold-dark flex-shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm text-gray-500">Час</p>
                <p className="font-medium">
                  {toTimeOfDay(startDate)} -{" "}
                  {toTimeOfDay(parseISO(reservation.endAt))}
                </p>
                <p className="text-sm text-gray-500">
                  ({formatDuration(reservation.durationMinutes)})
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Цена</span>
              <span className="font-display text-2xl text-brand-black">
                {formatPrice(reservation.price)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
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
