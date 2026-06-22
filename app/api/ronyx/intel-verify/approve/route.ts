import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Fields that map directly to owner_operators columns
const OO_COL_MAP: Record<string, string> = {
  mc_number:            "mc_number",
  dot_number:           "dot_number",
  legal_name:           "company_name",
  ein:                  "ein",
  auto_liability_exp:   "auto_liability_expiration",
  auto_liability_policy:"auto_liability_policy_number",
  auto_liability_carrier:"auto_liability_carrier",
  cargo_exp:            "cargo_coi_expiration",
  cargo_policy:         "cargo_policy_number",
  cargo_carrier:        "cargo_carrier",
  gl_exp:               "general_liability_expiration",
  workers_comp_exp:     "workers_comp_expiration",
  insurance_agent_name: "insurance_agent_name",
  insurance_agent_email:"insurance_agent_email",
  insurance_agent_phone:"insurance_agent_phone",
};

async function resolveOrg(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabaseAdmin.from("organization_members").select("org_id").eq("user_id", userId).single();
  return data?.org_id ?? null;
}

// POST /api/ronyx/intel-verify/approve
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    extraction_id,
    oo_id,
    file_name,
    doc_type,
    approved_fields = [],   // [{key, label, value, confidence, sensitive, approved_value?}]
    rejected_fields  = [],
    staff_name       = "Staff",
    create_ccb_tasks = true,
  } = body;

  const { data: { session } } = await supabaseAdmin.auth.getSession();
  const userId = session?.user?.id ?? null;
  const orgId  = await resolveOrg(userId);

  const results: { action: string; ok: boolean; detail?: string }[] = [];

  // ── 1. Update queue item ──────────────────────────────────────────────────
  if (extraction_id) {
    try {
      await supabaseAdmin.from("intel_verify_queue").update({
        status:          "approved",
        approved_by:     userId,
        approved_at:     new Date().toISOString(),
        approved_fields: approved_fields,
        rejected_fields: rejected_fields,
      }).eq("id", extraction_id);
      results.push({ action: "queue_update", ok: true });
    } catch { results.push({ action: "queue_update", ok: false, detail: "Table may not exist yet" }); }
  }

  // ── 2. Update OO record ──────────────────────────────────────────────────
  if (oo_id && approved_fields.length > 0) {
    const ooUpdate: Record<string, string> = {};
    for (const f of approved_fields) {
      const col = OO_COL_MAP[f.key as string];
      if (col && (f.approved_value ?? f.value)) {
        ooUpdate[col] = String(f.approved_value ?? f.value);
      }
    }
    if (Object.keys(ooUpdate).length > 0) {
      try {
        const { error } = await supabaseAdmin
          .from("owner_operators")
          .update({ ...ooUpdate, updated_at: new Date().toISOString() })
          .eq("id", oo_id);
        if (error) throw error;
        results.push({ action: "oo_update", ok: true, detail: `Updated ${Object.keys(ooUpdate).length} field(s)` });
      } catch (e) {
        results.push({ action: "oo_update", ok: false, detail: String(e) });
      }
    }
  }

  // ── 3. CCB tasks for expired/expiring fields ──────────────────────────────
  if (create_ccb_tasks) {
    const tasks: object[] = [];
    for (const f of approved_fields) {
      const val = f.approved_value ?? f.value;
      if (!val || !String(val).match(/\d{1,2}\/\d{1,2}\/\d{4}/)) continue;
      const parts = String(val).split("/");
      const exp = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
      if (isNaN(exp.getTime())) continue;
      const days = Math.ceil((exp.getTime() - Date.now()) / 86_400_000);
      if (days <= 0) {
        tasks.push({ task_type: `Expired: ${f.label}`, priority: "critical", assigned_to: "Compliance Admin", org_id: orgId, owner_operator_id: oo_id, source_file: file_name, notes: `Value: ${val}` });
      } else if (days <= 30) {
        tasks.push({ task_type: `Expiring in ${days}d: ${f.label}`, priority: "urgent", assigned_to: "Compliance Admin", org_id: orgId, owner_operator_id: oo_id, source_file: file_name, notes: `Expires: ${val}` });
      }
    }
    if (tasks.length > 0) {
      try {
        await supabaseAdmin.from("ronyx_staff_tasks").insert(tasks);
        results.push({ action: "ccb_tasks", ok: true, detail: `Created ${tasks.length} task(s)` });
      } catch { results.push({ action: "ccb_tasks", ok: false, detail: "ronyx_staff_tasks insert failed" }); }
    }
  }

  // ── 4. Audit log ──────────────────────────────────────────────────────────
  try {
    await supabaseAdmin.from("intel_verify_audit").insert({
      org_id,
      extraction_id,
      oo_id,
      file_name,
      doc_type,
      approved_field_count: approved_fields.length,
      rejected_field_count: rejected_fields.length,
      approved_by_user:     userId,
      approved_by_name:     staff_name,
      oo_fields_updated:    results.find(r => r.action === "oo_update")?.detail ?? null,
      ccb_tasks_created:    results.find(r => r.action === "ccb_tasks")?.detail ?? null,
      result_summary:       results.filter(r => r.ok).map(r => r.action).join(", "),
    });
  } catch { /* intel_verify_audit table may not exist yet */ }

  return NextResponse.json({
    ok:      results.some(r => r.ok),
    results,
    summary: results.filter(r => r.ok).map(r => r.detail ?? r.action).join(" · ") || "No changes applied.",
  });
}
