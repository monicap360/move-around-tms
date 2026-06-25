import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireOrgRole } from "@/lib/auth/requireOrgRole";

export const dynamic = "force-dynamic";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Org is resolved per-request from the authenticated user via requireOrgRole
// (auth.organization.id) — never a global env var. See multi-tenant isolation.

// Role constants
const READ_ROLES  = ["owner", "super_admin", "admin", "payroll", "billing", "viewer"];
const WRITE_ROLES = ["owner", "super_admin", "admin", "payroll"];
const LOCK_ROLES  = ["owner", "super_admin", "admin", "payroll"];

type ValidationResult = {
  check_name: string;
  passed: boolean;
  detail: string;
  severity: "error" | "warning" | "info";
};

type CalcResult = {
  gross_pay: number;
  deductions: number;
  reimbursements: number;
  advances: number;
  fuel_deduction: number;
  net_pay: number;
  ticket_count: number;
  missing_tickets: number;
  disputed_tickets: number;
  fast_scan_matched: number;
  validations: ValidationResult[];
  payroll_status: string;
  hold_reason: string | null;
  validation_errors: string[];
};

async function runValidations(sb: ReturnType<typeof adminClient>, params: {
  driver_id: string;
  tickets: any[];
  rate_rule: any;
  deductions_total: number;
  gross_pay: number;
  period_start: string;
  period_end: string;
}): Promise<ValidationResult[]> {
  const { driver_id, tickets, rate_rule, deductions_total, gross_pay, period_start, period_end } = params;
  const results: ValidationResult[] = [];

  // 1. Has at least 1 approved ticket
  const approvedTickets = tickets.filter(t =>
    ["approved", "matched", "sent_to_payroll", "paid"].includes(t.status || "")
  );
  results.push({
    check_name: "has_approved_tickets",
    passed: approvedTickets.length > 0,
    detail: approvedTickets.length > 0
      ? `${approvedTickets.length} approved ticket(s) found`
      : "No approved tickets found for this pay period",
    severity: "error",
  });

  // 2. All tickets have a truck assigned
  const noTruck = tickets.filter(t => !t.truck_number && !t.unit_number);
  results.push({
    check_name: "tickets_have_truck",
    passed: noTruck.length === 0,
    detail: noTruck.length === 0
      ? "All tickets have a truck assigned"
      : `${noTruck.length} ticket(s) missing truck assignment`,
    severity: "error",
  });

  // 3. All tickets have a driver assigned
  const noDriver = tickets.filter(t => !t.driver_name && !t.driver_id);
  results.push({
    check_name: "tickets_have_driver",
    passed: noDriver.length === 0,
    detail: noDriver.length === 0
      ? "All tickets have a driver assigned"
      : `${noDriver.length} ticket(s) missing driver assignment`,
    severity: "error",
  });

  // 4. Rate rule exists for driver
  results.push({
    check_name: "rate_rule_exists",
    passed: !!rate_rule,
    detail: rate_rule
      ? `Rate: ${rate_rule.pay_type} @ $${rate_rule.pay_rate}`
      : "No pay rate rule found for this driver — cannot calculate pay",
    severity: "error",
  });

  // 5. No disputed tickets
  const disputed = tickets.filter(t => t.status === "disputed" || (t.notes || "").toLowerCase().includes("dispute"));
  results.push({
    check_name: "no_disputed_tickets",
    passed: disputed.length === 0,
    detail: disputed.length === 0
      ? "No disputed tickets"
      : `${disputed.length} ticket(s) in dispute`,
    severity: "error",
  });

  // 6. Missing tickets (Fast Scan match)
  const { data: fastScans } = await sb
    .from("fast_scan_documents")
    .select("ticket_number, scan_status")
    .eq("driver_name", params.driver_id)
    .gte("created_at", period_start)
    .lte("created_at", period_end + "T23:59:59")
    .neq("scan_status", "voided");

  const scannedNums = new Set((fastScans || []).map((s: any) => s.ticket_number).filter(Boolean));
  const ticketNums = new Set(tickets.map(t => t.ticket_number).filter(Boolean));
  const missing = [...scannedNums].filter(n => !ticketNums.has(n));
  results.push({
    check_name: "fast_scan_tickets_matched",
    passed: missing.length === 0,
    detail: missing.length === 0
      ? "All Fast Scan tickets matched to payroll records"
      : `${missing.length} Fast Scan ticket(s) not matched: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`,
    severity: "warning",
  });

  // 7. Deductions don't exceed gross pay
  results.push({
    check_name: "deductions_within_gross",
    passed: deductions_total <= gross_pay,
    detail: deductions_total <= gross_pay
      ? `Deductions ($${deductions_total.toFixed(2)}) within gross pay ($${gross_pay.toFixed(2)})`
      : `Deductions ($${deductions_total.toFixed(2)}) EXCEED gross pay ($${gross_pay.toFixed(2)})`,
    severity: "error",
  });

  // 8. Driver is not on payroll hold
  const { data: driver } = await sb
    .from("drivers")
    .select("payroll_eligible, payroll_hold_reason, dispatch_eligible")
    .eq("id", driver_id)
    .maybeSingle();

  const onHold = driver?.payroll_eligible === false;
  results.push({
    check_name: "driver_not_on_hold",
    passed: !onHold,
    detail: onHold
      ? `Driver is on payroll hold: ${driver?.payroll_hold_reason || "No reason given"}`
      : "Driver payroll is active",
    severity: "error",
  });

  // 9. Driver dispatch status (warning only)
  const dispatchBlocked = driver?.dispatch_eligible === false;
  results.push({
    check_name: "driver_dispatch_eligible",
    passed: !dispatchBlocked,
    detail: dispatchBlocked
      ? "Driver is currently blocked from dispatch — verify ticket dates"
      : "Driver is dispatch eligible",
    severity: "warning",
  });

  // 10. Pay period not locked
  const { data: period } = await sb
    .from("ronyx_payroll_periods")
    .select("status, id")
    .eq("period_start", period_start)
    .eq("period_end", period_end)
    .maybeSingle();

  const periodLocked = period?.status === "locked";
  results.push({
    check_name: "period_not_locked",
    passed: !periodLocked,
    detail: periodLocked
      ? "This pay period is locked — corrections require an unlock"
      : "Pay period is open for changes",
    severity: "error",
  });

  // 11. Rate rule is active and in effect
  const rateActive = rate_rule?.is_active !== false;
  const rateExpired = rate_rule?.effective_to && new Date(rate_rule.effective_to) < new Date(period_end);
  results.push({
    check_name: "rate_rule_active",
    passed: rateActive && !rateExpired,
    detail: !rate_rule
      ? "No rate rule to check"
      : !rateActive
      ? "Rate rule is inactive"
      : rateExpired
      ? `Rate rule expired on ${rate_rule.effective_to}`
      : "Rate rule is active and in effect",
    severity: "warning",
  });

  return results;
}

