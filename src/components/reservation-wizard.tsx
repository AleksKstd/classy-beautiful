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
} from "lucide-react";
import {
  createReservation,
  getBookedRangesForWindow,
  getBookedSlots,
  getBookingProcedures,
  getOfficeClosures,
  type CreateReservationResult,
} from "@/app/actions/booking";
import { OFFICES, type OfficeName } from "@/config/site";
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
import { DayLoadWave, loadLabel } from "@/components/day-load";
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

  // Calendar day: the date with a small wave showing how busy the day is
  const DayWithLoad = ({ date, activeModifiers }: DayContentProps) => {
    const info = dayLoad.get(format(date, "yyyy-MM-dd"));
    const showWave = info && !activeModifiers.disabled && !activeModifiers.outside;
    return (
      <span className="flex flex-col items-center gap-1">
        <span>{date.getDate()}</span>
        {showWave ? (
          <>
            <DayLoadWave occupancy={info.occupancy} />
            <span className="sr-only">, {loadLabel(info.occupancy)}</span>
          </>
        ) : (
          <span className="h-1.5" aria-hidden="true" />
        )}
      </span>
    );
  };

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

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <nav aria-label="Напредък" className="mb-8">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);
            const Icon = step.icon;
            return (
              <li key={step.id} className="flex items-center flex-1">
                <div
                  className={cn(
                    "flex flex-col items-center gap-2 transition-all duration-300",
                    status === "completed" && "text-brand-black",
                    status === "current" && "text-brand-black",
                    status === "upcoming" && "text-gray-400"
                  )}
                >
                  <div
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center border transition-colors duration-300",
                      status === "completed" && "bg-brand-black border-brand-black text-white",
                      status === "current" && "border-gold bg-gold text-brand-black",
                      status === "upcoming" && "border-gray-300 text-gray-400"
                    )}
                  >
                    {status === "completed" ? (
                      <Check className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      <Icon className="w-5 h-5" aria-hidden="true" />
                    )}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-px mx-2 sm:mx-4 transition-colors duration-500",
                      status === "completed" ? "bg-brand-black" : "bg-gray-200"
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Back button */}
      {currentStep > 1 && (
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-gray-600 hover:text-brand-black transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Назад</span>
        </button>
      )}

      {/* Step 1: Office selection */}
      {currentStep === 1 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl mb-6">Изберете локация
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OFFICES.map((office) => (
              <button
                key={office}
                onClick={() => selectOffice(office)}
                className={cn(
                  "p-8 border text-center transition-colors duration-200",
                  state.office === office
                    ? "border-brand-black bg-ivory"
                    : "border-gray-300 hover:border-brand-black"
                )}
              >
                <span className="font-display text-3xl">{office}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Procedure selection - Hierarchical */}
      {currentStep === 2 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl mb-6">Изберете процедура
          </h2>
          
          {/* Main Categories */}
          {!state.selectedCategory && (
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(categoryHierarchy).map((category) => {
                const isPromo = category === "Промоции";
                const hasDiscounts = isPromo && getDiscountedProcedures().length > 0;
                
                // Hide promo category if no discounts
                if (isPromo && !hasDiscounts) return null;
                
                return (
                  <button
                    key={category}
                    onClick={() => selectCategory(category)}
                    className={cn(
                      "p-6 border text-left transition-colors duration-200 group",
                      isPromo 
                        ? "border-gold bg-ivory hover:border-brand-black col-span-2"
                        : "border-gray-300 hover:border-brand-black"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isPromo && <Percent className="w-5 h-5 text-gold-dark" aria-hidden="true" />}
                      <span className={cn("text-lg", isPromo && "font-semibold")}>{category}</span>
                      {isPromo && (
                        <span className="ml-1 text-sm text-gold-dark">({getDiscountedProcedures().length} оферти)</span>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "w-5 h-5 float-right -mt-5 transition-colors",
                      isPromo ? "text-gold-dark group-hover:text-brand-black" : "text-gray-400 group-hover:text-brand-black"
                    )} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub Categories (for Епилация) - skip for Промоции which goes directly to procedure list */}
          {state.selectedCategory && state.selectedCategory !== "Промоции" && !state.selectedSubCategory && categoryHierarchy[state.selectedCategory]?.some(sub => subCategoryMap[sub]) && (
            <div className="space-y-4">
              <button
                onClick={() => setState(prev => ({ ...prev, selectedCategory: null }))}
                className="text-sm text-gray-600 hover:text-brand-black flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> {state.selectedCategory}
              </button>
              <div className="grid grid-cols-2 gap-4">
                {categoryHierarchy[state.selectedCategory].map((subCat) => (
                  <button
                    key={subCat}
                    onClick={() => selectSubCategory(subCat)}
                    className="p-5 border border-gray-300 text-left transition-colors duration-200 hover:border-brand-black group"
                  >
                    <span>{subCat}</span>
                    <ChevronRight className="w-5 h-5 float-right text-gray-400 group-hover:text-brand-black transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Procedure List */}
          {state.selectedCategory && (state.selectedCategory === "Промоции" || state.selectedSubCategory || !categoryHierarchy[state.selectedCategory]?.some(sub => subCategoryMap[sub])) && (
            <div className="space-y-4">
              <button
                onClick={() => setState(prev => ({ 
                  ...prev, 
                  selectedSubCategory: null,
                  selectedCategory: state.selectedSubCategory ? prev.selectedCategory : null 
                }))}
                className="text-sm text-gray-600 hover:text-brand-black flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> {state.selectedSubCategory || state.selectedCategory}
              </button>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                {getFilteredProcedures().map((proc) => {
                  const hasDiscount = procedureHasDiscount(proc);
                  const discountedPrice = getFinalPrice(proc);
                  
                  return (
                    <button
                      key={proc.id}
                      onClick={() => selectProcedure(proc)}
                      className={cn(
                        "w-full p-4 border text-left transition-colors duration-200 relative",
                        state.procedure?.id === proc.id
                          ? "border-brand-black bg-ivory"
                          : "border-gray-300 hover:border-brand-black",
                        hasDiscount && "border-gold"
                      )}
                    >
                      {hasDiscount && (
                        <span className="absolute -top-2.5 right-3 bg-brand-black text-white text-xs font-semibold px-2 py-0.5">
                          -{proc.discount_percentage}%
                        </span>
                      )}
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{proc.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDuration(proc.duration_minutes)}
                          </p>
                        </div>
                        <div className="text-right">
                          {hasDiscount ? (
                            <>
                              <p className="text-sm text-gray-400 line-through">
                                {formatPrice(proc.price)}
                              </p>
                              <p className="font-display text-xl text-brand-black">
                                {formatPrice(discountedPrice)}
                              </p>
                            </>
                          ) : (
                            <p className="font-display text-xl text-brand-black">
                              {formatPrice(proc.price)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Date and time selection - Inline */}
      {currentStep === 3 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl mb-6">Изберете дата и час
          </h2>
          
          {/* Selected procedure summary */}
          {state.procedure && (() => {
            const hasDiscount = procedureHasDiscount(state.procedure);
            const discountedPrice = getFinalPrice(state.procedure);
            
            return (
              <div className={cn(
                "mb-6 p-4 border bg-ivory",
                hasDiscount ? "border-gold" : "border-gray-200"
              )}>
                <p className="text-sm text-gray-500">Избрана процедура:</p>
                <p className="font-medium">{state.procedure.name}</p>
                {hasDiscount ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400 line-through">{formatPrice(state.procedure.price)}</span>
                    <span className="text-sm font-semibold text-brand-black">{formatPrice(discountedPrice)}</span>
                    <span className="bg-brand-black text-white text-xs font-semibold px-1.5 py-0.5">−{state.procedure.discount_percentage}%</span>
                    <span className="text-sm text-gray-500">• {formatDuration(state.procedure.duration_minutes)}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700">{formatPrice(state.procedure.price)} · {formatDuration(state.procedure.duration_minutes)}</p>
                )}
              </div>
            );
          })()}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar with day occupancy */}
            <div className="flex justify-center">
              <div>
                <Calendar
                  mode="single"
                  selected={state.date ?? undefined}
                  onSelect={selectDate}
                  disabled={isDateDisabled}
                  className="border border-gray-300 p-4 bg-white"
                  locale={bg}
                  components={{ DayContent: DayWithLoad }}
                  classNames={{
                    head_cell: "text-gray-500 w-10 font-normal text-[0.75rem] uppercase",
                    day_today: "font-semibold",
                    cell: "h-12 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                    day: "inline-flex h-12 w-10 items-center justify-center p-0 text-sm font-normal transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-dark aria-selected:opacity-100",
                  }}
                />
                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500">
                  <span className="flex items-center gap-2">
                    <DayLoadWave occupancy={0.15} className="text-brand-black" /> свободно
                  </span>
                  <span className="flex items-center gap-2">
                    <DayLoadWave occupancy={0.55} className="text-brand-black" /> натоварено
                  </span>
                  <span className="flex items-center gap-2">
                    <DayLoadWave occupancy={0.95} className="text-brand-black" /> почти пълно
                  </span>
                </div>
              </div>
            </div>
            
            {/* Time slots - shown when date selected */}
            <div>
              {!state.date ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <p>Изберете дата от календара</p>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <p className="text-sm text-gray-600 mb-4">
                    Налични часове за{" "}
                    <span className="font-semibold text-brand-black">
                      {format(state.date, "d MMMM yyyy", { locale: bg })}
                    </span>
                  </p>
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gold-dark" />
                      <span className="ml-2 text-gray-500">Зареждане...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-2">
                      {timeSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => slot.available && selectTimeSlot(slot.time)}
                          disabled={!slot.available}
                          className={cn(
                            "py-3 px-2 text-sm font-medium tabular-nums transition-colors duration-200",
                            state.timeSlot === slot.time
                              ? "bg-brand-black text-white border border-brand-black"
                              : slot.available
                                ? "border border-gray-300 hover:border-brand-black"
                                : slot.booked
                                  ? "border border-transparent bg-gray-100 text-gray-400 cursor-not-allowed line-through"
                                  : "border border-transparent bg-gray-50 text-gray-300 cursor-not-allowed line-through"
                          )}
                          title={slot.booked ? "Заето" : !slot.available ? "Недостъпно" : ""}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Customer details */}
      {currentStep === 4 && (
        <div className="animate-fade-in-up">
          <h2 className="text-3xl mb-6">Вашите данни
          </h2>
          
          {/* Reservation summary */}
          <div className="mb-6 p-4 bg-ivory border border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Локация:</span>
              <span className="font-medium">{state.office}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Процедура:</span>
              <span className="font-medium">{state.procedure?.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Дата:</span>
              <span className="font-medium">{state.date && format(state.date, "d MMMM yyyy", { locale: bg })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Час:</span>
              <span className="font-medium">{state.timeSlot}</span>
            </div>
          </div>
          
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
                className="mt-0.5 h-4 w-4 accent-brand-black"
              />
              <span>
                Запомни ме на това устройство
                <span className="block text-gray-500">
                  Името, телефонът и имейлът ще се попълват автоматично следващия път. Пазят се само във вашия браузър.
                </span>
              </span>
            </label>

            {errors.submit && (
              <div className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
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
              <Link href="/poveritelnost" className="underline underline-offset-2 hover:text-brand-black">
                Политика за поверителност
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
