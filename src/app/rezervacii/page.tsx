"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ReservationWizard } from "@/components/reservation-wizard";
import { ReservationSuccess } from "@/components/reservation-success";
import type { CreateReservationResult } from "@/app/actions/booking";

function ReservationContent() {
  const searchParams = useSearchParams();
  const procedureId = searchParams.get("procedureId");
  
  const [completedReservation, setCompletedReservation] =
    useState<CreateReservationResult["reservation"] | null>(null);

  const handleComplete = (reservation: CreateReservationResult["reservation"]) => {
    setCompletedReservation(reservation ?? null);
  };

  const handleNewReservation = () => {
    setCompletedReservation(null);
  };

  if (completedReservation) {
    return (
      <ReservationSuccess
        reservation={completedReservation}
        onNewReservation={handleNewReservation}
      />
    );
  }

  return (
    <section className="py-12 md:py-20 bg-gradient-to-b from-blush-light via-ivory to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <p className="eyebrow mb-4">Онлайн резервация</p>
          <h1 className="text-5xl sm:text-6xl mb-4">Запази час</h1>
          <p className="text-gray-600">
            Четири кратки стъпки: салон, процедура, дата и час, вашите данни.
          </p>
        </div>

        <ReservationWizard onComplete={handleComplete} preSelectedProcedureId={procedureId} />
      </div>
    </section>
  );
}

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Зареждане...</div>}>
      <ReservationContent />
    </Suspense>
  );
}