function deriveStatus(validations: ValidationResult[], gross_pay: number): { status: string; hold_reason: string | null } {
  const errors = validations.filter(v => !v.passed && v.severity === "error");
  const warnings = validations.filter(v => !v.passed && v.severity === "warning");

  if (errors.find(e => e.check_name === "period_not_locked")) {
    return { status: "locked", hold_reason: "Pay period is locked" };
  }
  if (errors.find(e => e.check_name === "driver_not_on_hold")) {
    return { status: "payroll_hold", hold_reason: "Driver on payroll hold" };
  }
  if (errors.find(e => e.check_name === "has_approved_tickets")) {
    return { status: "waiting_for_ticket", hold_reason: null };
  }
  if (errors.find(e => e.check_name === "rate_rule_exists")) {
    return { status: "needs_review", hold_reason: "No rate rule configured" };
  }
  if (errors.find(e => e.check_name === "deductions_within_gross")) {
    return { status: "needs_review", hold_reason: "Deductions exceed gross pay" };
  }
  if (errors.length > 0) {
    return { status: "needs_review", hold_reason: errors.map(e => e.detail).join("; ") };
  }
  if (warnings.find(w => w.check_name === "no_disputed_tickets")) {
    return { status: "needs_review", hold_reason: "Disputed tickets require resolution" };
  }
  if (gross_pay <= 0) {
    return { status: "needs_review", hold_reason: "Calculated pay is $0.00" };
  }
  if (warnings.length > 0) {
    return { status: "calculated", hold_reason: null };
  }
  return { status: "ready_to_pay", hold_reason: null };
}

