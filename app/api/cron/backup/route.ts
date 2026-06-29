// Unguarded (NOT behind the PIN gate — it lives outside /api/ronyx) but secret-protected
// endpoint for scheduled daily backups. A scheduler (Render Cron, GitHub Actions, etc.)
// hits this with the CRON_SECRET; it runs the same createSnapshot() as the manual button.
//
//   POST/GET /api/cron/backup
//   Authorization: Bearer <CRON_SECRET>     (or ?secret=<CRON_SECRET>)

import { NextResponse } from "next/server";
import { createSnapshot } from "@/lib/backup/createSnapshot";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse until a secret is configured
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim() || new URL(req.url).searchParams.get("secret") || "";
  return token.length > 0 && token === secret;
}

async function run(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orgId =
    (await resolveOrgId()) || process.env.RONYX_ORG_ID || "871e2c51-205c-4c1a-93dc-022a237f05ad";
  const result = await createSnapshot(orgId, "cron");
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

export const GET = run;
export const POST = run;
