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
  .regex(/^\p{L}[\p{L}\p{M} '’-]*$/u, "Позволени са само букви (кирилица или латиница), тире и интервал");

const emailRegex =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Имейлът е задължителен")
  .max(254, "Невалиден имейл адрес")
  .regex(emailRegex, "Невалиден имейл адрес");

export const noteSchema = z.string().trim().max(500, "Максимум 500 символа").optional();

export const officeSchema = z.enum(OFFICES, { error: "Изберете салон" });

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
  /** Set when the client books through a special promotion. */
  promotionId: z.string().uuid("Невалидна промоция").nullish(),
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
  technician: z.string().trim().min(1, "Специалистът е задължителен").max(100),
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

const optionalDate = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(dateKeySchema.nullable())
  .nullish();

export const promotionInputSchema = z
  .object({
    kind: z.enum(["bundle", "package", "custom"], { error: "Изберете вид промоция" }),
    title: z.string().trim().min(1, "Заглавието е задължително").max(120, "Максимум 120 символа"),
    badge: z.string().trim().min(1, "Етикетът е задължителен").max(30, "Максимум 30 символа"),
    description: z.string().trim().max(600, "Максимум 600 символа").nullish(),
    procedure_ids: z
      .array(z.string().uuid())
      .min(1, "Изберете поне една процедура")
      .max(10, "Максимум 10 процедури")
      .refine((ids) => new Set(ids).size === ids.length, "Процедурите се повтарят"),
    buy_count: z.number().int().min(2).max(20).nullish(),
    pay_count: z.number().int().min(1).max(19).nullish(),
    price: z.number().min(0, "Невалидна цена").max(100000).nullish(),
    starts_on: optionalDate,
    ends_on: optionalDate,
    is_active: z.boolean(),
  })
  .superRefine((p, ctx) => {
    if (p.kind === "bundle") {
      if (!p.buy_count || !p.pay_count || p.pay_count >= p.buy_count) {
        ctx.addIssue({ code: "custom", path: ["buy_count"], message: "Посещенията за плащане трябва да са по-малко от общия брой" });
      }
      if (p.procedure_ids.length !== 1) {
        ctx.addIssue({ code: "custom", path: ["procedure_ids"], message: "Изберете точно една процедура" });
      }
    }
    if (p.kind === "package") {
      if (p.procedure_ids.length < 2) {
        ctx.addIssue({ code: "custom", path: ["procedure_ids"], message: "Пакетът трябва да има поне две процедури" });
      }
      if (p.price === null || p.price === undefined) {
        ctx.addIssue({ code: "custom", path: ["price"], message: "Въведете цена на пакета" });
      }
    }
    if (p.starts_on && p.ends_on && p.starts_on > p.ends_on) {
      ctx.addIssue({ code: "custom", path: ["ends_on"], message: "Крайната дата е преди началната" });
    }
  });

export type PromotionInput = z.input<typeof promotionInputSchema>;
