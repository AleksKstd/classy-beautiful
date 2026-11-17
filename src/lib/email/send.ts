import "server-only";

export interface EmailAttachment {
  filename: string;
  /** File contents; sent base64-encoded. */
  content: string;
  contentType: string;
}

interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Sends an email through Resend. Returns true only when the provider
 * accepted the message. Without RESEND_API_KEY nothing is sent.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.info(`Email not sent (RESEND_API_KEY not set): "${message.subject}"`);
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Classy & Beautiful <noreply@cbclassyandbeautiful.com>",
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
        ...(message.attachments?.length
          ? {
              attachments: message.attachments.map((a) => ({
                filename: a.filename,
                content: Buffer.from(a.content, "utf-8").toString("base64"),
                content_type: a.contentType,
              })),
            }
          : {}),
      }),
    });

    if (!response.ok) {
      console.error("Resend API error:", response.status, await response.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}
