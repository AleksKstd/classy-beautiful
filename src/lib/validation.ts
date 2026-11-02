import { z } from "zod";
import { OFFICES } from "@/config/site";
import { isDateKey, isTimeOfDay } from "@/lib/time";

/**
 * Normalises a Bulgarian phone number to +359XXXXXXXX(X).
 * Accepts 0888 123 456, 0888-123-456, +359 888 123 456, 00359..., 359...,
 * and landlines such as 02 123 4567 or 0971 23456. Returns null if invalid.
 */
export function normalizePhone(phone: string): string | null {
  let digits = phone.trim().replace(/[\s\-().\/]/g, "");
  if (digits.startsWith("+359")) digits = digits.slice(4);
  else if (digits.startsWith("00359")) digits = digits.slice(5);
  else if (digits.startsWith("359") && digits.length >= 11) digits = digits.slice(3);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  else return null;

  return /^[1-9]\d{7,8}$/.test(digits) ? `+359${digits}` : null;
}

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Телефонът е задължителен")
  .refine((v) => normalizePhone(v) !== null, "Невалиден телефонен номер. Пример: 0888123456 или +359888123456");

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Минимум 2 символа")
  .max(50, "Максимум 50 символа")
  .regex(/^\p{L}[\p{L}\p{M}\s'’.-]*$/u, "Позволени са само букви (кирилица или латиница), тире и интервал");

const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Имейлът е задължителен")
  .max(254, "Невалиден имейл адрес")
  .regex(emailRegex, "Невалиден имейл адрес");

export const noteSchema = z.string().trim().max(500, "Максимум 500 символа").optional();

export const officeSchema = z.enum(OFFICES, { error: "Изберете офис" });

export const dateKeySchema = z.string().refine(isDateKey, "Невалидна дата");
export const timeSchema = z.string().refine(isTimeOfDay, "Невалиден час");

export const reservationFormSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  email: emailSchema,
  note: noteSchema,
});

export type ReservationFormData = z.input<typeof reservationFormSchema>;

export const reservationRequestSchema = reservationFormSchema.extend({
  officeName: officeSchema,
  procedureId: z.string().uuid("Невалидна процедура"),
  date: dateKeySchema,
  time: timeSchema,
});

export type ReservationRequest = z.input<typeof reservationRequestSchema>;

/** Maps zod issues to the first message per top-level field. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Admin inputs
// ---------------------------------------------------------------------------

export const procedureInputSchema = z.object({
  name: z.string().trim().min(1, "Името е задължително").max(200),
  description: z.string().trim().max(2000).nullish(),
  duration_minutes: z.number().int().min(5, "Невалидна продължителност").max(600),
  price: z.number().min(0, "Невалидна цена").max(100000),
  type: z.string().trim().min(1, "Категорията е задължителна").max(100),
  technician: z.string().trim().min(1, "Техникът е задължителен").max(100),
  discount_percentage: z.number().min(0).max(100).nullish(),
});

export type ProcedureInput = z.input<typeof procedureInputSchema>;

export const scheduleClosureSchema = z
  .object({
    office_name: officeSchema,
    closed_date_start: z.iso.datetime({ offset: true }),
    closed_date_end: z.iso.datetime({ offset: true }),
  })
  .refine((v) => new Date(v.closed_date_end) > new Date(v.closed_date_start), {
    message: "Крайната дата трябва да е след началната",
    path: ["closed_date_end"],
  });

export const adminSettingsSchema = z.object({
  adminEmail: z.union([z.literal(""), emailSchema]),
  notificationEnabled: z.boolean(),
});

export type AdminSettingsData = z.infer<typeof adminSettingsSchema>;
