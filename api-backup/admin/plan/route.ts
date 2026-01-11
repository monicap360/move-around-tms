import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from("account_plan")
    .select("plan, updated_at")
    .limit(1)
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    plan: data?.plan || "Basic",
    updated_at: data?.updated_at,
  });
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { plan } = body as { plan: "Basic" | "Pro" | "Enterprise" };

  if (!plan || !["Basic", "Pro", "Enterprise"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("account_plan")
    .upsert(
      { plan, updated_at: new Date().toISOString() },
      { onConflict: "true" },
    )
    .select("plan, updated_at")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: data.plan, updated_at: data.updated_at });
}
