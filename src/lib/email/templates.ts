import { escapeHtml } from "@/lib/html";
import { formatInSalonTz } from "@/lib/time";
import { formatPrice } from "@/lib/utils";

export interface EmailReservation {
  office_name: string;
  start_at: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string;
  customer_email: string;
  customer_note: string | null;
  procedureName: string;
  durationMinutes: number;
  price: number;
}

function details(r: EmailReservation) {
  const start = new Date(r.start_at);
  return [
    ["📍 Локация", r.office_name],
    ["📅 Дата", formatInSalonTz(start, { weekday: "long", day: "numeric", month: "long", year: "numeric" })],
    ["🕐 Час", formatInSalonTz(start, { hour: "2-digit", minute: "2-digit", hour12: false })],
    ["💅 Процедура", r.procedureName],
    ["⏱️ Продължителност", `${r.durationMinutes} минути`],
    ["💰 Цена", formatPrice(r.price)],
  ] as const;
}

function rows(items: readonly (readonly [string, string])[]): string {
  return items
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 0; color: #666;">${escapeHtml(label)}:</td>
          <td style="padding: 8px 0; font-weight: bold;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
}

const plain = (items: readonly (readonly [string, string])[]) =>
  items.map(([label, value]) => `${label}: ${value}`).join("\n");

export function reservationConfirmedEmail(r: EmailReservation) {
  const items = details(r);
  const subject = "Потвърдена резервация - Classy & Beautiful";
  const text = `Здравейте ${r.customer_first_name},

Вашата резервация в Classy & Beautiful е потвърдена!

${plain(items)}

Ако имате въпроси или желаете да промените резервацията, моля свържете се с нас.

С уважение,
Екипът на Classy & Beautiful`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #C4A35A; margin: 0;">Classy & Beautiful</h1>
      </div>
      <div style="background: #f9f9f9; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <h2 style="color: #333; margin-top: 0;">Здравейте ${escapeHtml(r.customer_first_name)},</h2>
        <p style="color: #666; font-size: 16px;">Вашата резервация е потвърдена!</p>
      </div>
      <div style="background: white; border: 2px solid #C4A35A; border-radius: 12px; padding: 24px;">
        <h3 style="color: #C4A35A; margin-top: 0;">Детайли на резервацията</h3>
        <table style="width: 100%; border-collapse: collapse;">${rows(items)}</table>
      </div>
      <p style="color: #666; font-size: 14px; margin-top: 24px; text-align: center;">
        Ако имате въпроси или желаете да промените резервацията,<br>моля свържете се с нас.
      </p>
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">С уважение,<br>Екипът на Classy & Beautiful</p>
      </div>
    </div>`;

  return { subject, text, html };
}

export function newReservationAdminEmail(r: EmailReservation) {
  const items = details(r);
  const customer = [
    ["👤 Име", `${r.customer_first_name} ${r.customer_last_name}`],
    ["📞 Телефон", r.customer_phone],
    ["📧 Имейл", r.customer_email],
    ...(r.customer_note ? ([["📝 Бележка", r.customer_note]] as const) : []),
  ] as const;

  const subject = `🆕 Нова резервация - ${r.customer_first_name} ${r.customer_last_name}`.replace(/[\r\n]/g, " ");
  const text = `Нова резервация в Classy & Beautiful!

${plain(items)}

Клиент:
${plain(customer)}

Резервацията е със статус ЧАКАЩА и очаква потвърждение.
Влезте в админ панела за да потвърдите или откажете резервацията.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #C4A35A; margin: 0;">🆕 Нова резервация</h1>
      </div>
      <div style="background: #FEF3C7; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
        <strong>Статус:</strong> Чакаща потвърждение
      </div>
      <div style="background: white; border: 2px solid #C4A35A; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
        <h3 style="color: #C4A35A; margin-top: 0;">Детайли на резервацията</h3>
        <table style="width: 100%; border-collapse: collapse;">${rows(items)}</table>
      </div>
      <div style="background: #f9f9f9; border-radius: 12px; padding: 24px;">
        <h3 style="color: #333; margin-top: 0;">Данни на клиента</h3>
        <table style="width: 100%; border-collapse: collapse;">${rows(customer)}</table>
      </div>
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #666; font-size: 14px;">Влезте в админ панела за да потвърдите или откажете резервацията.</p>
      </div>
    </div>`;

  return { subject, text, html };
}
