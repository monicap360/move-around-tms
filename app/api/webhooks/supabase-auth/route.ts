import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST /api/webhooks/supabase-auth
// Secure this endpoint by configuring your Supabase Auth webhook to send
// an Authorization header: "Bearer SUPABASE_WEBHOOK_SECRET"

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized" },
    { status: 401 },
  );
}

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  const authHeader = req.headers.get("authorization") || "";

  if (!secret) {
    console.warn("SUPABASE_WEBHOOK_SECRET is not set; rejecting webhook calls");
    return unauthorized();
  }
  if (authHeader !== `Bearer ${secret}`) return unauthorized();

  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  // Support a few common shapes for Supabase auth webhooks
  const type: string = body?.type || body?.event || "";
  const record = body?.record || body?.user || body?.new || {};

  const userId: string | undefined = record?.id;
  const email: string | undefined = record?.email;

  if (!userId || !email) {
    return NextResponse.json(
      { ok: false, message: "Missing user info" },
      { status: 400 },
    );
  }

  // Only assign roles once the user has confirmed their email
  const isConfirmedEvent = /confirmed/i.test(type);

  if (!isConfirmedEvent) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Not a confirmation event",
    });
  }

  // Insert a default role if not already present
  const defaultRole = "office"; // choose a sensible default; adjust as needed
  const company = "Ronyx Logistics LLC";

  const { error } = await supabaseAdmin
    .from("user_roles")
    .upsert(
      { user_id: userId, role: defaultRole, company },
      { onConflict: "user_id,role,company" },
    );

  if (error) {
    console.error("Failed to upsert default role for user", { userId, error });
    return NextResponse.json(
      { ok: false, message: "Failed to assign role" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    assigned: { user_id: userId, role: defaultRole, company },
  });
}
