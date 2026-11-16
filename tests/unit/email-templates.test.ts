import { describe, expect, it } from "vitest";
import {
  newReservationAdminEmail,
  reservationCancelledEmail,
  reservationConfirmedEmail,
  reservationReceivedEmail,
  reservationRescheduledEmail,
  type EmailReservation,
} from "@/lib/email/templates";

const reservation: EmailReservation = {
  office_name: "София",
  start_at: "2026-12-01T08:00:00.000Z",
  customer_first_name: "Мария",
  customer_last_name: "Иванова",
  customer_phone: "+359888123456",
  customer_email: "maria@example.bg",
  customer_note: null,
  procedureName: "Педикюр",
  durationMinutes: 90,
  price: 36.8,
};

describe("customer emails", () => {
  it("tells the customer the request still awaits confirmation", () => {
    const email = reservationReceivedEmail(reservation);
    expect(email.subject).toContain("Получихме заявката");
    expect(email.text).toContain("все още не е потвърдена");
    expect(email.html).toContain("Очаква потвърждение");
  });

  it("shows salon-local time, duration and price", () => {
    const email = reservationConfirmedEmail(reservation);
    expect(email.text).toContain("Час: 10:00");
    expect(email.text).toContain("1 ч. 30 мин.");
    expect(email.text).toContain("36,80");
  });

  it("includes the cancellation reason only when given", () => {
    expect(reservationCancelledEmail(reservation, "Салонът е затворен").text).toContain("Причина: Салонът е затворен");
    expect(reservationCancelledEmail(reservation, null).text).not.toContain("Причина");
  });

  it("mentions the previous time when rescheduled", () => {
    const email = reservationRescheduledEmail(reservation, "2026-11-30T12:30:00.000Z");
    expect(email.text).toContain("14:30");
    expect(email.text).toContain("Час: 10:00");
  });

  it("escapes customer input in HTML and keeps the subject on one line", () => {
    const hostile = {
      ...reservation,
      customer_first_name: "<script>alert(1)</script>",
      customer_last_name: "X\r\nBcc: evil@example.com",
      customer_note: '<img src=x onerror="1">',
    };
    for (const email of [reservationReceivedEmail(hostile), newReservationAdminEmail(hostile)]) {
      expect(email.html).not.toContain("<script>");
      expect(email.html).not.toContain("<img");
      expect(email.subject).not.toMatch(/[\r\n]/);
    }
  });
});
