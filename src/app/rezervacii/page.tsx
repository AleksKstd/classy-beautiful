"use client";

import { useState } from "react";
import { ReservationWizard } from "@/components/reservation-wizard";
import { ReservationSuccess } from "@/components/reservation-success";
import type { CreateReservationResult } from "@/app/actions/reservations";

export default function ReservationsPage() {
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
    <section className="py-12 md:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Запази час</h1>
          <p className="text-gray-600">
            Следвайте стъпките по-долу, за да резервирате вашия час.
          </p>
        </div>

        <ReservationWizard onComplete={handleComplete} />
      </div>
    </section>
  );
}
