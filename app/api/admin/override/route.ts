import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!, // bypass RLS
  );

  const { organization_id, type, days } = await req.json();

  let overrideData: any = {};
  let logType = type;
  let logDays = days || null;
  let logExpires = null;

  if (type === "permanent") {
    overrideData = { admin_override: true, override_expires_at: null };
    logExpires = null;
  }

  if (type === "temporary") {
    const expires = new Date();
    expires.setDate(expires.getDate() + Number(days));
    overrideData = { admin_override: false, override_expires_at: expires };
    logExpires = expires;
  }

  if (type === "remove") {
    overrideData = { admin_override: false, override_expires_at: null };
    logType = "remove";
    logDays = null;
    logExpires = null;
  }

  // Update subscription
  await supabase
    .from("subscriptions")
    .update(overrideData)
    .eq("organization_id", organization_id);

  // Log it
  await supabase.from("override_log").insert([
    {
      organization_id,
      override_type: logType,
      days: logDays,
      expires_at: logExpires,
    },
  ]);

  return NextResponse.json({ success: true });
}
