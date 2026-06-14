"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type ColMap = {
  ticket_number?: string;
  date?: string;
  truck?: string;
  driver?: string;
  material?: string;
  tons?: string;
  rate?: string;
  amount?: string;
  project?: string;
};

type ParsedRow = Record<string, string>;

type MatchStatus = "Matched" | "Conflict" | "No Match" | "Duplicate" | "Partial";

type CrossCheckResult = {
  id: string;
  matchStatus: MatchStatus;
  matchStrategy: string;
  invoiceRow: ParsedRow | null;
  excelRow: ParsedRow | null;
  systemRow: ParsedRow | null;
  ticketNo: string;
  date: string;
  driver: string;
  truck: string;
  project: string;
  material: string;
  invoiceTons: number | null;
  excelTons: number | null;
  systemTons: number | null;
  invoiceRate: number | null;
  excelRate: number | null;
  systemRate: number | null;
  invoiceAmt: number | null;
  excelAmt: number | null;
  systemAmt: number | null;
  weightVariancePct: number | null;
  exceptions: string[];
  payrollStatus: "Ready" | "Hold" | "Pending";
  billingStatus: "Ready" | "Hold" | "Pending";
};

// ── Normalization helpers ──────────────────────────────────────────────────────

function normTicket(s: string): string {
  return s.toLowerCase().replace(/[\s\-_#]/g, "").replace(/^0+/, "");
}

function normNum(s: string): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[,$\s]/g, ""));
  return isNaN(n) ? null : n;
}

