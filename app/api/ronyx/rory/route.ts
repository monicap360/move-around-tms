// POST /api/ronyx/rory — "Rory — Operations Manager" chat endpoint.
//
// Phase 1: strictly READ-ONLY, organization-scoped Q&A grounded in live data.
//
// Security:
//  - org_id is resolved SERVER-SIDE (resolveOrgId) — never read from the body.
//  - Every tool runs through the registry, which filters by the resolved org and
//    caps results. The LLM cannot run free-form SQL or call undeclared tools.
//  - All tool inputs are validated with Zod before execution.
//  - Every question, tool call, result count, and status is written to the
//    ai_operations_audit_log (fire-and-forget, org-scoped).
//  - A minimal in-memory per-org/user rate limiter guards the endpoint.

import { NextResponse } from "next/server";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { buildRorySystemPrompt } from "@/lib/rory/systemPrompt";
import { RORY_TOOLS_BY_NAME, anthropicToolDefs } from "@/lib/rory/tools";
import { logRoryAudit } from "@/lib/rory/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-8";
const MAX_TOOL_ITERATIONS = 6;
const MAX_TURNS = 30;
const MAX_CONTENT_CHARS = 4000;

// ── minimal per-org/user rate limiter (in-memory; per-instance) ───────────────
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20;
const rlHits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const nowMs = Date.now();
  const hits = (rlHits.get(key) ?? []).filter((t) => nowMs - t < RL_WINDOW_MS);
  hits.push(nowMs);
  rlHits.set(key, hits);
  return hits.length > RL_MAX;
}

// ── request validation (org_id is intentionally NOT accepted here) ────────────
const BodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(MAX_CONTENT_CHARS) }))
    .min(1)
    .max(MAX_TURNS),
  conversationId: z.string().max(100).optional(),
});

async function resolveUser(): Promise<{ id: string | null; email: string | null }> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return { id: null, email: null };
    const cookieStore = await cookies();
    const authClient = createServerClient(url, anon, {
      cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} },
    });
    const { data: { user } } = await authClient.auth.getUser();
    return { id: user?.id ?? null, email: user?.email ?? null };
  } catch {
    return { id: null, email: null };
  }
}

export async function POST(req: Request) {
  // 1) Resolve org server-side. This is the tenant boundary — never from the body.
  const orgId = await resolveOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });
  }

  // 2) Validate input.
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }
  const { messages, conversationId } = parsed.data;
  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  const user = await resolveUser();

  // 3) Rate limit (per org + user).
  const rlKey = `${orgId}:${user.id ?? "anon"}`;
  if (rateLimited(rlKey)) {
    logRoryAudit(supabaseAdmin, {
      organization_id: orgId, user_id: user.id, user_email: user.email,
      conversation_id: conversationId ?? null, question: lastUser,
      response_status: "rate_limited",
    });
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  // 4) Org display name for the answer footer.
  let orgName = "your organization";
  try {
    const { data } = await (supabaseAdmin as any)
      .from("organizations").select("name").eq("id", orgId).maybeSingle();
    if (data?.name) orgName = data.name;
  } catch { /* keep default */ }

  // 5) Anthropic client.
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Rory is not configured (missing ANTHROPIC_API_KEY)." }, { status: 503 });
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = buildRorySystemPrompt(orgName);
  const tools = anthropicToolDefs();
  const convo: any[] = messages.map((m) => ({ role: m.role, content: m.content }));
  const dataUsed: { tool: string; result_count: number | null; status: string }[] = [];

  try {
    let answer = "";
    for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
      const response: any = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system,
        tools,
        messages: convo,
      } as any); // input_schema is a generic JSON object from our registry; cast like the other Anthropic call sites

      if (response.stop_reason !== "tool_use") {
        answer = (response.content ?? [])
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n")
          .trim();
        break;
      }

      // Echo the full assistant turn back (preserves thinking + tool_use blocks),
      // then resolve every tool_use block in ONE user message of tool_results.
      convo.push({ role: "assistant", content: response.content });
      const toolResults: any[] = [];

      for (const block of response.content ?? []) {
        if (block.type !== "tool_use") continue;
        const tool = RORY_TOOLS_BY_NAME[block.name];

        if (!tool) {
          logRoryAudit(supabaseAdmin, {
            organization_id: orgId, user_id: user.id, user_email: user.email,
            conversation_id: conversationId ?? null, question: lastUser,
            tool_name: block.name, response_status: "blocked",
            error_detail: "Undeclared tool requested",
          });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "This tool is not available." });
          dataUsed.push({ tool: block.name, result_count: null, status: "blocked" });
          continue;
        }

        const valid = tool.input.safeParse(block.input ?? {});
        if (!valid.success) {
          logRoryAudit(supabaseAdmin, {
            organization_id: orgId, user_id: user.id, user_email: user.email,
            conversation_id: conversationId ?? null, question: lastUser,
            tool_name: tool.name, tool_input_json: block.input, response_status: "blocked",
            error_detail: "Input validation failed",
          });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "Invalid tool input." });
          dataUsed.push({ tool: tool.name, result_count: null, status: "blocked" });
          continue;
        }

        try {
          const result = await tool.execute(valid.data, { sb: supabaseAdmin, orgId });
          logRoryAudit(supabaseAdmin, {
            organization_id: orgId, user_id: user.id, user_email: user.email,
            conversation_id: conversationId ?? null, question: lastUser,
            tool_name: tool.name, tool_input_json: valid.data,
            result_count: result.count, response_status: result.status,
          });
          dataUsed.push({ tool: tool.name, result_count: result.count, status: result.status });
          toolResults.push({
            type: "tool_result", tool_use_id: block.id,
            content: JSON.stringify({
              status: result.status, count: result.count, capped: result.capped,
              rows: result.rows, summary: result.summary ?? null, note: result.note ?? null,
            }),
          });
        } catch (e) {
          logRoryAudit(supabaseAdmin, {
            organization_id: orgId, user_id: user.id, user_email: user.email,
            conversation_id: conversationId ?? null, question: lastUser,
            tool_name: tool.name, tool_input_json: valid.data, response_status: "tool_error",
            error_detail: String((e as Error)?.message ?? e).slice(0, 300),
          });
          dataUsed.push({ tool: tool.name, result_count: null, status: "tool_error" });
          toolResults.push({ type: "tool_result", tool_use_id: block.id, is_error: true, content: "That data source returned an error." });
        }
      }

      convo.push({ role: "user", content: toolResults });
    }

    if (!answer) answer = "I do not have a verified data source for that yet.";

    return NextResponse.json({
      answer,
      dataUsed,
      organizationName: orgName,
      checkedAt: new Date().toISOString(),
      conversationId: conversationId ?? null,
      readOnly: true,
    });
  } catch (e) {
    logRoryAudit(supabaseAdmin, {
      organization_id: orgId, user_id: user.id, user_email: user.email,
      conversation_id: conversationId ?? null, question: lastUser,
      response_status: "model_error", error_detail: String((e as Error)?.message ?? e).slice(0, 300),
    });
    return NextResponse.json({ error: "Rory had trouble answering. Please try again." }, { status: 502 });
  }
}
