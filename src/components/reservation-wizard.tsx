"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatPrice, formatDuration } from "@/lib/utils";
import { format, startOfDay } from "date-fns";
import { bg } from "date-fns/locale";
import {
  MapPin,
  Scissors,
  CalendarDays,
  User,
  Check,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Percent,
  Search,
  Sparkles,
  Hand,
  Flower2,
  Zap,
  Leaf,
  Clock,
  X,
} from "lucide-react";
import {
  createReservation,
  getBookedRangesForWindow,
  getBookedSlots,
  getBookingProcedures,
  getOfficeClosures,
  type CreateReservationResult,
} from "@/app/actions/booking";
import { OFFICES, OPENING_HOURS, type OfficeName } from "@/config/site";
import { getFinalPrice, hasDiscount as procedureHasDiscount } from "@/lib/pricing";
import {
  buildDaySlots,
  dayOccupancy,
  getBookingWindow,
  getBookingWindowDays,
  isDayClosed,
  type DaySlot,
  type TimeRange,
} from "@/lib/slots";
import { GlassFill, GlassSample, loadLabel } from "@/components/day-load";
import type { DayContentProps } from "react-day-picker";
import { fieldErrors, reservationFormSchema, type ReservationFormData } from "@/lib/validation";
import type { Procedure } from "@/types/database";

interface ReservationWizardProps {
  onComplete: (reservation: CreateReservationResult["reservation"]) => void;
  preSelectedProcedureId?: string | null;
}

interface WizardState {
  office: OfficeName | null;
  selectedCategory: string | null;
  selectedSubCategory: string | null;
  procedure: Procedure | null;
  date: Date | null;
  timeSlot: string | null;
  formData: ReservationFormData;
}

const initialFormData: ReservationFormData = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  note: "",
};

const steps = [
  { id: 1, title: "Локация", icon: MapPin },
  { id: 2, title: "Процедура", icon: Scissors },
  { id: 3, title: "Дата и час", icon: CalendarDays },
  { id: 4, title: "Данни", icon: User },
];

// Category hierarchy for better organization
const categoryHierarchy: Record<string, string[]> = {
  "Промоции": [], // Special category for discounted procedures
  "Нокти": ["Нокти"],
  "Лице": ["Вежди", "Мигли", "Терапии за лице", "Естетични процедури - лице"],
  "Епилация": ["Епилация жени", "Епилация мъже"],
  "Тяло": ["Естетични процедури - тяло", "Пилинг на тяло", "Пресотерапия и лимфендренаж"],
};

// Icon and one-line description for each category card
const categoryMeta: Record<string, { icon: typeof MapPin; description: string }> = {
  "Промоции": { icon: Percent, description: "Процедури с отстъпка в момента" },
  "Нокти": { icon: Hand, description: "Педикюр и грижа за ноктите" },
  "Лице": { icon: Flower2, description: "Мигли, вежди, терапии и естетика" },
  "Епилация": { icon: Zap, description: "Лазер и кола маска за жени и мъже" },
  "Тяло": { icon: Leaf, description: "Пилинг, лимфодренаж и оформяне" },
};

const officeTaglines: Record<OfficeName, string> = {
  "София": "Салонът в столицата",
  "Лом": "Салонът в Лом",
};

/** "Всеки ден 09:00 - 19:00" when every day has the same hours. */
function openingHoursText(): string {
  const days = Object.values(OPENING_HOURS).filter(Boolean) as { open: string; close: string }[];
  const first = days[0];
  if (days.length === 7 && days.every((d) => d.open === first.open && d.close === first.close)) {
    return `Всеки ден ${first.open} - ${first.close}`;
  }
  return "Вижте свободните часове в календара";
}

const timeGroups = [
  { label: "Сутрин", test: (t: string) => t < "12:00" },
  { label: "Следобед", test: (t: string) => t >= "12:00" && t < "17:00" },
  { label: "Вечер", test: (t: string) => t >= "17:00" },
];

/** Local calendar Date for a "yyyy-MM-dd" key (the calendar works in local days). */
function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