async function calculateDriverPay(sb: ReturnType<typeof adminClient>, params: {
  driver_id: string;
  period_start: string;
  period_end: string;
}): Promise<CalcResult> {
  const { driver_id, period_start, period_end } = params;

  // Fetch approved tickets for driver in period
  const { data: tickets = [] } = await sb
    .from("ronyx_tickets")
    .select("*")
    .eq("driver_id", driver_id)
    .gte("ticket_date", period_start)
    .lte("ticket_date", period_end)
    .not("status", "eq", "voided")
    .order("ticket_date", { ascending: true });

  // Fetch rate rule (most specific: per driver → per org)
  const { data: rateRules } = await sb
    .from("ronyx_rate_rules")
    .select("*")
    .eq("driver_id", driver_id)
    .eq("is_active", true)
    .order("effective_from", { ascending: false })
    .limit(1);

  // Fallback: payroll_rules table from migration 092
  let rate_rule = rateRules?.[0] ?? null;
  if (!rate_rule) {
    const { data: legacyRules } = await sb
      .from("ronyx_payroll_rules")
      .select("*")
      .eq("driver_id", driver_id)
      .limit(1);
    if (legacyRules?.[0]) {
      rate_rule = {
        pay_type: legacyRules[0].pay_type || "per_ton",
        pay_rate: legacyRules[0].pay_rate || 0,
        is_active: true,
        effective_to: null,
      };
    }
  }

  // Calculate gross pay
  let gross_pay = 0;
  const approved = (tickets || []).filter((t: any) =>
    ["approved", "matched", "sent_to_payroll", "paid"].includes(t.status || "")
  );

  if (rate_rule) {
    const pay_type = rate_rule.pay_type;
    const rate = Number(rate_rule.pay_rate || 0);

    if (pay_type === "per_ton") {
      gross_pay = approved.reduce((sum: number, t: any) => sum + (Number(t.quantity || 0) * rate), 0);
    } else if (pay_type === "per_load") {
      gross_pay = approved.length * rate;
    } else if (pay_type === "per_hour" || pay_type === "hourly") {
      gross_pay = approved.reduce((sum: number, t: any) => sum + (Number(t.quantity || 0) * rate), 0);
    } else if (pay_type === "percent_of_revenue") {
      const revenue = approved.reduce((sum: number, t: any) => sum + Number(t.total_amount || 0), 0);
      gross_pay = revenue * (rate / 100);
    } else if (pay_type === "flat_rate" || pay_type === "daily_rate") {
      gross_pay = rate;
    }
    // Apply minimum
    if (rate_rule.minimum_pay && gross_pay < Number(rate_rule.minimum_pay)) {
      gross_pay = Number(rate_rule.minimum_pay);
    }
  }

  // Fuel surcharge from tickets
  const fuel_deduction = approved.reduce((sum: number, t: any) =>
    sum + Number(t.fuel_surcharge_amount || 0), 0);

  // Fetch active deductions for driver
  const { data: deductionRows } = await sb
    .from("ronyx_driver_deductions")
    .select("amount, description")
    .eq("driver_id", driver_id)
    .eq("is_active", true);

  const deductions_total = (deductionRows || []).reduce((sum: number, d: any) =>
    sum + Number(d.amount || 0), 0) + fuel_deduction;

  const net_pay = Math.max(0, gross_pay - deductions_total);
  const disputed_count = (tickets || []).filter((t: any) =>
    t.status === "disputed" || (t.notes || "").toLowerCase().includes("dispute")
  ).length;
  const missing_count = 0; // computed in validations
  const fast_scan_matched = (tickets || []).filter((t: any) => t.ticket_source === "FastScan").length;

  const validations = await runValidations(sb, {
    driver_id,
    tickets: tickets || [],
    rate_rule,
    deductions_total,
    gross_pay,
    period_start,
    period_end,
  });

  const { status, hold_reason } = deriveStatus(validations, gross_pay);
  const errors = validations.filter(v => !v.passed && v.severity === "error").map(v => v.detail);

  return {
    gross_pay,
    deductions: deductions_total,
    reimbursements: 0,
    advances: 0,
    fuel_deduction,
    net_pay,
    ticket_count: (tickets || []).length,
    missing_tickets: missing_count,
    disputed_tickets: disputed_count,
    fast_scan_matched,
    validations,
    payroll_status: status,
    hold_reason,
    validation_errors: errors,
  };
}

