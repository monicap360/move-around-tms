import { supabase } from "../../lib/supabaseClient";

export async function sendTicketEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  // In production, use a real email API (e.g., SendGrid, Resend, Mailgun, or Supabase Edge Function)
  // Example using a REST endpoint:
  await fetch("/api/send-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, body }),
  });
  return true;
}
