import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Live fuel + costs from fuel_transactions (created by the accounting migration).
export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin.from("fuel_transactions").select("*").order("transaction_date", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ live: false, items: [] });
    const tabFor = (t: any) => {
      const ct = (t.cost_type || "").toLowerCase();
      if (ct.includes("fuel")) return t.allocation_method ? "assigned" : "unmatched";
      if (ct.includes("maint")) return "maint";
      if (ct.includes("toll") || ct.includes("permit")) return "tolls";
      return "other";
    };
    const items = (data || []).map((t: any) => ({
      id: t.id?.slice(0, 8), date: (t.transaction_date || "").slice(5), vendor: t.vendor || "—", type: t.cost_type || "—",
      amount: Number(t.amount || 0), truck: t.truck_number || null, party: t.party || null, job: t.job || null,
      method: t.allocation_method || null, tab: tabFor(t),
    }));
    return NextResponse.json({ live: items.length > 0, items });
  } catch (e: any) { return NextResponse.json({ live: false, items: [], error: e?.message }); }
}
