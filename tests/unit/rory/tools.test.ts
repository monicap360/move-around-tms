import { describe, it, expect } from "vitest";
import {
  RORY_TOOLS,
  RORY_TOOLS_BY_NAME,
  anthropicToolDefs,
} from "../../../lib/rory/tools";
import { logRoryAudit } from "../../../lib/rory/audit";

// ── Minimal in-memory Supabase mock that simulates org-scoped filtering ───────
// Captures every .eq() filter, applies eq/ilike/gte/lte/in to a configured
// dataset, honours .limit(), and records inserts. Lets us prove tenant isolation,
// result caps, redaction, no-data behaviour, and audit writes WITHOUT a live DB.

type Dataset = Record<string, Record<string, unknown>[] | "ERROR">;

function makeSb(config: Dataset) {
  const sink = { inserted: [] as { table: string; obj: any }[], eqFilters: [] as { table: string; col: string; val: unknown }[] };

  class QB {
    _filters: [string, string, unknown][] = [];
    _limit = Infinity;
    _inserted = false;
    constructor(public table: string) {}
    select() { return this; }
    insert(obj: any) { this._inserted = true; sink.inserted.push({ table: this.table, obj }); return this; }
    limit(n: number) { this._limit = n; return this; }
    eq(c: string, v: unknown) { this._filters.push(["eq", c, v]); sink.eqFilters.push({ table: this.table, col: c, val: v }); return this; }
    ilike(c: string, v: unknown) { this._filters.push(["ilike", c, v]); return this; }
    gte(c: string, v: unknown) { this._filters.push(["gte", c, v]); return this; }
    lte(c: string, v: unknown) { this._filters.push(["lte", c, v]); return this; }
    in(c: string, v: unknown) { this._filters.push(["in", c, v]); return this; }
    not() { return this; }
    _resolve() {
      if (this._inserted) return { data: null, error: null };
      const cfg = config[this.table];
      if (!cfg || cfg === "ERROR") return { data: null, error: { message: `no ${this.table}` } };
      let rows = [...(cfg as Record<string, unknown>[])];
      for (const [op, c, v] of this._filters) {
        rows = rows.filter((r) => {
          const cell = r[c];
          if (op === "eq") return cell === v;
          if (op === "ilike") return String(cell ?? "").toLowerCase().includes(String(v).replace(/%/g, "").toLowerCase());
          if (op === "gte") return String(cell ?? "") >= String(v);
          if (op === "lte") return String(cell ?? "") <= String(v);
          if (op === "in") return Array.isArray(v) && (v as unknown[]).includes(cell);
          return true;
        });
      }
      if (this._limit < rows.length) rows = rows.slice(0, this._limit);
      return { data: rows, error: null };
    }
    maybeSingle() { const r = this._resolve(); return Promise.resolve({ data: (r.data && r.data[0]) || null, error: r.error }); }
    single() { const r = this._resolve(); return Promise.resolve({ data: (r.data && r.data[0]) || null, error: r.error }); }
    then(onF: any, onR?: any) { return Promise.resolve(this._resolve()).then(onF, onR); }
  }

  const sb = { from: (t: string) => new QB(t) } as any;
  return { sb, sink };
}

const ORG_A = "org-aaaa";
const ORG_B = "org-bbbb";
const tool = (name: string) => RORY_TOOLS_BY_NAME[name];

describe("Rory registry", () => {
  it("declares exactly the 9 approved tools and nothing else is callable", () => {
    const names = RORY_TOOLS.map((t) => t.name).sort();
    expect(names).toEqual([
      "find_dispatch_eligible_drivers",
      "get_billing_ready_summary",
      "get_customer_clearance_status",
      "get_driver_compliance_alerts",
      "get_driver_or_owner_operator_status",
      "get_fleet_readiness",
      "get_operations_priority_summary",
      "get_payroll_review_summary",
      "get_ticket_exceptions",
    ]);
    // Undeclared tools are not resolvable (route returns is_error for these).
    expect(RORY_TOOLS_BY_NAME["delete_everything"]).toBeUndefined();
    expect(RORY_TOOLS_BY_NAME["run_sql"]).toBeUndefined();
  });

  it("exposes Anthropic tool defs with locked-down JSON schemas", () => {
    const defs = anthropicToolDefs();
    expect(defs).toHaveLength(9);
    for (const d of defs) {
      expect(d.input_schema).toMatchObject({ type: "object", additionalProperties: false });
    }
  });
});

