"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfDay } from "date-fns";
import { bg } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  Check,
  X,
  RefreshCw,
  Loader2,
  MapPin,
  AlertCircle,
  Plus,
} from "lucide-react";
import { confirmReservation, cancelReservation, rescheduleReservation } from "@/app/actions/admin/reservations";
import { OFFICES, type OfficeName } from "@/config/site";
import { getSlotTimes } from "@/lib/slots";
import type { Procedure, Promotion, ReservationStatus } from "@/types/database";
import { NewBookingForm } from "./new-booking-form";

export interface ReservationWithProcedure {
  id: string;
  procedure_id: string;
  office_name: string;
  start_at: string;
  end_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  customer_note: string | null;
  status: ReservationStatus;
  original_start_at: string | null;
  rescheduled_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  confirmed_at: string | null;
  confirmation_email_sent: boolean;
  created_at: string;
  updated_at: string;
  procedure: {
    id: string;
    name: string;
    duration_minutes: number;
    price: number;
    technician: string;
  };
  /** Set when the client booked through a promotion */
  promotion: { badge: string; title: string } | null;
}

interface BookingsManagerProps {
  reservations: ReservationWithProcedure[];
  procedures: Procedure[];
  promotions: Promotion[];
}


const statusLabels: Record<ReservationStatus, string> = {
  pending: "Чакаща",
  confirmed: "Потвърдена",
  cancelled: "Отменена",
};

const statusColors: Record<ReservationStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-400 border-red-200",
};

