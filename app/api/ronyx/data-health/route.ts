// Data Health — scans the core records (drivers, owner-operators, trucks, customers)
// for gaps a dispatcher cares about: missing names/licenses, and expired or missing
// CDL / medical / MVR / registration docs. Read-only; org-scoped.

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const today = () => new Date().toISOString().slice(0, 10);
const blank = (v: any) => !v || !String(v).trim();
const expired = (d: any) => d && String(d).slice(0, 10) < today();
const placeholderName = (n: string) => /^name needed/i.test(n) || n === "`" || n.length < 2;

type Issue = { type: string; label: string; severity: "block" | "warn"; count: number; sample: { id: string; name: string }[] };

function tally(rows: any[], nameOf: (r: any) => string, checks: { type: string; label: string; severity: "block" | "warn"; test: (r: any) => boolean }[]): Issue[] {
  return checks.map(c => {
    const hits = rows.filter(c.test);
    return {
      type: c.type, label: c.label, severity: c.severity, count: hits.length,
      sample: hits.slice(0, 12).map(r => ({ id: String(r.id), name: nameOf(r) || "—" })),
    };
  }).filter(i => i.count > 0);
}

export async function GET() {
  const supabase = supabaseAdmin as any;
  const orgId = await resolveOrgId();
  const scope = (q: any) => (orgId ? q.or(`organization_id.eq.${orgId},organization_id.is.null`) : q);

  const entities: any[] = [];

  // ── Drivers ────────────────────────────────────────────────────────────────
  try {
    const { data } = await scope(
      supabase.from("drivers").select("id, name, full_name, license_number, license_expiration_date, medical_card_expiration, mvr_expiration, status")
        .neq("status", "deleted").neq("status", "inactive").neq("status", "terminated"),
    );
    const rows = data || [];
    const nameOf = (r: any) => (r.full_name || r.name || "").trim();
    entities.push({
      key: "drivers", label: "Drivers", total: rows.length,
      issues: tally(rows, nameOf, [
        { type: "missing_name", label: "Missing / placeholder name", severity: "block", test: r => placeholderName(nameOf(r)) },
        { type: "missing_license", label: "Missing CDL number", severity: "block", test: r => blank(r.license_number) },
        { type: "cdl_expired", label: "CDL expired", severity: "block", test: r => expired(r.license_expiration_date) },
        { type: "cdl_no_date", label: "No CDL expiration on file", severity: "warn", test: r => blank(r.license_expiration_date) },
        { type: "medical_expired", label: "Medical card expired", severity: "block", test: r => expired(r.medical_card_expiration) },
        { type: "medical_no_date", label: "No medical card on file", severity: "warn", test: r => blank(r.medical_card_expiration) },
        { type: "mvr_missing", label: "No MVR on file", severity: "warn", test: r => blank(r.mvr_expiration) },
      ]),
    });
  } catch { entities.push({ key: "drivers", label: "Drivers", total: 0, issues: [], error: true }); }

  // ── Owner-operator drivers ───────────────────────────────────────────────────
  try {
    const { data } = await supabase.from("ronyx_oo_drivers")
      .select("id, name, cdl_number, cdl_expiration, med_card_expiration, status").neq("status", "deleted");
    const rows = data || [];
    const nameOf = (r: any) => (r.name || "").trim();
    entities.push({
      key: "owner_operators", label: "Owner-Operators", total: rows.length,
      issues: tally(rows, nameOf, [
        { type: "missing_name", label: "Missing name", severity: "block", test: r => blank(nameOf(r)) },
        { type: "missing_license", label: "Missing CDL number", severity: "block", test: r => blank(r.cdl_number) },
        { type: "cdl_expired", label: "CDL expired", severity: "block", test: r => expired(r.cdl_expiration) },
        { type: "cdl_no_date", label: "No CDL expiration on file", severity: "warn", test: r => blank(r.cdl_expiration) },
        { type: "medical_expired", label: "Medical card expired", severity: "block", test: r => expired(r.med_card_expiration) },
        { type: "medical_no_date", label: "No medical card on file", severity: "warn", test: r => blank(r.med_card_expiration) },
      ]),
    });
  } catch { entities.push({ key: "owner_operators", label: "Owner-Operators", total: 0, issues: [], error: true }); }

  // ── Trucks ───────────────────────────────────────────────────────────────────
  try {
    const { data } = await scope(supabase.from("ronyx_trucks").select("id, truck_number, vin, plate, make, model, status"));
    const rows = data || [];
    const nameOf = (r: any) => r.truck_number || r.plate || r.vin || "—";
    entities.push({
      key: "trucks", label: "Trucks", total: rows.length,
      issues: tally(rows, nameOf, [
        { type: "missing_number", label: "Missing truck number", severity: "block", test: r => blank(r.truck_number) },
        { type: "missing_vin", label: "Missing VIN", severity: "warn", test: r => blank(r.vin) },
        { type: "missing_plate", label: "Missing plate", severity: "warn", test: r => blank(r.plate) },
        { type: "missing_makemodel", label: "Missing make / model", severity: "warn", test: r => blank(r.make) && blank(r.model) },
      ]),
    });
  } catch { entities.push({ key: "trucks", label: "Trucks", total: 0, issues: [], error: true }); }

  // ── Customers ─────────────────────────────────────────────────────────────────
  try {
    const { data } = await scope(supabase.from("customers").select("id, name, status"));
    const rows = data || [];
    const nameOf = (r: any) => (r.name || "").trim();
    entities.push({
      key: "customers", label: "Customers", total: rows.length,
      issues: tally(rows, nameOf, [
        { type: "missing_name", label: "Missing name", severity: "block", test: r => blank(nameOf(r)) },
      ]),
    });
  } catch { entities.push({ key: "customers", label: "Customers", total: 0, issues: [], error: true }); }

  const totalIssues = entities.reduce((n, e) => n + (e.issues || []).reduce((m: number, i: Issue) => m + i.count, 0), 0);
  const totalBlocks = entities.reduce((n, e) => n + (e.issues || []).filter((i: Issue) => i.severity === "block").reduce((m: number, i: Issue) => m + i.count, 0), 0);

  return NextResponse.json({ entities, totalIssues, totalBlocks });
}
