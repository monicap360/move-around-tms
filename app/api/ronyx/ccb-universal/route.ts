import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// CCB Sentinel™ — UNIVERSAL (cross-company) carrier clearance rollup for Norma.
// Aggregates every company's most recent dispatch import into one clearance picture:
// how many carriers are Clear / Low / Warning / Dispatch-Block, and who needs review.

type CompanyRoll = {
  org_id: string; name: string;
  clear: number; low: number; warning: number; critical: number; review: number;
  carriers: number; attention: number; import_date: string | null;
};

export async function GET() {
  const sb = supabaseAdmin;

  // All companies we manage clearance for.
  const { data: orgs } = await sb.from("organizations").select("id, name, legal_name").limit(1000);
  const nameById: Record<string, string> = {};
  for (const o of orgs || []) nameById[o.id] = o.name || o.legal_name || "Company";

  // Latest dispatch import per org (one row per org, newest first).
  const { data: recent } = await sb
    .from("dispatch_import_rows")
    .select("organization_id, dispatch_import_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20000);

  const latestImport: Record<string, string> = {};
  const latestDate: Record<string, string> = {};
  for (const r of recent || []) {
    if (!r.organization_id || !r.dispatch_import_id) continue;
    if (!latestImport[r.organization_id]) { latestImport[r.organization_id] = r.dispatch_import_id; latestDate[r.organization_id] = (r.created_at || "").slice(0, 10); }
  }

  const companies: CompanyRoll[] = [];
  const attentionList: { company: string; carrier: string; truck: string | null; severity: string; note: string | null }[] = [];

  for (const orgId of Object.keys(latestImport)) {
    const { data: rows } = await sb
      .from("dispatch_import_rows")
      .select("company_name, driver_name, truck_number, rmis_note, rmis_severity")
      .eq("dispatch_import_id", latestImport[orgId]).limit(5000);
    const r = rows || [];
    const sev = (s: string) => r.filter(x => (x.rmis_severity || "") === s).length;
    // rows that carry a compliance note but haven't been classified yet = "needs review"
    const review = r.filter(x => !x.rmis_severity && (x.rmis_note || "").trim()).length;
    const roll: CompanyRoll = {
      org_id: orgId, name: nameById[orgId] || "Company",
      clear: sev("clear"), low: sev("low"), warning: sev("warning"), critical: sev("critical"), review,
      carriers: new Set(r.map(x => x.company_name).filter(Boolean)).size,
      attention: sev("critical") + sev("warning") + review,
      import_date: latestDate[orgId] || null,
    };
    companies.push(roll);
    for (const x of r) {
      const s = x.rmis_severity || (((x.rmis_note || "").trim()) ? "review" : "");
      if (s === "critical" || s === "warning" || s === "review") {
        attentionList.push({ company: roll.name, carrier: x.company_name || x.driver_name || "—", truck: x.truck_number || null, severity: s, note: x.rmis_note || null });
      }
    }
  }

  companies.sort((a, b) => b.attention - a.attention);
  const totals = companies.reduce((t, c) => ({
    clear: t.clear + c.clear, low: t.low + c.low, warning: t.warning + c.warning,
    critical: t.critical + c.critical, review: t.review + c.review, carriers: t.carriers + c.carriers,
  }), { clear: 0, low: 0, warning: 0, critical: 0, review: 0, carriers: 0 });

  const order = { critical: 0, warning: 1, review: 2 } as any;
  attentionList.sort((a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3));

  return NextResponse.json({
    companies_managed: (orgs || []).length,
    companies_with_data: companies.length,
    totals,
    companies,
    attention: attentionList.slice(0, 50),
  });
}
