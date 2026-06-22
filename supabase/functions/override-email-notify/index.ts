import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, body: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("EMAIL_FROM") ?? Deno.env.get("SMTP_FROM");

  if (!apiKey || !fromEmail) {
    console.warn("Email not configured (RESEND_API_KEY or EMAIL_FROM missing)");
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, from: fromEmail, subject, html: body }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
        return new Response(JSON.stringify({ error: "Unknown event" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    for (const contact of (contacts ?? [])) {
      await sendEmail(contact, subject, body);
    }

    return new Response(JSON.stringify({ ok: true, sent: contacts?.length ?? 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
