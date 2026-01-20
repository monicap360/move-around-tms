import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

type SendEmailPayload = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as SendEmailPayload;
    const { to, subject, text, html } = payload;

    if (!to || !subject || (!text && !html)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const host = Deno.env.get("SMTP_HOST");
    const port = Number(Deno.env.get("SMTP_PORT") || "465");
    const username = Deno.env.get("SMTP_USER");
    const password = Deno.env.get("SMTP_PASS");
    const from = payload.from || Deno.env.get("SMTP_FROM");

    if (!host || !username || !password || !from) {
      return new Response(
        JSON.stringify({ error: "SMTP configuration is missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    const recipients = Array.isArray(to) ? to : [to];

    const client = new SmtpClient();
    await client.connectTLS({
      hostname: host,
      port,
      username,
      password,
    });

    await client.send({
      from,
      to: recipients,
      subject,
      content: text || "",
      html: html || undefined,
    });

    await client.close();

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  }
}
