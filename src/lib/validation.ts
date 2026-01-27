import { z } from "zod";

const bulgarianPhoneRegex = /^(\+359\s?|0)8[789]\d[\s-]?\d{3}[\s-]?\d{3}$/;

export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s-]/g, "");
  if (cleaned.startsWith("+359")) {
    return cleaned;
  }
  if (cleaned.startsWith("0")) {
    return "+359" + cleaned.slice(1);
  }
  return cleaned;
}

export const phoneSchema = z
  .string()
  .min(1, "Телефонът е задължителен")
  .regex(bulgarianPhoneRegex, "Невалиден телефонен номер. Пример: 0888123456 или +359888123456");

export const nameSchema = z
  .string()
  .min(2, "Минимум 2 символа")
  .max(50, "Максимум 50 символа")
  .regex(
    /^[а-яА-Яa-zA-ZѝЍ\s-]+$/,
    "Позволени са само букви (кирилица или латиница), тире и интервал"
  );

export const emailSchema = z
  .string()
  .email("Невалиден имейл адрес")
  .optional()
  .or(z.literal(""));

export const noteSchema = z.string().max(500, "Максимум 500 символа").optional();

export const reservationFormSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  note: noteSchema,
});

export type ReservationFormData = z.infer<typeof reservationFormSchema>;

export const reservationRequestSchema = z.object({
  officeName: z.enum(["София", "Лом"], {
    required_error: "Изберете офис",
  }),
  procedureId: z.string().uuid("Невалидна процедура"),
  startAt: z.string().datetime("Невалидна дата/час"),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  note: noteSchema,
});

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