export function BookingsManager({ reservations: initialReservations, procedures, promotions }: BookingsManagerProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [reservations, setReservations] = useState(initialReservations);
  const [selectedOffice, setSelectedOffice] = useState<OfficeName>("София");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithProcedure | null>(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset local state when the server sends fresh reservations
  const [prevInitial, setPrevInitial] = useState(initialReservations);
  if (initialReservations !== prevInitial) {
    setPrevInitial(initialReservations);
    setReservations(initialReservations);
  }

  // Filter reservations by office
  const officeReservations = reservations.filter(r => r.office_name === selectedOffice);

  // Get reservations for a specific date
  const getReservationsForDate = (date: Date) => {
    return officeReservations.filter(r => {
      const resDate = parseISO(r.start_at);
      return isSameDay(resDate, date);
    });
  };

  // Get reservations for selected date
  const selectedDateReservations = getReservationsForDate(selectedDate);

  // Get days with reservations for the current month
  const getDaysWithReservations = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    return days.reduce((acc, day) => {
      const dayReservations = getReservationsForDate(day);
      if (dayReservations.length > 0) {
        const hasPending = dayReservations.some(r => r.status === "pending");
        const hasConfirmed = dayReservations.some(r => r.status === "confirmed");
        acc[format(day, "yyyy-MM-dd")] = { count: dayReservations.length, hasPending, hasConfirmed };
      }
      return acc;
    }, {} as Record<string, { count: number; hasPending: boolean; hasConfirmed: boolean }>);
  };

  const daysWithReservations = getDaysWithReservations();

  // Count pending reservations for each office
  const pendingCounts = {
    "София": reservations.filter(r => r.office_name === "София" && r.status === "pending").length,
    "Лом": reservations.filter(r => r.office_name === "Лом" && r.status === "pending").length,
  };

  // Upcoming requests in this office that still need a decision, soonest first
  const [now] = useState(() => Date.now());
  const pendingQueue = officeReservations
    .filter(r => r.status === "pending" && new Date(r.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());

  // Handle confirm reservation
  const handleConfirm = async (id: string) => {
    setActionError(null);
    startTransition(async () => {
      const result = await confirmReservation(id);
      if (result.success) {
        setReservations(prev => prev.map(r => 
          r.id === id ? { ...r, status: "confirmed" as ReservationStatus, confirmed_at: new Date().toISOString() } : r
        ));
        setSelectedReservation(null);
      } else {
        setActionError(result.error || "Грешка при потвърждаване");
      }
    });
  };

  // Handle cancel reservation
  const handleCancel = async (id: string) => {
    setActionError(null);
    const reason = prompt("Причина за отмяна (по избор). Клиентът ще получи имейл, че резервацията е отменена.");
    // Pressing "Cancel" in the prompt aborts the cancellation.
    if (reason === null) return;
    startTransition(async () => {
      const result = await cancelReservation(id, reason || undefined);
      if (result.success) {
        setReservations(prev => prev.map(r => 
          r.id === id ? { ...r, status: "cancelled" as ReservationStatus, cancelled_at: new Date().toISOString() } : r
        ));
        setSelectedReservation(null);
      } else {
        setActionError(result.error || "Грешка при отмяна");
      }
    });
  };

  // Handle reschedule reservation
  const handleReschedule = async () => {
    if (!selectedReservation || !rescheduleDate || !rescheduleTime) return;
    
    setActionError(null);
    const dateKey = format(rescheduleDate, "yyyy-MM-dd");

    startTransition(async () => {
      const result = await rescheduleReservation(selectedReservation.id, dateKey, rescheduleTime);
      if (result.success && result.startAt && result.endAt) {
        const { startAt, endAt } = result;
        setReservations(prev => prev.map(r => 
          r.id === selectedReservation.id 
            ? { 
                ...r, 
                start_at: startAt,
                end_at: endAt,
                original_start_at: r.original_start_at || r.start_at,
                rescheduled_at: new Date().toISOString()
              } 
            : r
        ));
        setIsRescheduling(false);
        setRescheduleDate(null);
        setRescheduleTime("");
        setSelectedReservation(null);
      } else {
        setActionError(result.error || "Грешка при преместване");
      }
    });
  };

  // Slot start times of the chosen day, from the salon's opening hours
  // (the last entry is the closing time itself, when nothing can start)
  const timeSlots = rescheduleDate ? getSlotTimes(format(rescheduleDate, "yyyy-MM-dd")).slice(0, -1) : [];

  // Closing the details also discards a half-filled reschedule form and old errors
  const closeDetails = () => {
    setSelectedReservation(null);
    setIsRescheduling(false);
    setRescheduleDate(null);
    setRescheduleTime("");
    setActionError(null);
  };

  // A booking added from the panel: show its day and load the fresh list
  const handleCreated = (office: OfficeName, startAt: string) => {
    const date = parseISO(startAt);
    setIsAdding(false);
    setSelectedOffice(office);
    setSelectedDate(date);
    setCurrentMonth(date);
    setNotice(`Резервацията за ${format(date, "d MMMM, HH:mm", { locale: bg })} ч. е добавена.`);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {notice ? (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>
        ) : (
          <span />
        )}
        <Button onClick={() => { setNotice(null); setIsAdding(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Нова резервация
        </Button>
      </div>

      {isAdding && (
        <NewBookingForm
          procedures={procedures}
          promotions={promotions}
          defaultOffice={selectedOffice}
          onClose={() => setIsAdding(false)}
          onCreated={handleCreated}
        />
      )}

      {/* Office Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        {OFFICES.map((office) => (
          <button
            key={office}
            onClick={() => setSelectedOffice(office)}
            className={cn(
              "flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all flex-1",
              selectedOffice === office
                ? "border-gold bg-gold/10 shadow-md"
                : "border-taupe-200 hover:border-gold/50"
            )}
          >
            <div className="flex items-center gap-3">
              <MapPin className={cn("w-5 h-5", selectedOffice === office ? "text-gold" : "text-taupe-400")} />
              <span className={cn("font-medium", selectedOffice === office ? "text-gold" : "text-taupe-700")}>
                {office}
              </span>
            </div>
            {pendingCounts[office] > 0 && (
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingCounts[office]} нови
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests waiting for a decision */}
      {pendingQueue.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-yellow-200 p-4 shadow-sm">
          <h3 className="font-semibold text-lg mb-1">Чакат потвърждение ({pendingQueue.length})</h3>
          <p className="text-sm text-taupe-500 mb-4">
            Клиентът получава имейл, когато потвърдите или отмените резервацията.
          </p>
          <ul className="divide-y divide-taupe-100">
            {pendingQueue.map((reservation) => (
              <li key={reservation.id} className="flex flex-wrap items-center gap-3 py-3">
                <button
                  type="button"
                  onClick={() => {
                    const date = parseISO(reservation.start_at);
                    setSelectedDate(date);
                    setCurrentMonth(date);
                    setSelectedReservation(reservation);
                  }}
                  className="min-w-0 flex-1 text-left hover:text-gold"
                >
                  <span className="block font-medium">
                    {format(parseISO(reservation.start_at), "d MMM, HH:mm", { locale: bg })} • {reservation.procedure.name}{reservation.promotion && <span className="ml-2 rounded bg-gold px-1.5 py-0.5 text-xs font-semibold text-cocoa">{reservation.promotion.badge}</span>}
                  </span>
                  <span className="block text-sm text-taupe-500">
                    {reservation.customer_first_name} {reservation.customer_last_name} • {reservation.customer_phone}
                  </span>
                </button>
                <Button size="sm" onClick={() => handleConfirm(reservation.id)} disabled={isPending}>
                  <Check className="w-4 h-4 mr-1" />
                  Потвърди
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCancel(reservation.id)}
                  disabled={isPending}
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <X className="w-4 h-4 mr-1" />
                  Отмени
                </Button>
              </li>
            ))}
          </ul>
          {actionError && !selectedReservation && (
            <p className="mt-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">{actionError}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-taupe-200 p-4 shadow-sm">
            {/* The calendar's own caption shows the month and the previous/next buttons */}
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              locale={bg}
              className="rounded-xl"
              modifiers={{
                hasReservations: (date) => {
                  const key = format(date, "yyyy-MM-dd");
                  return !!daysWithReservations[key];
                },
                hasPending: (date) => {
                  const key = format(date, "yyyy-MM-dd");
                  return daysWithReservations[key]?.hasPending || false;
                },
              }}
              modifiersClassNames={{
                hasReservations: "bg-gold/20 font-semibold",
                hasPending: "ring-2 ring-yellow-400",
              }}
            />

            <div className="mt-4 flex gap-4 text-xs text-taupe-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-gold/20" />
                <span>Има резервации</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded ring-2 ring-yellow-400" />
                <span>Чакащи</span>
              </div>
            </div>
          </div>
        </div>

        {/* Day Schedule */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-taupe-200 p-4 shadow-sm">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gold" />
              {format(selectedDate, "EEEE, d MMMM yyyy", { locale: bg })}
              <span className="text-taupe-400 font-normal">• {selectedOffice}</span>
            </h3>

            {selectedDateReservations.length === 0 ? (
              <div className="text-center py-12 text-taupe-400">
                <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Няма резервации за този ден</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateReservations
                  .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                  .map((reservation) => (
                    <div
                      key={reservation.id}
                      onClick={() => setSelectedReservation(reservation)}
                      className={cn(
                        "p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                        reservation.status === "pending" && "border-yellow-200 bg-yellow-50/50",
                        reservation.status === "confirmed" && "border-green-200 bg-green-50/50",
                        reservation.status === "cancelled" && "border-red-200 bg-red-50/50 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-taupe-400" />
                            <span className="font-semibold">
                              {format(parseISO(reservation.start_at), "HH:mm")} - {format(parseISO(reservation.end_at), "HH:mm")}
                            </span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full border", statusColors[reservation.status])}>
                              {statusLabels[reservation.status]}
                            </span>
                          </div>
                          <p className="font-medium text-cocoa">{reservation.procedure.name}{reservation.promotion && <span className="ml-2 rounded bg-gold px-1.5 py-0.5 text-xs font-semibold text-cocoa">{reservation.promotion.badge}</span>}</p>
                          <p className="text-sm text-taupe-500">
                            {reservation.customer_first_name} {reservation.customer_last_name}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-taupe-400" />
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reservation Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !isPending && closeDetails()}>
          <div 
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold">{selectedReservation.procedure.name}</h3>
                  {selectedReservation.promotion && (
                    <p className="mt-1 text-sm text-taupe-600">
                      <span className="mr-2 rounded bg-gold px-1.5 py-0.5 text-xs font-semibold text-cocoa">{selectedReservation.promotion.badge}</span>
                      Промоция: {selectedReservation.promotion.title}
                    </p>
                  )}
                  <p className="text-taupe-500">{selectedReservation.procedure.technician}</p>
                </div>
                <span className={cn("text-sm px-3 py-1 rounded-full border", statusColors[selectedReservation.status])}>
                  {statusLabels[selectedReservation.status]}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-taupe-700">
                  <CalendarIcon className="w-5 h-5 text-gold" />
                  <span>
                    {format(parseISO(selectedReservation.start_at), "EEEE, d MMMM yyyy", { locale: bg })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-taupe-700">
                  <Clock className="w-5 h-5 text-gold" />
                  <span>
                    {format(parseISO(selectedReservation.start_at), "HH:mm")} - {format(parseISO(selectedReservation.end_at), "HH:mm")}
                    <span className="text-taupe-400 ml-2">({selectedReservation.procedure.duration_minutes} мин.)</span>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-taupe-700">
                  <MapPin className="w-5 h-5 text-gold" />
                  <span>{selectedReservation.office_name}</span>
                </div>

                <hr className="my-4" />

                <div className="flex items-center gap-3 text-taupe-700">
                  <User className="w-5 h-5 text-gold" />
                  <span>{selectedReservation.customer_first_name} {selectedReservation.customer_last_name}</span>
                </div>
                <div className="flex items-center gap-3 text-taupe-700">
                  <Phone className="w-5 h-5 text-gold" />
                  <a href={`tel:${selectedReservation.customer_phone}`} className="hover:text-gold">
                    {selectedReservation.customer_phone}
                  </a>
                </div>
                {selectedReservation.customer_email && (
                  <div className="flex items-center gap-3 text-taupe-700">
                    <Mail className="w-5 h-5 text-gold" />
                    <a href={`mailto:${selectedReservation.customer_email}`} className="break-all hover:text-gold">
                      {selectedReservation.customer_email}
                    </a>
                  </div>
                )}
                {selectedReservation.customer_note && (
                  <div className="flex items-start gap-3 text-taupe-700">
                    <FileText className="w-5 h-5 text-gold mt-0.5" />
                    <span>{selectedReservation.customer_note}</span>
                  </div>
                )}

                {selectedReservation.rescheduled_at && selectedReservation.original_start_at && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                    <RefreshCw className="w-4 h-4 inline mr-2" />
                    Преместена от {format(parseISO(selectedReservation.original_start_at), "d MMM, HH:mm", { locale: bg })}
                  </div>
                )}

                {selectedReservation.confirmation_email_sent && (
                  <div className="mt-2 p-3 bg-green-50 rounded-lg text-sm text-green-700">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Имейл за потвърждение е изпратен
                  </div>
                )}
              </div>

              {actionError && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {actionError}
                </div>
              )}

              {/* Reschedule Form */}
              {isRescheduling && (
                <div className="mt-6 p-4 bg-taupe-100 rounded-xl">
                  <h4 className="font-medium mb-4">Изберете нова дата и час</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Calendar
                        mode="single"
                        selected={rescheduleDate || undefined}
                        onSelect={(date) => date && setRescheduleDate(date)}
                        disabled={(date) => date < startOfDay(new Date())}
                        locale={bg}
                        className="rounded-lg border"
                      />
                    </div>
                    <div>
                      <p className="text-sm text-taupe-500 mb-2">Час:</p>
                      <div className="grid grid-cols-2 gap-1 max-h-64 overflow-y-auto">
                        {timeSlots.map((time) => (
                          <button
                            key={time}
                            onClick={() => setRescheduleTime(time)}
                            className={cn(
                              "py-2 px-3 text-sm rounded-lg transition-colors",
                              rescheduleTime === time
                                ? "bg-gold text-white"
                                : "bg-white border hover:border-gold"
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      onClick={handleReschedule}
                      disabled={!rescheduleDate || !rescheduleTime || isPending}
                      className="flex-1"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Запази
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsRescheduling(false);
                        setRescheduleDate(null);
                        setRescheduleTime("");
                      }}
                      disabled={isPending}
                    >
                      Отказ
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedReservation.status !== "cancelled" && !isRescheduling && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {selectedReservation.status === "pending" && (
                    <Button
                      onClick={() => handleConfirm(selectedReservation.id)}
                      disabled={isPending}
                      className="flex-1"
                    >
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                      Потвърди
                    </Button>
                  )}
                  {selectedReservation.status === "confirmed" && (
                    <Button
                      onClick={() => setIsRescheduling(true)}
                      disabled={isPending}
                      variant="outline"
                      className="flex-1"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Премести
                    </Button>
                  )}
                  <Button
                    onClick={() => handleCancel(selectedReservation.id)}
                    disabled={isPending}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <X className="w-4 h-4 mr-2" />}
                    Отмени
                  </Button>
                </div>
              )}

              <Button
                variant="ghost"
                onClick={closeDetails}
                disabled={isPending}
                className="w-full mt-4"
              >
                Затвори
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