// POST /api/ronyx/payroll/engine
// Body: { driver_id, period_start, period_end, trigger_source?, trigger_ref? }
// Also accepts: { recalculate_period: true, period_start, period_end } to do all drivers
export async function POST(req: NextRequest) {
  const auth = await requireOrgRole(WRITE_ROLES);
  if (!auth.ok) return auth.response;

  const sb = adminClient();
  const body = await req.json().catch(() => ({}));
  const { driver_id, period_start, period_end, trigger_source = "manual", trigger_ref, recalculate_period } = body;

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "period_start and period_end are required" }, { status: 400 });
  }

  // Ensure payroll period record exists
  const { data: existingPeriod } = await sb
    .from("ronyx_payroll_periods")
    .select("id, status")
    .eq("period_start", period_start)
    .eq("period_end", period_end)
    .maybeSingle();

  let period_id = existingPeriod?.id;

  if (!period_id) {
    const { data: newPeriod } = await sb
      .from("ronyx_payroll_periods")
      .insert({
        organization_id: auth.organization.id,
        period_start,
        period_end,
        status: "calculating",
      })
      .select("id")
      .single();
    period_id = newPeriod?.id;
  } else if (existingPeriod?.status === "locked") {
    return NextResponse.json({ error: "Pay period is locked. Unlock it before recalculating." }, { status: 409 });
  }

  // Determine which driver(s) to process
  let driver_ids: string[] = [];
  if (recalculate_period) {
    // All drivers with tickets in this period
    const { data: ticketDrivers } = await sb
      .from("ronyx_tickets")
      .select("driver_id")
      .gte("ticket_date", period_start)
      .lte("ticket_date", period_end)
      .not("status", "eq", "voided");
    driver_ids = [...new Set((ticketDrivers || []).map((t: any) => t.driver_id).filter(Boolean))];
  } else if (driver_id) {
    driver_ids = [driver_id];
  } else {
    return NextResponse.json({ error: "Provide driver_id or set recalculate_period: true" }, { status: 400 });
  }

  const results: any[] = [];

  for (const did of driver_ids) {
    try {
      const calc = await calculateDriverPay(sb, { driver_id: did, period_start, period_end });

      // Upsert payroll item
      const { data: driver } = await sb
        .from("drivers")
        .select("first_name, last_name, driver_type, unit_number, company_name")
        .eq("id", did)
        .maybeSingle();

      const driver_name = driver
        ? `${driver.first_name || ""} ${driver.last_name || ""}`.trim()
        : "Unknown Driver";

      const upsertData = {
        organization_id: auth.organization.id,
        period_id,
        driver_id: did,
        driver_name,
        driver_type: driver?.driver_type || "1099",
        truck_number: driver?.unit_number || null,
        company_name: driver?.company_name || null,
        period_start,
        period_end,
        gross_pay: calc.gross_pay,
        deductions: calc.deductions,
        reimbursements: calc.reimbursements,
        advances: calc.advances,
        fuel_deduction: calc.fuel_deduction,
        net_pay: calc.net_pay,
        ticket_count: calc.ticket_count,
        missing_tickets: calc.missing_tickets,
        disputed_tickets: calc.disputed_tickets,
        fast_scan_matched: calc.fast_scan_matched,
        status: calc.payroll_status,
        hold_reason: calc.hold_reason,
        validation_flags: Object.fromEntries(
          calc.validations.map(v => [v.check_name, { passed: v.passed, detail: v.detail }])
        ),
        validation_errors: calc.validation_errors,
        last_trigger_source: trigger_source,
        calculated_at: new Date().toISOString(),
      };

      // Check for existing item to detect status change
      const { data: existing } = await sb
        .from("ronyx_payroll_items")
        .select("id, status, gross_pay")
        .eq("driver_id", did)
        .eq("period_start", period_start)
        .eq("period_end", period_end)
        .maybeSingle();

      let payroll_item_id: string;

      if (existing) {
        await sb.from("ronyx_payroll_items").update(upsertData).eq("id", existing.id);
        payroll_item_id = existing.id;

        // Log status change in audit
        if (existing.status !== calc.payroll_status) {
          await sb.from("ronyx_payroll_audit").insert({
            organization_id: auth.organization.id,
            payroll_item_id: existing.id,
            period_id,
            driver_id: did,
            driver_name,
            event_type: "status_change",
            from_status: existing.status,
            to_status: calc.payroll_status,
            trigger_source,
            trigger_ref: trigger_ref || null,
            old_values: { gross_pay: existing.gross_pay, status: existing.status },
            new_values: { gross_pay: calc.gross_pay, status: calc.payroll_status },
          });
        }
      } else {
        const { data: newItem } = await sb
          .from("ronyx_payroll_items")
          .insert(upsertData)
          .select("id")
          .single();
        payroll_item_id = newItem?.id;

        await sb.from("ronyx_payroll_audit").insert({
          organization_id: auth.organization.id,
          payroll_item_id,
          period_id,
          driver_id: did,
          driver_name,
          event_type: "recalculation",
          to_status: calc.payroll_status,
          trigger_source,
          trigger_ref: trigger_ref || null,
          new_values: { gross_pay: calc.gross_pay, status: calc.payroll_status },
        });
      }

      // Upsert validation rows
      if (payroll_item_id) {
        await sb.from("ronyx_payroll_validations").delete().eq("payroll_item_id", payroll_item_id);
        if (calc.validations.length > 0) {
          await sb.from("ronyx_payroll_validations").insert(
            calc.validations.map(v => ({
              organization_id: auth.organization.id,
              payroll_item_id,
              ...v,
              evaluated_at: new Date().toISOString(),
            }))
          );
        }
      }

      results.push({ driver_id: did, driver_name, ...calc });
    } catch (err: any) {
      results.push({ driver_id: did, error: err.message });
    }
  }

  // Update period totals
  if (period_id) {
    const { data: items } = await sb
      .from("ronyx_payroll_items")
      .select("gross_pay, deductions, reimbursements, net_pay, status, ticket_count")
      .eq("period_id", period_id);

    if (items && items.length > 0) {
      await sb.from("ronyx_payroll_periods").update({
        total_gross_pay: items.reduce((s: number, i: any) => s + Number(i.gross_pay || 0), 0),
        total_deductions: items.reduce((s: number, i: any) => s + Number(i.deductions || 0), 0),
        total_reimbursements: items.reduce((s: number, i: any) => s + Number(i.reimbursements || 0), 0),
        total_net_pay: items.reduce((s: number, i: any) => s + Number(i.net_pay || 0), 0),
        driver_count: items.length,
        ticket_count: items.reduce((s: number, i: any) => s + Number(i.ticket_count || 0), 0),
        items_ready: items.filter((i: any) => i.status === "ready_to_pay").length,
        items_needing_review: items.filter((i: any) =>
          ["needs_review", "waiting_for_ticket", "recalculation_required", "payroll_hold"].includes(i.status)
        ).length,
        status: "calculating",
      }).eq("id", period_id);
    }
  }

  return NextResponse.json({
    ok: true,
    period_id,
    processed: results.length,
    results,
  });
}

