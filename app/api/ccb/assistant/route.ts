import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Norma's CCB assistant — CROSS-COMPANY carrier clearance. Answers questions and
// takes actions across every company (not scoped to one tenant like the Ronyx one).
const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_ccb_snapshot",
    description: "Clearance snapshot across ALL companies from each company's latest dispatch: totals for Clear / Warning / Dispatch-Block / Needs-Review, and per-company breakdown. Use for 'how does clearance look / what's blocked / who needs review'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_carrier_clearance",
    description: "Search carrier clearance across ALL companies by carrier, driver, truck, or company name. Returns each match's company, compliance note, and severity.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "create_ccb_task",
    description: "Create a CCB follow-up task (e.g. 're-check ABC Trucking insurance', 'call carrier about expired authority'). Use when told to follow up, remind, or add a to-do.",
    input_schema: { type: "object", properties: { title: { type: "string" }, priority: { type: "string", enum: ["low", "normal", "high"] } }, required: ["title"] },
  },
];

// Build the cross-company clearance dataset (each org's latest dispatch import).
async function loadClearance() {
  const sb = supabaseAdmin;
  const { data: orgs } = await sb.from("organizations").select("id, name, legal_name").limit(1000);
  const nameById: Record<string, string> = {};
  for (const o of orgs || []) nameById[o.id] = o.name || o.legal_name || "Company";
  const { data: recent } = await sb.from("dispatch_import_rows").select("organization_id, dispatch_import_id, created_at").order("created_at", { ascending: false }).limit(20000);
  const latest: Record<string, string> = {};
  for (const r of recent || []) { if (r.organization_id && r.dispatch_import_id && !latest[r.organization_id]) latest[r.organization_id] = r.dispatch_import_id; }
  const rows: any[] = [];
  for (const orgId of Object.keys(latest)) {
    const { data } = await sb.from("dispatch_import_rows").select("company_name, driver_name, truck_number, rmis_note, rmis_severity").eq("dispatch_import_id", latest[orgId]).limit(5000);
    for (const x of data || []) rows.push({ ...x, company: nameById[orgId] || "Company" });
  }
  return { rows, companies: Object.keys(latest).length, managed: (orgs || []).length };
}

async function runTool(name: string, input: any): Promise<any> {
  if (name === "get_ccb_snapshot" || name === "search_carrier_clearance") {
    const { rows, companies, managed } = await loadClearance();
    const sevOf = (x: any) => x.rmis_severity || (((x.rmis_note || "").trim()) ? "review" : "clear");
    if (name === "get_ccb_snapshot") {
      const count = (s: string) => rows.filter(x => sevOf(x) === s).length;
      const byCompany: Record<string, any> = {};
      for (const x of rows) { const c = (byCompany[x.company] ||= { company: x.company, clear: 0, warning: 0, critical: 0, review: 0 }); const s = sevOf(x); if (c[s] != null) c[s]++; }
      return { companies_managed: managed, companies_with_data: companies, clear: count("clear"), warning: count("warning"), dispatch_block: count("critical"), needs_review: count("review"), per_company: Object.values(byCompany) };
    }
    const q = (input.query || "").toLowerCase();
    const hits = rows.filter(x => [x.company, x.company_name, x.driver_name, x.truck_number, x.rmis_note].some(v => (v || "").toLowerCase().includes(q)))
      .slice(0, 30).map(x => ({ company: x.company, carrier: x.company_name || "—", driver: x.driver_name || null, truck: x.truck_number || null, severity: sevOf(x), note: x.rmis_note || null }));
    return { count: hits.length, carriers: hits };
  }
  if (name === "create_ccb_task") {
    const title = String(input.title || "").trim();
    if (!title) return { error: "Need a task description." };
    const pri = ["low", "normal", "high"].includes(String(input.priority)) ? String(input.priority) : "normal";
    const { data, error } = await supabaseAdmin.from("ronyx_staff_tasks")
      .insert({ assigned_to_name: "CCB", title, status: "pending", priority: pri, task_type: "ccb_followup", source_type: "assistant", source_label: "CCB Assistant" })
      .select("id").single();
    if (error) return { error: error.message };
    return { ok: true, created: `CCB task added: "${title}" (${pri} priority).`, id: data?.id };
  }
  return { error: `Unknown tool ${name}` };
}

const SYSTEM = `You are the CCB Assistant for Norma at the Carrier Clearance Board (CCB) — a MoveAround service that clears carriers for EVERY company on the platform. You work ACROSS ALL COMPANIES, not one tenant.

You both ANSWER clearance questions and TAKE ACTIONS. Be concise, warm, and practical.
- Lead with clearance: who's cleared, who's blocked, who needs review, across all companies.
- Use get_ccb_snapshot for "how does clearance look / what's blocked", search_carrier_clearance to check a carrier or company, create_ccb_task to add a follow-up.
- Never invent data. If a tool returns nothing, say the board is clear or no data has been imported yet.
- Golden rule for advice: when in doubt, hold the carrier — a blocked load is cheaper than a claim.
Keep answers short.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ reply: "The assistant isn't configured yet (missing AI key)." });
  const body = await req.json().catch(() => ({}));
  const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
  const convo: Anthropic.MessageParam[] = history.slice(-12).map(m => ({ role: m.role, content: m.content }));
  const steps: { tool: string; input: any }[] = [];
  try {
    for (let i = 0; i < 6; i++) {
      const resp = await anthropic.messages.create({ model: "claude-opus-4-8", max_tokens: 1200, system: SYSTEM, tools: TOOLS, messages: convo });
      if (resp.stop_reason === "tool_use") {
        convo.push({ role: "assistant", content: resp.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of resp.content) {
          if (block.type !== "tool_use") continue;
          const out = await runTool(block.name, block.input).catch(e => ({ error: String(e?.message || e) }));
          steps.push({ tool: block.name, input: block.input });
          results.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(out).slice(0, 9000) });
        }
        convo.push({ role: "user", content: results });
        continue;
      }
      const text = resp.content.filter(c => c.type === "text").map((c: any) => c.text).join("\n").trim();
      return NextResponse.json({ reply: text || "Done.", steps });
    }
    return NextResponse.json({ reply: "That took more steps than expected — try narrowing the request.", steps });
  } catch (e: any) {
    const msg = String(e?.message || "unknown");
    if (/credit balance|billing|quota|insufficient/i.test(msg)) return NextResponse.json({ reply: "I'm out of AI credits right now — please top up the Anthropic account and I'll be back online.", steps });
    return NextResponse.json({ reply: `Sorry — I hit an error: ${msg}.`, steps });
  }
}
