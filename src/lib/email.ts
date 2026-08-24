import { Resend } from "resend";

function getClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export type EmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<EmailResult> {
  const client = getClient();
  if (!client) return { ok: false, error: "Email not configured (RESEND_API_KEY missing)" };

  const from = process.env.EMAIL_FROM ?? "CareFlow <onboarding@resend.dev>";
  try {
    const { error } = await client.emails.send({ from, to, subject, html });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    console.error("sendEmail failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
