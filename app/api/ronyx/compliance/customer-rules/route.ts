import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sb = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const customer = searchParams.get("customer_name");
  const project  = searchParams.get("project_name");
  const active   = searchParams.get("active");

  let q = sb
    .from("ronyx_customer_compliance_rules")
    .select("*")
    .order("customer_name");

  if (customer) q = q.eq("customer_name", customer);
  if (project)  q = q.eq("project_name",  project);
  if (active !== null) q = q.eq("is_active", active !== "false");

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = createSupabaseServerClient();
  try {
    const body = await req.json();
    if (!body.customer_name) return NextResponse.json({ error: "customer_name required" }, { status: 400 });

    const row = {
      organization_id:                 body.organization_id ?? null,
      customer_name:                   String(body.customer_name).trim(),
      project_name:                    body.project_name ?? null,
      auto_liability_required:         body.auto_liability_required         ?? true,
      general_liability_required:      body.general_liability_required      ?? true,
      cargo_required:                  body.cargo_required                  ?? true,
      cargo_override_allowed:          body.cargo_override_allowed          ?? false,
      workers_comp_required:           body.workers_comp_required           ?? false,
      workers_comp_override_allowed:   body.workers_comp_override_allowed   ?? true,
      driver_cdl_required:             body.driver_cdl_required             ?? true,
      driver_medical_card_required:    body.driver_medical_card_required    ?? true,
      mvr_required:                    body.mvr_required                    ?? true,
      drug_test_required:              body.drug_test_required              ?? false,
      background_check_required:       body.background_check_required       ?? false,
      loan_agreement_required_if_loan: body.loan_agreement_required_if_loan ?? true,
      notes:                           body.notes ?? null,
      is_active:                       body.is_active ?? true,
      updated_at:                      new Date().toISOString(),
    };

    const { data, error } = await sb
      .from("ronyx_customer_compliance_rules")
      .upsert(row, { onConflict: "customer_name,project_name" })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rule: data, ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
