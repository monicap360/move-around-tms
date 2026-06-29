import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Live driver payroll from driver_pay_runs (created by the accounting migration).
export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin.from("driver_pay_runs").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ live: false, items: [] });
    const items = (data || []).map((d: any) => ({
      id: d.id?.slice(0, 8), name: d.driver_name || "—", period: d.pay_period || "—",
      loads: Number(d.loads || 0), tons: Number(d.tons || 0), hours: Number(d.hours || 0),
      base: Number(d.base_pay || 0), ot: Number(d.overtime || 0), bonus: Number(d.bonus || 0),
      reimb: Number(d.reimbursements || 0), deduct: Number(d.deductions || 0), tickets: Number(d.ticket_count || 0),
      exceptions: [] as string[],
      appr: ({ draft: "Draft", approved: "Approved", hold: "On Hold", paid: "Paid" } as any)[(d.approval_status || "draft")] || "Draft",
      exported: d.export_status === "exported",
    }));
    return NextResponse.json({ live: items.length > 0, items });
  } catch (e: any) { return NextResponse.json({ live: false, items: [], error: e?.message }); }
}