// Sub-categories for epilation
const subCategoryMap: Record<string, string[]> = {
  "Епилация жени": ["Лазерна епилация - жени", "Кола маска - жени"],
  "Епилация мъже": ["Лазерна епилация - мъже", "Кола маска - мъже"],
};

// "Запомни ме": customer details kept only in this browser (localStorage), never in a cookie.
const REMEMBER_KEY = "cb_customer_details";

function loadRememberedDetails(): ReservationFormData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return {
      firstName: String(saved.firstName ?? ""),
      lastName: String(saved.lastName ?? ""),
      phone: String(saved.phone ?? ""),
      email: String(saved.email ?? ""),
      note: "",
    };
  } catch {
    return null;
  }
}

function saveRememberedDetails(details: ReservationFormData | null) {
  try {
    if (details) {
      const { firstName, lastName, phone, email } = details;
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({ firstName, lastName, phone, email }));
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }
  } catch {
    // Storage blocked (private mode etc.) - remembering is optional.
  }
}

export function ReservationWizard({ onComplete, preSelectedProcedureId }: ReservationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>(() => ({
    office: null,
    selectedCategory: null,
    selectedSubCategory: null,
    procedure: null,
    date: null,
    timeSlot: null,
    formData: loadRememberedDetails() ?? initialFormData,
  }));
  const [remember, setRemember] = useState(() => loadRememberedDetails() !== null);

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [scheduleClosures, setScheduleClosures] = useState<TimeRange[]>([]);
  // Booked ranges tagged with the office/day they were loaded for
  const [booked, setBooked] = useState<{ key: string; ranges: TimeRange[] } | null>(null);

  useEffect(() => {
    getBookingProcedures()
      .then((loaded) => {
        setProcedures(loaded);
        // Pre-select a procedure passed in the URL (?procedureId=...)
        const preSelected = preSelectedProcedureId && loaded.find((p) => p.id === preSelectedProcedureId);
        if (preSelected) {
          setState((prev) => ({ ...prev, procedure: preSelected }));
        }
      })
      .catch((error) => console.error("Failed to load procedures:", error));
  }, [preSelectedProcedureId]);

  // Fetch schedule closures when office is selected
  useEffect(() => {
    if (state.office) {
      getOfficeClosures(state.office)
        .then(setScheduleClosures)
        .catch((error) => console.error("Failed to load closures:", error));
    }
  }, [state.office]);

  // Bookings for the whole booking window, used to show how busy each day is
  const [windowBooked, setWindowBooked] = useState<{ office: OfficeName; ranges: TimeRange[] } | null>(null);
  useEffect(() => {
    const office = state.office;
    if (!office) return;
    let cancelled = false;
    getBookedRangesForWindow(office)
      .then((ranges) => !cancelled && setWindowBooked({ office, ranges }))
      .catch((error) => console.error("Failed to load day occupancy:", error));
    return () => {
      cancelled = true;
    };
  }, [state.office]);

  // Per day: share of the day already booked, and whether the chosen procedure still fits anywhere
  const dayLoad = useMemo(() => {
    const map = new Map<string, { occupancy: number; full: boolean }>();
    if (!windowBooked || windowBooked.office !== state.office) return map;
    const duration = state.procedure?.duration_minutes ?? 30;
    for (const key of getBookingWindowDays()) {
      const busy = [...windowBooked.ranges, ...scheduleClosures];
      const slots = buildDaySlots({ dateKey: key, durationMinutes: duration, closures: scheduleClosures, booked: windowBooked.ranges });
      map.set(key, { occupancy: dayOccupancy(key, busy), full: !slots.some((slot) => slot.available) });
    }
    return map;
  }, [windowBooked, state.office, state.procedure, scheduleClosures]);

  // Calendar days are converted to "yyyy-MM-dd"; times are always salon (Sofia) time.
  const dateKey = state.date ? format(state.date, "yyyy-MM-dd") : null;
  const bookedKey = dateKey && state.office ? `${state.office}|${dateKey}` : null;
  const loadingSlots = bookedKey !== null && booked?.key !== bookedKey;

  // Fetch booked slots when date or office changes
  useEffect(() => {
    if (!dateKey || !state.office || !bookedKey) return;
    let cancelled = false;
    getBookedSlots(state.office, dateKey)
      .catch((error) => {
        console.error("Failed to load booked slots:", error);
        return [] as TimeRange[];
      })
      .then((ranges) => {
        if (!cancelled) setBooked({ key: bookedKey, ranges });
      });
    return () => {
      cancelled = true;
    };
  }, [dateKey, state.office, bookedKey]);

  const timeSlots: DaySlot[] = useMemo(
    () =>
      dateKey
        ? buildDaySlots({
            dateKey,
            durationMinutes: state.procedure?.duration_minutes ?? 30,
            closures: scheduleClosures,
            booked: booked?.key === bookedKey ? booked.ranges : [],
          })
        : [],
    [dateKey, scheduleClosures, booked, bookedKey, state.procedure]
  );

  const bookingWindow = getBookingWindow();
  const isDateDisabled = (date: Date) => {
    const key = format(date, "yyyy-MM-dd");
    return (
      date < startOfDay(new Date()) ||
      key < bookingWindow.first ||
      key > bookingWindow.last ||
      isDayClosed(key, scheduleClosures) ||
      dayLoad.get(key)?.full === true
    );
  };

  // Calendar day: a box that fills up like a glass with the day's bookings
  const DayWithLoad = ({ date, activeModifiers }: DayContentProps) => {
    const info = dayLoad.get(format(date, "yyyy-MM-dd"));
    const show = info && !activeModifiers.disabled && !activeModifiers.outside;
    return (
      <>
        {show && <GlassFill occupancy={info.occupancy} />}
        <span className="relative">{date.getDate()}</span>
        {show && <span className="sr-only">, {loadLabel(info.occupancy)}</span>}
      </>
    );
  };

  // First free time for the chosen procedure across the booking window (cheap: ~60 days)
  const findEarliest = (): { dateKey: string; time: string } | null => {
    if (!state.procedure || !windowBooked || windowBooked.office !== state.office) return null;
    for (const key of getBookingWindowDays()) {
      const slot = buildDaySlots({
        dateKey: key,
        durationMinutes: state.procedure.duration_minutes,
        closures: scheduleClosures,
        booked: windowBooked.ranges,
      }).find((candidate) => candidate.available);
      if (slot) return { dateKey: key, time: slot.time };
    }
    return null;
  };
  const earliest = currentStep === 3 ? findEarliest() : null;

  // Search across all procedures (step 2)
  const [query, setQuery] = useState("");
  const searchResults = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("bg");
    if (q.length < 2) return [];
    return procedures
      .filter((p) => p.name.toLocaleLowerCase("bg").includes(q) || p.type.toLocaleLowerCase("bg").includes(q))
      .slice(0, 30);
  }, [query, procedures]);

  const selectOffice = (office: OfficeName) => {
    setState((prev) => ({ ...prev, office }));
    // If procedure is pre-selected, skip to step 3 (date selection)
    if (state.procedure) {
      setCurrentStep(3);
    } else {
      setCurrentStep(2);
    }
  };

  const selectCategory = (category: string) => {
    setState((prev) => ({ 
      ...prev, 
      selectedCategory: category, 
      selectedSubCategory: null,
      procedure: null 
    }));
  };

  const selectSubCategory = (subCategory: string) => {
    setState((prev) => ({ ...prev, selectedSubCategory: subCategory, procedure: null }));
  };

  const selectProcedure = (procedure: Procedure) => {
    setState((prev) => ({ ...prev, procedure, date: null, timeSlot: null }));
    setCurrentStep(3);
  };

  const selectDate = (date: Date | undefined) => {
    if (date) {
      setState((prev) => ({ ...prev, date, timeSlot: null }));
    }
  };

  const selectTimeSlot = (time: string) => {
    setState((prev) => ({ ...prev, timeSlot: time }));
    setCurrentStep(4);
  };

  const pickEarliest = () => {
    const earliest = findEarliest();
    if (!earliest) return;
    setState((prev) => ({ ...prev, date: dateFromKey(earliest.dateKey), timeSlot: earliest.time }));
    setCurrentStep(4);
  };

  // Completed steps can be reopened from the stepper or the summary
  const goToStep = (step: number) => {
    if (step < currentStep) setCurrentStep(step);
  };

  const updateFormData = (field: keyof ReservationFormData, value: string) => {
    setState((prev) => ({
      ...prev,
      formData: { ...prev.formData, [field]: value },
    }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const goBack = () => {
    // A procedure pre-selected from a link skips step 2, so go straight back to the office.
    if (currentStep === 3 && !state.selectedCategory) {
      setCurrentStep(1);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const result = reservationFormSchema.safeParse(state.formData);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    if (!state.office || !state.procedure || !dateKey || !state.timeSlot) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await createReservation({
        officeName: state.office,
        procedureId: state.procedure.id,
        date: dateKey,
        time: state.timeSlot,
        firstName: state.formData.firstName,
        lastName: state.formData.lastName,
        phone: state.formData.phone,
        email: state.formData.email,
        note: state.formData.note || undefined,
      });

      if (response.success && response.reservation) {
        saveRememberedDetails(remember ? state.formData : null);
        onComplete(response.reservation);
      } else {
        setErrors({ ...response.fieldErrors, submit: response.error || "Възникна грешка" });
      }
    } catch (error) {
      console.error("Reservation failed:", error);
      setErrors({ submit: "Възникна грешка. Моля, опитайте отново или се обадете." });
    } finally {
      setSubmitting(false);
    }
  };

  // Get discounted procedures
  const getDiscountedProcedures = () => {
    return procedures.filter(procedureHasDiscount);
  };

  // Get procedures for current selection
  const getFilteredProcedures = () => {
    if (!state.selectedCategory) return [];
    
    // Special handling for Промоции category
    if (state.selectedCategory === "Промоции") {
      return getDiscountedProcedures();
    }
    
    const subCategories = categoryHierarchy[state.selectedCategory] || [];
    let typesToShow: string[] = [];
    
    if (state.selectedSubCategory) {
      // Check if it's a sub-category that needs further drilling
      const subSubCategories = subCategoryMap[state.selectedSubCategory];
      if (subSubCategories) {
        typesToShow = subSubCategories;
      } else {
        typesToShow = [state.selectedSubCategory];
      }
    } else {
      // Show all types under this category
      subCategories.forEach(sub => {
        const subSub = subCategoryMap[sub];
        if (subSub) {
          typesToShow.push(...subSub);
        } else {
          typesToShow.push(sub);
        }
      });
    }
    
    return procedures.filter(p => typesToShow.includes(p.type));
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return "completed";
    if (stepId === currentStep) return "current";
    return "upcoming";
  };

  const finalPrice = state.procedure ? getFinalPrice(state.procedure) : null;
  const dateLabel = state.date ? format(state.date, "EEEE, d MMMM", { locale: bg }) : null;

  const summaryRows = [
    { step: 1, label: "Салон", value: state.office },
    { step: 2, label: "Процедура", value: state.procedure?.name ?? null },
    {
      step: 3,
      label: "Дата и час",
      value: dateLabel && state.timeSlot ? `${dateLabel}, ${state.timeSlot}` : dateLabel,
    },
  ];

  const renderProcedureButton = (proc: Procedure) => {
    const hasDiscount = procedureHasDiscount(proc);
    return (
      <button
        key={proc.id}
        onClick={() => selectProcedure(proc)}
        className={cn(
          "group w-full rounded-xl border bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_24px_-18px_rgba(51,36,31,0.5)]",
          state.procedure?.id === proc.id ? "border-cocoa" : hasDiscount ? "border-gold" : "border-gray-200 hover:border-cocoa/40"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-cocoa">{proc.name}</p>
            <p className="mt-1 flex items-center gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatDuration(proc.duration_minutes)}
              </span>
              <span>{proc.technician}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            {hasDiscount && (
              <p className="text-xs">
                <span className="mr-1.5 rounded bg-rose-dark px-1.5 py-0.5 font-semibold text-white">−{proc.discount_percentage}%</span>
                <span className="text-gray-400 line-through">{formatPrice(proc.price)}</span>
              </p>
            )}
            <p className="font-display text-xl text-cocoa">{formatPrice(getFinalPrice(proc))}</p>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <div className="min-w-0">
        {/* Progress: completed steps can be reopened */}
        <nav aria-label="Напредък" className="mb-8">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const status = getStepStatus(step.id);
              const Icon = step.icon;
              const clickable = status === "completed";
              return (
                <li key={step.id} className="flex flex-1 items-center last:flex-none">
                  <button
                    type="button"
                    onClick={() => goToStep(step.id)}
                    disabled={!clickable}
                    aria-current={status === "current" ? "step" : undefined}
                    className={cn(
                      "flex flex-col items-center gap-2 transition-colors duration-300 disabled:cursor-default",
                      status === "upcoming" ? "text-gray-400" : "text-cocoa",
                      clickable && "hover:text-rose-dark"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-full border transition-colors duration-300",
                        status === "completed" && "border-cocoa bg-cocoa text-white",
                        status === "current" && "border-gold bg-gold text-cocoa ring-4 ring-gold/20",
                        status === "upcoming" && "border-gray-300 bg-white text-gray-400"
                      )}
                    >
                      {status === "completed" ? <Check className="h-5 w-5" aria-hidden="true" /> : <Icon className="h-5 w-5" aria-hidden="true" />}
                    </span>
                    <span className="hidden text-xs font-medium sm:block">{step.title}</span>
                  </button>
                  {index < steps.length - 1 && (
                    <span
                      aria-hidden="true"
                      className={cn("mx-2 h-px flex-1 transition-colors duration-500 sm:mx-4", status === "completed" ? "bg-cocoa" : "bg-gray-200")}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Compact summary on small screens */}
        {currentStep > 1 && (
          <div className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-blush-light px-4 py-3 text-sm text-cocoa lg:hidden">
            {[state.office, state.procedure?.name, dateLabel && (state.timeSlot ? `${dateLabel}, ${state.timeSlot}` : dateLabel)]
              .filter(Boolean)
              .map((item, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gold" aria-hidden="true">·</span>}
                  {item}
                </span>
              ))}
            {finalPrice !== null && <span className="ml-auto font-display text-base">{formatPrice(finalPrice)}</span>}
          </div>
        )}

        {currentStep > 1 && (
          <button onClick={goBack} className="mb-4 flex items-center gap-2 text-gray-600 transition-colors hover:text-cocoa">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm">Назад</span>
          </button>
        )}

        {/* Step 1: Salon */}
        {currentStep === 1 && (
          <div key="step-1" className="animate-fade-in-up">
            <p className="eyebrow mb-2">Стъпка 1 от 4</p>
            <h2 className="mb-6 text-3xl">Къде ще ви посрещнем?</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {OFFICES.map((office) => (
                <button
                  key={office}
                  onClick={() => selectOffice(office)}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-white p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(51,36,31,0.5)]",
                    state.office === office ? "border-cocoa" : "border-gray-200 hover:border-cocoa/40"
                  )}
                >
                  <span aria-hidden="true" className="drop-dots absolute -right-10 -top-10 h-32 w-32 opacity-70" />
                  <MapPin className="relative h-5 w-5 text-rose-dark" aria-hidden="true" />
                  <span className="relative mt-4 block font-display text-3xl text-cocoa">{office}</span>
                  <span className="relative mt-1 block text-sm text-gray-600">{officeTaglines[office]}</span>
                  <span className="relative mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-600">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {openingHoursText()}
                  </span>
                  <ChevronRight className="absolute bottom-6 right-6 h-5 w-5 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-cocoa" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Procedure */}
        {currentStep === 2 && (
          <div key="step-2" className="animate-fade-in-up">
            <p className="eyebrow mb-2">Стъпка 2 от 4</p>
            <h2 className="mb-6 text-3xl">Каква процедура желаете?</h2>

            {/* Search */}
            <div className="relative mb-6">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Търсете процедура, напр. педикюр, мигли, лазер…"
                aria-label="Търсене на процедура"
                className="h-12 w-full rounded-xl border border-gray-200 bg-white pl-11 pr-10 text-sm placeholder:text-gray-400 focus:border-cocoa focus:outline-none focus:ring-2 focus:ring-gold/30"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-cocoa"
                  aria-label="Изчисти търсенето"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {query.trim().length >= 2 ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600" aria-live="polite">
                  {searchResults.length > 0 ? `Намерени: ${searchResults.length}` : "Няма намерени процедури. Опитайте с друга дума."}
                </p>
                {searchResults.map(renderProcedureButton)}
              </div>
            ) : (
              <>
                {/* Main categories */}
                {!state.selectedCategory && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {Object.keys(categoryHierarchy).map((category) => {
                      const isPromo = category === "Промоции";
                      const count = isPromo
                        ? getDiscountedProcedures().length
                        : procedures.filter((p) =>
                            (categoryHierarchy[category] ?? []).flatMap((sub) => subCategoryMap[sub] ?? [sub]).includes(p.type)
                          ).length;
                      if (isPromo && count === 0) return null;
                      const meta = categoryMeta[category];
                      const Icon = meta?.icon ?? Sparkles;
                      return (
                        <button
                          key={category}
                          onClick={() => selectCategory(category)}
                          className={cn(
                            "group flex items-center gap-4 rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(51,36,31,0.5)]",
                            isPromo ? "border-gold bg-champagne sm:col-span-2" : "border-gray-200 bg-white hover:border-cocoa/40"
                          )}
                        >
                          <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", isPromo ? "bg-gold text-cocoa" : "bg-blush-light text-rose-dark")}>
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-xl text-cocoa">{category}</span>
                            <span className="block text-sm text-gray-600">{meta?.description}</span>
                          </span>
                          <span className="shrink-0 text-xs font-semibold text-gray-500">{count}</span>
                          <ChevronRight className="h-5 w-5 shrink-0 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-cocoa" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Sub categories (Епилация) */}
                {state.selectedCategory && state.selectedCategory !== "Промоции" && !state.selectedSubCategory && categoryHierarchy[state.selectedCategory]?.some((sub) => subCategoryMap[sub]) && (
                  <div className="space-y-4">
                    <button
                      onClick={() => setState((prev) => ({ ...prev, selectedCategory: null }))}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-cocoa"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {state.selectedCategory}
                    </button>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {categoryHierarchy[state.selectedCategory].map((subCat) => (
                        <button
                          key={subCat}
                          onClick={() => selectSubCategory(subCat)}
                          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-cocoa/40"
                        >
                          <span className="font-display text-xl text-cocoa">{subCat}</span>
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-cocoa" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procedure list */}
                {state.selectedCategory && (state.selectedCategory === "Промоции" || state.selectedSubCategory || !categoryHierarchy[state.selectedCategory]?.some((sub) => subCategoryMap[sub])) && (
                  <div className="space-y-4">
                    <button
                      onClick={() =>
                        setState((prev) => ({
                          ...prev,
                          selectedSubCategory: null,
                          selectedCategory: prev.selectedSubCategory ? prev.selectedCategory : null,
                        }))
                      }
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-cocoa"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {state.selectedSubCategory || state.selectedCategory}
                    </button>
                    <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">{getFilteredProcedures().map(renderProcedureButton)}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3: Date and time */}
        {currentStep === 3 && (
          <div key="step-3" className="animate-fade-in-up">
            <p className="eyebrow mb-2">Стъпка 3 от 4</p>
            <h2 className="mb-6 text-3xl">Кога ви е удобно?</h2>

            {earliest && (
              <button
                type="button"
                onClick={pickEarliest}
                className="group mb-6 flex w-full items-center gap-4 rounded-2xl border border-gold bg-champagne p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-20px_rgba(51,36,31,0.5)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold text-cocoa">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-rose-dark">Най-бързо</span>
                  <span className="block text-cocoa">
                    Първи свободен час: <strong className="font-semibold">{format(dateFromKey(earliest.dateKey), "EEEE, d MMMM", { locale: bg })}, {earliest.time}</strong>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-cocoa/50 transition-all group-hover:translate-x-0.5 group-hover:text-cocoa" aria-hidden="true" />
              </button>
            )}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-[auto_minmax(0,1fr)]">
              {/* Calendar: each day is a box that fills like a glass with its bookings */}
              <div className="flex flex-col items-center xl:items-start">
                <Calendar
                  mode="single"
                  selected={state.date ?? undefined}
                  onSelect={selectDate}
                  disabled={isDateDisabled}
                  className="rounded-2xl border border-blush bg-white p-3 sm:p-4 shadow-[0_20px_40px_-30px_rgba(51,36,31,0.35)]"
                  locale={bg}
                  components={{ DayContent: DayWithLoad }}
                  classNames={{
                    head_cell: "w-10 sm:w-11 text-[0.7rem] font-medium uppercase text-gray-500",
                    row: "flex w-full mt-1",
                    cell: "h-12 w-10 sm:h-14 sm:w-11 p-0.5 text-center text-sm relative focus-within:relative focus-within:z-20",
                    day: "relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg border border-blush bg-white text-sm font-medium text-cocoa transition-colors hover:border-cocoa/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark aria-selected:opacity-100",
                    day_selected: "!border-cocoa !bg-cocoa !text-white",
                    day_today: "font-bold",
                    day_disabled: "!border-transparent !bg-transparent text-gray-300 line-through decoration-gray-300 cursor-default hover:!border-transparent",
                    day_outside: "invisible",
                  }}
                />
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
                  <span className="flex items-center gap-2"><GlassSample occupancy={0} /> свободно</span>
                  <span className="flex items-center gap-2"><GlassSample occupancy={0.5} /> наполовина</span>
                  <span className="flex items-center gap-2"><GlassSample occupancy={0.9} /> почти пълно</span>
                </div>
              </div>

              {/* Time slots */}
              <div>
                {!state.date ? (
                  <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-blush p-8 text-center text-gray-500">
                    <CalendarDays className="mb-3 h-6 w-6 text-rose-dark" aria-hidden="true" />
                    <p>Изберете ден от календара, за да видите свободните часове.</p>
                  </div>
                ) : (
                  <div className="animate-fade-in">
                    <p className="mb-4 text-sm text-gray-600">
                      Свободни часове за{" "}
                      <span className="font-semibold text-cocoa">{format(state.date, "EEEE, d MMMM", { locale: bg })}</span>
                    </p>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gold-dark" aria-hidden="true" />
                        <span className="ml-2 text-gray-500">Зареждане...</span>
                      </div>
                    ) : timeSlots.some((slot) => slot.available) ? (
                      <div className="space-y-5">
                        {timeGroups.map((group) => {
                          const groupSlots = timeSlots.filter((slot) => group.test(slot.time));
                          if (!groupSlots.some((slot) => slot.available)) return null;
                          return (
                            <div key={group.label}>
                              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-rose-dark">{group.label}</p>
                              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                {groupSlots.map((slot) => (
                                  <button
                                    key={slot.time}
                                    onClick={() => slot.available && selectTimeSlot(slot.time)}
                                    disabled={!slot.available}
                                    className={cn(
                                      "rounded-md px-2 py-3 text-sm font-medium tabular-nums transition-all duration-200",
                                      state.timeSlot === slot.time
                                        ? "border border-cocoa bg-cocoa text-white"
                                        : slot.available
                                          ? "border border-gray-200 bg-white text-cocoa hover:-translate-y-0.5 hover:border-cocoa hover:bg-blush-light"
                                          : "cursor-not-allowed border border-transparent bg-gray-50 text-gray-300 line-through"
                                    )}
                                    title={slot.booked ? "Заето" : !slot.available ? "Недостъпно" : ""}
                                  >
                                    {slot.time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="rounded-2xl bg-blush-light p-6 text-center text-gray-600">Няма свободни часове този ден. Изберете друг ден.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {currentStep === 4 && (
          <div key="step-4" className="animate-fade-in-up">
            <p className="eyebrow mb-2">Стъпка 4 от 4</p>
            <h2 className="mb-2 text-3xl">Почти готово</h2>
            <p className="mb-6 text-gray-600">Остава само да ни кажете как да се свържем с вас.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Име *</Label>
                <Input
                  id="firstName"
                  autoComplete="given-name"
                  value={state.formData.firstName}
                  onChange={(e) => updateFormData("firstName", e.target.value)}
                  placeholder="Въведете име"
                  className="h-12"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-700 mt-1">{errors.firstName}</p>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Фамилия *</Label>
                <Input
                  id="lastName"
                  autoComplete="family-name"
                  value={state.formData.lastName}
                  onChange={(e) => updateFormData("lastName", e.target.value)}
                  placeholder="Въведете фамилия"
                  className="h-12"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-700 mt-1">{errors.lastName}</p>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="phone">Телефон *</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={state.formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                placeholder="0888 123 456"
                className="h-12"
              />
              {errors.phone && (
                <p className="text-sm text-red-700 mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Имейл *</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={state.formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                placeholder="email@example.com"
                className="h-12"
              />
              {errors.email && (
                <p className="text-sm text-red-700 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="note">Бележка (по избор)</Label>
              <Textarea
                id="note"
                value={state.formData.note}
                onChange={(e) => updateFormData("note", e.target.value)}
                placeholder="Допълнителна информация..."
                rows={3}
                maxLength={500}
               
              />
              {errors.note && (
                <p className="text-sm text-red-700 mt-1">{errors.note}</p>
              )}
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => {
                  setRemember(e.target.checked);
                  if (!e.target.checked) saveRememberedDetails(null);
                }}
                className="mt-0.5 h-4 w-4 accent-cocoa"
              />
              <span>
                Запомни ме на това устройство
                <span className="block text-gray-500">
                  Името, телефонът и имейлът ще се попълват автоматично следващия път. Пазят се само във вашия браузър.
                </span>
              </span>
            </label>

            {errors.submit && (
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
                {errors.submit}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Изпращане...
                </>
              ) : (
                "Потвърди резервацията"
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Използваме данните ви само за тази резервация и за връзка с вас.{" "}
              <Link href="/poveritelnost" className="underline underline-offset-2 hover:text-cocoa">
                Политика за поверителност
              </Link>
            </p>
          </div>
        </div>
        )}
      </div>

      {/* Booking summary (desktop) */}
      <aside className="hidden lg:block">
        <div className="sticky top-28 overflow-hidden rounded-2xl bg-cocoa p-6 text-white">
          <span aria-hidden="true" className="drop-dots absolute -right-16 -top-16 h-48 w-48 opacity-60" />
          <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-gold">Вашата резервация</p>
          <dl className="relative mt-5 space-y-4">
            {summaryRows.map((row) => (
              <div key={row.step} className="border-b border-white/10 pb-4 last:border-b-0">
                <dt className="flex items-center justify-between text-xs text-white/60">
                  {row.label}
                  {row.value && row.step < currentStep && (
                    <button type="button" onClick={() => goToStep(row.step)} className="text-gold hover:text-white">
                      Промени
                    </button>
                  )}
                </dt>
                <dd className={cn("mt-1", row.value ? "text-white" : "text-white/35")}>{row.value ?? "—"}</dd>
              </div>
            ))}
          </dl>
          {state.procedure && finalPrice !== null && (
            <div className="relative mt-2 flex items-baseline justify-between border-t border-white/15 pt-4">
              <span className="text-sm text-white/70">{formatDuration(state.procedure.duration_minutes)}</span>
              <span className="text-right">
                {procedureHasDiscount(state.procedure) && (
                  <span className="mr-2 text-sm text-white/50 line-through">{formatPrice(state.procedure.price)}</span>
                )}
                <span className="font-display text-2xl text-gold">{formatPrice(finalPrice)}</span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
