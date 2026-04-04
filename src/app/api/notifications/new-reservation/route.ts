import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { format, parseISO } from "date-fns";
import { bg } from "date-fns/locale";

export async function POST(request: NextRequest) {
  try {
    const { reservationId } = await request.json();

    if (!reservationId) {
      return NextResponse.json({ error: "Missing reservationId" }, { status: 400 });
    }

    const supabase = createClient();

    // Get reservation details
    const { data: reservation, error } = await supabase
      .from("reservations")
      .select(`
        *,
        procedure:procedures(name, duration_minutes, price, technician)
      `)
      .eq("id", reservationId)
      .single();

    if (error || !reservation) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    // Get admin email from settings
    const { data: adminEmailSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "admin_email")
      .single();

    const { data: notificationEnabled } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "notification_enabled")
      .single();

    // Check if notifications are enabled and admin email is set
    if (notificationEnabled?.setting_value !== "true" || !adminEmailSetting?.setting_value) {
      console.log("Admin notifications disabled or email not set");
      return NextResponse.json({ success: true, message: "Notifications disabled" });
    }

    const adminEmail = adminEmailSetting.setting_value;

    // Format date and time for notification
    const startDate = parseISO(reservation.start_at);
    const formattedDate = format(startDate, "EEEE, d MMMM yyyy", { locale: bg });
    const formattedTime = format(startDate, "HH:mm");
    const procedure = reservation.procedure as any;

    // Email content for admin
    const emailSubject = `🆕 Нова резервация - ${reservation.customer_first_name} ${reservation.customer_last_name}`;
    const emailBody = `
Нова резервация в Classy & Beautiful!

📍 Локация: ${reservation.office_name}
📅 Дата: ${formattedDate}
🕐 Час: ${formattedTime}
💅 Процедура: ${procedure?.name || "N/A"}
⏱️ Продължителност: ${procedure?.duration_minutes || 0} минути
💰 Цена: ${procedure?.price?.toFixed(2) || "0.00"} лв.

Клиент:
👤 Име: ${reservation.customer_first_name} ${reservation.customer_last_name}
📞 Телефон: ${reservation.customer_phone}
📧 Имейл: ${reservation.customer_email}
${reservation.customer_note ? `📝 Бележка: ${reservation.customer_note}` : ""}

Резервацията е със статус ЧАКАЩА и очаква потвърждение.
Влезте в админ панела за да потвърдите или откажете резервацията.
    `.trim();

    console.log("=== ADMIN NOTIFICATION ===");
    console.log("To:", adminEmail);
    console.log("Subject:", emailSubject);
    console.log("Body:", emailBody);
    console.log("==========================");

    // Send email using Resend if configured
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Classy & Beautiful <noreply@classybeautiful.bg>",
            to: [adminEmail],
            subject: emailSubject,
            text: emailBody,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #C4A35A; margin: 0;">🆕 Нова резервация</h1>
                </div>
                
                <div style="background: #FEF3C7; border-radius: 12px; padding: 16px; margin-bottom: 20px; border-left: 4px solid #F59E0B;">
                  <strong>Статус:</strong> Чакаща потвърждение
                </div>
                
                <div style="background: white; border: 2px solid #C4A35A; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                  <h3 style="color: #C4A35A; margin-top: 0;">Детайли на резервацията</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">📍 Локация:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${reservation.office_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">📅 Дата:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">🕐 Час:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${formattedTime}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">💅 Процедура:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${procedure?.name || "N/A"}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">⏱️ Продължителност:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${procedure?.duration_minutes || 0} минути</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">💰 Цена:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${procedure?.price?.toFixed(2) || "0.00"} лв.</td>
                    </tr>
                  </table>
                </div>
                
                <div style="background: #f9f9f9; border-radius: 12px; padding: 24px;">
                  <h3 style="color: #333; margin-top: 0;">Данни на клиента</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #666;">👤 Име:</td>
                      <td style="padding: 8px 0; font-weight: bold;">${reservation.customer_first_name} ${reservation.customer_last_name}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">📞 Телефон:</td>
                      <td style="padding: 8px 0; font-weight: bold;"><a href="tel:${reservation.customer_phone}">${reservation.customer_phone}</a></td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #666;">📧 Имейл:</td>
                      <td style="padding: 8px 0; font-weight: bold;"><a href="mailto:${reservation.customer_email}">${reservation.customer_email}</a></td>
                    </tr>
                    ${reservation.customer_note ? `
                    <tr>
                      <td style="padding: 8px 0; color: #666;">📝 Бележка:</td>
                      <td style="padding: 8px 0;">${reservation.customer_note}</td>
                    </tr>
                    ` : ""}
                  </table>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                  <p style="color: #666; font-size: 14px;">
                    Влезте в админ панела за да потвърдите или откажете резервацията.
                  </p>
                </div>
              </div>
            `,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Resend API error:", errorData);
        }
      } catch (emailError) {
        console.error("Failed to send admin notification via Resend:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending admin notification:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
