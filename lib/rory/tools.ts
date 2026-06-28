// Rory — Operations Manager: server-side READ-ONLY tool registry.
//
// SECURITY MODEL
//  - The LLM never constructs SQL. It can only call these typed tools.
//  - Every query is scoped to ctx.orgId (resolved server-side from the session,
//    NEVER from the browser) via an explicit organization_id filter — service role
//    bypasses RLS, so this app-code filter IS the tenant boundary.
//  - Every tool caps results (maxResults) and projects an allowlist of fields
//    (internal IDs / organization_id are never returned → redaction by construction).
//  - Tools are pure of side effects: SELECT only. No insert/update/delete.
//  - Inputs are validated with Zod before execute() runs.
//
// RESILIENCE: the live schema diverges from the repo DDL in places, so each read
// tries a specific column list and, on any column/table error, falls back to
// select('*'); output is then projected through an allowlist. A genuinely missing
// table surfaces as status:"no_data_source" so Rory says "I do not have a verified
// data source for that yet" rather than crashing.

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { FEDERAL_TRUCKING, lookupStateRule, ALL_STATE_NAMES, DISCLAIMER, TRUCKING_REQUIREMENTS } from "./stateTruckingRules";

export type RoryToolStatus = "ok" | "no_data_source" | "tool_error";

export type RoryToolResult = {
  ok: boolean;
  status: RoryToolStatus;
  count: number;
  capped: boolean;
  rows: Record<string, unknown>[];
  summary?: Record<string, unknown>;
  note?: string;
};

export type RoryToolContext = {
  sb: SupabaseClient;
  orgId: string;
  now?: Date; // injectable for deterministic tests
};

export type RoryTool = {
  name: string;
  description: string;
  input: z.ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  maxResults: number;
  execute: (input: unknown, ctx: RoryToolContext) => Promise<RoryToolResult>;
};

// ── small helpers ────────────────────────────────────────────────────────────

function now(ctx: RoryToolContext): Date {
  return ctx.now ?? new Date();
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type QueryApplier = (q: any) => any;

// Run a scoped select. Tries the specific column list; on ANY error retries with
// '*' so a diverged/missing column doesn't crash the tool. Selects max+1 rows so
// we can detect (and honestly report) truncation.
async function selectScoped(
  sb: SupabaseClient,
  table: string,
  cols: string[],
  apply: QueryApplier,
  max: number,
): Promise<{ data?: any[]; error?: unknown }> {
  const attempt = async (sel: string) => {
    let q: any = (sb as any).from(table).select(sel).limit(max + 1);
    q = apply(q);
    return q;
  };
  const first = await attempt(cols.join(","));
  if (!first.error) return { data: first.data ?? [] };
  const second = await attempt("*");
  if (!second.error) return { data: second.data ?? [] };
  return { error: second.error };
}

// Allowlist projection → redaction by construction (only listed keys, only if present).
function project(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in row && row[k] !== null && row[k] !== undefined) out[k] = row[k];
  return out;
}

function pack(rows: any[], keys: string[], max: number): { rows: Record<string, unknown>[]; capped: boolean } {
  const capped = rows.length > max;
  const sliced = capped ? rows.slice(0, max) : rows;
  return { rows: sliced.map((r) => project(r, keys)), capped };
}

function noDataSource(note: string): RoryToolResult {
  return { ok: false, status: "no_data_source", count: 0, capped: false, rows: [], note };
}

// Owner-operator IDs for this org (used to scope the OO sub-tables that lack
// their own organization_id column).
async function ooIdsForOrg(sb: SupabaseClient, orgId: string): Promise<string[] | null> {
  const { data, error } = await (sb as any)
    .from("ronyx_owner_operators")
    .select("id")
    .eq("organization_id", orgId)
    .limit(2000);
  if (error) return null;
  return (data ?? []).map((r: any) => r.id);
}

// Credential expiry fields tracked on the drivers table.
const CREDENTIALS: { field: string; label: string }[] = [
  { field: "license_expiration_date", label: "CDL / license" },
  { field: "medical_card_expiration", label: "Medical card" },
  { field: "mvr_expiration", label: "MVR" },
  { field: "drug_test_expiration", label: "Drug test" },
];

