"use client";

import { useState, useEffect, useMemo } from "react";
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
  getBookedSlots,
  getBookingProcedures,
  getOfficeClosures,
  type CreateReservationResult,
} from "@/app/actions/booking";
import { OFFICES, type OfficeName } from "@/config/site";
import { getFinalPrice, hasDiscount as procedureHasDiscount } from "@/lib/pricing";
import { buildDaySlots, getBookingWindow, isDayClosed, type DaySlot, type TimeRange } from "@/lib/slots";
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

export function ReservationWizard({ onComplete, preSelectedProcedureId }: ReservationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<WizardState>({
    office: null,
    selectedCategory: null,
    selectedSubCategory: null,
    procedure: null,
    date: null,
    timeSlot: null,
    formData: initialFormData,
  });

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
      isDayClosed(key, scheduleClosures)
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
                    status === "completed" && "text-gold",
                    status === "current" && "text-brand-black",
                    status === "upcoming" && "text-gray-300"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      status === "completed" && "bg-gold border-gold text-white scale-90",
                      status === "current" && "border-gold text-gold scale-110 shadow-lg shadow-gold/20",
                      status === "upcoming" && "border-gray-200 text-gray-300"
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
                      "flex-1 h-0.5 mx-2 sm:mx-4 transition-all duration-500",
                      status === "completed" ? "bg-gold" : "bg-gray-200"
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
          className="flex items-center gap-2 text-gray-500 hover:text-gold transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Назад</span>
        </button>
      )}

      {/* Step 1: Office selection */}
      {currentStep === 1 && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <MapPin className="w-6 h-6 text-gold" aria-hidden="true" />
            Изберете локация
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {OFFICES.map((office) => (
              <button
                key={office}
                onClick={() => selectOffice(office)}
                className={cn(
                  "p-6 rounded-2xl border-2 text-center font-medium transition-all duration-300 hover:scale-[1.02]",
                  state.office === office
                    ? "border-gold bg-gold/10 text-gold shadow-lg shadow-gold/10"
                    : "border-gray-200 hover:border-gold/50 hover:shadow-md"
                )}
              >
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="text-lg">{office}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Procedure selection - Hierarchical */}
      {currentStep === 2 && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <Scissors className="w-6 h-6 text-gold" aria-hidden="true" />
            Изберете процедура
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
                      "p-6 rounded-2xl border-2 text-left font-medium transition-all duration-300 hover:shadow-md hover:scale-[1.02] group",
                      isPromo 
                        ? "border-gold bg-gold/10 hover:border-gold hover:bg-gold/20 col-span-2" 
                        : "border-gray-200 hover:border-gold/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {isPromo && <Percent className="w-5 h-5 text-gold" />}
                      <span className={cn("text-lg", isPromo && "text-gold font-semibold")}>{category}</span>
                      {isPromo && (
                        <span className="ml-1 text-sm text-gold/70">({getDiscountedProcedures().length} оферти)</span>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      "w-5 h-5 float-right -mt-5 transition-colors",
                      isPromo ? "text-gold group-hover:text-gold" : "text-gray-400 group-hover:text-gold"
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
                className="text-sm text-gray-500 hover:text-gold flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> {state.selectedCategory}
              </button>
              <div className="grid grid-cols-2 gap-4">
                {categoryHierarchy[state.selectedCategory].map((subCat) => (
                  <button
                    key={subCat}
                    onClick={() => selectSubCategory(subCat)}
                    className="p-5 rounded-2xl border-2 border-gray-200 text-left font-medium transition-all duration-300 hover:border-gold/50 hover:shadow-md hover:scale-[1.02] group"
                  >
                    <span>{subCat}</span>
                    <ChevronRight className="w-5 h-5 float-right text-gray-400 group-hover:text-gold transition-colors" />
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
                className="text-sm text-gray-500 hover:text-gold flex items-center gap-1"
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
                        "w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:scale-[1.01] relative",
                        state.procedure?.id === proc.id
                          ? "border-gold bg-gold/10 shadow-md"
                          : "border-gray-200 hover:border-gold/50 hover:shadow-sm",
                        hasDiscount && "border-red-200 bg-red-50/50"
                      )}
                    >
                      {hasDiscount && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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
                              <p className="font-semibold text-red-500 text-lg">
                                {formatPrice(discountedPrice)}
                              </p>
                            </>
                          ) : (
                            <p className="font-semibold text-gold text-lg">
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
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <CalendarDays className="w-6 h-6 text-gold" aria-hidden="true" />
            Изберете дата и час
          </h2>
          
          {/* Selected procedure summary */}
          {state.procedure && (() => {
            const hasDiscount = procedureHasDiscount(state.procedure);
            const discountedPrice = getFinalPrice(state.procedure);
            
            return (
              <div className={cn(
                "mb-6 p-4 rounded-xl border",
                hasDiscount ? "bg-red-50/50 border-red-200" : "bg-gold/5 border-gold/20"
              )}>
                <p className="text-sm text-gray-500">Избрана процедура:</p>
                <p className="font-medium">{state.procedure.name}</p>
                {hasDiscount ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-400 line-through">{formatPrice(state.procedure.price)}</span>
                    <span className="text-sm font-semibold text-red-500">{formatPrice(discountedPrice)}</span>
                    <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">-{state.procedure.discount_percentage}%</span>
                    <span className="text-sm text-gray-500">• {formatDuration(state.procedure.duration_minutes)}</span>
                  </div>
                ) : (
                  <p className="text-sm text-gold">{formatPrice(state.procedure.price)} • {formatDuration(state.procedure.duration_minutes)}</p>
                )}
              </div>
            );
          })()}
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Calendar - 3D style */}
            <div className="flex justify-center">
              <div className="relative">
                {/* 3D shadow layers */}
                <div className="absolute inset-0 bg-gold/20 rounded-2xl translate-x-2 translate-y-2" />
                <div className="absolute inset-0 bg-gold/10 rounded-2xl translate-x-1 translate-y-1" />
                <Calendar
                  mode="single"
                  selected={state.date ?? undefined}
                  onSelect={selectDate}
                  disabled={isDateDisabled}
                  className="relative rounded-2xl border-2 border-gold/30 p-4 bg-white shadow-xl"
                  locale={bg}
                />
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
                      <Loader2 className="w-6 h-6 animate-spin text-gold" />
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
                            "py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300",
                            state.timeSlot === slot.time
                              ? "bg-gold text-white shadow-lg shadow-gold/30 scale-105"
                              : slot.available
                                ? "bg-gray-100 hover:bg-gold/20 hover:text-gold hover:scale-105"
                                : slot.booked
                                  ? "bg-red-100 text-red-400 cursor-not-allowed line-through"
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed line-through"
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
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
            <User className="w-6 h-6 text-gold" aria-hidden="true" />
            Вашите данни
          </h2>
          
          {/* Reservation summary */}
          <div className="mb-6 p-4 bg-gold/5 rounded-xl border border-gold/20 space-y-2">
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
              <span className="font-medium text-gold">{state.timeSlot}</span>
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
                  className="rounded-xl h-12"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>
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
                  className="rounded-xl h-12"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>
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
                className="rounded-xl h-12"
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
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
                className="rounded-xl h-12"
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
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
                className="rounded-xl"
              />
              {errors.note && (
                <p className="text-sm text-red-500 mt-1">{errors.note}</p>
              )}
            </div>

            {errors.submit && (
              <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">
                {errors.submit}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full h-14 text-base"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Изпращане...
                </>
              ) : (
                "ПОТВЪРДИ РЕЗЕРВАЦИЯ"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
