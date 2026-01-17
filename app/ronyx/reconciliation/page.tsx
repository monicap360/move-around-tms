"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Papa from "papaparse";

type ReconRun = {
  id: string;
  status: string;
  matched_count?: number;
  exception_count?: number;
  started_at?: string;
};

type ReconResult = {
  id: string;
  ticket_id?: string | null;
  ticket_number?: string | null;
  status: string;
  quantity_variance_pct?: number | null;
  price_variance_pct?: number | null;
  delivery_variance_hours?: number | null;
  master_load_id?: string | null;
  match_method?: string | null;
  match_confidence?: number | null;
};

type ReconException = {
  id: string;
  result_id?: string | null;
  exception_type: string;
  severity: string;
  explanation?: string | null;
};

type Ticket = {
  id: string;
  ticket_number: string;
  customer_name?: string | null;
  material?: string | null;
  quantity?: number | null;
  bill_rate?: number | null;
  status?: string | null;
  unit_type?: string | null;
  ticket_date?: string | null;
  ocr_confidence?: number | null;
  ocr_fields_confidence?: Record<string, number> | null;
};

type MasterLoad = {
  id: string;
  ticket_number?: string | null;
  job_name?: string | null;
  customer_name?: string | null;
  planned_quantity?: number | null;
  unit_type?: string | null;
  planned_date?: string | null;
  truck_identifier?: string | null;
  po_number?: string | null;
};

type ReconSettings = {
  scale_tolerance_pct: number;
  moisture_tolerance_pct: number;
  fines_tolerance_pct: number;
  price_variance_pct: number;
  delivery_window_hours: number;
  location_radius_meters: number;
};

