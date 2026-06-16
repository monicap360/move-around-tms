import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* GET /api/ronyx/staff/tasks
   ?assigned_to_name=Sylvia
   &status=open
   &priority=critical
   &owner_operator_id=uuid
   &task_type=coi_missing
   &limit=100
*/
export async function GET(req: Request) {
  const sb = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);

  let q = sb.from("ronyx_staff_tasks").select("*")
    .order("priority", { ascending: false })
    .order("due_date",  { ascending: true,  nullsFirst: false })
    .order("created_at",{ ascending: false })
    .limit(parseInt(searchParams.get("limit") || "200"));

  const p = (k: string) => searchParams.get(k);
  if (p("assigned_to_name"))    q = q.eq("assigned_to_name",  p("assigned_to_name")!);
  if (p("status"))              q = q.eq("status",             p("status")!);
  if (p("priority"))            q = q.eq("priority",           p("priority")!);
  if (p("owner_operator_id"))   q = q.eq("owner_operator_id",  p("owner_operator_id")!);
  if (p("task_type"))           q = q.eq("task_type",          p("task_type")!);
  if (p("exclude_status"))      q = q.neq("status",            p("exclude_status")!);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Compute derived fields
  const now = Date.now();
  const tasks = (data || []).map(t => ({
    ...t,
    is_overdue: t.status === "open" && t.due_date && new Date(t.due_date).getTime() < now,
    days_until_due: t.due_date ? Math.ceil((new Date(t.due_date).getTime() - now) / 86400000) : null,
  }));

  return NextResponse.json({ tasks });
}

/* POST /api/ronyx/staff/tasks
   Create or find existing open task (idempotent by oo_id+document_type+task_type).
*/
export async function POST(req: Request) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  if (!body.task_type || !body.title) {
    return NextResponse.json({ error: "task_type and title required" }, { status: 400 });
  }

  // De-duplicate: look for an existing open task
  if (body.owner_operator_id && body.document_type) {
    const { data: existing } = await sb
      .from("ronyx_staff_tasks")
      .select("id, priority, due_date")
      .eq("owner_operator_id", body.owner_operator_id)
      .eq("document_type",     body.document_type)
      .eq("task_type",         body.task_type)
      .eq("status",            "open")
      .maybeSingle();

    if (existing) {
      // Upgrade priority if needed
      const rank: Record<string,number> = { critical:4, high:3, normal:2, low:1 };
      const newRank = rank[body.priority || "high"] || 3;
      const oldRank = rank[existing.priority] || 3;
      if (newRank > oldRank) {
        await sb.from("ronyx_staff_tasks").update({ priority: body.priority, updated_at: new Date().toISOString() }).eq("id", existing.id);
      }
      return NextResponse.json({ task: existing, existed: true });
    }
  }

  const { data, error } = await sb
    .from("ronyx_staff_tasks")
    .insert({
      task_type:           body.task_type,
      title:               body.title,
      description:         body.description        || null,
      status:              body.status              || "open",
      priority:            body.priority            || "high",
      assigned_to_name:    body.assigned_to_name    || "Sylvia",
      owner_operator_id:   body.owner_operator_id   || null,
      owner_operator_name: body.owner_operator_name || null,
      document_type:       body.document_type       || null,
      coi_document_id:     body.coi_document_id     || null,
      due_date:            body.due_date             || null,
      notes:               body.notes               || null,
    })
    .select("*")
    .single();

  if (error) {
    // Unique constraint violation — task already exists (race condition)
    if (error.code === "23505") return NextResponse.json({ task: null, existed: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ task: data, existed: false }, { status: 201 });
}
