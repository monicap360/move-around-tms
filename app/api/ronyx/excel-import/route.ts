import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await req.json();

    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return NextResponse.json({ error: "rows[] is required and cannot be empty" }, { status: 400 });
    }

    // Get first organization (Ronyx single-org setup)
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .limit(1)
      .maybeSingle();

    const organization_id = org?.id;
    if (!organization_id) {
      return NextResponse.json({ error: "No organization configured — run setup first" }, { status: 500 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: "Server misconfigured — missing Supabase credentials" }, { status: 500 });
    }

    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/excel-reconcile-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey:          serviceKey,
        Authorization:   `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        organization_id,
        file_name:         body.file_name  ?? "upload.xlsx",
        file_path:         body.file_path  ?? null,
        upload_type:       body.upload_type ?? "vendor_excel",
        rows:              body.rows,
        trigger_reconcile: body.trigger_reconcile ?? true,
      }),
    });

    const result = await edgeRes.json().catch(() => ({}));

    if (!edgeRes.ok) {
      return NextResponse.json(
        { error: result?.error || `Edge function error ${edgeRes.status}` },
        { status: 500 },
      );
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Import failed" }, { status: 500 });
  }
}
