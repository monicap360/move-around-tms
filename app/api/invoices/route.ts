import { NextRequest, NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/security";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function resolveOrganizationId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  requestedOrgId?: string | null,
) {
  if (!requestedOrgId) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();
    return orgMember?.organization_id || null;
  }

  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", requestedOrgId)
    .single();

  return orgMember?.organization_id || null;
}

export async function GET(req: NextRequest) {
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (demoMode) {
    return NextResponse.json({
      invoices: [
        {
          id: "demo-inv-1",
          invoice_number: "INV-1001",
          company: "Acme Aggregates",
          total: 12500,
          status: "Sent",
          created_at: new Date().toISOString(),
        },
      ],
    });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const requestedOrgId = searchParams.get("organization_id");
  const organizationId = await resolveOrganizationId(
    supabase,
    user.id,
    requestedOrgId,
  );

  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  let query = supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data });
}

export async function POST(req: NextRequest) {
  if (!requireSameOrigin(req))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (demoMode) {
    return NextResponse.json({ invoice: { id: "demo-inv", status: "Draft" } });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const organizationId = await resolveOrganizationId(
    supabase,
    user.id,
    body.organization_id,
  );
  if (!organizationId) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const items = Array.isArray(body.line_items) ? body.line_items : [];
  const subtotal = items.reduce(
    (sum: number, it: any) =>
      sum + (Number(it.amount ?? it.quantity * it.unit_price) || 0),
    0,
  );
  const tax_rate = Number(body.tax_rate || 0);
  const tax_amount = Math.round(subtotal * tax_rate * 100) / 100;
  const total = Math.round((subtotal + tax_amount) * 100) / 100;

  const { data: numRow, error: numErr } = await supabaseAdmin.rpc(
    "generate_invoice_number",
    { prefix: body.invoice_type === "Quote" ? "QUO" : "INV" },
  );
  if (numErr)
    return NextResponse.json({ error: numErr.message }, { status: 500 });

  const payload = {
    invoice_number: numRow as string,
    invoice_type: body.invoice_type || "Invoice",
    quote_id: body.quote_id || null,
    company: body.company,
    contact_name: body.contact_name || null,
    contact_email: body.contact_email || null,
    billing_address: body.billing_address || null,
    line_items: items,
    subtotal,
    tax_rate,
    tax_amount,
    total,
    notes: body.notes || null,
    terms: body.terms || null,
    due_date: body.due_date || null,
    status: body.status || "Draft",
    customer_id: body.customer_id || null,
    ar_status: body.ar_status || "Open",
    factoring_company_id: body.factoring_company_id || null,
    movement_type: body.movement_type || null,
    primary_state: body.primary_state || null,
    organization_id: organizationId,
    client_organization_id: body.client_organization_id || null,
    carrier_id: body.carrier_id || null,
    billing_model: body.billing_model || "pass_through",
    margin_rate: body.margin_rate || null,
    fee_rate: body.fee_rate || null,
  };

  const { data, error } = await supabaseAdmin
    .from("invoices")
    .insert(payload)
    .select("*")
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