describe("Tenant isolation", () => {
  it("a user in Org A never receives Org B records", async () => {
    const { sb, sink } = makeSb({
      drivers: [
        { full_name: "Alice OrgA", status: "active", dispatch_eligible: true, organization_id: ORG_A },
        { full_name: "ZZ_Bob_OrgB", status: "active", dispatch_eligible: true, organization_id: ORG_B },
      ],
    });
    const res = await tool("find_dispatch_eligible_drivers").execute({}, { sb, orgId: ORG_A });
    const names = res.rows.map((r) => r.full_name);
    expect(names).toContain("Alice OrgA");
    expect(names).not.toContain("ZZ_Bob_OrgB");
    // The org filter was applied with the server-resolved org, never Org B.
    expect(sink.eqFilters.some((f) => f.col === "organization_id" && f.val === ORG_A)).toBe(true);
    expect(sink.eqFilters.some((f) => f.val === ORG_B)).toBe(false);
  });

  it("a forged org_id in the tool input is ignored — only ctx.orgId is used", async () => {
    const { sb, sink } = makeSb({
      drivers: [
        { full_name: "Alice OrgA", status: "active", dispatch_eligible: true, organization_id: ORG_A },
        { full_name: "ZZ_Bob_OrgB", status: "active", dispatch_eligible: true, organization_id: ORG_B },
      ],
    });
    // Attacker tries to smuggle a different org through the input payload.
    await tool("find_dispatch_eligible_drivers").execute(
      { organization_id: ORG_B, orgId: ORG_B } as any,
      { sb, orgId: ORG_A },
    );
    expect(sink.eqFilters.some((f) => f.col === "organization_id" && f.val === ORG_B)).toBe(false);
    expect(sink.eqFilters.some((f) => f.col === "organization_id" && f.val === ORG_A)).toBe(true);
  });
});

describe("Safe behaviour", () => {
  it("returns a clean no-data answer when there are no matching records", async () => {
    const { sb } = makeSb({ drivers: [] });
    const res = await tool("find_dispatch_eligible_drivers").execute({}, { sb, orgId: ORG_A });
    expect(res.ok).toBe(true);
    expect(res.status).toBe("ok");
    expect(res.count).toBe(0);
    expect(res.rows).toEqual([]);
  });

  it("returns no_data_source (not a crash) when the table is unavailable", async () => {
    const { sb } = makeSb({ ronyx_trucks: "ERROR" });
    const res = await tool("get_fleet_readiness").execute({}, { sb, orgId: ORG_A });
    expect(res.ok).toBe(false);
    expect(res.status).toBe("no_data_source");
  });

  it("caps results and reports truncation", async () => {
    const many = Array.from({ length: 130 }, (_, i) => ({ truck_number: `T${i}`, status: "available", organization_id: ORG_A }));
    const { sb } = makeSb({ ronyx_trucks: many });
    const res = await tool("get_fleet_readiness").execute({}, { sb, orgId: ORG_A });
    expect(res.rows.length).toBe(tool("get_fleet_readiness").maxResults); // 100
    expect(res.capped).toBe(true);
  });
});

describe("Field redaction", () => {
  it("compliance alerts expose only permitted fields — no internal id, org id, or raw license number", async () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const { sb } = makeSb({
      drivers: [{
        id: "secret-uuid",
        full_name: "Carl Driver",
        license_number: "DL-PRIVATE-999",
        license_expiration_date: soon.toISOString().slice(0, 10),
        assigned_truck_number: "T7",
        organization_id: ORG_A,
      }],
    });
    const res = await tool("get_driver_compliance_alerts").execute({ daysAhead: 30 }, { sb, orgId: ORG_A });
    expect(res.count).toBe(1);
    const keys = Object.keys(res.rows[0]);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("organization_id");
    expect(keys).not.toContain("license_number");
    expect(keys).not.toContain("full_name"); // exposed only as the redacted "driver" field
    expect(res.rows[0].driver).toBe("Carl Driver");
    expect(JSON.stringify(res.rows[0])).not.toContain("DL-PRIVATE-999");
  });
});

describe("Audit logging", () => {
  it("writes an org-scoped audit row for a successful tool call", async () => {
    const { sb, sink } = makeSb({});
    logRoryAudit(sb, { organization_id: ORG_A, tool_name: "find_dispatch_eligible_drivers", result_count: 3, response_status: "ok" });
    await Promise.resolve();
    expect(sink.inserted).toHaveLength(1);
    expect(sink.inserted[0].table).toBe("ai_operations_audit_log");
    expect(sink.inserted[0].obj).toMatchObject({ organization_id: ORG_A, response_status: "ok", result_count: 3 });
  });

  it("writes an audit row for a failed/blocked attempt", async () => {
    const { sb, sink } = makeSb({});
    logRoryAudit(sb, { organization_id: ORG_A, tool_name: "run_sql", response_status: "blocked", error_detail: "Undeclared tool requested" });
    await Promise.resolve();
    expect(sink.inserted).toHaveLength(1);
    expect(sink.inserted[0].obj.response_status).toBe("blocked");
  });
});
