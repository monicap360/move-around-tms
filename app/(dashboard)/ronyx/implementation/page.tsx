"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  csvHeaders: string[];
  exampleRow: string[];
  endpoint: string;
  table: string;
};

type SessionRow = {
  phase: string;
  status: string;
  import_count: number;
  error_count: number;
  last_error: string | null;
  completed_at: string | null;
};

type ParsedRow = Record<string, string>;

// ─── Phases config ──────────────────────────────────────────────────────────

const PHASES: Phase[] = [
  {
    key: "customers",
    label: "Customers",
    subtitle: "Companies you haul for",
    icon: "🏢",
    csvHeaders: ["customer_name", "contact_name", "contact_email", "contact_phone", "billing_address", "notes"],
    exampleRow: ["Martin Marietta", "Jane Smith", "jsmith@mm.com", "409-555-0100", "100 Commerce Dr, Houston TX", "Net 30"],
    endpoint: "/api/ronyx/implementation/import",
    table: "ronyx_customers",
  },
  {
    key: "drivers",
    label: "Drivers",
    subtitle: "W2 and 1099 drivers",
    icon: "🧑‍✈️",
    csvHeaders: ["full_name", "phone", "email", "license_number", "license_state", "license_expiration_date", "hire_date", "pay_rate", "equipment_type", "status"],
    exampleRow: ["John Doe", "409-555-0200", "jdoe@email.com", "TX1234567", "TX", "2027-06-01", "2024-01-15", "0.85", "Dump Truck", "active"],
    endpoint: "/api/ronyx/implementation/import",
    table: "driver_profiles",
  },
  {
    key: "trucks",
    label: "Trucks & Equipment",
    subtitle: "Your fleet",
    icon: "🚛",
    csvHeaders: ["truck_number", "make", "model", "year", "vin", "plate", "truck_type", "status", "notes"],
    exampleRow: ["T-101", "Peterbilt", "389", "2022", "1NP5LB9X1ND123456", "TX-AB1234", "End Dump", "active", "Primary unit"],
    endpoint: "/api/ronyx/implementation/import",
    table: "ronyx_trucks",
  },
  {
    key: "owner_operators",
    label: "Owner Operators",
    subtitle: "Sub-haulers and OO companies",
    icon: "🤝",
    csvHeaders: ["company_name", "contact_name", "contact_phone", "contact_email", "mc_number", "dot_number", "ein", "business_address", "status"],
    exampleRow: ["1974 Trucking LLC", "Mike Rivera", "409-555-0300", "m.rivera@1974trucking.com", "MC-123456", "DOT-789012", "12-3456789", "200 Port Rd, Galveston TX", "active"],
    endpoint: "/api/ronyx/implementation/import",
    table: "ronyx_owner_operators",
  },
  {
    key: "historical_tickets",
    label: "Historical Tickets",
    subtitle: "Past load tickets for baseline payroll and billing",
    icon: "🗂️",
    csvHeaders: ["ticket_number", "ticket_date", "driver_name", "truck_number", "job_name", "material", "unit_type", "quantity", "pay_rate", "bill_rate", "status"],
    exampleRow: ["T-2025-001", "2025-06-01", "John Doe", "T-101", "Martin Marietta - Galveston", "Crushed Limestone", "Ton", "22.5", "9.00", "14.50", "paid"],
    endpoint: "/api/ronyx/implementation/import",
    table: "aggregate_tickets",
  },
];