function normDateStr(s: string): string {
  if (!s) return "";
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return `${y}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return s.slice(0, 10);
}

function normStr(s: string): string {
  return (s || "").trim().toLowerCase();
}

// ── Auto-map columns by header name pattern ────────────────────────────────────

const COL_PATTERNS: Record<keyof ColMap, RegExp> = {
  ticket_number: /ticket|tkt|ticket#|ticket_no|ticket_num|load#/i,
  date:          /^date$|load.?date|delivery.?date|ticket.?date|service.?date/i,
  truck:         /truck|unit#|unit_no|vehicle|tractor/i,
  driver:        /driver|operator|chauffeur/i,
  material:      /material|product|commodity|type|description/i,
  tons:          /^tons$|net.?tons|weight|qty|quantity|net_wt/i,
  rate:          /^rate$|unit.?price|price|rate_ton/i,
  amount:        /^amount$|total|gross|revenue|charge|invoice.?amt/i,
  project:       /project|job#|job_no|job_num|order/i,
};

function autoMap(headers: string[]): ColMap {
  const map: ColMap = {};
  for (const [field, pattern] of Object.entries(COL_PATTERNS)) {
    const found = headers.find(h => pattern.test(h.trim()));
    if (found) (map as any)[field] = found;
  }
  return map;
}

function getField(row: ParsedRow, map: ColMap, field: keyof ColMap): string {
  const col = map[field];
  return col ? (row[col] || "") : "";
}

// ── Parse TSV/tab text into rows ───────────────────────────────────────────────

function parseTabRows(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split("\t").map(h => h.trim());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split("\t");
    if (parts.every(p => !p.trim())) continue;
    const row: ParsedRow = {};
    headers.forEach((h, j) => { row[h] = (parts[j] || "").trim(); });
    rows.push(row);
  }
  return { headers, rows };
}

// ── Matching engine ────────────────────────────────────────────────────────────

function runCrossCheck(
  invoiceRows: ParsedRow[], excelRows: ParsedRow[], systemRows: ParsedRow[],
  invMap: ColMap, xlMap: ColMap, sysMap: ColMap
): CrossCheckResult[] {
  const results: CrossCheckResult[] = [];
  const usedExcel = new Set<number>();
  const usedSystem = new Set<number>();

  function buildResult(
    id: string,
    inv: ParsedRow | null,
    xl: ParsedRow | null,
    sys: ParsedRow | null,
    strategy: string
  ): CrossCheckResult {
    const invTons = inv ? normNum(getField(inv, invMap, "tons")) : null;
    const xlTons  = xl  ? normNum(getField(xl,  xlMap,  "tons")) : null;
    const sysTons = sys ? normNum(getField(sys, sysMap, "tons")) : null;
    const invRate = inv ? normNum(getField(inv, invMap, "rate")) : null;
    const xlRate  = xl  ? normNum(getField(xl,  xlMap,  "rate")) : null;
    const sysRate = sys ? normNum(getField(sys, sysMap, "rate")) : null;
    const invAmt  = inv ? normNum(getField(inv, invMap, "amount")) : null;
    const xlAmt   = xl  ? normNum(getField(xl,  xlMap,  "amount")) : null;
    const sysAmt  = sys ? normNum(getField(sys, sysMap, "amount")) : null;

    const ticketNo = getField(inv || xl || sys || {}, inv ? invMap : xl ? xlMap : sysMap, "ticket_number");
    const date     = normDateStr(getField(inv || xl || sys || {}, inv ? invMap : xl ? xlMap : sysMap, "date"));
    const driver   = getField(inv || xl || sys || {}, inv ? invMap : xl ? xlMap : sysMap, "driver");
    const truck    = getField(inv || xl || sys || {}, inv ? invMap : xl ? xlMap : sysMap, "truck");
    const project  = getField(inv || xl || sys || {}, inv ? invMap : xl ? xlMap : sysMap, "project");
    const material = getField(inv || xl || sys || {}, inv ? invMap : xl ? xlMap : sysMap, "material");

    const exceptions: string[] = [];

    // Weight variance check (>2%)
    const refTons = invTons ?? xlTons ?? sysTons;
    const cmpTons = refTons !== null && sysTons !== null && refTons !== sysTons ? sysTons : null;
    let weightVariancePct: number | null = null;
    if (refTons && cmpTons) {
      weightVariancePct = Math.abs((refTons - cmpTons) / refTons) * 100;
      if (weightVariancePct > 2) exceptions.push("Weight Variance");
    }
    if (invTons && xlTons && Math.abs(invTons - xlTons) / invTons > 0.02) exceptions.push("Invoice/Excel Ton Mismatch");

    // Rate conflict
    const rates = [invRate, xlRate, sysRate].filter(r => r !== null) as number[];
    if (rates.length > 1 && new Set(rates.map(r => Math.round(r * 100))).size > 1) exceptions.push("Rate Conflict");

    // Missing source flags
    if (!inv) exceptions.push("Not on Invoice");
    if (!xl)  exceptions.push("Not on Excel");
    if (!sys) exceptions.push("Not in System");

    // Date mismatch between sources
    const dates = [
      inv ? normDateStr(getField(inv, invMap, "date")) : null,
      xl  ? normDateStr(getField(xl,  xlMap,  "date")) : null,
      sys ? normDateStr(getField(sys, sysMap, "date")) : null,
    ].filter(Boolean) as string[];
    if (dates.length > 1 && new Set(dates).size > 1) exceptions.push("Date Mismatch");

    const presentSources = [inv, xl, sys].filter(Boolean).length;
    let matchStatus: MatchStatus = "No Match";
    if (presentSources === 3) {
      matchStatus = exceptions.some(e => ["Weight Variance", "Rate Conflict", "Date Mismatch", "Invoice/Excel Ton Mismatch"].includes(e))
        ? "Conflict"
        : "Matched";
    } else if (presentSources === 2) {
      matchStatus = "Partial";
    } else if (presentSources === 1 && !inv && !xl) {
      matchStatus = "No Match";
    }

    const payrollStatus: CrossCheckResult["payrollStatus"] =
      exceptions.length > 0 ? "Hold" : presentSources >= 2 ? "Ready" : "Pending";
    const billingStatus: CrossCheckResult["billingStatus"] =
      exceptions.length > 0 ? "Hold" : presentSources >= 2 ? "Ready" : "Pending";

    return {
      id, matchStatus, matchStrategy: strategy,
      invoiceRow: inv, excelRow: xl, systemRow: sys,
      ticketNo, date, driver, truck, project, material,
      invoiceTons: invTons, excelTons: xlTons, systemTons: sysTons,
      invoiceRate: invRate, excelRate: xlRate, systemRate: sysRate,
      invoiceAmt: invAmt, excelAmt: xlAmt, systemAmt: sysAmt,
      weightVariancePct, exceptions,
      payrollStatus, billingStatus,
    };
  }

  // For each invoice row, find best match in excel and system
  invoiceRows.forEach((inv, i) => {
    const invTicket = normTicket(getField(inv, invMap, "ticket_number"));
    const invDate   = normDateStr(getField(inv, invMap, "date"));
    const invTruck  = normStr(getField(inv, invMap, "truck"));
    const invMat    = normStr(getField(inv, invMap, "material"));
    const invTons   = getField(inv, invMap, "tons");

    let matchedXl: number | null  = null;
    let matchedSys: number | null = null;
    let strategy = "No Match";

    // Strategy 1: exact ticket number
    if (invTicket) {
      const xiExact = excelRows.findIndex((xl, j) => !usedExcel.has(j) && normTicket(getField(xl, xlMap, "ticket_number")) === invTicket);
      const siExact = systemRows.findIndex((s, j) => !usedSystem.has(j) && normTicket(getField(s, sysMap, "ticket_number")) === invTicket);
      if (xiExact >= 0 || siExact >= 0) {
        matchedXl  = xiExact >= 0 ? xiExact : null;
        matchedSys = siExact >= 0 ? siExact : null;
        strategy   = "Exact Ticket #";
      }
    }

    // Strategy 2: truck + date + material
    if (matchedXl === null && matchedSys === null && invTruck && invDate && invMat) {
      const xiTDM = excelRows.findIndex((xl, j) => !usedExcel.has(j)
        && normStr(getField(xl, xlMap, "truck"))    === invTruck
        && normDateStr(getField(xl, xlMap, "date")) === invDate
        && normStr(getField(xl, xlMap, "material")) === invMat
      );
      const siTDM = systemRows.findIndex((s, j) => !usedSystem.has(j)
        && normStr(getField(s, sysMap, "truck"))    === invTruck
        && normDateStr(getField(s, sysMap, "date")) === invDate
        && normStr(getField(s, sysMap, "material")) === invMat
      );
      if (xiTDM >= 0 || siTDM >= 0) {
        matchedXl  = xiTDM >= 0 ? xiTDM : null;
        matchedSys = siTDM >= 0 ? siTDM : null;
        strategy   = "Truck + Date + Material";
      }
    }

    // Strategy 3: date + material + tons
    if (matchedXl === null && matchedSys === null && invDate && invMat && invTons) {
      const nt = normNum(invTons);
      const xiDMT = excelRows.findIndex((xl, j) => !usedExcel.has(j)
        && normDateStr(getField(xl, xlMap, "date")) === invDate
        && normStr(getField(xl, xlMap, "material")) === invMat
        && Math.abs((normNum(getField(xl, xlMap, "tons")) ?? -999) - (nt ?? -998)) < 0.05
      );
      if (xiDMT >= 0) { matchedXl = xiDMT; strategy = "Date + Material + Tons"; }
    }

    if (matchedXl !== null) usedExcel.add(matchedXl);
    if (matchedSys !== null) usedSystem.add(matchedSys);

    results.push(buildResult(
      `cc-${i}`,
      inv,
      matchedXl !== null ? excelRows[matchedXl] : null,
      matchedSys !== null ? systemRows[matchedSys] : null,
      strategy
    ));
  });

  // Excel rows that didn't match any invoice
  excelRows.forEach((xl, j) => {
    if (usedExcel.has(j)) return;
    const xlTicket = normTicket(getField(xl, xlMap, "ticket_number"));
    let matchedSys: number | null = null;
    if (xlTicket) {
      const si = systemRows.findIndex((s, k) => !usedSystem.has(k) && normTicket(getField(s, sysMap, "ticket_number")) === xlTicket);
      if (si >= 0) { matchedSys = si; usedSystem.add(si); }
    }
    results.push(buildResult(`cc-xl-${j}`, null, xl, matchedSys !== null ? systemRows[matchedSys] : null, matchedSys !== null ? "Excel+System Only" : "Excel Only"));
  });

  // System rows that didn't match anything
  systemRows.forEach((s, k) => {
    if (usedSystem.has(k)) return;
    results.push(buildResult(`cc-sys-${k}`, null, null, s, "System Only"));
  });

  // Duplicate detection
  const ticketCounts = new Map<string, number>();
  results.forEach(r => {
    const n = normTicket(r.ticketNo);
    if (n) ticketCounts.set(n, (ticketCounts.get(n) || 0) + 1);
  });
  results.forEach(r => {
    const n = normTicket(r.ticketNo);
    if (n && (ticketCounts.get(n) || 0) > 1) {
      if (!r.exceptions.includes("Duplicate")) r.exceptions.push("Duplicate");
      if (r.matchStatus === "Matched") r.matchStatus = "Duplicate";
    }
  });

  return results;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<MatchStatus, { bg: string; color: string; border: string }> = {
  Matched:   { bg: "#dcfce7", color: "#16a34a", border: "#bbf7d0" },
  Conflict:  { bg: "#fef3c7", color: "#d97706", border: "#fde68a" },
  "No Match":{ bg: "#fee2e2", color: "#dc2626", border: "#fecaca" },
  Duplicate: { bg: "#ede9fe", color: "#7c3aed", border: "#ddd6fe" },
  Partial:   { bg: "#dbeafe", color: "#2563eb", border: "#bfdbfe" },
};

const PAYROLL_COLORS = { Ready: "#16a34a", Hold: "#dc2626", Pending: "#d97706" };

function Badge({ text, bg, color, border }: { text: string; bg: string; color: string; border: string }) {
  return (
    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: bg, color, border: `1px solid ${border}` }}>
      {text}
    </span>
  );
}

function fmt(n: number | null, dec = 2) {
  if (n === null) return <span style={{ color: "#cbd5e1" }}>—</span>;
  return n.toFixed(dec);
}

const STD_FIELDS: { key: keyof ColMap; label: string }[] = [
  { key: "ticket_number", label: "Ticket #" },
  { key: "date",          label: "Date" },
  { key: "truck",         label: "Truck" },
  { key: "driver",        label: "Driver" },
  { key: "material",      label: "Material" },
  { key: "tons",          label: "Tons" },
  { key: "rate",          label: "Rate" },
  { key: "amount",        label: "Amount" },
  { key: "project",       label: "Project #" },
];

// ── Column Mapper ─────────────────────────────────────────────────────────────

function ColMapper({ label, headers, map, onChange }: { label: string; headers: string[]; map: ColMap; onChange: (m: ColMap) => void }) {
  return (
    <div>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label} Columns</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {STD_FIELDS.map(f => (
          <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.72rem", color: "#64748b", width: 68, flexShrink: 0 }}>{f.label}</span>
            <select
              value={(map as any)[f.key] || ""}
              onChange={e => onChange({ ...map, [f.key]: e.target.value || undefined })}
              style={{ flex: 1, padding: "4px 6px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: "0.72rem", background: "#f8fafc", outline: "none" }}
            >
              <option value="">— skip —</option>
              {headers.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Side-by-side Drawer ───────────────────────────────────────────────────────

function CompareDrawer({ result, onClose }: { result: CrossCheckResult; onClose: () => void }) {
  const sc = STATUS_COLORS[result.matchStatus];

  function SrcPanel({ title, row, map, color }: { title: string; row: ParsedRow | null; map: ColMap; color: string }) {
    return (
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ fontWeight: 700, fontSize: "0.8rem", color, marginBottom: 10, paddingBottom: 6, borderBottom: `2px solid ${color}` }}>{title}</div>
        {!row ? (
          <div style={{ color: "#94a3b8", fontSize: "0.78rem", padding: "12px 0" }}>Not found in this source</div>
        ) : (
          STD_FIELDS.map(f => {
            const val = getField(row, map, f.key);
            return (
              <div key={f.key} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.label}</div>
                <div style={{ fontSize: "0.82rem", color: val ? "#0f172a" : "#cbd5e1", fontWeight: val ? 600 : 400 }}>{val || "—"}</div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "stretch", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.5)" }} onClick={onClose} />
      <div style={{ position: "relative", width: 680, background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", background: sc.bg, display: "flex", alignItems: "center", gap: 12 }}>
          <Badge text={result.matchStatus} {...sc} />
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Ticket #{result.ticketNo || "—"}</span>
          <span style={{ fontSize: "0.78rem", color: "#64748b", marginLeft: "auto" }}>{result.matchStrategy}</span>
          <button onClick={onClose} style={{ marginLeft: 8, background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "#94a3b8" }}>✕</button>
        </div>

        {/* Exceptions */}
        {result.exceptions.length > 0 && (
          <div style={{ padding: "12px 24px", background: "#fef3c7", borderBottom: "1px solid #fde68a", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {result.exceptions.map(e => (
              <span key={e} style={{ fontSize: "0.72rem", fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fff", border: "1px solid #f59e0b", color: "#92400e" }}>{e}</span>
            ))}
          </div>
        )}

        {/* Three sources side by side */}
        <div style={{ padding: 24, display: "flex", gap: 20, flex: 1 }}>
          <SrcPanel title="📄 Pit Invoice" row={result.invoiceRow} map={{}} color="#2563eb" />
          <div style={{ width: 1, background: "#e2e8f0" }} />
          <SrcPanel title="📊 Master Excel" row={result.excelRow} map={{}} color="#7c3aed" />
          <div style={{ width: 1, background: "#e2e8f0" }} />
          <SrcPanel title="💻 System" row={result.systemRow} map={{}} color="#0f172a" />
        </div>

        {/* Variance summary */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            ["Tons (Invoice)", result.invoiceTons !== null ? `${result.invoiceTons.toFixed(2)} T` : "—"],
            ["Tons (Excel)",   result.excelTons !== null  ? `${result.excelTons.toFixed(2)} T`  : "—"],
            ["Tons (System)",  result.systemTons !== null ? `${result.systemTons.toFixed(2)} T` : "—"],
            ["Rate (Invoice)", result.invoiceRate !== null ? `$${result.invoiceRate.toFixed(2)}` : "—"],
            ["Rate (Excel)",   result.excelRate !== null  ? `$${result.excelRate.toFixed(2)}`  : "—"],
            ["Wt Variance",    result.weightVariancePct !== null ? `${result.weightVariancePct.toFixed(1)}%` : "—"],
          ].map(([k, v]) => (
            <div key={String(k)} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.66rem", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{k}</div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── File upload handler ────────────────────────────────────────────────────────

async function parseUpload(file: File): Promise<{ headers: string[]; rows: ParsedRow[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (["csv", "xlsx", "xls", "xlsm", "pdf"].includes(ext)) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/ronyx/owner-operators/parse-file", { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return parseTabRows(data.text || "");
  }
  // TSV / TXT — read in browser
  const text = await file.text();
  return parseTabRows(text);
}

// ── Map system API tickets to ParsedRow ───────────────────────────────────────

function sysTicketToRow(t: any): ParsedRow {
  const tons  = t.tons || t.quantity || t.net_weight || "";
  const rate  = t.pay_rate || t.bill_rate || t.rate || t.rate_amount || "";
  const total = t.total_amount || t.gross_amount || (parseFloat(String(tons)) * parseFloat(String(rate))) || "";
  return {
    ticket_number: t.ticket_number || t.ticketNo || "",
    date:          t.ticket_date   || t.ticketDate || t.date || "",
    truck:         t.truck_number  || t.unit_number || t.truck || "",
    driver:        t.driver_name   || t.driver || "",
    material:      t.material      || t.material_type || "",
    tons:          String(tons),
    rate:          String(rate),
    amount:        String(total),
    project:       t.customer_name || t.client_name || t.customer || t.jobsite || "",
  };
}

const SYS_MAP: ColMap = {
  ticket_number: "ticket_number",
  date: "date",
  truck: "truck",
  driver: "driver",
  material: "material",
  tons: "tons",
  rate: "rate",
  amount: "amount",
  project: "project",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CrossCheckPage() {
  // Invoice source
  const [invFile, setInvFile]       = useState<File | null>(null);
  const [invRows, setInvRows]       = useState<ParsedRow[]>([]);
  const [invHeaders, setInvHeaders] = useState<string[]>([]);
  const [invMap, setInvMap]         = useState<ColMap>({});
  const [invLoading, setInvLoading] = useState(false);

  // Excel source
  const [xlFile, setXlFile]       = useState<File | null>(null);
  const [xlRows, setXlRows]       = useState<ParsedRow[]>([]);
  const [xlHeaders, setXlHeaders] = useState<string[]>([]);
  const [xlMap, setXlMap]         = useState<ColMap>({});
  const [xlLoading, setXlLoading] = useState(false);

  // System tickets
  const [sysRows, setSysRows]       = useState<ParsedRow[]>([]);
  const [sysLoading, setSysLoading] = useState(false);

  // Results
  const [results, setResults]       = useState<CrossCheckResult[]>([]);
  const [running, setRunning]       = useState(false);
  const [selected, setSelected]     = useState<CrossCheckResult | null>(null);
  const [tab, setTab]               = useState<"results" | "exceptions">("results");
  const [filterStatus, setFilterStatus] = useState<MatchStatus | "">("");
  const [filterExc, setFilterExc]   = useState("");

  const invRef = useRef<HTMLInputElement>(null);
  const xlRef  = useRef<HTMLInputElement>(null);

  // Load system tickets on mount
  useEffect(() => {
    setSysLoading(true);
    fetch("/api/ronyx/tickets?limit=2000")
      .then(r => r.json())
      .then(d => {
        const tickets = d.tickets || d.data || [];
        setSysRows(tickets.map(sysTicketToRow));
      })
      .catch(() => {})
      .finally(() => setSysLoading(false));
  }, []);

  async function handleInvFile(file: File) {
    setInvFile(file); setInvLoading(true);
    try {
      const { headers, rows } = await parseUpload(file);
      setInvHeaders(headers);
      setInvRows(rows);
      setInvMap(autoMap(headers));
    } catch (e: any) { alert("Parse error: " + e.message); }
    finally { setInvLoading(false); }
  }

  async function handleXlFile(file: File) {
    setXlFile(file); setXlLoading(true);
    try {
      const { headers, rows } = await parseUpload(file);
      setXlHeaders(headers);
      setXlRows(rows);
      setXlMap(autoMap(headers));
    } catch (e: any) { alert("Parse error: " + e.message); }
    finally { setXlLoading(false); }
  }

  function runCheck() {
    setRunning(true);
    setTimeout(() => {
      const r = runCrossCheck(invRows, xlRows, sysRows, invMap, xlMap, SYS_MAP);
      setResults(r);
      setRunning(false);
      setTab("results");
    }, 100);
  }

  const kpis = useMemo(() => {
    if (!results.length) return null;
    const total       = results.length;
    const matched     = results.filter(r => r.matchStatus === "Matched").length;
    const conflict    = results.filter(r => r.matchStatus === "Conflict").length;
    const noMatch     = results.filter(r => r.matchStatus === "No Match").length;
    const duplicate   = results.filter(r => r.matchStatus === "Duplicate").length;
    const partial     = results.filter(r => r.matchStatus === "Partial").length;
    const wVariance   = results.filter(r => r.exceptions.includes("Weight Variance")).length;
    const rateConflict= results.filter(r => r.exceptions.includes("Rate Conflict")).length;
    const payrollRdy  = results.filter(r => r.payrollStatus === "Ready").length;
    const billingRdy  = results.filter(r => r.billingStatus === "Ready").length;
    const totalSysTons= results.reduce((s, r) => s + (r.systemTons || 0), 0);
    const totalInvTons= results.reduce((s, r) => s + (r.invoiceTons || 0), 0);
    return { total, matched, conflict, noMatch, duplicate, partial, wVariance, rateConflict, payrollRdy, billingRdy, totalSysTons, totalInvTons };
  }, [results]);

  const filteredResults = useMemo(() => {
    let r = results;
    if (filterStatus) r = r.filter(x => x.matchStatus === filterStatus);
    if (filterExc) r = r.filter(x => x.exceptions.includes(filterExc));
    return r;
  }, [results, filterStatus, filterExc]);

  const allExceptionTypes = useMemo(() => {
    const s = new Set<string>();
    results.forEach(r => r.exceptions.forEach(e => s.add(e)));
    return Array.from(s);
  }, [results]);

  const exceptionSummary = useMemo(() => {
    const map = new Map<string, number>();
    results.forEach(r => r.exceptions.forEach(e => map.set(e, (map.get(e) || 0) + 1)));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [results]);

  const canRun = invRows.length > 0 || xlRows.length > 0;

  function UploadCard({ title, icon, color, file, loading, onFile, rows }: {
    title: string; icon: string; color: string; file: File | null;
    loading: boolean; onFile: (f: File) => void; rows: ParsedRow[];
  }) {
    return (
      <div style={{ background: "#fff", borderRadius: 12, border: `2px solid ${file ? color : "#e2e8f0"}`, padding: 20, transition: "border-color 150ms" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: "1.4rem" }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>{title}</div>
            {file && <div style={{ fontSize: "0.72rem", color, fontWeight: 600 }}>{rows.length} rows parsed</div>}
          </div>
        </div>
        <label style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "14px 0", borderRadius: 8, border: "2px dashed #e2e8f0",
          cursor: "pointer", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600,
          background: "#f8fafc", transition: "all 120ms",
        }}>
          {loading ? "Parsing…" : file ? `✓ ${file.name}` : "Click to upload (CSV, Excel, PDF, TSV)"}
          <input type="file" accept=".csv,.xlsx,.xls,.xlsm,.pdf,.tsv,.txt" style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </label>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", padding: "28px 32px 24px", borderRadius: 14, marginBottom: 24, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>CrossCheck</h1>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: 4, marginBottom: 0 }}>
              Invoice × Master Excel × System Tickets — weight variance, rate conflicts &amp; exception flagging
            </p>
          </div>
          {results.length > 0 && kpis && (
            <div style={{ display: "flex", gap: 20 }}>
              {[
                ["Matched", kpis.matched, "#4ade80"],
                ["Conflicts", kpis.conflict, "#fbbf24"],
                ["No Match", kpis.noMatch, "#f87171"],
              ].map(([l, v, c]) => (
                <div key={String(l)} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: String(c) }}>{v}</div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload panel */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 16, fontSize: "0.9rem" }}>Data Sources</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
          <UploadCard title="Pit Invoice" icon="📄" color="#2563eb" file={invFile} loading={invLoading} onFile={handleInvFile} rows={invRows} />
          <UploadCard title="Master Excel" icon="📊" color="#7c3aed" file={xlFile} loading={xlLoading} onFile={handleXlFile} rows={xlRows} />
          <div style={{ background: "#fff", borderRadius: 12, border: `2px solid ${sysRows.length > 0 ? "#16a34a" : "#e2e8f0"}`, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: "1.4rem" }}>💻</span>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.9rem" }}>System Tickets</div>
                {sysLoading
                  ? <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Loading…</div>
                  : <div style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>{sysRows.length} tickets loaded</div>
                }
              </div>
            </div>
            <div style={{ padding: "14px 0", borderRadius: 8, border: "2px dashed #e2e8f0", textAlign: "center", color: "#94a3b8", fontSize: "0.78rem", fontWeight: 600, background: "#f8fafc" }}>
              {sysLoading ? "Loading from database…" : sysRows.length > 0 ? `✓ ${sysRows.length} tickets auto-loaded` : "No system tickets found"}
            </div>
          </div>
        </div>

        {/* Column mappers */}
        {(invHeaders.length > 0 || xlHeaders.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: invHeaders.length > 0 && xlHeaders.length > 0 ? "1fr 1fr" : "1fr", gap: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
            {invHeaders.length > 0 && <ColMapper label="Invoice" headers={invHeaders} map={invMap} onChange={setInvMap} />}
            {xlHeaders.length > 0  && <ColMapper label="Excel"   headers={xlHeaders}  map={xlMap}  onChange={setXlMap} />}
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={runCheck}
            disabled={!canRun || running}
            style={{
              padding: "11px 28px", borderRadius: 8, fontWeight: 700, fontSize: "0.9rem", border: "none", cursor: canRun ? "pointer" : "not-allowed",
              background: canRun ? "#1e40af" : "#e2e8f0", color: canRun ? "#fff" : "#94a3b8",
              boxShadow: canRun ? "0 2px 8px rgba(30,64,175,0.3)" : "none", transition: "all 150ms",
            }}
          >
            {running ? "Running CrossCheck…" : "▶ Run CrossCheck"}
          </button>
          {results.length > 0 && (
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {results.length} total rows · last run {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            ["Total",         kpis.total,       "#0f172a", "#f8fafc", "#e2e8f0"],
            ["Matched",       kpis.matched,     "#16a34a", "#f0fdf4", "#bbf7d0"],
            ["Conflicts",     kpis.conflict,    "#d97706", "#fffbeb", "#fde68a"],
            ["No Match",      kpis.noMatch,     "#dc2626", "#fef2f2", "#fecaca"],
            ["Duplicates",    kpis.duplicate,   "#7c3aed", "#f5f3ff", "#ddd6fe"],
            ["Partial",       kpis.partial,     "#2563eb", "#eff6ff", "#bfdbfe"],
            ["Wt Variance",   kpis.wVariance,   "#ea580c", "#fff7ed", "#fed7aa"],
            ["Rate Conflict", kpis.rateConflict,"#dc2626", "#fef2f2", "#fecaca"],
            ["Payroll Ready", kpis.payrollRdy,  "#16a34a", "#f0fdf4", "#bbf7d0"],
            ["Billing Ready", kpis.billingRdy,  "#2563eb", "#eff6ff", "#bfdbfe"],
          ].map(([l, v, c, bg, border]) => (
            <div key={String(l)} style={{ background: String(bg), borderRadius: 10, border: `1px solid ${String(border)}`, padding: "14px 16px" }}>
              <div style={{ fontSize: "0.66rem", fontWeight: 700, color: String(c), textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          {/* Tabs + filters */}
          <div style={{ padding: "0 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 4 }}>
            {(["results", "exceptions"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{ padding: "12px 16px", fontWeight: 600, fontSize: "0.82rem", border: "none", background: "none", cursor: "pointer", color: tab === t ? "#1e40af" : "#64748b", borderBottom: tab === t ? "2px solid #1e40af" : "2px solid transparent" }}
              >
                {t === "results" ? `Results (${results.length})` : `Exceptions (${exceptionSummary.length})`}
              </button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as MatchStatus | "")}
                style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none" }}>
                <option value="">All Statuses</option>
                {(["Matched","Conflict","No Match","Duplicate","Partial"] as MatchStatus[]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {allExceptionTypes.length > 0 && (
                <select value={filterExc} onChange={e => setFilterExc(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.78rem", outline: "none" }}>
                  <option value="">All Exceptions</option>
                  {allExceptionTypes.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              )}
            </div>
          </div>

          {tab === "results" && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Status","Ticket #","Date","Driver","Truck","Project","Material","Inv Tons","Excel Tons","Sys Tons","Var%","Rate","Inv Amt","Sys Amt","Issues","Payroll","Billing",""].map(h => (
                      <th key={h} style={{ padding: "9px 10px", fontWeight: 700, color: "#475569", textAlign: "left", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "0.7rem" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((r, i) => {
                    const sc = STATUS_COLORS[r.matchStatus];
                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                          <Badge text={r.matchStatus} {...sc} />
                        </td>
                        <td style={{ padding: "7px 10px", fontWeight: 600, color: "#0f172a" }}>{r.ticketNo || "—"}</td>
                        <td style={{ padding: "7px 10px", color: "#475569" }}>{r.date || "—"}</td>
                        <td style={{ padding: "7px 10px", color: "#475569" }}>{r.driver || "—"}</td>
                        <td style={{ padding: "7px 10px", color: "#475569" }}>{r.truck || "—"}</td>
                        <td style={{ padding: "7px 10px", color: "#475569" }}>{r.project || "—"}</td>
                        <td style={{ padding: "7px 10px", color: "#475569" }}>{r.material || "—"}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(r.invoiceTons)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(r.excelTons)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>{fmt(r.systemTons)}</td>
                        <td style={{ padding: "7px 10px", textAlign: "right", color: (r.weightVariancePct || 0) > 2 ? "#dc2626" : "#475569", fontWeight: (r.weightVariancePct || 0) > 2 ? 700 : 400 }}>
                          {r.weightVariancePct !== null ? `${r.weightVariancePct.toFixed(1)}%` : <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>
                          {r.invoiceRate !== null ? `$${r.invoiceRate.toFixed(2)}` : <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>
                          {r.invoiceAmt !== null ? `$${r.invoiceAmt.toFixed(2)}` : <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "right" }}>
                          {r.systemAmt !== null ? `$${r.systemAmt.toFixed(2)}` : <span style={{ color: "#cbd5e1" }}>—</span>}
                        </td>
                        <td style={{ padding: "7px 10px", textAlign: "center" }}>
                          {r.exceptions.length > 0 && (
                            <span style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.78rem" }}>{r.exceptions.length}</span>
                          )}
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: PAYROLL_COLORS[r.payrollStatus] }}>{r.payrollStatus}</span>
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: PAYROLL_COLORS[r.billingStatus] }}>{r.billingStatus}</span>
                        </td>
                        <td style={{ padding: "7px 10px" }}>
                          <button onClick={() => setSelected(r)}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, color: "#1e40af" }}>
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === "exceptions" && (
            <div style={{ padding: 24 }}>
              {exceptionSummary.length === 0 ? (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>No exceptions found — all records matched cleanly.</div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
                    {exceptionSummary.map(([exc, count]) => (
                      <div key={exc} style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 16px", cursor: "pointer" }}
                        onClick={() => { setFilterExc(exc); setTab("results"); }}>
                        <div style={{ fontWeight: 700, color: "#ea580c", fontSize: "1.4rem" }}>{count}</div>
                        <div style={{ fontSize: "0.78rem", color: "#92400e", fontWeight: 600, marginTop: 2 }}>{exc}</div>
                        <div style={{ fontSize: "0.68rem", color: "#d97706", marginTop: 4 }}>Click to filter results →</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#64748b" }}>
                    Total exception flags: {results.reduce((s, r) => s + r.exceptions.length, 0)} across {results.filter(r => r.exceptions.length > 0).length} tickets
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {results.length === 0 && !running && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>🔍</div>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#64748b" }}>Upload files and run CrossCheck</div>
          <div style={{ fontSize: "0.82rem", marginTop: 6 }}>Invoice PDF/CSV + Master Excel → matched against {sysRows.length} system tickets</div>
        </div>
      )}

      {/* Comparison drawer */}
      {selected && <CompareDrawer result={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
