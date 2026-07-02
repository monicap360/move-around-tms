import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Suffix-aware, order-independent name key so "Pat Hendrick", "Hendrick, Pat"
// and "Patrick Hendrick III" collapse together for duplicate detection.
const SUFFIX = new Set(["ii", "iii", "iv", "v", "jr", "sr"]);
const nameKey = (s: string) =>
  (s || "").toLowerCase().replace(/[^a-z0-9 ,]+/g, "").replace(/,/g, " ")
    .split(/\s+/).filter(t => t && !SUFFIX.has(t)).sort().join(" ");

const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_drivers",
    description: "Search owner-operator drivers by name (or company). Returns up to 30 matches with their id, company, truck number, CDL/medical expirations.",
    input_schema: { type: "object", properties: { query: { type: "string", description: "Driver name, partial name, or company" } }, required: ["query"] },
  },
  {
    name: "find_duplicate_drivers",
    description: "Find likely-duplicate driver records (same person entered more than once), optionally filtered to a name. Groups matches so you can merge them. Use this before merging.",
    input_schema: { type: "object", properties: { name: { type: "string", description: "Optional driver name to check (e.g. 'Patrick Hendrick')" } } },
  },
  {
    name: "merge_drivers",
    description: "Merge two duplicate driver records into one. Keeps keep_id, moves any truck assignment to it, and removes remove_id. Only call after find_duplicate_drivers confirms they are the same person.",
    input_schema: { type: "object", properties: { keep_id: { type: "string" }, remove_id: { type: "string" } }, required: ["keep_id", "remove_id"] },
  },
  {
    name: "search_owner_operators",
    description: "Search owner-operator companies by name. Returns id, company_name, contact, driver/truck counts.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "get_stats",
    description: "High-level fleet numbers: total owner-operators, drivers, trucks, drivers missing a truck, expired CDLs, expired medical cards.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_money_snapshot",
    description: "Accounting summary across owner-operator jobs/loads: total loads, loads pending settlement, verified tickets, gross revenue, owed to owner-operators, and margin. Use for 'what's outstanding / pending settlement / revenue / margin' questions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_dispatch_snapshot",
    description: "Summary of the most recent daily dispatch import: total loads, number of carriers, and how many rows are missing a truck, missing a company, or not yet matched to an owner-operator. Use for 'how's today's dispatch' / 'what's outstanding on dispatch'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "search_dispatch",
    description: "Search the latest dispatch import by driver, carrier/company, or truck number. Returns matching loads with driver, truck, carrier, matched owner-operator, and status.",
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
];

