import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// ── Assignee routing ────────────────────────────────────────────────────────
// Insurance / COI → CCB
// CDL / medical / compliance docs → Sylvia
// Everything else → Team

const CCB_PATTERNS = [
  /insur/i, /coi/i, /coverage/i, /liabilit/i, /cargo.*cert/i, /certificate/i,
  /policy/i, /bond/i,
];
const SYLVIA_PATTERNS = [
  /cdl/i, /driver.*licen/i, /medical.*card/i, /med.*card/i, /mvr/i,
  /drug.*test/i, /background/i, /dot/i, /hazmat/i, /endorsement/i,
  /driver.*doc/i, /missing.*doc/i, /upload.*doc/i,
];

function routeTaskAssignee(taskType: string, title: string): string {
  const text = `${taskType} ${title}`;
  if (CCB_PATTERNS.some((p) => p.test(text))) return "CCB";
  if (SYLVIA_PATTERNS.some((p) => p.test(text))) return "Sylvia";
  return "Team";
}

// GET /api/ronyx/staff-tasks
// ?assignee=CCB|Sylvia|Team|All  &status=open|completed|all  &limit=100
export async function GET(req: Request) {
  const sb = supabaseAdmin;
  const { searchParams } = new URL(req.url);
  const assignee = searchParams.get("assignee") || "All";
  const status   = searchParams.get("status")   || "open";
  const limit    = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

  let q = sb
    .from("ronyx_staff_tasks")
    .select(`
      id, task_type, title, description, status, priority,
      assigned_to_name, due_date,
      completed_at, completed_by, completion_notes,
      owner_operator_id, owner_operator_name, document_type,
      entity_type, entity_id,
      source_type, source_label, dispatch_import_id, driver_profile_id,
      initials_required,
      created_at, updated_at
    `)
    .order("priority", { ascending: true })   // critical first
    .order("created_at", { ascending: false })
    .limit(limit);

  if (assignee !== "All") q = q.eq("assigned_to_name", assignee);
  if (status === "open")      q = q.in("status", ["open", "in_progress"]);
  else if (status === "done") q = q.in("status", ["completed", "cancelled"]);
  // else "all" — no status filter

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count summary by assignee for badge display
  const { data: counts } = await sb
    .from("ronyx_staff_tasks")
    .select("assigned_to_name")
    .in("status", ["open", "in_progress"]);

  const tally: Record<string, number> = { CCB: 0, Sylvia: 0, Team: 0 };
  for (const r of counts || []) {
    const name = r.assigned_to_name || "Team";
    tally[name] = (tally[name] || 0) + 1;
  }

  return NextResponse.json({ tasks: data || [], counts: tally });
}

// POST /api/ronyx/staff-tasks
// Create a task (or upsert if entity_type + entity_id + task_type match an open task)
export async function POST(req: Request) {
  const sb = supabaseAdmin;
  const body = await req.json();

  const assignee = body.assigned_to_name || routeTaskAssignee(body.task_type || "", body.title || "");

  const row = {
    task_type:           body.task_type,
    title:               body.title,
    description:         body.description     || null,
    status:              body.status          || "open",
    priority:            body.priority        || "high",
    assigned_to_name:    assignee,
    due_date:            body.due_date        || null,
    owner_operator_id:   body.owner_operator_id   || null,
    owner_operator_name: body.owner_operator_name || null,
    document_type:       body.document_type   || null,
    coi_document_id:     body.coi_document_id || null,
    entity_type:         body.entity_type     || null,
    entity_id:           body.entity_id       || null,
    source_type:         body.source_type     || "manual",
    source_label:        body.source_label    || null,
    dispatch_import_id:  body.dispatch_import_id  || null,
    driver_profile_id:   body.driver_profile_id   || null,
    notes:               body.notes           || null,
    initials_required:   body.initials_required !== false,
  };

  // Upsert if entity fields are present
  if (row.entity_type && row.entity_id) {
    const { data, error } = await sb
      .from("ronyx_staff_tasks")
      .upsert(row, {
        onConflict: "entity_type,entity_id,task_type",
        ignoreDuplicates: false,
      })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ task: data, assignee });
  }

  const { data, error } = await sb
    .from("ronyx_staff_tasks")
    .insert(row)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data, assignee });
}
