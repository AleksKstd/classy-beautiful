"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { formatPrice, formatDuration } from "@/lib/utils";
import { format, addDays } from "date-fns";
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
} from "lucide-react";
import { getProcedures, getAvailableSlots } from "@/app/actions/availability";
import { createReservation, CreateReservationResult } from "@/app/actions/reservations";
import { reservationFormSchema, type ReservationFormData } from "@/lib/validation";
import type { Procedure } from "@/types/database";
import type { TimeSlot } from "@/lib/availability";

interface ReservationWizardProps {
  onComplete: (reservation: CreateReservationResult["reservation"]) => void;
}

type OfficeName = "София" | "Лом";

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

export function ReservationWizard({ onComplete }: ReservationWizardProps) {
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
  const [timeSlots, setTimeSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getProcedures().then(setProcedures);
  }, []);

  // Generate time slots from 9:00 to 19:00 with 30 min intervals (for testing - no checks)
  const generateTimeSlots = () => {
    const slots: { time: string; available: boolean }[] = [];
    for (let hour = 9; hour < 19; hour++) {
      slots.push({ time: `${hour.toString().padStart(2, '0')}:00`, available: true });
      slots.push({ time: `${hour.toString().padStart(2, '0')}:30`, available: true });
    }
    slots.push({ time: '19:00', available: true });
    return slots;
  };

  useEffect(() => {
    if (state.date) {
      setTimeSlots(generateTimeSlots());
    }
  }, [state.date]);

  const selectOffice = (office: OfficeName) => {
    setState((prev) => ({ ...prev, office }));
    setCurrentStep(2);
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
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const result = reservationFormSchema.safeParse(state.formData);
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    if (!state.office || !state.procedure || !state.date || !state.timeSlot) {
      return;
    }

    setSubmitting(true);

    const [hours, minutes] = state.timeSlot.split(":").map(Number);
    const startAt = new Date(state.date);
    startAt.setHours(hours, minutes, 0, 0);

    const response = await createReservation({
      officeName: state.office,
      procedureId: state.procedure.id,
      startAt: startAt.toISOString(),
      firstName: state.formData.firstName,
      lastName: state.formData.lastName,
      phone: state.formData.phone,
      email: state.formData.email || undefined,
      note: state.formData.note || undefined,
    });

    setSubmitting(false);

    if (response.success && response.reservation) {
      onComplete(response.reservation);
    } else {
      setErrors({ submit: response.error || "Възникна грешка" });
    }
  };

  // Get procedures for current selection
  const getFilteredProcedures = () => {
    if (!state.selectedCategory) return [];
    
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
            {(["София", "Лом"] as OfficeName[]).map((office) => (
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
              {Object.keys(categoryHierarchy).map((category) => (
                <button
                  key={category}
                  onClick={() => selectCategory(category)}
                  className="p-6 rounded-2xl border-2 border-gray-200 text-left font-medium transition-all duration-300 hover:border-gold/50 hover:shadow-md hover:scale-[1.02] group"
                >
                  <span className="text-lg">{category}</span>
                  <ChevronRight className="w-5 h-5 float-right mt-1 text-gray-400 group-hover:text-gold transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Sub Categories (for Епилация) */}
          {state.selectedCategory && !state.selectedSubCategory && categoryHierarchy[state.selectedCategory]?.some(sub => subCategoryMap[sub]) && (
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
          {state.selectedCategory && (state.selectedSubCategory || !categoryHierarchy[state.selectedCategory]?.some(sub => subCategoryMap[sub])) && (
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
                {getFilteredProcedures().map((proc) => (
                  <button
                    key={proc.id}
                    onClick={() => selectProcedure(proc)}
                    className={cn(
                      "w-full p-4 rounded-xl border-2 text-left transition-all duration-300 hover:scale-[1.01]",
                      state.procedure?.id === proc.id
                        ? "border-gold bg-gold/10 shadow-md"
                        : "border-gray-200 hover:border-gold/50 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{proc.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDuration(proc.duration_minutes)}
                        </p>
                      </div>
                      <p className="font-semibold text-gold text-lg">
                        {formatPrice(proc.price)}
                      </p>
                    </div>
                  </button>
                ))}
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
          {state.procedure && (
            <div className="mb-6 p-4 bg-gold/5 rounded-xl border border-gold/20">
              <p className="text-sm text-gray-500">Избрана процедура:</p>
              <p className="font-medium">{state.procedure.name}</p>
              <p className="text-sm text-gold">{formatPrice(state.procedure.price)} • {formatDuration(state.procedure.duration_minutes)}</p>
            </div>
          )}
          
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
                  disabled={(date) =>
                    date < new Date() || date > addDays(new Date(), 60)
                  }
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-80 overflow-y-auto pr-2">
                    {timeSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => selectTimeSlot(slot.time)}
                        className={cn(
                          "py-3 px-2 rounded-xl text-sm font-medium transition-all duration-300",
                          state.timeSlot === slot.time
                            ? "bg-gold text-white shadow-lg shadow-gold/30 scale-105"
                            : "bg-gray-100 hover:bg-gold/20 hover:text-gold hover:scale-105"
                        )}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
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
              <Label htmlFor="email">Имейл (по избор)</Label>
              <Input
                id="email"
                type="email"
                value={state.formData.email}
                onChange={(e) => updateFormData("email", e.target.value)}
                placeholder="email@example.com"
                className="rounded-xl h-12"
              />
            </div>
            <div>
              <Label htmlFor="note">Бележка (по избор)</Label>
              <Textarea
                id="note"
                value={state.formData.note}
                onChange={(e) => updateFormData("note", e.target.value)}
                placeholder="Допълнителна информация..."
                rows={3}
                className="rounded-xl"
              />
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
