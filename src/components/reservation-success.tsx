import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, MapPin, Scissors, CalendarDays, Clock, User } from "lucide-react";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";
import { formatPrice, formatDuration } from "@/lib/utils";
import type { CreateReservationResult } from "@/app/actions/reservations";

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
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Резервацията е успешна!
          </h1>
          <p className="text-gray-600">
            Благодарим ви! Очакваме ви в нашия салон.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-semibold text-lg border-b border-gray-100 pb-3">
            Детайли на резервацията
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Клиент</p>
                <p className="font-medium">
                  {reservation.firstName} {reservation.lastName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Локация</p>
                <p className="font-medium">{reservation.officeName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Scissors className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Процедура</p>
                <p className="font-medium">{reservation.procedureName}</p>
                <p className="text-sm text-gray-500">
                  Специалист: {reservation.technician}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Дата</p>
                <p className="font-medium">
                  {format(startDate, "EEEE, d MMMM yyyy", { locale: bg })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4 h-4 text-gold" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Час</p>
                <p className="font-medium">
                  {format(startDate, "HH:mm", { locale: bg })} -{" "}
                  {format(parseISO(reservation.endAt), "HH:mm", { locale: bg })}
                </p>
                <p className="text-sm text-gray-500">
                  ({formatDuration(reservation.durationMinutes)})
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Цена</span>
              <span className="text-xl font-bold text-gold">
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
