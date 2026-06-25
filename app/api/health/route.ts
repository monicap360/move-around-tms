import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Health Check API — used by Render (healthCheckPath) + uptime monitor + alerts.
 *
 * Probes the database, not just process liveness: a deploy that boots but cannot
 * reach Supabase (e.g. bad/rotated connection string) is NOT healthy. Returns
 * 503 when the DB probe fails so Render won't promote a broken deploy and the
 * uptime monitor pages immediately.
 *
 * The probe is fast and bounded (HEAD count, 2.5s timeout) so transient slowness
 * cannot hang the check. Pair with numInstances >= 2 so a single unhealthy
 * instance is replaced without taking the service down.
 */
const DB_TIMEOUT_MS = 2500;

async function probeDb(): Promise<{ ok: boolean; error?: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, error: "supabase env not configured" };

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    // HEAD + count: no rows transferred, just proves the connection + a table read.
    const probe = sb.from("organizations").select("id", { head: true, count: "exact" }).limit(1);
    const timeout = new Promise<{ error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ error: { message: `db probe timeout >${DB_TIMEOUT_MS}ms` } }), DB_TIMEOUT_MS),
    );
    const { error } = (await Promise.race([probe, timeout])) as { error: { message: string } | null };
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "db probe failed" };
  }
}

export async function GET() {
  const db = await probeDb();
  const body = {
    status: db.ok ? "ok" : "error",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
    checks: { database: db.ok },
    ...(db.ok ? {} : { error: db.error ?? "database unreachable" }),
  };
  return NextResponse.json(body, { status: db.ok ? 200 : 503 });
}
