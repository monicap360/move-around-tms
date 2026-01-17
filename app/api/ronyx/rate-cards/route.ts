import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const numericFields = ["base_rate", "fuel_pct", "detention_free_minutes", "detention_rate", "minimum_charge"];

function normalizePayload(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = { ...payload };
  delete cleaned.created_at;
  delete cleaned.updated_at;

  numericFields.forEach((field) => {
    if (field in cleaned) {
      const value = cleaned[field];
      if (value === "" || value === null) {
        cleaned[field] = null;
        return;
      }
      const numberValue = Number(value);
      cleaned[field] = Number.isFinite(numberValue) ? numberValue : null;
    }
  });

  if ("fuel_linked" in cleaned) {
    cleaned.fuel_linked = Boolean(cleaned.fuel_linked);
  }

  return cleaned;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("ronyx_rate_cards").select("*").order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rateCards: data || [] });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_rate_cards")
    .insert({ ...cleaned, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rateCard: data });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});

  if (!cleaned.id) {
    return NextResponse.json({ error: "Missing rate card id" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_rate_cards")
    .update({ ...cleaned, updated_at: new Date().toISOString() })
    .eq("id", cleaned.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rateCard: data });
}
