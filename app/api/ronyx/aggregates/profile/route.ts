import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const numericFields = [
  "base_rate",
  "fuel_surcharge",
  "delivery_charge",
  "minimum_load_charge",
  "brokered_load_pct",
  "hauling_distance",
  "tare_weight",
  "gross_weight",
  "net_weight",
];

function normalizePayload(payload: Record<string, unknown>) {
  const cleaned: Record<string, unknown> = { ...payload };
  delete cleaned.id;
  delete cleaned.created_at;
  delete cleaned.updated_at;
  delete cleaned.organization_id;

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

  return cleaned;
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("aggregate_material_profiles")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data || null });
}

export async function PUT(request: Request) {
  const payload = await request.json();
  const cleaned = normalizePayload(payload || {});

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("aggregate_material_profiles")
    .upsert(
      {
        ...cleaned,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
