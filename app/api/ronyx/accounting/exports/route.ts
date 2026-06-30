import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// QuickBooks Sync Control Center — live from accounting_exports (created by the migration).
export async function GET() {
  try {
    await resolveOrgId();
    const { data, error } = await supabaseAdmin.from("accounting_exports").select("*").order("created_at", { ascending: false }).limit(500);
    if (error) return NextResponse.json({ live: false, items: [], summary: null });
    const items = (data || []).map((e: any) => ({
      id: e.id?.slice(0, 8), type: e.export_type || "—", ref: e.source_ref || "—",
      count: Number(e.record_count || 0), amount: Number(e.amount || 0),
      status: (e.status || "ready") as "ready" | "exported" | "failed",
      extRef: e.external_ref || null, date: (e.exported_at || "").slice(0, 10) || null,
      by: e.exported_by || null, error: e.sync_error || null,
    }));
    const failed = items.filter(i => i.status === "failed");
    const ready = items.filter(i => i.status === "ready");
    const exported = items.filter(i => i.status === "exported");
    const lastSync = exported.map(i => i.date).filter(Boolean).sort().pop() || null;
    const summary = {
      lastSync,
      healthy: failed.length === 0,
      readyCount: ready.length,
      failedCount: failed.length,
      missingMappings: failed.filter(i => /map|not found|account/i.test(i.error || "")).length,
      unreconciled: ready.filter(i => /payment/i.test(i.type)).length,
    };
    return NextResponse.json({ live: items.length > 0, items, summary });
  } catch (e: any) { return NextResponse.json({ live: false, items: [], summary: null, error: e?.message }); }
}
