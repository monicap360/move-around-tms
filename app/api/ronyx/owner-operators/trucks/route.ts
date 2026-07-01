import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Fleet-wide truck list — every owner-operator's trucks in one place, so the
// office can pull up the fleet for any (or all) owner-operators.
export async function GET() {
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ trucks: [], companies: [], error: "Could not resolve your organization." });

  const { data: ooCos } = await sb.from("ronyx_owner_operators").select("id, company_name").eq("organization_id", orgId).limit(5000);
  const cos = ooCos || [];
  const byId: Record<string, string> = {};
  for (const c of cos as { id: string; company_name: string }[]) byId[c.id] = c.company_name;
  const ooIds = cos.map((c: { id: string }) => c.id);
  if (!ooIds.length) return NextResponse.json({ trucks: [], companies: [] });

  const { data, error } = await sb.from("ronyx_oo_trucks")
    .select("id, oo_id, truck_number, year, make, model, vin, plate, assigned_driver_name, last_inspection, inspection_result, status")
    .in("oo_id", ooIds).limit(10000);
  if (error) return NextResponse.json({ trucks: [], companies: [], error: error.message });

  const trucks = (data || []).map((t: any) => ({
    id: t.id, oo_id: t.oo_id, company: byId[t.oo_id] || "—",
    truck_number: t.truck_number || "", year: t.year || "", make: t.make || "", model: t.model || "",
    vin: t.vin || "", plate: t.plate || "", driver: t.assigned_driver_name || "",
    last_inspection: t.last_inspection || "", inspection_result: t.inspection_result || "", status: t.status || "",
  }));
  trucks.sort((a, b) => (a.company + a.truck_number).localeCompare(b.company + b.truck_number, undefined, { numeric: true }));

  const companies = (cos as { id: string; company_name: string }[])
    .map(c => ({ id: c.id, name: c.company_name }))
    .filter(c => trucks.some(t => t.oo_id === c.id))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return NextResponse.json({ trucks, companies });
}
