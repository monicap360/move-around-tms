import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseAdmin;
  const today   = new Date().toISOString().slice(0, 10);
  const now     = new Date();

  const alerts: DispatchAlertResult[] = [];

  // ── 1. Driver compliance issues ──────────────────────────
  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, name, driver_profiles(full_name, medical_card_expiration, license_expiration_date, mvr_expiration, dispatch_eligible, phone)")
    .neq("status", "inactive");

  for (const d of drivers || []) {
    const p = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
    if (!p) continue;
    const name = p.full_name || d.name;

    if (p.dispatch_eligible === false) {
      alerts.push({ type: "driver_dispatch_blocked", severity: "blocked", message: `${name} is dispatch-ineligible (compliance block)`, driver_id: d.id });
    }
    if (p.medical_card_expiration && p.medical_card_expiration < today) {
      alerts.push({ type: "medical_card_expired", severity: "blocked", message: `${name} — medical card expired ${p.medical_card_expiration}`, driver_id: d.id });
    }
    if (p.license_expiration_date && p.license_expiration_date < today) {
      alerts.push({ type: "cdl_expired", severity: "blocked", message: `${name} — CDL expired ${p.license_expiration_date}`, driver_id: d.id });
    }
    if (!p.phone && !d.name.startsWith("Test")) {
      alerts.push({ type: "driver_no_phone", severity: "warning", message: `${name} has no phone number on file — cannot send trip via SMS`, driver_id: d.id });
    }
  }

  // ── 2. Vehicle / maintenance issues ──────────────────────
  const { data: units } = await supabase
    .from("maintenance_units")
    .select("id, unit_number, status, dispatch_eligible, annual_inspection_expiry, insurance_expiry, registration_expiry")
    .neq("status", "decommissioned");

  for (const u of units || []) {
    if (u.dispatch_eligible === false || u.status === "out_of_service") {
      alerts.push({ type: "vehicle_out_of_service", severity: "blocked", message: `Unit ${u.unit_number} is out of service — dispatch blocked`, vehicle_id: u.id });
    }
    if (u.annual_inspection_expiry && u.annual_inspection_expiry < today) {
      alerts.push({ type: "vehicle_inspection_expired", severity: "blocked", message: `Unit ${u.unit_number} — annual inspection expired ${u.annual_inspection_expiry}`, vehicle_id: u.id });
    }
    if (u.insurance_expiry && u.insurance_expiry < today) {
      alerts.push({ type: "vehicle_insurance_expired", severity: "blocked", message: `Unit ${u.unit_number} — insurance expired ${u.insurance_expiry}`, vehicle_id: u.id });
    }
    if (u.registration_expiry && u.registration_expiry < today) {
      alerts.push({ type: "vehicle_registration_expired", severity: "high", message: `Unit ${u.unit_number} — registration expired ${u.registration_expiry}`, vehicle_id: u.id });
    }
  }

  // ── 3. Job / trip issues ─────────────────────────────────
  const { data: jobs } = await supabase
    .from("dispatch_jobs")
    .select("id, job_number, customer_name, customer_phone, pickup_address, pickup_time, payment_status, risk_level, job_status, assigned_driver_id, special_instructions, special_instructions_ack")
    .not("job_status", "in", '("completed","billing_review","cancelled")');

  for (const j of jobs || []) {
    const label = `Job #${j.job_number || j.id.slice(0, 6)} (${j.customer_name || "Unknown"})`;

    if (!j.pickup_address) {
      alerts.push({ type: "job_missing_pickup", severity: "blocked", message: `${label} — missing pickup address`, job_id: j.id });
    }
    if (!j.customer_phone) {
      alerts.push({ type: "job_missing_phone", severity: "warning", message: `${label} — missing customer phone`, job_id: j.id });
    }
    if (j.payment_status === "unpaid" && ["high","critical"].includes(j.risk_level)) {
      alerts.push({ type: "job_unpaid_high_risk", severity: "high", message: `${label} — unpaid high-risk trip (manager approval required)`, job_id: j.id });
    }
    if (j.payment_status === "unpaid" && j.job_status === "ready_to_dispatch") {
      alerts.push({ type: "job_unpaid_ready", severity: "warning", message: `${label} — ready to dispatch but payment not confirmed`, job_id: j.id });
    }
    if (!j.assigned_driver_id && j.job_status === "ready_to_dispatch") {
      alerts.push({ type: "job_no_driver", severity: "high", message: `${label} — no driver assigned`, job_id: j.id });
    }
    if (j.special_instructions && !j.special_instructions_ack) {
      alerts.push({ type: "job_special_not_acked", severity: "warning", message: `${label} — special instructions not acknowledged by driver`, job_id: j.id });
    }
    if (j.pickup_time && new Date(j.pickup_time) < now && !["completed","billing_review","cancelled"].includes(j.job_status)) {
      const minLate = Math.round((now.getTime() - new Date(j.pickup_time).getTime()) / 60000);
      alerts.push({ type: "job_past_pickup", severity: minLate > 30 ? "critical" : "high", message: `${label} — pickup time passed (${minLate}m ago)`, job_id: j.id });
    }
  }

  // Sort: blocked first, then critical, high, warning
  const order = { blocked: 0, critical: 1, high: 2, warning: 3 };
  alerts.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  return NextResponse.json({ alerts, total: alerts.length, blocked: alerts.filter(a => a.severity === "blocked").length });
}

type DispatchAlertResult = {
  type: string;
  severity: "warning" | "high" | "critical" | "blocked";
  message: string;
  job_id?: string;
  driver_id?: string;
  vehicle_id?: string;
};
