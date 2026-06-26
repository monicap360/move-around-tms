// GET /api/ronyx/rory/brief — "Morning Operations Brief".
//
// Runs ONLY the read-only get_operations_priority_summary tool directly (no LLM),
// org-scoped, so the brief cards are deterministic, cheap, and grounded. Same org
// resolution and audit as the chat endpoint. No actions, no writes.

import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { RORY_TOOLS_BY_NAME } from "@/lib/rory/tools";
import { logRoryAudit } from "@/lib/rory/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });

  let orgName = "your organization";
  try {
    const { data } = await (supabaseAdmin as any).from("organizations").select("name").eq("id", orgId).maybeSingle();
    if (data?.name) orgName = data.name;
  } catch { /* default */ }

  const tool = RORY_TOOLS_BY_NAME["get_operations_priority_summary"];
  try {
    const result = await tool.execute({}, { sb: supabaseAdmin, orgId });
    logRoryAudit(supabaseAdmin, {
      organization_id: orgId, tool_name: tool.name, result_count: result.count,
      response_status: result.status, question: "[morning operations brief]",
    });
    const groups = (result.summary?.groups ?? {}) as Record<string, unknown[]>;
    return NextResponse.json({
      organizationName: orgName,
      checkedAt: new Date().toISOString(),
      groups: {
        critical_now: groups.critical_now ?? [],
        needs_attention_today: groups.needs_attention_today ?? [],
        this_week: groups.this_week ?? [],
        ready_for_next_step: groups.ready_for_next_step ?? [],
      },
      readOnly: true,
    });
  } catch (e) {
    logRoryAudit(supabaseAdmin, {
      organization_id: orgId, tool_name: tool.name, response_status: "tool_error",
      error_detail: String((e as Error)?.message ?? e).slice(0, 300),
    });
    return NextResponse.json({ error: "Could not build the brief right now." }, { status: 502 });
  }
}
