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

    // Format date and time for email
    const startDate = parseISO(reservation.start_at);
    const formattedDate = format(startDate, "EEEE, d MMMM yyyy", { locale: bg });
    const formattedTime = format(startDate, "HH:mm");
    const procedure = reservation.procedure as any;

    // Email content
    const emailSubject = `Потвърдена резервация - Classy & Beautiful`;
    const emailBody = `
Здравейте ${reservation.customer_first_name},

Вашата резервация в Classy & Beautiful е потвърдена!

📍 Локация: ${reservation.office_name}
📅 Дата: ${formattedDate}
🕐 Час: ${formattedTime}
💅 Процедура: ${procedure?.name || "N/A"}
⏱️ Продължителност: ${procedure?.duration_minutes || 0} минути
💰 Цена: ${procedure?.price?.toFixed(2) || "0.00"} лв.

Ако имате въпроси или желаете да промените резервацията, 
моля свържете се с нас.

С уважение,
Екипът на Classy & Beautiful
    `.trim();

    // For now, we'll log the email content
    // In production, integrate with an email service like Resend, SendGrid, etc.
    console.log("=== CONFIRMATION EMAIL ===");
    console.log("To:", reservation.customer_email);
    console.log("Subject:", emailSubject);
    console.log("Body:", emailBody);
    console.log("=========================");

    // Check if we have email service configured
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      // Send email using Resend
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM || "Classy & Beautiful <noreply@classybeautiful.bg>",
            to: [reservation.customer_email],
            subject: emailSubject,
            text: emailBody,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #C4A35A; margin: 0;">Classy & Beautiful</h1>
                </div>
                
                <div style="background: #f9f9f9; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                  <h2 style="color: #333; margin-top: 0;">Здравейте ${reservation.customer_first_name},</h2>
                  <p style="color: #666; font-size: 16px;">Вашата резервация е потвърдена!</p>
                </div>
                
                <div style="background: white; border: 2px solid #C4A35A; border-radius: 12px; padding: 24px;">
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
                
                <p style="color: #666; font-size: 14px; margin-top: 24px; text-align: center;">
                  Ако имате въпроси или желаете да промените резервацията,<br>
                  моля свържете се с нас.
                </p>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  <p style="color: #999; font-size: 12px;">
                    С уважение,<br>
                    Екипът на Classy & Beautiful
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
        console.error("Failed to send email via Resend:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
