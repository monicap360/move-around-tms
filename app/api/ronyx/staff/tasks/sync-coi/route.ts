import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const COI_TYPES = [
  { value:"auto_liability_coi",                     label:"Auto Liability COI",                     group:"standard" },
  { value:"general_liability_coi",                  label:"General Liability COI",                  group:"standard" },
  { value:"cargo_coi",                              label:"Cargo / Motor Truck Cargo COI",           group:"standard" },
  { value:"ronyx_contractor_auto_liability_coi",    label:"Ronyx Contractor Auto Liability COI",    group:"ronyx" },
  { value:"ronyx_contractor_general_liability_coi", label:"Ronyx Contractor General Liability COI", group:"ronyx" },
  { value:"ronyx_contractor_cargo_coi",             label:"Ronyx Contractor Cargo COI",             group:"ronyx" },
  { value:"ma_morrison_auto_liability_coi",         label:"MA Morrison Auto Liability COI",         group:"ma_morrison" },
  { value:"ma_morrison_general_liability_coi",      label:"MA Morrison General Liability COI",      group:"ma_morrison" },
  { value:"ma_morrison_cargo_coi",                  label:"MA Morrison Cargo COI",                  group:"ma_morrison" },
];

function dayOffset(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}

/* POST /api/ronyx/staff/tasks/sync-coi
   Scans all OO companies and syncs staff tasks to reflect current COI status.
   - Creates tasks for any missing/expired/expiring/needs_review COIs.
   - Closes tasks where the underlying COI is now complete.
   - Returns counts of created/closed/skipped tasks.
*/
export async function POST() {
  const sb = supabaseAdmin;

  // Fetch all OOs with their COI documents
  const { data: oos, error: ooErr } = await sb
    .from("ronyx_owner_operators")
    .select("id, company_name")
    .order("company_name");

  if (ooErr) return NextResponse.json({ error: ooErr.message }, { status: 500 });

  const ooIds = (oos || []).map(o => o.id);
  if (ooIds.length === 0) return NextResponse.json({ created:0, closed:0, skipped:0 });

  const { data: allDocs } = await sb
    .from("ronyx_oo_coi_documents")
    .select("*")
    .in("oo_id", ooIds);

  const docMap = new Map<string, any[]>(); // oo_id → docs
  for (const doc of allDocs || []) {
    if (!docMap.has(doc.oo_id)) docMap.set(doc.oo_id, []);
    docMap.get(doc.oo_id)!.push(doc);
  }

  // Fetch all open tasks once to avoid repeated DB calls
  const { data: openTasks } = await sb
    .from("ronyx_staff_tasks")
    .select("id, owner_operator_id, document_type, task_type, status")
    .in("owner_operator_id", ooIds)
    .eq("status", "open");

  const openTaskSet = new Set<string>(); // "oo_id:doc_type:task_type"
  const openTaskIds = new Map<string, string>(); // key → id
  for (const t of openTasks || []) {
    const key = `${t.owner_operator_id}:${t.document_type}:${t.task_type}`;
    openTaskSet.add(key);
    openTaskIds.set(key, t.id);
  }

  const toInsert: any[] = [];
  const toClose:  string[] = []; // task IDs to mark completed
  let skipped = 0;

  for (const oo of oos || []) {
    const docs = docMap.get(oo.id) || [];

    for (const cType of COI_TYPES) {
      const doc = docs.find(d => d.document_type === cType.value);
      const status: string = doc?.status || "missing";
      const days = doc?.expiration_date
        ? Math.ceil((new Date(doc.expiration_date).getTime() - Date.now()) / 86400000)
        : null;

      let taskType: string | null = null;
      let title     = "";
      let priority  = "high";
      let dueDate: string | null = null;

      switch (status) {
        case "complete":
          // Close any open tasks for this doc
          for (const tType of ["coi_missing","coi_expired","coi_expiring_7d","coi_expiring_30d","coi_needs_review","coi_rejected"]) {
            const key = `${oo.id}:${cType.value}:${tType}`;
            if (openTaskIds.has(key)) toClose.push(openTaskIds.get(key)!);
          }
          continue;

        case "missing":
          taskType = "coi_missing";
          title    = `Missing ${cType.label} — ${oo.company_name}`;
          priority = cType.group === "standard" ? "critical" : "high";
          dueDate  = dayOffset(0);
          break;

        case "expired":
          taskType = "coi_expired";
          title    = `EXPIRED: ${cType.label} — ${oo.company_name}`;
          priority = cType.group === "standard" ? "critical" : "high";
          dueDate  = dayOffset(-1);
          break;

        case "rejected":
          taskType = "coi_rejected";
          title    = `Rejected COI: ${cType.label} — ${oo.company_name}`;
          priority = "high";
          dueDate  = dayOffset(0);
          break;

        case "expiring_soon":
          taskType = days !== null && days <= 7 ? "coi_expiring_7d" : "coi_expiring_30d";
          title    = `${cType.label} expiring in ${days}d — ${oo.company_name}`;
          priority = days !== null && days <= 7 ? "critical" : "high";
          dueDate  = dayOffset(days !== null && days <= 7 ? 0 : 7);
          break;

        case "needs_review":
          taskType = "coi_needs_review";
          title    = `Review uploaded ${cType.label} — ${oo.company_name}`;
          priority = "normal";
          dueDate  = dayOffset(1);
          break;

        default:
          skipped++;
          continue;
      }

      if (!taskType) { skipped++; continue; }

      const dedupeKey = `${oo.id}:${cType.value}:${taskType}`;
      if (openTaskSet.has(dedupeKey)) { skipped++; continue; }

      toInsert.push({
        task_type:           taskType,
        title,
        priority,
        status:              "open",
        assigned_to_name:    "Sylvia",
        owner_operator_id:   oo.id,
        owner_operator_name: oo.company_name,
        document_type:       cType.value,
        coi_document_id:     doc?.id || null,
        due_date:            dueDate,
        description:         `Auto-created from COI sync. OO: ${oo.company_name}. COI type: ${cType.label}. Status: ${status}.`,
      });
    }
  }

  // Batch insert new tasks (ignore unique conflicts from concurrent sync calls)
  let created = 0;
  if (toInsert.length > 0) {
    const { data: inserted, error: insErr } = await sb
      .from("ronyx_staff_tasks")
      .insert(toInsert)
      .select("id");
    if (!insErr) created = (inserted || []).length;
  }

  // Batch close resolved tasks
  let closed = 0;
  if (toClose.length > 0) {
    const { error: closeErr } = await sb
      .from("ronyx_staff_tasks")
      .update({ status: "completed", completed_at: new Date().toISOString(), completion_notes: "COI resolved — auto-closed by sync" })
      .in("id", toClose);
    if (!closeErr) closed = toClose.length;
  }

  return NextResponse.json({ created, closed, skipped, total_oos: (oos||[]).length });
}
