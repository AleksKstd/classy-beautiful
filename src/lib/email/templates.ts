import { BUSINESS, SITE_URL } from "@/config/site";
import { escapeHtml } from "@/lib/html";
import { formatInSalonTz } from "@/lib/time";
import { formatDuration, formatPrice } from "@/lib/utils";

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

type Rows = readonly (readonly [string, string])[];

interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

/* Brand colours (see tailwind.config.ts); emails cannot use the site's CSS. */
const COCOA = "#33241F";
const TAUPE = "#5F4F47";
const GOLD = "#C4A35A";
const GOLD_DARK = "#8A6D2F";
const BLUSH_LIGHT = "#F9F1EE";
const HAIRLINE = "#E7DDD6";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

const formatDay = (iso: string) =>
  formatInSalonTz(new Date(iso), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const formatTime = (iso: string) =>
  formatInSalonTz(new Date(iso), { hour: "2-digit", minute: "2-digit", hour12: false });

function details(r: EmailReservation): Rows {
  return [
    ["Салон", r.office_name],
    ["Дата", formatDay(r.start_at)],
    ["Час", formatTime(r.start_at)],
    ["Процедура", r.procedureName],
    ["Продължителност", formatDuration(r.durationMinutes)],
    ["Цена", formatPrice(r.price)],
  ];
}

function table(rows: Rows): string {
  const body = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 16px 8px 0; color: ${TAUPE}; font-size: 13px; vertical-align: top; white-space: nowrap;">${escapeHtml(label)}</td>
          <td style="padding: 8px 0; color: ${COCOA}; font-size: 15px;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" style="width: 100%; border-collapse: collapse;">${body}</table>`;
}

const plainRows = (rows: Rows) => rows.map(([label, value]) => `${label}: ${value}`).join("\n");

/** A single-line value that is safe to use in an email subject. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

interface Layout {
  subject: string;
  status: string;
  heading: string;
  /** Plain-text paragraphs; escaped for the HTML version. */
  paragraphs: string[];
  sections: { title: string; rows: Rows }[];
  footer: string;
}

function build({ subject, status, heading, paragraphs, sections, footer }: Layout): EmailContent {
  const text = [
    heading,
    ...paragraphs,
    ...sections.map((s) => `${s.title}\n${plainRows(s.rows)}`),
    footer,
    "Classy & Beautiful",
  ].join("\n\n");

  const html = `
    <div style="margin: 0; padding: 24px 12px; background: #FBF7F2; font-family: ${SANS};">
      <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid ${HAIRLINE}; border-radius: 16px; overflow: hidden;">
        <div style="padding: 28px 32px 0;">
          <p style="margin: 0; font-family: ${SERIF}; font-size: 20px; color: ${COCOA};">Classy &amp; Beautiful</p>
          <div style="width: 48px; height: 1px; background: ${GOLD}; margin: 16px 0 24px;"></div>
          <p style="margin: 0 0 8px; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: ${GOLD_DARK};">${escapeHtml(status)}</p>
          <h1 style="margin: 0 0 16px; font-family: ${SERIF}; font-weight: normal; font-size: 26px; line-height: 1.25; color: ${COCOA};">${escapeHtml(heading)}</h1>
          ${paragraphs
            .map((p) => `<p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: ${TAUPE};">${escapeHtml(p)}</p>`)
            .join("")}
        </div>
        ${sections
          .map(
            (s) => `
        <div style="margin: 16px 32px 0; padding: 20px 24px; background: ${BLUSH_LIGHT}; border: 1px solid ${HAIRLINE}; border-radius: 12px;">
          <p style="margin: 0 0 8px; font-family: ${SERIF}; font-size: 17px; color: ${COCOA};">${escapeHtml(s.title)}</p>
          ${table(s.rows)}
        </div>`
          )
          .join("")}
        <div style="padding: 24px 32px 28px;">
          <p style="margin: 0; font-size: 13px; line-height: 1.6; color: ${TAUPE};">${escapeHtml(footer)}</p>
        </div>
      </div>
    </div>`;

  return { subject: oneLine(subject), text, html };
}

const CONTACT_FOOTER = `Ако имате въпроси или нещо се промени, обадете ни се на ${BUSINESS.phoneDisplay}.`;

/** To the customer, right after they send a booking request. */
export function reservationReceivedEmail(r: EmailReservation): EmailContent {
  return build({
    subject: "Получихме заявката ви - Classy & Beautiful",
    status: "Очаква потвърждение",
    heading: `Здравейте, ${r.customer_first_name}.`,
    paragraphs: [
      "Получихме заявката ви за час. Тя все още не е потвърдена.",
      "Ще я прегледаме и ще ви изпратим втори имейл, щом часът бъде потвърден.",
    ],
    sections: [{ title: "Вашата заявка", rows: details(r) }],
    footer: CONTACT_FOOTER,
  });
}

/** To the customer, when the salon confirms the booking. */
export function reservationConfirmedEmail(r: EmailReservation): EmailContent {
  return build({
    subject: "Часът ви е потвърден - Classy & Beautiful",
    status: "Потвърдена",
    heading: `Очакваме ви, ${r.customer_first_name}.`,
    paragraphs: ["Вашата резервация е потвърдена. Елате около 5 минути по-рано, за да започнем навреме."],
    sections: [{ title: "Вашата резервация", rows: details(r) }],
    footer: CONTACT_FOOTER,
  });
}

/** To the customer, when the salon declines or cancels the booking. */
export function reservationCancelledEmail(r: EmailReservation, reason: string | null): EmailContent {
  return build({
    subject: "Резервацията ви е отменена - Classy & Beautiful",
    status: "Отменена",
    heading: `Здравейте, ${r.customer_first_name}.`,
    paragraphs: [
      "За съжаление резервацията ви беше отменена и часът вече не е запазен за вас.",
      ...(reason ? [`Причина: ${reason}`] : []),
      `Можете да запазите друг час на ${SITE_URL}/rezervacii.`,
    ],
    sections: [{ title: "Отменена резервация", rows: details(r) }],
    footer: CONTACT_FOOTER,
  });
}

/** To the customer, when the salon moves the booking to another time. */
export function reservationRescheduledEmail(r: EmailReservation, previousStartAt: string): EmailContent {
  return build({
    subject: "Часът ви е преместен - Classy & Beautiful",
    status: "Нов час",
    heading: `Здравейте, ${r.customer_first_name}.`,
    paragraphs: [
      `Преместихме часа ви. Предишният час беше ${formatDay(previousStartAt)}, ${formatTime(previousStartAt)}.`,
      "Ако новият час не ви е удобен, обадете ни се и ще намерим друг.",
    ],
    sections: [{ title: "Новият ви час", rows: details(r) }],
    footer: CONTACT_FOOTER,
  });
}

/** To the salon, when a new booking request arrives. */
export function newReservationAdminEmail(r: EmailReservation): EmailContent {
  const customer: Rows = [
    ["Име", `${r.customer_first_name} ${r.customer_last_name}`],
    ["Телефон", r.customer_phone],
    ["Имейл", r.customer_email],
    ...(r.customer_note ? ([["Бележка", r.customer_note]] as const) : []),
  ];

  return build({
    subject: `Нова резервация - ${r.customer_first_name} ${r.customer_last_name}`,
    status: "Очаква потвърждение",
    heading: "Нова заявка за час",
    paragraphs: [
      "Клиентът ще получи потвърждение едва след като потвърдите резервацията.",
      `Потвърдете или откажете от админ панела: ${SITE_URL}/admin`,
    ],
    sections: [
      { title: "Резервация", rows: details(r) },
      { title: "Клиент", rows: customer },
    ],
    footer: "Това съобщение е изпратено автоматично от сайта.",
  });
}
