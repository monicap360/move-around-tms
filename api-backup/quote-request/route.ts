import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { name, email, company, phone, details, source, hp, recaptcha_token } =
    body || {};
  // Honeypot: reject if filled
  if (typeof hp === "string" && hp.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  // Optional reCAPTCHA server verification
  if (process.env.RECAPTCHA_SECRET && recaptcha_token) {
    try {
      const resp = await fetch(
        "https://www.google.com/recaptcha/api/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: process.env.RECAPTCHA_SECRET,
            response: recaptcha_token,
          }),
        },
      );
      const json = await resp.json();
      if (!json.success) {
        return NextResponse.json({ error: "Captcha failed" }, { status: 400 });
      }
    } catch {
      // Fail closed
      return NextResponse.json({ error: "Captcha error" }, { status: 400 });
    }
  }
  if (!name || !email) {
    return NextResponse.json(
      { error: "Missing name or email" },
      { status: 400 },
    );
  }
  const { data, error } = await supabaseAdmin
    .from("quote_requests")
    .insert({
      name,
      email,
      company: company || null,
      phone: phone || null,
      details: details || null,
      source: source || null,
    })
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, request: data });
}
