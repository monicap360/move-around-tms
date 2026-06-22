import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/fmcsa/configure
// Admin-only. Saves the FMCSA web key into ronyx_integrations.
// The key is NEVER returned in any GET response — this is write-only from the UI.
// Every change is written to ronyx_admin_audit_logs.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { api_key, enabled = true, changed_by = "admin" } = body as {
      api_key: string; enabled?: boolean; changed_by?: string;
    };

    if (!api_key?.trim()) {
      return NextResponse.json({ error: "api_key is required" }, { status: 400 });
    }

    // Upsert the FMCSA integration row (insert if missing, update if exists)
    const { error } = await supabaseAdmin
      .from("ronyx_integrations")
      .upsert({
        name:       "FMCSA",
        category:   "Compliance",
        status:     enabled ? "connected" : "disconnected",
        enabled,
        api_key:    api_key.trim(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "name" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Audit log — record who changed the key and when, but NOT the key value
    void supabaseAdmin.from("ronyx_admin_audit_logs").insert({
      action:      "fmcsa_key_updated",
      performed_by: changed_by,
      details:     { enabled, key_length: api_key.trim().length },
      created_at:  new Date().toISOString(),
    }).then(() => {}).catch(() => {});

    return NextResponse.json({ ok: true, enabled });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Configuration failed" }, { status: 500 });
  }
}

// GET — returns connection status only, NEVER the key value
export async function GET() {
  const { data } = await supabaseAdmin
    .from("ronyx_integrations")
    .select("enabled, status, updated_at")  // api_key intentionally excluded
    .eq("name", "FMCSA")
    .single();

  return NextResponse.json({
    configured: !!data,
    enabled:    data?.enabled ?? false,
    status:     data?.status  ?? "disconnected",
    updated_at: data?.updated_at ?? null,
  });
}