// GET /api/ronyx/payroll/engine?period_start=...&period_end=...
// Returns calculated items for a period (reads from DB, no recalc)
export async function GET(req: NextRequest) {
  const auth = await requireOrgRole(READ_ROLES);
  if (!auth.ok) return auth.response;

  const sb = adminClient();
  const { searchParams } = new URL(req.url);
  const period_start = searchParams.get("period_start");
  const period_end   = searchParams.get("period_end");
  const driver_id    = searchParams.get("driver_id");

  if (!period_start || !period_end) {
    return NextResponse.json({ error: "period_start and period_end are required" }, { status: 400 });
  }

  let query = sb
    .from("ronyx_payroll_items")
    .select("*")
    .eq("period_start", period_start)
    .eq("period_end", period_end)
    .order("driver_name", { ascending: true });

  if (driver_id) query = query.eq("driver_id", driver_id);

  const { data: items, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: period } = await sb
    .from("ronyx_payroll_periods")
    .select("*")
    .eq("period_start", period_start)
    .eq("period_end", period_end)
    .maybeSingle();

  return NextResponse.json({ period, items: items || [] });
}

// PATCH /api/ronyx/payroll/engine
// Body: { action: "approve"|"lock"|"unlock"|"void"|"hold", item_id?, period_id?, reason?, approved_by? }
export async function PATCH(req: NextRequest) {
  const auth = await requireOrgRole(LOCK_ROLES);
  if (!auth.ok) return auth.response;

  const sb = adminClient();
  const body = await req.json().catch(() => ({}));
  const { action, item_id, period_id, reason, approved_by = auth.user?.email ?? "admin" } = body;

  if (!action) return NextResponse.json({ error: "action is required" }, { status: 400 });

  if (action === "approve" && item_id) {
    const { data: item } = await sb
      .from("ronyx_payroll_items")
      .select("status, driver_name, driver_id, period_id")
      .eq("id", item_id)
      .single();

    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    if (!["ready_to_pay", "calculated"].includes(item.status)) {
      return NextResponse.json({ error: `Cannot approve item in status: ${item.status}` }, { status: 400 });
    }

    await sb.from("ronyx_payroll_items").update({
      status: "approved",
      approved_by,
      approved_at: new Date().toISOString(),
    }).eq("id", item_id);

    await sb.from("ronyx_payroll_audit").insert({
      organization_id: auth.organization.id,
      payroll_item_id: item_id,
      period_id: item.period_id,
      driver_id: item.driver_id,
      driver_name: item.driver_name,
      event_type: "approval",
      from_status: item.status,
      to_status: "approved",
      trigger_source: "manual",
      performed_by: approved_by,
    });

    return NextResponse.json({ ok: true, status: "approved" });
  }

  if (action === "lock" && period_id) {
    const { data: period } = await sb
      .from("ronyx_payroll_periods")
      .select("status")
      .eq("id", period_id)
      .single();

    if (period?.status === "locked") {
      return NextResponse.json({ error: "Period is already locked" }, { status: 400 });
    }

    await sb.from("ronyx_payroll_periods").update({
      status: "locked",
      locked_by: approved_by,
      locked_at: new Date().toISOString(),
    }).eq("id", period_id);

    await sb.from("ronyx_payroll_items").update({ status: "locked" })
      .eq("period_id", period_id)
      .eq("status", "approved");

    await sb.from("ronyx_payroll_audit").insert({
      organization_id: auth.organization.id,
      period_id,
      event_type: "lock",
      to_status: "locked",
      trigger_source: "manual",
      performed_by: approved_by,
      notes: reason || "Pay period locked",
    });

    return NextResponse.json({ ok: true, status: "locked" });
  }

  if (action === "unlock" && period_id) {
    await sb.from("ronyx_payroll_periods").update({ status: "approved" }).eq("id", period_id);
    await sb.from("ronyx_payroll_audit").insert({
      organization_id: auth.organization.id,
      period_id,
      event_type: "status_change",
      from_status: "locked",
      to_status: "approved",
      trigger_source: "manual",
      performed_by: approved_by,
      notes: reason || "Period unlocked for corrections",
    });
    return NextResponse.json({ ok: true, status: "unlocked" });
  }

  if (action === "hold" && item_id) {
    await sb.from("ronyx_payroll_items").update({
      status: "payroll_hold",
      hold_reason: reason || "Placed on hold",
    }).eq("id", item_id);
    return NextResponse.json({ ok: true, status: "payroll_hold" });
  }

  if (action === "void" && item_id) {
    await sb.from("ronyx_payroll_items").update({
      status: "voided",
      hold_reason: reason || "Voided",
    }).eq("id", item_id);
    return NextResponse.json({ ok: true, status: "voided" });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