async function runTool(name: string, input: any, orgId: string): Promise<any> {
  const sb = supabaseAdmin;
  // org-scoped OO id list (drivers/trucks are scoped through their parent OO)
  const { data: oos } = await sb.from("ronyx_owner_operators").select("id, company_name").eq("organization_id", orgId).limit(5000);
  const byId: Record<string, string> = {}; const ooIds: string[] = [];
  for (const o of oos || []) { byId[o.id] = o.company_name; ooIds.push(o.id); }

  if (name === "get_stats") {
    const { data: drivers } = await sb.from("ronyx_oo_drivers").select("cdl_expiration, med_card_expiration, truck_number, status").in("oo_id", ooIds).neq("status", "inactive").limit(10000);
    const { count: trucks } = await sb.from("ronyx_oo_trucks").select("id", { count: "exact", head: true }).in("oo_id", ooIds);
    const today = new Date().toISOString().slice(0, 10);
    const d = drivers || [];
    return {
      owner_operators: ooIds.length,
      drivers: d.length,
      trucks: trucks || 0,
      drivers_missing_truck: d.filter(x => !x.truck_number).length,
      expired_cdl: d.filter(x => x.cdl_expiration && x.cdl_expiration < today).length,
      expired_medical: d.filter(x => x.med_card_expiration && x.med_card_expiration < today).length,
    };
  }

  if (name === "search_owner_operators") {
    const q = (input.query || "").toLowerCase();
    const hits = (oos || []).filter(o => (o.company_name || "").toLowerCase().includes(q)).slice(0, 30);
    const out = [];
    for (const o of hits) {
      const { count: dc } = await sb.from("ronyx_oo_drivers").select("id", { count: "exact", head: true }).eq("oo_id", o.id).neq("status", "inactive");
      const { count: tc } = await sb.from("ronyx_oo_trucks").select("id", { count: "exact", head: true }).eq("oo_id", o.id);
      out.push({ id: o.id, company_name: o.company_name, drivers: dc || 0, trucks: tc || 0 });
    }
    return { owner_operators: out };
  }

  if (name === "search_drivers") {
    const q = (input.query || "").toLowerCase();
    const { data } = await sb.from("ronyx_oo_drivers")
      .select("id, oo_id, name, phone, truck_number, cdl_number, cdl_expiration, med_card_expiration, status")
      .in("oo_id", ooIds).neq("status", "inactive").limit(5000);
    const matches = (data || [])
      .filter(d => (d.name || "").toLowerCase().includes(q) || (byId[d.oo_id] || "").toLowerCase().includes(q))
      .slice(0, 30)
      .map(d => ({ id: d.id, name: d.name, company: byId[d.oo_id] || "—", truck_number: d.truck_number || null, cdl_expiration: d.cdl_expiration || null, med_card_expiration: d.med_card_expiration || null, phone: d.phone || null }));
    return { count: matches.length, drivers: matches };
  }

  if (name === "find_duplicate_drivers") {
    const { data } = await sb.from("ronyx_oo_drivers")
      .select("id, oo_id, name, truck_number, cdl_number, created_at, status")
      .in("oo_id", ooIds).neq("status", "inactive").limit(10000);
    const wantKey = input.name ? nameKey(input.name) : null;
    const groups: Record<string, any[]> = {};
    for (const d of data || []) {
      const k = `${d.oo_id}|${nameKey(d.name)}`;
      if (wantKey && nameKey(d.name) !== wantKey) continue;
      (groups[k] ||= []).push({ id: d.id, name: d.name, company: byId[d.oo_id] || "—", truck_number: d.truck_number || null, cdl_number: d.cdl_number || null, created_at: d.created_at });
    }
    const dups = Object.values(groups).filter(g => g.length > 1);
    return { duplicate_groups: dups, note: dups.length ? "Each group is the same person entered multiple times. Merge keeping the most complete record." : "No duplicates found for that query." };
  }

  if (name === "merge_drivers") {
    const { keep_id, remove_id } = input;
    if (!keep_id || !remove_id || keep_id === remove_id) return { error: "Need two different driver ids." };
    // Confirm both belong to this org
    const { data: rows } = await sb.from("ronyx_oo_drivers").select("id, oo_id, name, truck_number").in("id", [keep_id, remove_id]);
    const keep = (rows || []).find(r => r.id === keep_id);
    const remove = (rows || []).find(r => r.id === remove_id);
    if (!keep || !remove) return { error: "One of the drivers was not found." };
    if (!ooIds.includes(keep.oo_id) || !ooIds.includes(remove.oo_id)) return { error: "Driver is outside your organization." };
    // Repoint references
    await sb.from("ronyx_driver_truck_assignments").update({ driver_id: keep_id }).eq("driver_id", remove_id);
    await sb.from("ronyx_oo_trucks").update({ assigned_driver_id: keep_id }).eq("assigned_driver_id", remove_id);
    // Carry a truck number over if the keeper has none
    if (!keep.truck_number && remove.truck_number) {
      try { await sb.from("ronyx_oo_drivers").update({ truck_number: remove.truck_number }).eq("id", keep_id); } catch {}
    }
    const { error } = await sb.from("ronyx_oo_drivers").delete().eq("id", remove_id);
    if (error) return { error: error.message };
    return { ok: true, merged: `Kept ${keep.name} (${keep_id.slice(0, 8)}), removed duplicate ${remove.name} (${remove_id.slice(0, 8)}).` };
  }

  if (name === "get_money_snapshot") {
    const { data: jobs } = await sb.from("ronyx_oo_jobs")
      .select("settlement_status, ticket_status, gross_revenue, oo_rate, margin")
      .in("oo_id", ooIds).limit(50000);
    const j = jobs || [];
    const sum = (f: string) => j.reduce((s, x: any) => s + Number(x[f] || 0), 0);
    const money = (n: number) => "$" + Math.round(n).toLocaleString();
    return {
      total_loads: j.length,
      pending_settlement: j.filter((x: any) => /pending/i.test(x.settlement_status || "")).length,
      verified_tickets: j.filter((x: any) => /verified/i.test(x.ticket_status || "")).length,
      gross_revenue: money(sum("gross_revenue")),
      owed_to_owner_operators: money(sum("oo_rate")),
      margin: money(sum("margin")),
      note: j.length < 5 ? "Very little job/settlement data is loaded yet — these numbers will grow as loads and payouts are imported." : undefined,
    };
  }

  if (name === "get_dispatch_snapshot") {
    const { data: latest } = await sb.from("dispatch_import_rows").select("dispatch_import_id, created_at").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!latest) return { note: "No dispatch has been imported yet." };
    const { data: rows } = await sb.from("dispatch_import_rows")
      .select("company_name, missing_driver, missing_truck, missing_company, matched_owner_operator_id, row_status")
      .eq("dispatch_import_id", latest.dispatch_import_id).limit(5000);
    const r = rows || [];
    const carriers = new Set(r.map(x => x.company_name).filter(Boolean));
    return {
      import_date: (latest.created_at || "").slice(0, 10),
      total_loads: r.length,
      carriers: carriers.size,
      missing_truck: r.filter(x => x.missing_truck).length,
      missing_company: r.filter(x => x.missing_company).length,
      unmatched_to_owner_operator: r.filter(x => !x.matched_owner_operator_id).length,
      needs_attention: r.filter(x => x.missing_truck || x.missing_company || !x.matched_owner_operator_id).length,
    };
  }

  if (name === "search_dispatch") {
    const q = (input.query || "").toLowerCase();
    const { data: latest } = await sb.from("dispatch_import_rows").select("dispatch_import_id").eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!latest) return { note: "No dispatch imported yet." };
    const { data: rows } = await sb.from("dispatch_import_rows")
      .select("driver_name, truck_number, company_name, matched_company_name, row_status, start_time")
      .eq("dispatch_import_id", latest.dispatch_import_id).limit(5000);
    const hits = (rows || []).filter(x =>
      [x.driver_name, x.company_name, x.truck_number, x.matched_company_name].some(v => (v || "").toLowerCase().includes(q))
    ).slice(0, 30);
    return { count: hits.length, loads: hits };
  }

  return { error: `Unknown tool ${name}` };
}