function driverBlockers(row: Record<string, unknown>, today: Date): string[] {
  const reasons: string[] = [];
  if (row.dispatch_eligible === false) reasons.push("Marked not dispatch-eligible");
  const todayStr = ymd(today);
  for (const c of CREDENTIALS) {
    const v = row[c.field];
    if (typeof v === "string" && v.slice(0, 10) < todayStr) reasons.push(`${c.label} expired (${v.slice(0, 10)})`);
  }
  const bg = row.background_check_status;
  if (typeof bg === "string" && /fail|expired|pending|incomplete/i.test(bg)) reasons.push(`Background check: ${bg}`);
  return reasons;
}

// ── tool definitions ─────────────────────────────────────────────────────────

const DRIVER_COLS = [
  "full_name", "status", "driver_type", "company_name",
  "assigned_truck_number", "job_assignment", "phone",
  "license_expiration_date", "medical_card_expiration", "mvr_expiration",
  "drug_test_expiration", "background_check_status",
  "dispatch_eligible", "payroll_eligible", "compliance_flags",
  "organization_id",
];
const DRIVER_OUT = [
  "full_name", "status", "assigned_truck_number", "job_assignment",
  "dispatch_eligible", "background_check_status",
];

export const RORY_TOOLS: RoryTool[] = [
  {
    name: "find_dispatch_eligible_drivers",
    description:
      "Call this when staff ask who is available to dispatch (e.g. 'who can I dispatch tomorrow?', 'who's available?'). Returns this organization's drivers with their dispatch-eligibility and any blocking reasons (expired credentials, not-eligible flag). Optional date/equipment/customer/location are informational filters.",
    maxResults: 50,
    input: z.object({
      date: z.string().optional(),
      equipment_type: z.string().optional(),
      customer: z.string().optional(),
      location: z.string().optional(),
      include_blocked: z.boolean().optional(),
    }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        date: { type: "string", description: "Optional ISO date (YYYY-MM-DD) the dispatch is for." },
        equipment_type: { type: "string", description: "Optional equipment/truck type filter." },
        customer: { type: "string", description: "Optional customer name (informational)." },
        location: { type: "string", description: "Optional location (informational)." },
        include_blocked: { type: "boolean", description: "If true, also return non-eligible drivers with reasons. Default false (eligible only)." },
      },
    },
    async execute(input, ctx) {
      const i = input as { date?: string; include_blocked?: boolean };
      const today = i.date ? new Date(i.date) : now(ctx);
      const { data, error } = await selectScoped(
        ctx.sb, "drivers", DRIVER_COLS,
        (q) => q.eq("organization_id", ctx.orgId), this.maxResults,
      );
      if (error) return noDataSource("drivers table unavailable");
      let mapped = (data ?? []).map((r: any) => ({
        ...project(r, DRIVER_OUT),
        blocking_reasons: driverBlockers(r, today),
        eligible: r.dispatch_eligible !== false && driverBlockers(r, today).length === 0,
      }));
      if (!i.include_blocked) mapped = mapped.filter((d: any) => d.eligible);
      const { rows, capped } = pack(mapped, [...DRIVER_OUT, "blocking_reasons", "eligible"], this.maxResults);
      return {
        ok: true, status: "ok", count: rows.length, capped, rows,
        summary: { eligible_returned: rows.length, as_of_date: ymd(today) },
      };
    },
  },

  {
    name: "get_driver_compliance_alerts",
    description:
      "Call this for driver document/credential expirations (e.g. 'whose CDL expires soon?', 'medical cards expiring this month'). Returns drivers in this org with CDL/medical/MVR/drug-test credentials expiring within daysAhead, or already expired, plus background-check status.",
    maxResults: 75,
    input: z.object({
      daysAhead: z.number().int().min(0).max(365).optional(),
      severity: z.enum(["expired", "expiring", "all"]).optional(),
      driverName: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        daysAhead: { type: "integer", description: "Look-ahead window in days (default 30)." },
        severity: { type: "string", enum: ["expired", "expiring", "all"], description: "Filter: already expired, upcoming, or all. Default all." },
        driverName: { type: "string", description: "Optional driver name to filter (partial match)." },
      },
    },
    async execute(input, ctx) {
      const i = input as { daysAhead?: number; severity?: string; driverName?: string };
      const horizon = addDays(now(ctx), i.daysAhead ?? 30);
      const horizonStr = ymd(horizon);
      const todayStr = ymd(now(ctx));
      const { data, error } = await selectScoped(
        ctx.sb, "drivers", DRIVER_COLS,
        (q) => {
          let qq = q.eq("organization_id", ctx.orgId);
          if (i.driverName) qq = qq.ilike("full_name", `%${i.driverName}%`);
          return qq;
        },
        500,
      );
      if (error) return noDataSource("drivers table unavailable");
      const alerts: Record<string, unknown>[] = [];
      for (const r of data ?? []) {
        for (const c of CREDENTIALS) {
          const v = r[c.field];
          if (typeof v !== "string") continue;
          const day = v.slice(0, 10);
          if (day > horizonStr) continue; // not within window
          const expired = day < todayStr;
          if (i.severity === "expired" && !expired) continue;
          if (i.severity === "expiring" && expired) continue;
          alerts.push({
            driver: r.full_name, credential: c.label, expires_on: day,
            severity: expired ? "expired" : "expiring",
            assigned_truck_number: r.assigned_truck_number ?? undefined,
          });
        }
      }
      alerts.sort((a: any, b: any) => String(a.expires_on).localeCompare(String(b.expires_on)));
      const { rows, capped } = pack(alerts, ["driver", "credential", "expires_on", "severity", "assigned_truck_number"], this.maxResults);
      return {
        ok: true, status: "ok", count: rows.length, capped, rows,
        summary: { window_days: i.daysAhead ?? 30, expired: rows.filter((r: any) => r.severity === "expired").length },
      };
    },
  },

  {
    name: "get_driver_or_owner_operator_status",
    description:
      "Call this when staff ask about ONE driver, owner-operator, or carrier by name (e.g. 'what is blocking Double F from dispatch?', 'is John Smith cleared?'). Searches this org's drivers, owner-operator companies, and OO drivers; returns status and blocking reasons.",
    maxResults: 25,
    input: z.object({ name: z.string().min(1) }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: { name: { type: "string", description: "Driver, owner-operator company, or carrier name (partial match)." } },
    },
    async execute(input, ctx) {
      const i = input as { name: string };
      const today = now(ctx);
      const results: Record<string, unknown>[] = [];

      // 1) W2 drivers
      const dr = await selectScoped(
        ctx.sb, "drivers", DRIVER_COLS,
        (q) => q.eq("organization_id", ctx.orgId).ilike("full_name", `%${i.name}%`), 25,
      );
      for (const r of dr.data ?? []) {
        results.push({
          record_type: "driver", name: r.full_name, status: r.status,
          assigned_truck_number: r.assigned_truck_number ?? undefined,
          dispatch_eligible: r.dispatch_eligible !== false,
          blocking_reasons: driverBlockers(r, today),
        });
      }

      // 2) Owner-operator companies
      const oo = await selectScoped(
        ctx.sb, "ronyx_owner_operators",
        ["company_name", "status", "mc_number", "dot_number", "organization_id"],
        (q) => q.eq("organization_id", ctx.orgId).ilike("company_name", `%${i.name}%`), 25,
      );
      for (const r of oo.data ?? []) {
        results.push({
          record_type: "owner_operator", name: r.company_name, status: r.status,
          mc_number: r.mc_number ?? undefined, dot_number: r.dot_number ?? undefined,
          blocking_reasons: typeof r.status === "string" && /inactive|blocked|hold/i.test(r.status) ? [`Company status: ${r.status}`] : [],
        });
      }

      // 3) OO drivers (scoped via parent oo_id)
      const ooIds = await ooIdsForOrg(ctx.sb, ctx.orgId);
      if (ooIds && ooIds.length) {
        const ood = await selectScoped(
          ctx.sb, "ronyx_oo_drivers",
          ["name", "status", "truck_number", "cdl_expiration", "med_card_expiration", "oo_id"],
          (q) => q.in("oo_id", ooIds).ilike("name", `%${i.name}%`), 25,
        );
        for (const r of ood.data ?? []) {
          const reasons: string[] = [];
          const todayStr = ymd(today);
          if (typeof r.cdl_expiration === "string" && r.cdl_expiration.slice(0, 10) < todayStr) reasons.push(`CDL expired (${r.cdl_expiration.slice(0, 10)})`);
          if (typeof r.med_card_expiration === "string" && r.med_card_expiration.slice(0, 10) < todayStr) reasons.push(`Medical card expired (${r.med_card_expiration.slice(0, 10)})`);
          results.push({
            record_type: "oo_driver", name: r.name, status: r.status,
            truck_number: r.truck_number ?? undefined, blocking_reasons: reasons,
          });
        }
      }

      if (results.length === 0) return { ok: true, status: "ok", count: 0, capped: false, rows: [], note: "No matching driver, owner-operator, or carrier found." };
      const capped = results.length > this.maxResults;
      return { ok: true, status: "ok", count: Math.min(results.length, this.maxResults), capped, rows: results.slice(0, this.maxResults) };
    },
  },

  {
    name: "get_fleet_readiness",
    description:
      "Call this for truck/fleet availability (e.g. 'which trucks are unavailable and why?', 'how many trucks are out of service?'). Returns this org's trucks grouped by status with reasons where available.",
    maxResults: 100,
    input: z.object({
      truck_number: z.string().optional(),
      status: z.string().optional(),
      date: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        truck_number: { type: "string", description: "Optional specific unit/truck number." },
        status: { type: "string", description: "Optional status filter (e.g. available, maintenance, out_of_service)." },
        date: { type: "string", description: "Optional date (informational)." },
      },
    },
    async execute(input, ctx) {
      const i = input as { truck_number?: string; status?: string };
      const { data, error } = await selectScoped(
        ctx.sb, "ronyx_trucks",
        ["truck_number", "status", "truck_type", "make", "model", "year", "notes", "organization_id"],
        (q) => {
          let qq = q.eq("organization_id", ctx.orgId);
          if (i.truck_number) qq = qq.ilike("truck_number", `%${i.truck_number}%`);
          if (i.status) qq = qq.ilike("status", `%${i.status}%`);
          return qq;
        },
        this.maxResults,
      );
      if (error) return noDataSource("fleet (ronyx_trucks) table unavailable");
      const counts: Record<string, number> = {};
      for (const r of data ?? []) {
        const s = String(r.status ?? "unknown").toLowerCase();
        counts[s] = (counts[s] ?? 0) + 1;
      }
      const { rows, capped } = pack(data ?? [], ["truck_number", "status", "truck_type", "make", "model", "year", "notes"], this.maxResults);
      return { ok: true, status: "ok", count: rows.length, capped, rows, summary: { counts_by_status: counts } };
    },
  },

  {
    name: "get_ticket_exceptions",
    description:
      "Call this for ticket/Fast Scan problems (e.g. 'tickets ready for billing but missing something', 'tickets with missing signatures or low OCR confidence', 'reconciliation exceptions'). Returns this org's aggregate tickets that have an exception, missing signature, missing fields, or low OCR confidence.",
    maxResults: 75,
    input: z.object({
      status: z.string().optional(),
      exception_type: z.enum(["missing_signature", "low_ocr", "missing_fields", "reconciliation", "any"]).optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        status: { type: "string", description: "Optional ticket status filter." },
        exception_type: { type: "string", enum: ["missing_signature", "low_ocr", "missing_fields", "reconciliation", "any"], description: "Type of exception. Default any." },
        dateFrom: { type: "string", description: "Optional start date YYYY-MM-DD." },
        dateTo: { type: "string", description: "Optional end date YYYY-MM-DD." },
      },
    },
    async execute(input, ctx) {
      const i = input as { status?: string; exception_type?: string; dateFrom?: string; dateTo?: string };
      const cols = [
        "ticket_number", "status", "reconciliation_status", "signature_present",
        "has_signature", "ocr_confidence", "missing_fields", "exception_flags",
        "customer_name", "total_amount", "ticket_date", "billing_ready", "payroll_ready",
        "organization_id",
      ];
      const { data, error } = await selectScoped(
        ctx.sb, "aggregate_tickets", cols,
        (q) => {
          let qq = q.eq("organization_id", ctx.orgId);
          if (i.status) qq = qq.ilike("status", `%${i.status}%`);
          if (i.dateFrom) qq = qq.gte("ticket_date", i.dateFrom);
          if (i.dateTo) qq = qq.lte("ticket_date", i.dateTo);
          return qq;
        },
        500,
      );
      if (error) return noDataSource("tickets (aggregate_tickets) table unavailable");
      const isException = (r: any, type?: string) => {
        const sigMissing = r.signature_present === false || r.has_signature === false;
        const lowOcr = typeof r.ocr_confidence === "number" && r.ocr_confidence < 0.7;
        const missingFields = Array.isArray(r.missing_fields) && r.missing_fields.length > 0;
        const recon = typeof r.reconciliation_status === "string" && /exception/i.test(r.reconciliation_status);
        if (type === "missing_signature") return sigMissing;
        if (type === "low_ocr") return lowOcr;
        if (type === "missing_fields") return missingFields;
        if (type === "reconciliation") return recon;
        return sigMissing || lowOcr || missingFields || recon;
      };
      const flagged = (data ?? [])
        .filter((r: any) => isException(r, i.exception_type))
        .map((r: any) => ({
          ...project(r, ["ticket_number", "status", "reconciliation_status", "customer_name", "ticket_date", "ocr_confidence"]),
          missing_signature: r.signature_present === false || r.has_signature === false,
          missing_fields: Array.isArray(r.missing_fields) ? r.missing_fields : undefined,
        }));
      const { rows, capped } = pack(flagged, ["ticket_number", "status", "reconciliation_status", "customer_name", "ticket_date", "ocr_confidence", "missing_signature", "missing_fields"], this.maxResults);
      return { ok: true, status: "ok", count: rows.length, capped, rows, summary: { exceptions_found: flagged.length } };
    },
  },

  {
    name: "get_billing_ready_summary",
    description:
      "Call this for billing readiness (e.g. 'what's ready to bill?', 'billing total this week', 'what's blocking billing?'). Returns a count of this org's billing-ready tickets and a verified dollar total computed ONLY from stored amounts, plus blocked items.",
    maxResults: 50,
    input: z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      customer: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        dateFrom: { type: "string", description: "Optional start date YYYY-MM-DD." },
        dateTo: { type: "string", description: "Optional end date YYYY-MM-DD." },
        customer: { type: "string", description: "Optional customer name filter." },
      },
    },
    async execute(input, ctx) {
      const i = input as { dateFrom?: string; dateTo?: string; customer?: string };
      const { data, error } = await selectScoped(
        ctx.sb, "aggregate_tickets",
        ["ticket_number", "billing_ready", "billing_status", "total_amount", "customer_name", "ticket_date", "organization_id"],
        (q) => {
          let qq = q.eq("organization_id", ctx.orgId);
          if (i.customer) qq = qq.ilike("customer_name", `%${i.customer}%`);
          if (i.dateFrom) qq = qq.gte("ticket_date", i.dateFrom);
          if (i.dateTo) qq = qq.lte("ticket_date", i.dateTo);
          return qq;
        },
        1000,
      );
      if (error) return noDataSource("tickets (aggregate_tickets) table unavailable");
      const ready = (data ?? []).filter((r: any) => r.billing_ready === true || /ready/i.test(String(r.billing_status ?? "")));
      let total = 0;
      let amountsKnown = true;
      for (const r of ready) {
        const amt = Number(r.total_amount);
        if (Number.isFinite(amt)) total += amt;
        else amountsKnown = false; // some rows lack a stored amount → don't assert a full total
      }
      const { rows, capped } = pack(ready, ["ticket_number", "customer_name", "ticket_date", "total_amount"], this.maxResults);
      return {
        ok: true, status: "ok", count: rows.length, capped, rows,
        summary: {
          billing_ready_count: ready.length,
          verified_total: amountsKnown ? Number(total.toFixed(2)) : null,
          total_note: amountsKnown ? "computed from stored ticket amounts" : "some tickets have no stored amount — total is partial / not verified",
        },
      };
    },
  },

  {
    name: "get_payroll_review_summary",
    description:
      "Call this for payroll items needing review (e.g. 'what payroll needs review?', 'held settlements', 'payroll exceptions this period'). Returns this org's payroll/settlement items flagged for review, held, or with validation issues.",
    maxResults: 75,
    input: z.object({
      periodFrom: z.string().optional(),
      periodTo: z.string().optional(),
    }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        periodFrom: { type: "string", description: "Optional pay-period start YYYY-MM-DD." },
        periodTo: { type: "string", description: "Optional pay-period end YYYY-MM-DD." },
      },
    },
    async execute(input, ctx) {
      const i = input as { periodFrom?: string; periodTo?: string };
      const flagged: Record<string, unknown>[] = [];

      // Settlement items (org-scoped directly) — held / exception statuses.
      const settle = await selectScoped(
        ctx.sb, "driver_settlement_items",
        ["driver_name", "ticket_number", "settlement_status", "gross_pay", "net_pay", "week_ending", "organization_id"],
        (q) => {
          let qq = q.eq("organization_id", ctx.orgId);
          if (i.periodFrom) qq = qq.gte("week_ending", i.periodFrom);
          if (i.periodTo) qq = qq.lte("week_ending", i.periodTo);
          return qq;
        },
        500,
      );
      if (!settle.error) {
        for (const r of settle.data ?? []) {
          const st = String(r.settlement_status ?? "").toLowerCase();
          if (/held|hold|exception|pending|disputed/.test(st)) {
            flagged.push({ source: "settlement", driver: r.driver_name, ticket_number: r.ticket_number, status: r.settlement_status, week_ending: r.week_ending });
          }
        }
      }

      // Payroll items (scoped via parent run) — validation flags / hold reasons.
      const runs = await selectScoped(
        ctx.sb, "ronyx_payroll_runs",
        ["id", "period_start", "period_end", "status", "organization_id"],
        (q) => q.eq("organization_id", ctx.orgId), 100,
      );
      if (!runs.error && (runs.data ?? []).length) {
        const runIds = (runs.data ?? []).map((r: any) => r.id);
        const items = await selectScoped(
          ctx.sb, "ronyx_payroll_items",
          ["driver_name", "hold_reason", "validation_flags", "missing_tickets", "disputed_tickets", "net_pay", "run_id"],
          (q) => q.in("run_id", runIds), 500,
        );
        if (!items.error) {
          for (const r of items.data ?? []) {
            const hasIssue = (r.hold_reason && String(r.hold_reason).trim()) ||
              (Array.isArray(r.validation_flags) && r.validation_flags.length) ||
              (Number(r.missing_tickets) > 0) || (Number(r.disputed_tickets) > 0);
            if (hasIssue) {
              flagged.push({
                source: "payroll_item", driver: r.driver_name,
                hold_reason: r.hold_reason ?? undefined,
                missing_tickets: r.missing_tickets ?? undefined,
                disputed_tickets: r.disputed_tickets ?? undefined,
              });
            }
          }
        }
      }

      if (settle.error && (runs.error || !(runs.data ?? []).length)) {
        // Neither payroll source is available.
        if (settle.error) return noDataSource("payroll/settlement tables unavailable");
      }
      const capped = flagged.length > this.maxResults;
      return {
        ok: true, status: "ok", count: Math.min(flagged.length, this.maxResults), capped,
        rows: flagged.slice(0, this.maxResults), summary: { needs_review: flagged.length },
      };
    },
  },

  {
    name: "get_customer_clearance_status",
    description:
      "Call this for customer dispatch requirements / clearance (e.g. 'what customer clearance issues need attention?', 'what does Customer X require to dispatch?'). Returns this org's customer dispatch requirements, their status, and which block dispatch.",
    maxResults: 60,
    input: z.object({ customer_name: z.string().optional() }),
    jsonSchema: {
      type: "object",
      additionalProperties: false,
      properties: { customer_name: { type: "string", description: "Optional customer name (partial match). Omit to see all customers with open requirements." } },
    },
    async execute(input, ctx) {
      const i = input as { customer_name?: string };
      const { data, error } = await selectScoped(
        ctx.sb, "customer_dispatch_requirements",
        ["customer_name", "project_name", "requirement_label", "requirement_status", "blocks_dispatch", "requires_expiration_check", "is_active", "organization_id"],
        (q) => {
          let qq = q.eq("organization_id", ctx.orgId);
          if (i.customer_name) qq = qq.ilike("customer_name", `%${i.customer_name}%`);
          return qq;
        },
        500,
      );
      if (error) return noDataSource("customer_dispatch_requirements table unavailable");
      // Surface the open / blocking ones first.
      const rowsAll = (data ?? []).filter((r: any) => r.is_active !== false);
      const open = rowsAll.filter((r: any) => r.blocks_dispatch === true || (typeof r.requirement_status === "string" && !/met|clear|complete|ok|passed/i.test(r.requirement_status)));
      const chosen = open.length ? open : rowsAll;
      const { rows, capped } = pack(chosen, ["customer_name", "project_name", "requirement_label", "requirement_status", "blocks_dispatch"], this.maxResults);
      return { ok: true, status: "ok", count: rows.length, capped, rows, summary: { blocking: rowsAll.filter((r: any) => r.blocks_dispatch === true).length } };
    },
  },

  {
    name: "get_operations_priority_summary",
    description:
      "Call this for an overall 'what needs attention' / morning-brief view (e.g. 'what's most important right now?', 'give me the morning brief'). Returns the top items across compliance, fleet, tickets, payroll, billing, and customer clearance for this org.",
    maxResults: 40,
    input: z.object({}),
    jsonSchema: { type: "object", additionalProperties: false, properties: {} },
    async execute(_input, ctx) {
      const today = now(ctx);
      const soon = ymd(addDays(today, 7));
      const todayStr = ymd(today);
      const buckets: Record<string, Record<string, unknown>[]> = {
        critical_now: [], needs_attention_today: [], this_week: [], ready_for_next_step: [],
      };

      // Compliance: expired vs expiring-7d credentials.
      const dr = await selectScoped(ctx.sb, "drivers", DRIVER_COLS, (q) => q.eq("organization_id", ctx.orgId), 1000);
      if (!dr.error) {
        let expired = 0, expiring = 0;
        for (const r of dr.data ?? []) {
          for (const c of CREDENTIALS) {
            const v = r[c.field];
            if (typeof v !== "string") continue;
            const day = v.slice(0, 10);
            if (day < todayStr) expired++;
            else if (day <= soon) expiring++;
          }
        }
        if (expired) buckets.critical_now.push({ issue: "Expired driver credentials", count: expired, severity: "critical", explanation: "Drivers have CDL/medical/MVR/drug-test credentials already expired.", module: "/ronyx/drivers?tab=compliance" });
        if (expiring) buckets.this_week.push({ issue: "Credentials expiring within 7 days", count: expiring, severity: "warning", explanation: "Renew before they lapse.", module: "/ronyx/compliance/expiring" });
      }

      // Fleet: out of service / maintenance.
      const tr = await selectScoped(ctx.sb, "ronyx_trucks", ["status", "organization_id"], (q) => q.eq("organization_id", ctx.orgId), 1000);
      if (!tr.error) {
        const oos = (tr.data ?? []).filter((r: any) => /out.?of.?service|oos|down/i.test(String(r.status ?? ""))).length;
        const maint = (tr.data ?? []).filter((r: any) => /maintenance|repair/i.test(String(r.status ?? ""))).length;
        if (oos) buckets.critical_now.push({ issue: "Trucks out of service", count: oos, severity: "critical", explanation: "Units unavailable for dispatch.", module: "/ronyx/maintenance/breakdowns" });
        if (maint) buckets.needs_attention_today.push({ issue: "Trucks in maintenance", count: maint, severity: "warning", explanation: "Units in the shop today.", module: "/ronyx/maintenance" });
      }

      // Tickets: exceptions.
      const tk = await selectScoped(ctx.sb, "aggregate_tickets",
        ["signature_present", "has_signature", "ocr_confidence", "reconciliation_status", "missing_fields", "billing_ready", "organization_id"],
        (q) => q.eq("organization_id", ctx.orgId), 1000);
      if (!tk.error) {
        let exc = 0, ready = 0;
        for (const r of tk.data ?? []) {
          const sigMissing = r.signature_present === false || r.has_signature === false;
          const lowOcr = typeof r.ocr_confidence === "number" && r.ocr_confidence < 0.7;
          const recon = typeof r.reconciliation_status === "string" && /exception/i.test(r.reconciliation_status);
          const missing = Array.isArray(r.missing_fields) && r.missing_fields.length > 0;
          if (sigMissing || lowOcr || recon || missing) exc++;
          if (r.billing_ready === true) ready++;
        }
        if (exc) buckets.needs_attention_today.push({ issue: "Ticket exceptions", count: exc, severity: "warning", explanation: "Missing signatures, low OCR confidence, or reconciliation exceptions.", module: "/ronyx/tickets?tab=needs_review" });
        if (ready) buckets.ready_for_next_step.push({ issue: "Tickets ready to bill", count: ready, severity: "info", explanation: "Billing-ready tickets awaiting invoicing.", module: "/ronyx/billing?tab=customer_billing" });
      }

      // Customer clearance blockers.
      const cc = await selectScoped(ctx.sb, "customer_dispatch_requirements",
        ["blocks_dispatch", "is_active", "organization_id"], (q) => q.eq("organization_id", ctx.orgId), 1000);
      if (!cc.error) {
        const blocking = (cc.data ?? []).filter((r: any) => r.is_active !== false && r.blocks_dispatch === true).length;
        if (blocking) buckets.needs_attention_today.push({ issue: "Customer clearance requirements blocking dispatch", count: blocking, severity: "warning", explanation: "Open requirements that prevent dispatch.", module: "/ronyx/compliance/customer-dispatch-requirements" });
      }

      const flat: Record<string, unknown>[] = [];
      for (const [group, items] of Object.entries(buckets)) for (const it of items) flat.push({ group, ...it });
      return { ok: true, status: "ok", count: flat.length, capped: false, rows: flat, summary: { groups: buckets } };
    },
  },
];

