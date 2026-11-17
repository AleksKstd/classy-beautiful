"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronDown, Loader2, MapPin, X } from "lucide-react";
import { createAdminReservation, getAdminDaySlots } from "@/app/actions/admin/reservations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OFFICES, type OfficeName } from "@/config/site";
import { canBookWith, isPromotionLive, offerVisitMinutes, promotionOffer, type PromotionOffer } from "@/lib/promotions";
import type { DaySlot } from "@/lib/slots";
import { toDateKey } from "@/lib/time";
import { cn, formatDuration } from "@/lib/utils";
import type { Procedure, Promotion } from "@/types/database";

interface NewBookingFormProps {
  procedures: Procedure[];
  promotions: Promotion[];
  defaultOffice: OfficeName;
  onClose: () => void;
  /** Called after the booking is saved, with its office and start time. */
  onCreated: (office: OfficeName, startAt: string) => void;
}

const selectClass =
  "h-12 w-full cursor-pointer appearance-none rounded-md border border-taupe-300 bg-white px-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gold";

/**
 * The admin's "Нова резервация" form: a booking taken by phone, or the next
 * visit of a promotion. It is saved as confirmed.
 */
export function NewBookingForm({ procedures, promotions, defaultOffice, onClose, onCreated }: NewBookingFormProps) {
  const [office, setOffice] = useState<OfficeName>(defaultOffice);
  const [promotionId, setPromotionId] = useState("");
  const [procedureId, setProcedureId] = useState("");
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [time, setTime] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const today = toDateKey(new Date());

  // Dialog behaviour: focus moves in on open, Escape closes, focus returns on close.
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    formRef.current?.focus();
    return () => opener?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isPending, onClose]);

  // Promotions that still have their procedures, live ones first (ended ones
  // stay available for the later visits of clients who already paid).
  const offers = useMemo(() => {
    const list = promotions.flatMap((p) => promotionOffer({ ...p, is_active: true }, procedures) ?? []);
    return list.sort((a, b) => Number(isPromotionLive(b.promotion)) - Number(isPromotionLive(a.promotion)));
  }, [promotions, procedures]);
  const offer: PromotionOffer | null = offers.find((o) => o.promotion.id === promotionId) ?? null;

  // Active procedures by category; with a promotion, only the ones it allows.
  const groups = useMemo(() => {
    const allowed = offer ? procedures.filter((p) => canBookWith(offer, p.id)) : procedures.filter((p) => p.is_active);
    const byType = new Map<string, Procedure[]>();
    for (const p of [...allowed].sort((a, b) => a.type.localeCompare(b.type, "bg") || a.name.localeCompare(b.name, "bg"))) {
      byType.set(p.type, [...(byType.get(p.type) ?? []), p]);
    }
    return [...byType.entries()];
  }, [procedures, offer]);

  const procedure = groups.flatMap(([, list]) => list).find((p) => p.id === procedureId) ?? null;
  const duration = procedure ? (offer ? offerVisitMinutes(offer, procedure) : procedure.duration_minutes) : 0;

  // Free times of the chosen day, reloaded when the office, day or length changes.
  const slotsKey = procedure ? `${office}|${date}|${duration}` : "";
  const [loaded, setLoaded] = useState<{ key: string; slots: DaySlot[]; error?: string }>({ key: "", slots: [] });
  useEffect(() => {
    if (!slotsKey) return;
    let cancelled = false;
    const [o, d, m] = slotsKey.split("|");
    getAdminDaySlots(o, d, Number(m)).then(
      (result) => !cancelled && setLoaded({ key: slotsKey, ...result }),
      () => !cancelled && setLoaded({ key: slotsKey, slots: [], error: "Свободните часове не могат да бъдат заредени." })
    );
    return () => {
      cancelled = true;
    };
  }, [slotsKey]);
  const slotsReady = loaded.key === slotsKey;
  const freeSlots = slotsReady ? loaded.slots.filter((s) => s.available) : [];
  const chosenTime = freeSlots.some((s) => s.time === time) ? time : "";

  const choosePromotion = (id: string) => {
    setPromotionId(id);
    const next = offers.find((o) => o.promotion.id === id);
    // A package or custom offer is booked on its first procedure; a bundle lets you pick.
    if (next && next.promotion.kind !== "bundle") setProcedureId(next.procedures[0].id);
    else if (next && !next.procedures.some((p) => p.id === procedureId)) setProcedureId(next.procedures[0].id);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    if (!procedure) return setError("Изберете процедура.");
    if (!chosenTime) return setError("Изберете час.");
    startTransition(async () => {
      const result = await createAdminReservation({
        officeName: office,
        procedureId: procedure.id,
        promotionId: offer?.promotion.id ?? null,
        date,
        time: chosenTime,
        firstName,
        lastName,
        phone,
        email,
        note: note || undefined,
        sendEmail: Boolean(email) && sendEmail,
      });
      if (result.success && result.startAt) {
        onCreated(office, result.startAt);
      } else {
        setErrors(result.fieldErrors ?? {});
        setError(result.error ?? "Грешка при създаване на резервацията.");
      }
    });
  };

  const fieldError = (key: string) =>
    errors[key] ? <p id={`nb-${key}-error`} className="mt-1 text-xs text-red-600">{errors[key]}</p> : null;
  // aria wiring for an input with a possible error
  const invalid = (key: string) =>
    errors[key] ? { "aria-invalid": true as const, "aria-describedby": `nb-${key}-error` } : {};

  // No close on a backdrop click: a stray click would lose what was typed
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        ref={formRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 focus:outline-none"
        aria-labelledby="new-booking-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="new-booking-title" className="text-xl font-semibold">Нова резервация</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Затвори"
            className="-m-2 rounded-md p-2 text-taupe-500 transition-colors hover:text-cocoa"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-taupe-500">Записва се като потвърдена. Подходяща за час, уговорен по телефона или в салона.</p>

        <div className="mt-6 space-y-5">
          {/* Salon */}
          <fieldset>
            <legend className="text-sm font-medium">Салон</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {OFFICES.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setOffice(name)}
                  aria-pressed={office === name}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-md border text-sm transition-colors",
                    office === name ? "border-cocoa bg-cocoa text-white" : "border-taupe-300 hover:border-cocoa/40"
                  )}
                >
                  <MapPin className="h-4 w-4 text-gold" />
                  {name}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Promotion */}
          {offers.length > 0 && (
            <div>
              <Label htmlFor="nb-promotion">Промоция (по избор)</Label>
              <div className="relative mt-1">
                <select id="nb-promotion" value={promotionId} onChange={(e) => choosePromotion(e.target.value)} className={selectClass}>
                  <option value="">Без промоция</option>
                  {offers.map((o) => (
                    <option key={o.promotion.id} value={o.promotion.id}>
                      {o.promotion.badge} · {o.promotion.title}
                      {isPromotionLive(o.promotion) ? "" : " (приключила)"}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe-400" />
              </div>
              {offer?.promotion.kind === "bundle" && (
                <p className="mt-1 text-xs text-taupe-500">Ако клиентът вече е идвал по тази промоция, в имейла вместо цена пише „Включена в промоцията“.</p>
              )}
            </div>
          )}

          {/* Procedure */}
          <div>
            <Label htmlFor="nb-procedure">Процедура *</Label>
            {offer && offer.promotion.kind !== "bundle" ? (
              <p className="mt-1 rounded-md border border-taupe-200 bg-taupe-100 px-4 py-3 text-sm">
                {offer.procedures.map((p) => p.name).join(" + ")}
              </p>
            ) : (
              <div className="relative mt-1">
                <select
                  id="nb-procedure"
                  value={procedureId}
                  onChange={(e) => setProcedureId(e.target.value)}
                  required
                  className={selectClass}
                >
                  <option value="" disabled>
                    Изберете процедура...
                  </option>
                  {groups.map(([type, list]) => (
                    <optgroup key={type} label={type}>
                      {list.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-taupe-400" />
              </div>
            )}
            {procedure && <p className="mt-1 text-xs text-taupe-500">Продължителност: {formatDuration(duration)}</p>}
          </div>

          {/* Day and time */}
          <div>
            <Label htmlFor="nb-date">Дата *</Label>
            <Input
              id="nb-date"
              type="date"
              value={date}
              min={today}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Час *</legend>
            {!procedure ? (
              <p className="mt-1 text-sm text-taupe-500">Изберете процедура, за да видите свободните часове.</p>
            ) : !slotsReady ? (
              <p className="mt-1 flex items-center gap-2 text-sm text-taupe-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Зареждане...
              </p>
            ) : loaded.error ? (
              <p className="mt-1 text-sm text-red-600">{loaded.error}</p>
            ) : freeSlots.length === 0 ? (
              <p className="mt-1 text-sm text-taupe-500">Няма свободни часове за този ден.</p>
            ) : (
              <div className="mt-1 grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-2">
                {freeSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setTime(slot.time)}
                    aria-pressed={chosenTime === slot.time}
                    className={cn(
                      "h-10 rounded-md border text-sm tabular-nums transition-colors",
                      chosenTime === slot.time ? "border-cocoa bg-cocoa text-white" : "border-taupe-300 hover:border-cocoa/40"
                    )}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </fieldset>

          <hr className="border-taupe-200" />

          {/* Client */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="nb-first">Име *</Label>
              <Input id="nb-first" {...invalid("firstName")} value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={50} required className="mt-1" />
              {fieldError("firstName")}
            </div>
            <div>
              <Label htmlFor="nb-last">Фамилия</Label>
              <Input id="nb-last" {...invalid("lastName")} value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={50} className="mt-1" />
              {fieldError("lastName")}
            </div>
          </div>
          <div>
            <Label htmlFor="nb-phone">Телефон *</Label>
            <Input id="nb-phone" {...invalid("phone")} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0888123456" required className="mt-1" />
            {fieldError("phone")}
          </div>
          <div>
            <Label htmlFor="nb-email">Имейл</Label>
            <Input id="nb-email" {...invalid("email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} className="mt-1" />
            {fieldError("email")}
            {email && (
              <label className="mt-2 flex items-center gap-2 text-sm text-taupe-700">
                <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="h-4 w-4 accent-gold" />
                Изпращане на имейл за потвърждение до клиента
              </label>
            )}
          </div>
          <div>
            <Label htmlFor="nb-note">Бележка</Label>
            <Textarea id="nb-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="mt-1" />
          </div>
        </div>

        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="sm:flex-1">
            Отказ
          </Button>
          <Button type="submit" disabled={isPending || !procedure || !chosenTime} className="sm:flex-1">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Запази резервацията
          </Button>
        </div>
      </form>
    </div>
  );
}
