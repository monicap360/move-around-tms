import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Live job costing from job_cost_snapshots (created by the accounting migration).
export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin.from("job_cost_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ live: false, items: [] });
    const items = (data || []).map((j: any) => ({
      id: j.id?.slice(0, 8), customer: j.customer || "—", job: j.job || "—",
      loads: Number(j.loads || 0), tons: Number(j.tons || 0), revenue: Number(j.revenue || 0),
      ooCost: Number(j.oo_cost || 0), fuel: Number(j.fuel_cost || 0), pit: Number(j.pit_cost || 0),
      maint: Number(j.maintenance || 0), other: Number(j.other_cost || 0),
      missingCost: !j.fuel_cost || !j.maintenance, pendingRate: false,
      contractRate: 0, actualRate: 0, bestTruck: "—", worstRoute: "—", trend: [] as number[],
    }));
    return NextResponse.json({ live: items.length > 0, items });
  } catch (e: any) { return NextResponse.json({ live: false, items: [], error: e?.message }); }
}