const TRAINING_ROLES = [
  {
    role: "Dispatcher",
    steps: [
      "Import dispatch CSV daily via Dispatch Command Center™ → Run Dispatch Guard",
      "Review compliance holds before approving any driver or truck for the day",
      "Match dispatch rows to Fast Scan tickets — use the Reconcile column",
      "Mark tickets as Approved once load count and amounts match",
      "Escalate Critical maintenance holds to shop before dispatch",
    ],
  },
  {
    role: "Billing Admin",
    steps: [
      "Monitor Billing Ready Queue — tickets auto-populate when approved",
      "Group tickets by customer to generate invoices from Accounting → Billing Queue",
      "Export invoices to QuickBooks via Accounting → QuickBooks Export",
      "Track payment status in Accounts Receivable — flag overdue invoices",
      "Reconcile any disputed tickets using Ticket Audit trail",
    ],
  },
  {
    role: "Payroll Manager",
    steps: [
      "Review Payroll Ready Queue — tickets auto-populate when approved",
      "Check holds before finalizing: insurance holds, compliance holds, deductions",
      "Process owner operator settlements separately from W2 driver payroll",
      "Generate settlement packets from Payroll → Settlements",
      "Export final payroll to QuickBooks or print summary PDF",
    ],
  },
  {
    role: "Owner Operator Manager",
    steps: [
      "Add new OO companies under Owner Operators → New Company",
      "Upload COI documents immediately — 3 types: Auto Liability, GL, Cargo",
      "Set dispatch eligibility per OO after all 3 COIs are verified",
      "Monitor COI expiration warnings in the Compliance Monitor",
      "Process OO settlements after payroll is finalized",
    ],
  },
];

// ─── CSV utilities ────────────────────────────────────────────────────────────

function buildCsv(headers: string[], example: string[]): string {
  const escape = (v: string) => (v.includes(",") ? `"${v}"` : v);
  return [headers.map(escape).join(","), example.map(escape).join(",")].join("\n");
}