function personaFor(staff: string): string {
  const first = (staff || "").trim().split(/\s+/)[0];
  const f = first.toLowerCase();
  // Per-person focus so the assistant is tuned to what each person actually does.
  let focus = "";
  if (f === "tabitha") {
    focus = `You are speaking with TABITHA, who runs ACCOUNTING (the "Money" section) at Ronyx — invoices, unpaid tickets, payroll, driver pay, owner-operator settlements, and receivables. Lead with her financial world: use get_money_snapshot for "how much is pending settlement / what's outstanding / revenue" questions. She also just set up the daily dispatch list, and dispatch feeds settlements & pay, so use get_dispatch_snapshot / search_dispatch when she connects loads to money. Help her reconcile, chase unpaid items, and keep the books tidy.`;
  } else if (f === "sylvia") {
    focus = `You are speaking with SYLVIA, who runs driver compliance and the owner-operator office. Lead with her world: drivers, CDL/medical, COIs, duplicates, and owner-operator records. Proactively catch data problems (duplicates, missing trucks/cards).`;
  } else {
    focus = `You are speaking with ${first || "an office staff member"} at Ronyx.`;
  }
  return `You are the Ronyx Office Assistant — a helpful in-app copilot for the office staff at Ronyx Logistics, running inside their MoveAround TMS workspace. ${focus}

You can both ANSWER questions about their data and TAKE ACTIONS using the tools provided. Be concise, friendly, and practical — these are busy people. Address them by first name when natural.

Guidelines:
- When asked to fix or change something, first INSPECT with a read tool, then act only when the target is unambiguous.
- For "X is duplicated, fix it": call find_duplicate_drivers with the name, confirm exactly one group of true duplicates, then merge_drivers keeping the most complete record. If 0 or many ambiguous matches, ask which to keep instead of guessing.
- Report what you did in plain language.
- Never invent data. If a tool returns nothing, say so.
- Keep answers short. You operate only within this organization's data.`;
}

export async function POST(req: Request) {
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ reply: "I couldn't resolve your organization — please sign in again." }, { status: 200 });
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ reply: "The assistant isn't configured yet (missing AI key)." });

  const body = await req.json().catch(() => ({}));
  const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body.messages) ? body.messages : [];
  const convo: Anthropic.MessageParam[] = history.slice(-12).map(m => ({ role: m.role, content: m.content }));
  const SYSTEM = personaFor(String(body.staff || ""));

  const steps: { tool: string; input: any }[] = [];
  try {
    for (let i = 0; i < 6; i++) {
      const resp = await anthropic.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1200,
        system: SYSTEM,
        tools: TOOLS,
        messages: convo,
      });
      if (resp.stop_reason === "tool_use") {
        convo.push({ role: "assistant", content: resp.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of resp.content) {
          if (block.type !== "tool_use") continue;
          const out = await runTool(block.name, block.input, orgId).catch(e => ({ error: String(e?.message || e) }));
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
    if (/credit balance|billing|quota|insufficient/i.test(msg))
      return NextResponse.json({ reply: "I'm out of AI credits right now — please top up the Anthropic account and I'll be back online.", steps });
    return NextResponse.json({ reply: `Sorry — I hit an error: ${msg}.`, steps });
  }
}
