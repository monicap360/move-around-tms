import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sb = supabaseAdmin;
  try {
    const body = await req.json();
    await sb.from("page_protection_logs").insert({
      event_type: String(body.event_type || "unknown").slice(0, 60),
      page_url:   String(body.page_url   || "").slice(0, 300) || null,
      staff_name: String(body.staff_name || "").slice(0, 80)  || null,
      user_agent: String(body.user_agent || "").slice(0, 300) || null,
    });
  } catch {
    // Silent — never break the UI over a log failure
  }
  return NextResponse.json({ ok: true });
}
