import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * Health endpoint with a liveness/readiness split so it can NEVER block a deploy:
 *
 *   GET /api/health          LIVENESS — instant 200 whenever the app responds.
 *                            This is Render's healthCheckPath: a DB blip must not
 *                            stop promotion or flap instances.
 *   GET /api/health?ready=1  READINESS — probes the DB, returns 503 when it fails.
 *                            Point the uptime monitor / alerts here to page on DB
 *                            outages (this is where strict DB-gating belongs).
 *
 * Probe is fast + bounded (HEAD count, 2.5s timeout). Pair with numInstances >= 2.
 */
const DB_TIMEOUT_MS = 2500;

async function probeDb(): Promise<{ ok: boolean; error?: string }> {
  // Resolve exactly like lib/supabaseAdmin so the probe can't fail on an
  // env-var-name mismatch.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { ok: false, error: "supabase env not configured" };

  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
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

export async function GET(req: Request) {
  const base = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  };

  // LIVENESS (default): never touches the DB, never gates a deploy.
  if (new URL(req.url).searchParams.get("ready") !== "1") {
    return NextResponse.json(base);
  }

  // READINESS (?ready=1): strict DB check for the uptime monitor.
  const db = await probeDb();
  return NextResponse.json(
    { ...base, status: db.ok ? "ok" : "error", checks: { database: db.ok }, ...(db.ok ? {} : { db_error: db.error ?? "database unreachable" }) },
    { status: db.ok ? 200 : 503 },
  );
}
