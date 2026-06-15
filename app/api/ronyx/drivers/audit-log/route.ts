import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DRIVER_ACTIONS = [
  "driver_created",
  "driver_updated",
  "driver_import_completed",
  "compliance_alert_created",
  "driver_backup_email_sent",
  "driver_backup_email_queued",
  "driver_document_uploaded",
  "driver_suspended",
  "driver_activated",
];

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Number(searchParams.get("limit")  || 200), 500);
  const offset = Number(searchParams.get("offset") || 0);

  const { data, error } = await supabase
    .from("ticket_audit_log")
    .select("id, action, description, metadata, created_at")
    .in("action", DRIVER_ACTIONS)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message, events: [] }, { status: 500 });
  return NextResponse.json({ events: data || [], total: data?.length ?? 0 });
}
