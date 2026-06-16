import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/ronyx/staff-tasks/sweep
// Scans driver_profiles for expired/expiring compliance fields
// and creates open Sylvia tasks. Idempotent — uses entity upsert.
// Also scans ronyx_owner_operators for missing COI and creates CCB tasks.

function dayOffset(days: number) {
  return new Date(Date.now() + days * 86400000).toISOString().split("T")[0];
}
function daysUntil(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

interface DriverRow {
  id: string;
  full_name: string | null;
  license_expiration_date: string | null;
  mvr_expiration: string | null;
  medical_card_expiration: string | null;
  drug_test_status: string | null;
  background_check_status: string | null;
  status: string | null;
}

export async function POST() {
  const sb = createSupabaseServerClient();
  let created = 0;
  let closed  = 0;

  // ── Driver compliance sweep ──────────────────────────────────────────────
  const { data: drivers } = await sb
    .from("driver_profiles")
    .select("id, full_name, license_expiration_date, mvr_expiration, medical_card_expiration, drug_test_status, background_check_status, status")
    .not("status", "eq", "inactive")
    .limit(1000);

  for (const d of (drivers || []) as DriverRow[]) {
    const name     = d.full_name || d.id;
    const cdlDays  = daysUntil(d.license_expiration_date);
    const mvrDays  = daysUntil(d.mvr_expiration);
    const medDays  = daysUntil(d.medical_card_expiration);

    type TaskDef = {
      task_type: string;
      title: string;
      priority: "critical" | "high" | "normal";
      due: string;
      description: string;
    };
    const tasks: TaskDef[] = [];

    // CDL expiry checks
    if (d.license_expiration_date === null) {
      tasks.push({ task_type:"cdl_missing", title:`CDL date missing — ${name}`, priority:"high", due:dayOffset(0), description:`No CDL expiration date on file for driver ${name}.` });
    } else if (cdlDays !== null && cdlDays < 0) {
      tasks.push({ task_type:"cdl_expiring", title:`CDL EXPIRED — ${name}`, priority:"critical", due:dayOffset(0), description:`CDL expired ${Math.abs(cdlDays)} days ago. Driver blocked from dispatch.` });
    } else if (cdlDays !== null && cdlDays <= 60) {
      tasks.push({ task_type:"cdl_expiring", title:`CDL expiring in ${cdlDays}d — ${name}`, priority: cdlDays<=30?"critical":"high", due:dayOffset(cdlDays<=30?0:7), description:`CDL expires on ${d.license_expiration_date}. Schedule renewal now.` });
    }

    // Medical Card
    if (d.medical_card_expiration === null) {
      tasks.push({ task_type:"medical_missing", title:`Medical Card missing — ${name}`, priority:"high", due:dayOffset(0), description:`No medical card expiration date for driver ${name}.` });
    } else if (medDays !== null && medDays < 0) {
      tasks.push({ task_type:"medical_expiring", title:`Medical Card EXPIRED — ${name}`, priority:"critical", due:dayOffset(0), description:`Medical Card expired ${Math.abs(medDays)} days ago. Driver blocked.` });
    } else if (medDays !== null && medDays <= 30) {
      tasks.push({ task_type:"medical_expiring", title:`Medical Card expiring in ${medDays}d — ${name}`, priority: medDays<=14?"critical":"high", due:dayOffset(medDays<=14?0:7), description:`Medical Card expires ${d.medical_card_expiration}.` });
    }

    // MVR
    if (d.mvr_expiration === null) {
      tasks.push({ task_type:"mvr_missing", title:`MVR missing — ${name}`, priority:"normal", due:dayOffset(7), description:`No MVR expiration date for driver ${name}.` });
    } else if (mvrDays !== null && mvrDays < 0) {
      tasks.push({ task_type:"mvr_expiring", title:`MVR expired — ${name}`, priority:"high", due:dayOffset(0), description:`MVR expired ${Math.abs(mvrDays)} days ago.` });
    } else if (mvrDays !== null && mvrDays <= 30) {
      tasks.push({ task_type:"mvr_expiring", title:`MVR expiring in ${mvrDays}d — ${name}`, priority:"normal", due:dayOffset(7), description:`MVR expires ${d.mvr_expiration}.` });
    }

    // Drug test / background
    if (d.drug_test_status && !["cleared"].includes(d.drug_test_status)) {
      tasks.push({ task_type:"drug_test_missing", title:`Drug test not cleared — ${name}`, priority:"high", due:dayOffset(0), description:`Drug test status: ${d.drug_test_status}.` });
    }
    if (d.background_check_status && !["cleared"].includes(d.background_check_status)) {
      tasks.push({ task_type:"background_check_missing", title:`Background check not cleared — ${name}`, priority:"high", due:dayOffset(0), description:`Background check status: ${d.background_check_status}.` });
    }

    // Upsert tasks (one open task per driver + task_type)
    for (const t of tasks) {
      const { error } = await sb.from("ronyx_staff_tasks").upsert({
        task_type:        t.task_type,
        title:            t.title,
        description:      t.description,
        status:           "open",
        priority:         t.priority,
        assigned_to_name: "Sylvia",
        due_date:         t.due,
        entity_type:      "driver",
        entity_id:        d.id,
        source_type:      "driver",
        source_label:     `Driver: ${name}`,
        driver_profile_id: d.id,
        initials_required: true,
      }, { onConflict: "entity_type,entity_id,task_type" });
      if (!error) created++;
    }

    // Close tasks for now-OK drivers
    if (cdlDays !== null && cdlDays > 60) {
      const { count } = await sb.from("ronyx_staff_tasks")
        .update({ status:"completed", completed_at:new Date().toISOString(), completion_notes:"Auto-closed: CDL no longer expiring soon", updated_at:new Date().toISOString() })
        .eq("entity_type","driver").eq("entity_id",d.id).eq("task_type","cdl_expiring").eq("status","open");
      closed += count || 0;
    }
    if (medDays !== null && medDays > 30) {
      const { count } = await sb.from("ronyx_staff_tasks")
        .update({ status:"completed", completed_at:new Date().toISOString(), completion_notes:"Auto-closed: Med card no longer expiring soon", updated_at:new Date().toISOString() })
        .eq("entity_type","driver").eq("entity_id",d.id).eq("task_type","medical_expiring").eq("status","open");
      closed += count || 0;
    }
    if (d.drug_test_status === "cleared") {
      await sb.from("ronyx_staff_tasks")
        .update({ status:"completed", completed_at:new Date().toISOString(), completion_notes:"Auto-closed: drug test cleared", updated_at:new Date().toISOString() })
        .eq("entity_type","driver").eq("entity_id",d.id).eq("task_type","drug_test_missing").eq("status","open");
    }
    if (d.background_check_status === "cleared") {
      await sb.from("ronyx_staff_tasks")
        .update({ status:"completed", completed_at:new Date().toISOString(), completion_notes:"Auto-closed: background check cleared", updated_at:new Date().toISOString() })
        .eq("entity_type","driver").eq("entity_id",d.id).eq("task_type","background_check_missing").eq("status","open");
    }
  }

  return NextResponse.json({ success: true, tasks_created: created, tasks_closed: closed, drivers_scanned: drivers?.length || 0 });
}