function parseCsv(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? ""]));
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImplementationHubPage() {
  const [sessions, setSessions]             = useState<Record<string, SessionRow>>({});
  const [activePhase, setActivePhase]       = useState<string | null>(null);
  const [importing, setImporting]           = useState(false);
  const [importResult, setImportResult]     = useState<{ inserted: number; errors: string[] } | null>(null);
  const [preview, setPreview]               = useState<ParsedRow[]>([]);
  const [activeTraining, setActiveTraining] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void loadSessions(); }, []);

  async function loadSessions() {
    try {
      const res = await fetch("/api/ronyx/implementation");
      const data = await res.json();
      const map: Record<string, SessionRow> = {};
      for (const row of (data.sessions ?? [])) map[row.phase] = row;
      setSessions(map);
    } catch { /* no sessions yet */ }
  }

  function downloadTemplate(phase: Phase) {
    const csv = buildCsv(phase.csvHeaders, phase.exampleRow);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movearound_import_${phase.key}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, phase: Phase) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target?.result as string);
      setPreview(rows.slice(0, 5));
      setImportResult(null);
    };
    reader.readAsText(file);
  }, []);

  async function runImport(phase: Phase) {
    if (!fileRef.current?.files?.[0]) return;
    const text = await fileRef.current.files[0].text();
    const rows = parseCsv(text);
    if (!rows.length) return;

    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/ronyx/implementation/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: phase.key, table: phase.table, rows }),
      });
      const data = await res.json();
      setImportResult({ inserted: data.inserted ?? 0, errors: data.errors ?? [] });
      await loadSessions();
    } catch (err) {
      setImportResult({ inserted: 0, errors: [(err as Error).message] });
    } finally {
      setImporting(false);
    }
  }

  const completedCount = PHASES.filter(p => sessions[p.key]?.status === "complete").length;
  const pct = Math.round((completedCount / PHASES.length) * 100);

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, rgba(37,99,235,0.14), transparent 55%), #e8eff8", padding: 32, color: "#0f172a" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🚀</span>
            <div>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#1e3a8a" }}>Implementation Hub</h1>
              <p style={{ margin: 0, fontSize: 14, color: "#475569" }}>Transfer your data and train your staff — without touching your live operations</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginTop: 16, background: "#dbeafe", borderRadius: 999, height: 10, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #1d4ed8, #2563eb)", borderRadius: 999, transition: "width 0.4s" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#1e40af", fontWeight: 600 }}>
            {completedCount} of {PHASES.length} phases complete — {pct}%
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* ── Phase cards ───────────────────────────────────────── */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1e3a8a", marginBottom: 16 }}>Data Transfer Phases</h2>
            {PHASES.map((phase, idx) => {
              const session = sessions[phase.key];
              const isDone  = session?.status === "complete";
              const isOpen  = activePhase === phase.key;

              return (
                <div key={phase.key} style={{
                  background: "#f8fafc",
                  border: `1.5px solid ${isOpen ? "#1d4ed8" : isDone ? "#22c55e44" : "rgba(30,64,175,0.16)"}`,
                  borderRadius: 14,
                  marginBottom: 12,
                  overflow: "hidden",
                  boxShadow: isOpen ? "0 4px 20px rgba(29,78,216,0.12)" : "0 2px 8px rgba(15,23,42,0.06)",
                }}>
                  {/* Phase header */}
                  <button
                    onClick={() => {
                      setActivePhase(isOpen ? null : phase.key);
                      setPreview([]);
                      setImportResult(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 12,
                      padding: "14px 18px", background: "none", border: "none", cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{phase.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#1e3a8a" }}>
                        Phase {idx + 1}: {phase.label}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{phase.subtitle}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {isDone && (
                        <span style={{ background: "#dcfce7", color: "#15803d", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                          ✓ {session.import_count} imported
                        </span>
                      )}
                      {session?.status === "error" && (
                        <span style={{ background: "#fef2f2", color: "#dc2626", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                          Error
                        </span>
                      )}
                      <span style={{ color: "#94a3b8", fontSize: 18 }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div style={{ padding: "0 18px 18px", borderTop: "1px solid rgba(30,64,175,0.1)" }}>
                      <p style={{ fontSize: 13, color: "#475569", marginTop: 12, marginBottom: 14 }}>
                        Download the CSV template, fill it with your real {phase.label.toLowerCase()} data, then upload it here.
                        Each row becomes a record in your system.
                      </p>

                      {/* Template download */}
                      <button
                        onClick={() => downloadTemplate(phase)}
                        style={{
                          background: "#eff6ff", border: "1px solid #93c5fd", color: "#1d4ed8",
                          padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14,
                        }}
                      >
                        ⬇ Download {phase.label} Template (.csv)
                      </button>

                      {/* Columns preview */}
                      <div style={{ background: "#1e293b", borderRadius: 8, padding: 12, marginBottom: 14, overflowX: "auto" }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>COLUMNS</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {phase.csvHeaders.map(h => (
                            <span key={h} style={{ background: "#334155", color: "#e2e8f0", padding: "3px 8px", borderRadius: 5, fontSize: 11, fontFamily: "monospace" }}>
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Upload */}
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".csv"
                        onChange={e => handleFileChange(e, phase)}
                        style={{ display: "block", marginBottom: 10, fontSize: 13, color: "#475569" }}
                      />

                      {/* Preview table */}
                      {preview.length > 0 && (
                        <div style={{ overflowX: "auto", marginBottom: 14 }}>
                          <div style={{ fontSize: 12, color: "#1d4ed8", fontWeight: 600, marginBottom: 6 }}>Preview — first 5 rows</div>
                          <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 11 }}>
                            <thead>
                              <tr>
                                {Object.keys(preview[0]).map(h => (
                                  <th key={h} style={{ background: "#eff6ff", padding: "5px 8px", border: "1px solid #bfdbfe", color: "#1e40af", textAlign: "left" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {preview.map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                                  {Object.values(row).map((v, j) => (
                                    <td key={j} style={{ padding: "4px 8px", border: "1px solid #e2e8f0", color: "#334155" }}>{v}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Import button */}
                      {preview.length > 0 && (
                        <button
                          onClick={() => runImport(phase)}
                          disabled={importing}
                          style={{
                            background: importing ? "#94a3b8" : "#1d4ed8",
                            color: "#fff", border: "none", borderRadius: 8,
                            padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: importing ? "not-allowed" : "pointer",
                          }}
                        >
                          {importing ? "Importing…" : `Import ${phase.label}`}
                        </button>
                      )}

                      {/* Result */}
                      {importResult && (
                        <div style={{
                          marginTop: 12, padding: 12, borderRadius: 8,
                          background: importResult.errors.length === 0 ? "#dcfce7" : "#fef2f2",
                          border: `1px solid ${importResult.errors.length === 0 ? "#86efac" : "#fca5a5"}`,
                        }}>
                          <div style={{ fontWeight: 700, color: importResult.errors.length === 0 ? "#15803d" : "#dc2626", fontSize: 14 }}>
                            {importResult.errors.length === 0
                              ? `✓ ${importResult.inserted} records imported successfully`
                              : `⚠ ${importResult.inserted} imported, ${importResult.errors.length} errors`}
                          </div>
                          {importResult.errors.slice(0, 3).map((e, i) => (
                            <div key={i} style={{ fontSize: 12, color: "#dc2626", marginTop: 4 }}>• {e}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Right column ──────────────────────────────────────── */}
          <div>

            {/* Status summary */}
            <div style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.16)", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1e3a8a" }}>Import Status</h2>
              {PHASES.map(phase => {
                const s = sessions[phase.key];
                const status = s?.status ?? "pending";
                const dot = status === "complete" ? "#22c55e" : status === "error" ? "#ef4444" : status === "in_progress" ? "#f59e0b" : "#cbd5e1";
                return (
                  <div key={phase.key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "#334155", fontWeight: 500 }}>{phase.label}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {status === "complete"
                        ? `${s?.import_count ?? 0} records`
                        : status === "error"
                        ? "Error — retry"
                        : status === "in_progress"
                        ? "In progress"
                        : "Pending"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cross-module integration status */}
            <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: 14, padding: 20, marginBottom: 20 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: "#14532d" }}>✓ Real-Time Integration Active</h2>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#166534" }}>
                Data flows automatically between modules. No manual re-entry needed.
              </p>
              {[
                { from: "Ticket Approved", to: "Billing Queue", icon: "→" },
                { from: "Ticket Approved", to: "Payroll Items", icon: "→" },
                { from: "Critical Maintenance", to: "Dispatch Hold", icon: "→" },
                { from: "Invoice Sent", to: "AR Tracking", icon: "→" },
              ].map((flow, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: "#166534" }}>
                  <span style={{ background: "#dcfce7", padding: "3px 8px", borderRadius: 5, fontWeight: 600 }}>{flow.from}</span>
                  <span style={{ color: "#4ade80", fontWeight: 800 }}>{flow.icon}</span>
                  <span style={{ background: "#dcfce7", padding: "3px 8px", borderRadius: 5, fontWeight: 600 }}>{flow.to}</span>
                </div>
              ))}
            </div>

            {/* Staff Training */}
            <div style={{ background: "#f8fafc", border: "1.5px solid rgba(30,64,175,0.16)", borderRadius: 14, padding: 20 }}>
              <h2 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#1e3a8a" }}>Staff Training Guides</h2>
              <p style={{ margin: "0 0 16px", fontSize: 13, color: "#475569" }}>
                Role-specific workflows. Share the correct guide with each team member on day one.
              </p>

              {TRAINING_ROLES.map(t => {
                const isOpen = activeTraining === t.role;
                return (
                  <div key={t.role} style={{ marginBottom: 10, border: "1px solid rgba(30,64,175,0.14)", borderRadius: 10, overflow: "hidden" }}>
                    <button
                      onClick={() => setActiveTraining(isOpen ? null : t.role)}
                      style={{
                        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "11px 14px", background: isOpen ? "#eff6ff" : "#fff",
                        border: "none", cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1e40af" }}>{t.role}</span>
                      <span style={{ color: "#94a3b8", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                    </button>
                    {isOpen && (
                      <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #dbeafe" }}>
                        <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                          {t.steps.map((step, i) => (
                            <li key={i} style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.5 }}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
