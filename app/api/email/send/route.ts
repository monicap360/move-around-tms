import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST: Send email via Supabase Edge Function (send-email)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, text, html, from } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json(
        { error: "Missing to, subject, and message content" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin.functions.invoke("send-email", {
      body: { to, subject, text, html, from },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to send email" },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true, response: data ?? null });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
