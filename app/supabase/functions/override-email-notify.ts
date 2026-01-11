// Supabase Edge Function: override-email-notify.ts
// Sends email notifications for override events (granted, removed, expiring soon)
// Integrate with Supabase email or external service (e.g., Resend, SendGrid)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(supabaseUrl, supabaseKey);

async function sendEmail(to: string, subject: string, body: string) {
  // Example: Use Supabase built-in email or external API
  // Replace with your actual email sending logic
  await fetch("https://api.resend.com/v1/email", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      from: "noreply@yourdomain.com",
      subject,
      html: body,
    }),
  });
}

export default async function handler(req: Request) {
  const { event, organization_id, contacts, details } = await req.json();

  let subject = "";
  let body = "";

  switch (event) {
    case "granted":
      subject = "Override Granted";
      body = `<p>Your override has been granted.</p><pre>${JSON.stringify(details, null, 2)}</pre>`;
      break;
    case "removed":
      subject = "Override Removed";
      body = `<p>Your override has been removed.</p><pre>${JSON.stringify(details, null, 2)}</pre>`;
      break;
    case "expiring":
      subject = "Override Expiring Soon";
      body = `<p>Your override will expire soon.</p><pre>${JSON.stringify(details, null, 2)}</pre>`;
      break;
    default:
      return new Response("Unknown event", { status: 400 });
  }

  // Send to all contacts
  for (const contact of contacts) {
    await sendEmail(contact, subject, body);
  }

  return new Response("Emails sent", { status: 200 });
}