export default function RonyxReconciliationPage() {
  const [runs, setRuns] = useState<ReconRun[]>([]);
  const [results, setResults] = useState<ReconResult[]>([]);
  const [exceptions, setExceptions] = useState<ReconException[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [masterLoads, setMasterLoads] = useState<MasterLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [ingestMessage, setIngestMessage] = useState("");
  const [pitFileUploading, setPitFileUploading] = useState(false);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [masterHeaders, setMasterHeaders] = useState<string[]>([]);
  const [masterRows, setMasterRows] = useState<Record<string, any>[]>([]);
  const [masterMapping, setMasterMapping] = useState<Record<string, string>>({
    ticket_number: "",
    customer_name: "",
    job_name: "",
    planned_quantity: "",
    unit_type: "",
    planned_date: "",
    truck_identifier: "",
    po_number: "",
  });
  const [settings, setSettings] = useState<ReconSettings>({
    scale_tolerance_pct: 2,
    moisture_tolerance_pct: 1,
    fines_tolerance_pct: 1,
    price_variance_pct: 5,
    delivery_window_hours: 12,
    location_radius_meters: 200,
  });
  const [settingsMessage, setSettingsMessage] = useState("");

  useEffect(() => {
    void loadRecon();
    void loadTickets();
    void loadMasterLoads();
    void loadSettings();
  }, []);

  async function loadRecon() {
    setLoading(true);
    try {
      const res = await fetch("/api/aggregates/reconciliation/results", { cache: "no-store" });
      const data = await res.json();
      setRuns(data.runs || []);
      setResults(data.results || []);
      setExceptions(data.exceptions || []);
    } catch (err) {
      console.error("Failed to load reconciliation results", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTickets() {
    try {
      const res = await fetch("/api/ronyx/tickets", { cache: "no-store" });
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      console.error("Failed to load tickets", err);
    }
  }

  async function loadMasterLoads() {
    try {
      const res = await fetch("/api/aggregates/master-loads", { cache: "no-store" });
      const data = await res.json();
      setMasterLoads(data.loads || []);
    } catch (err) {
      console.error("Failed to load master loads", err);
      setMasterLoads([]);
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch("/api/aggregates/reconciliation/settings", { cache: "no-store" });
      const data = await res.json();
      if (data.settings) {
        setSettings({
          scale_tolerance_pct: Number(data.settings.scale_tolerance_pct ?? 2),
          moisture_tolerance_pct: Number(data.settings.moisture_tolerance_pct ?? 1),
          fines_tolerance_pct: Number(data.settings.fines_tolerance_pct ?? 1),
          price_variance_pct: Number(data.settings.price_variance_pct ?? 5),
          delivery_window_hours: Number(data.settings.delivery_window_hours ?? 12),
          location_radius_meters: Number(data.settings.location_radius_meters ?? 200),
        });
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  }

  async function saveSettings() {
    setSettingsMessage("");
    try {
      const res = await fetch("/api/aggregates/reconciliation/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.settings) {
        setSettingsMessage("Settings saved.");
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      setSettingsMessage("Failed to save settings.");
    }
  }

  async function runRecon() {
    setRunning(true);
    setMessage("");
    try {
      await fetch("/api/aggregates/reconciliation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleTolerancePct: settings.scale_tolerance_pct,
          moistureTolerancePct: settings.moisture_tolerance_pct,
          finesTolerancePct: settings.fines_tolerance_pct,
          priceVariancePct: settings.price_variance_pct,
          deliveryWindowHours: settings.delivery_window_hours,
        }),
      });
      await loadRecon();
      setMessage("Reconciliation run completed.");
    } catch (err) {
      console.error("Failed to run reconciliation", err);
      setMessage("Reconciliation run failed.");
    } finally {
      setRunning(false);
    }
  }

  function autoMapHeaders(headers: string[]) {
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
    const findHeader = (keys: string[]) =>
      headers[lowerHeaders.findIndex((h) => keys.some((k) => h.includes(k)))];

    setMasterMapping((prev) => ({
      ...prev,
      ticket_number: findHeader(["ticket", "ticket #", "ticket_number"]) || prev.ticket_number,
      customer_name: findHeader(["customer", "company"]) || prev.customer_name,
      job_name: findHeader(["job", "site"]) || prev.job_name,
      planned_quantity: findHeader(["quantity", "tons", "yards", "loads"]) || prev.planned_quantity,
      unit_type: findHeader(["unit", "uom"]) || prev.unit_type,
      planned_date: findHeader(["date", "scheduled"]) || prev.planned_date,
      truck_identifier: findHeader(["truck", "unit"]) || prev.truck_identifier,
      po_number: findHeader(["po", "purchase order"]) || prev.po_number,
    }));
  }

  async function handleMasterFile(file: File) {
    setMasterFile(file);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = (results.data || []) as Record<string, any>[];
        const headers = (results.meta.fields || []) as string[];
        setMasterHeaders(headers);
        setMasterRows(rows);
        autoMapHeaders(headers);
      },
      error: (error) => {
        console.error("Failed to parse master file", error);
        setMessage("Failed to parse master file.");
      },
    });
  }

  async function uploadMasterSchedule() {
    if (!masterRows.length) {
      setMessage("No master schedule rows to upload.");
      return;
    }
    const mappedRows = masterRows.map((row) => ({
      ticket_number: masterMapping.ticket_number ? row[masterMapping.ticket_number] : null,
      customer_name: masterMapping.customer_name ? row[masterMapping.customer_name] : null,
      job_name: masterMapping.job_name ? row[masterMapping.job_name] : null,
      planned_quantity: masterMapping.planned_quantity ? row[masterMapping.planned_quantity] : null,
      unit_type: masterMapping.unit_type ? row[masterMapping.unit_type] : null,
      planned_date: masterMapping.planned_date ? row[masterMapping.planned_date] : null,
      truck_identifier: masterMapping.truck_identifier ? row[masterMapping.truck_identifier] : null,
      po_number: masterMapping.po_number ? row[masterMapping.po_number] : null,
      source_file: masterFile?.name || null,
      raw_row: row,
    }));

    try {
      const res = await fetch("/api/aggregates/master-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: mappedRows, source_file: masterFile?.name || null }),
      });
      const data = await res.json();
      if (data.loads) {
        setMessage(`Uploaded ${data.loads.length} master loads.`);
        setMasterRows([]);
        setMasterHeaders([]);
        setMasterFile(null);
        await loadMasterLoads();
      }
    } catch (err) {
      console.error("Failed to upload master schedule", err);
      setMessage("Failed to upload master schedule.");
    }
  }

  async function handlePitScanUpload(file: File) {
    setPitFileUploading(true);
    setIngestMessage("");
    try {
      const ticketRes = await fetch("/api/ronyx/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "pending" }),
      });
      const ticketData = await ticketRes.json();
      const ticketId = ticketData.ticket?.id;
      if (!ticketId) {
        setIngestMessage("Failed to create draft ticket.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("ticket_id", ticketId);
      formData.append("doc_type", "ticket");

      const uploadRes = await fetch("/api/ronyx/tickets/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (uploadData.path) {
        setIngestMessage("Pit scan uploaded. OCR processing queued.");
        await loadTickets();
      } else {
        setIngestMessage("Upload failed.");
      }
    } catch (err) {
      console.error("Pit scan upload failed", err);
      setIngestMessage("Upload failed.");
    } finally {
      setPitFileUploading(false);
    }
  }

  async function approveForBilling(ticketId: string) {
    try {
      await fetch("/api/tickets/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          reconciliationData: { action: "approve_for_billing", matched_by: "resolveflow", auto_invoice: true },
        }),
      });
      setMessage("Approved for billing.");
    } catch (err) {
      console.error("Failed to approve for billing", err);
      setMessage("Approve failed.");
    }
  }

  async function usePlanValue(ticketId: string, plan: MasterLoad) {
    try {
      await fetch("/api/tickets/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          reconciliationData: {
            action: "use_plan_value",
            matched_by: "resolveflow",
            plan_values: {
              quantity: plan.planned_quantity,
              material: null,
              unit_type: plan.unit_type,
            },
          },
        }),
      });
      setMessage("Applied planned values.");
    } catch (err) {
      console.error("Failed to apply planned values", err);
      setMessage("Apply failed.");
    }
  }

  async function useTicketValue(ticketId: string, ticket: Ticket) {
    try {
      await fetch("/api/tickets/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          reconciliationData: {
            action: "use_ticket_value",
            matched_by: "resolveflow",
            ticket_values: {
              quantity: ticket.quantity,
              material: ticket.material,
              unit_type: ticket.unit_type,
            },
          },
        }),
      });
      setMessage("Applied ticket values.");
    } catch (err) {
      console.error("Failed to apply ticket values", err);
      setMessage("Apply failed.");
    }
  }

  const resultById = useMemo(() => {
    const map = new Map<string, ReconResult>();
    results.forEach((result) => {
      map.set(result.id, result);
    });
    return map;
  }, [results]);

  const ticketById = useMemo(() => {
    const map = new Map<string, Ticket>();
    tickets.forEach((ticket) => {
      map.set(ticket.id, ticket);
    });
    return map;
  }, [tickets]);

  const masterById = useMemo(() => {
    const map = new Map<string, MasterLoad>();
    masterLoads.forEach((load) => {
      map.set(load.id, load);
    });
    return map;
  }, [masterLoads]);

  return (
    <div className="ronyx-shell">
      <style jsx global>{`
        :root {
          --ronyx-black: #e2eaf6;
          --ronyx-carbon: #f8fafc;
          --ronyx-border: rgba(30, 64, 175, 0.18);
          --ronyx-accent: #1d4ed8;
        }
        .ronyx-shell {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(37, 99, 235, 0.16), transparent 55%), var(--ronyx-black);
          color: #0f172a;
          padding: 32px;
        }
        .ronyx-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .ronyx-card {
          background: var(--ronyx-carbon);
          border: 1px solid var(--ronyx-border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 18px 30px rgba(15, 23, 42, 0.08);
        }
        .ronyx-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          border-radius: 12px;
          background: #ffffff;
          border: 1px solid rgba(29, 78, 216, 0.16);
          gap: 12px;
          flex-wrap: wrap;
        }
        .ronyx-input {
          width: 100%;
          background: #ffffff;
          border: 1px solid var(--ronyx-border);
          border-radius: 12px;
          padding: 10px 12px;
          color: #0f172a;
          box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.08);
        }
        .ronyx-label {
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.7);
          display: inline-block;
        }
        .ronyx-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          font-size: 0.8rem;
          color: rgba(15, 23, 42, 0.75);
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--ronyx-border);
          color: #0f172a;
          text-decoration: none;
          font-weight: 600;
          background: rgba(29, 78, 216, 0.08);
        }
        .ronyx-action.primary {
          background: var(--ronyx-accent);
          color: #ffffff;
          border-color: transparent;
        }
      `}</style>

      <div className="ronyx-container">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="ronyx-pill">Reconciliation Hub</p>
            <h1 style={{ fontSize: "2rem", fontWeight: 800, marginTop: 8 }}>Exception-Based Review</h1>
            <p style={{ color: "rgba(15,23,42,0.7)", marginTop: 6 }}>
              Focus only on mismatches. Resolve and audit every change.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="ronyx-action primary" onClick={runRecon} disabled={running}>
              {running ? "Running..." : "Run Reconciliation"}
            </button>
            <Link href="/ronyx" className="ronyx-action">
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>IngestFlow™</h2>
          <div className="ronyx-row" style={{ marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>Upload Pit Invoice Scan (ScanSense™)</div>
              <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                OCR extracts key fields and queues the ticket for matching.
              </div>
            </div>
            <input
              className="ronyx-input"
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handlePitScanUpload(file);
              }}
              disabled={pitFileUploading}
            />
          </div>
          {ingestMessage ? <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{ingestMessage}</div> : null}
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>SheetMapper™ Master Schedule</h2>
          <div style={{ display: "grid", gap: 12 }}>
            <input
              className="ronyx-input"
              type="file"
              accept=".csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleMasterFile(file);
              }}
            />
            {masterHeaders.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>
                  Map your columns once. We’ll use this for future uploads.
                </div>
                {Object.keys(masterMapping).map((field) => (
                  <div key={field} className="ronyx-row">
                    <span style={{ fontWeight: 600 }}>{field.replace("_", " ")}</span>
                    <select
                      className="ronyx-input"
                      style={{ minWidth: 220 }}
                      value={masterMapping[field]}
                      onChange={(e) => setMasterMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                    >
                      <option value="">Not mapped</option>
                      {masterHeaders.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
                <button className="ronyx-action primary" onClick={uploadMasterSchedule}>
                  Upload Master Schedule
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>ReconFlow™ Rule Setup</h2>
          <div className="ronyx-row" style={{ alignItems: "flex-start", gap: 16 }}>
            <div style={{ flex: 1, display: "grid", gap: 10 }}>
              <label className="ronyx-label">Scale Tolerance (%)</label>
              <input
                className="ronyx-input"
                type="number"
                value={settings.scale_tolerance_pct}
                onChange={(e) => setSettings((prev) => ({ ...prev, scale_tolerance_pct: Number(e.target.value) }))}
              />
            </div>
            <div style={{ flex: 1, display: "grid", gap: 10 }}>
              <label className="ronyx-label">Delivery Window (hrs)</label>
              <input
                className="ronyx-input"
                type="number"
                value={settings.delivery_window_hours}
                onChange={(e) => setSettings((prev) => ({ ...prev, delivery_window_hours: Number(e.target.value) }))}
              />
            </div>
            <div style={{ flex: 1, display: "grid", gap: 10 }}>
              <label className="ronyx-label">Price Variance (%)</label>
              <input
                className="ronyx-input"
                type="number"
                value={settings.price_variance_pct}
                onChange={(e) => setSettings((prev) => ({ ...prev, price_variance_pct: Number(e.target.value) }))}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <button className="ronyx-action" onClick={saveSettings}>
                Save Rules
              </button>
              {settingsMessage ? <span style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>{settingsMessage}</span> : null}
            </div>
          </div>
        </section>

        <section className="ronyx-card" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>Latest Runs</h2>
          {runs.length === 0 ? (
            <div className="ronyx-row">No reconciliation runs yet.</div>
          ) : (
            runs.map((run) => (
              <div key={run.id} className="ronyx-row" style={{ marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>Run {run.id.slice(0, 8)}</div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                    {run.status} • Matched {run.matched_count || 0} • Exceptions {run.exception_count || 0}
                  </div>
                </div>
                <span style={{ fontWeight: 700 }}>{run.started_at ? new Date(run.started_at).toLocaleString() : "—"}</span>
              </div>
            ))
          )}
        </section>

        <section className="ronyx-card">
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: 12 }}>ResolveFlow™ Exception Queue</h2>
          {loading ? (
            <div className="ronyx-row">Loading exceptions...</div>
          ) : exceptions.length === 0 ? (
            <div className="ronyx-row">No exceptions to review.</div>
          ) : (
            exceptions.map((ex) => {
              const result = ex.result_id ? resultById.get(ex.result_id) : null;
              const ticket = result?.ticket_id ? ticketById.get(result.ticket_id) : null;
              const master = result?.master_load_id ? masterById.get(result.master_load_id) : null;
              return (
                <div key={ex.id} className="ronyx-row" style={{ marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>
                      {ticket?.ticket_number || result?.ticket_number || "Ticket"} • {ex.exception_type}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {ex.explanation || "Mismatch detected"} • Severity: {ex.severity}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "rgba(15,23,42,0.6)" }}>
                      {ticket?.customer_name || "Customer"} • {ticket?.material || "Material"} • {ticket?.quantity || "—"}{" "}
                      {ticket?.unit_type || ""}
                    </div>
                    <div style={{ marginTop: 8, fontSize: "0.8rem", color: "rgba(15,23,42,0.7)" }}>
                      <div>Planned: {master?.planned_quantity ?? "—"} {master?.unit_type || ""}</div>
                      <div>Delivered: {ticket?.quantity ?? "—"} {ticket?.unit_type || ""}</div>
                      <div>Match: {result?.match_method || "—"} ({result?.match_confidence ?? "—"}%)</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <Link href="/ronyx/tickets" className="ronyx-action">
                      Open Ticket
                    </Link>
                    {result?.ticket_id && master ? (
                      <button className="ronyx-action" onClick={() => usePlanValue(result.ticket_id!, master)}>
                        Accept Plan
                      </button>
                    ) : null}
                    {result?.ticket_id && ticket ? (
                      <button className="ronyx-action" onClick={() => useTicketValue(result.ticket_id!, ticket)}>
                        Keep Ticket
                      </button>
                    ) : null}
                    {result?.ticket_id ? (
                      <button className="ronyx-action primary" onClick={() => approveForBilling(result.ticket_id!)}>
                        Approve for Billing
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
          {message ? <div style={{ marginTop: 10, fontSize: "0.85rem", color: "rgba(15,23,42,0.7)" }}>{message}</div> : null}
        </section>
      </div>
    </div>
  );
}