// ── reference tools (built-in trucking knowledge — NOT org data, NOT legal advice) ──
RORY_TOOLS.push(
  {
    name: "get_state_trucking_rules",
    description:
      "Call this for a STATE's operational trucking rules: max gross/axle weight, width, height, trailer length, seasonal chain laws, idling limits, and the oversize/overweight permit office. Use for 'what's the weight limit in Texas?', 'does Colorado have a chain law?', 'max height in California?', 'who issues oversize permits in Ohio?'. Built-in reference data (every state + DC), not the org's records.",
    maxResults: 1,
    input: z.object({
      state: z.string().optional(),
      topic: z.enum(["weight", "dimensions", "axles", "chains", "idling", "permits", "all"]).optional(),
    }),
    jsonSchema: {
      type: "object", additionalProperties: false,
      properties: {
        state: { type: "string", description: "State name or 2-letter abbreviation (e.g. 'Texas' or 'TX'). Omit to get the federal baseline." },
        topic: { type: "string", enum: ["weight", "dimensions", "axles", "chains", "idling", "permits", "all"], description: "Optional focus area." },
      },
    },
    async execute(input) {
      const i = input as { state?: string };
      if (!i.state) {
        return { ok: true, status: "ok", count: 0, capped: false, rows: [], summary: { federal: FEDERAL_TRUCKING, available_states: ALL_STATE_NAMES, disclaimer: DISCLAIMER, note: "Specify a state for state-specific limits." } };
      }
      const rule = lookupStateRule(i.state);
      if (!rule) return { ok: true, status: "ok", count: 0, capped: false, rows: [], note: `No reference found for "${i.state}".`, summary: { available_states: ALL_STATE_NAMES, disclaimer: DISCLAIMER } };
      return { ok: true, status: "ok", count: 1, capped: false, rows: [rule], summary: { federal: FEDERAL_TRUCKING, disclaimer: DISCLAIMER } };
    },
  },
  {
    name: "get_trucking_requirements",
    description:
      "Call this for FEDERAL trucking compliance requirements — what it takes to operate legally: operating authority (USDOT/MC, UCR, BOC-3), driver qualification (CDL classes & endorsements, DOT medical card, drug & alcohol testing + FMCSA Clearinghouse, ELDT), hours of service & ELD, vehicle inspection (annual DOT, DVIR), insurance minimums, taxes/registration (IRP, IFTA, UCR, Form 2290/HVUT), hazmat, and FOREIGN DRIVER LICENSING (Mexico & Venezuela drivers driving in Texas/US). Use for 'what insurance do I need?', 'CDL endorsements?', 'can a Mexican/Venezuelan driver drive in Texas?', 'what's required to run interstate?'. Built-in reference, not legal advice.",
    maxResults: 12,
    input: z.object({
      topic: z.enum(["operating_authority", "driver_qualification", "cdl", "medical_card", "drug_alcohol", "hours_of_service", "eld", "vehicle_inspection", "insurance", "taxes_registration", "hazmat", "foreign_driver_licensing", "all"]).optional(),
    }),
    jsonSchema: {
      type: "object", additionalProperties: false,
      properties: {
        topic: { type: "string", enum: ["operating_authority", "driver_qualification", "cdl", "medical_card", "drug_alcohol", "hours_of_service", "eld", "vehicle_inspection", "insurance", "taxes_registration", "hazmat", "foreign_driver_licensing", "all"], description: "Optional area to focus on (e.g. foreign_driver_licensing for Mexico/Venezuela drivers). Omit for an overview of all categories." },
      },
    },
    async execute(input) {
      const i = input as { topic?: string };
      const all = TRUCKING_REQUIREMENTS;
      if (!i.topic || i.topic === "all") {
        const rows = Object.entries(all).map(([key, v]) => ({ topic: key, title: v.title, items: v.items }));
        return { ok: true, status: "ok", count: rows.length, capped: false, rows, summary: { disclaimer: DISCLAIMER } };
      }
      const block = (all as Record<string, { title: string; items: string[] }>)[i.topic];
      if (!block) return { ok: true, status: "ok", count: 0, capped: false, rows: [], note: `No reference for "${i.topic}".`, summary: { topics: Object.keys(all), disclaimer: DISCLAIMER } };
      return { ok: true, status: "ok", count: 1, capped: false, rows: [{ topic: i.topic, title: block.title, items: block.items }], summary: { disclaimer: DISCLAIMER } };
    },
  },
);

export const RORY_TOOLS_BY_NAME: Record<string, RoryTool> = Object.fromEntries(RORY_TOOLS.map((t) => [t.name, t]));

// Anthropic tool definitions (name/description/input_schema) for messages.create.
export function anthropicToolDefs() {
  return RORY_TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.jsonSchema }));
}
