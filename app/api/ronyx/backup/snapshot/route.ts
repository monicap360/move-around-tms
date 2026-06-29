// Durable DATABASE SNAPSHOTS stored in Supabase Storage (bucket: ronyx-backups) —
// complements the Backup Center (which tracks uploaded source files). NOT email/local.
//
// POST → full snapshot (drivers, owner-operators, carriers, loads, tickets, trucks,
//        profiles, import history, file registry …) → ronyx-backups/<org>/…xlsx
// GET  → list snapshots with short-lived signed download URLs.
//
// For automated daily backups, a Render Cron Job hits POST /api/cron/backup (unguarded,
// secret-protected) which calls the same createSnapshot() this route uses.

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { createSnapshot } from "@/lib/backup/createSnapshot";

export const dynamic = "force-dynamic";

const BUCKET = "ronyx-backups";

export async function POST() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const result = await createSnapshot(orgId, "manual");
  return NextResponse.json(result, { status: 200 });
}

export async function GET() {
  const sb = supabaseAdmin as any;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Org not resolved" }, { status: 400 });
  const { data: files } = await sb.storage.from(BUCKET).list(orgId, { limit: 100, sortBy: { column: "name", order: "desc" } });
  const backups = [];
  for (const f of files || []) {
    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(`${orgId}/${f.name}`, 3600);
    backups.push({ name: f.name, sizeKB: Math.round((f.metadata?.size || 0) / 1024), created_at: f.created_at, url: signed?.signedUrl || null });
  }
  return NextResponse.json({ backups });
}
