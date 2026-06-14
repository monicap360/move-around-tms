"use client";

import { useRef, useState } from "react";

type DriverRow = {
  name: string;
  cdl_number?: string;
  cdl_state?: string;
  cdl_expiration?: string;
  med_card_number?: string;
  med_card_expiration?: string;
  truck_number?: string;
  job_assignment?: string;
  notes?: string;
  company_name?: string;
};

type ImportResult = {
  company: string;
  created: boolean;
  drivers_added: number;
  errors: string[];
};

const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.85rem", outline: "none", background: "#fff", boxSizing: "border-box" };
const primaryBtn: React.CSSProperties = { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem" };
const ghostBtn: React.CSSProperties = { padding: "9px 18px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.83rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer" };
const lbl: React.CSSProperties = { display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };

export default function BulkImportPage() {
  const [step, setStep]         = useState<"paste" | "map" | "preview" | "done">("paste");
  const [rawText, setRawText]   = useState("");
  const [headers, setHeaders]   = useState<string[]>([]);
  const [rows, setRows]         = useState<string[][]>([]);
  const [mapping, setMapping]   = useState<Record<string, string>>({});
  const [preview, setPreview]   = useState<Record<string, DriverRow[]>>({});
  const [companyCol, setCompanyCol] = useState("");
  const [defaultCompany, setDefaultCompany] = useState("");
  const [results, setResults]   = useState<ImportResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [toast, setToast]       = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const FIELDS = [
    { key: "name",                label: "Driver Name *" },
    { key: "cdl_number",          label: "CDL Number" },
    { key: "cdl_state",           label: "CDL State" },
    { key: "cdl_expiration",      label: "CDL Expiration" },
    { key: "med_card_number",     label: "Med Card Number" },
    { key: "med_card_expiration", label: "Med Card Expiration" },
    { key: "truck_number",        label: "Truck Number" },
    { key: "job_assignment",      label: "Job Assignment" },
    { key: "notes",               label: "Notes" },
  ];

  function parseTSV(text: string) {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return;
    const hdrs = lines[0].split("\t").map(h => h.trim());
    const dataRows = lines.slice(1).map(l => l.split("\t").map(c => c.trim()));
    setHeaders(hdrs);
    setRows(dataRows);
    // Auto-map: case-insensitive header matching
    const autoMap: Record<string, string> = {};
    hdrs.forEach((h, i) => {
      const lower = h.toLowerCase().replace(/[\s_\-\/]+/g, "");
      if (lower.includes("name") && !lower.includes("company")) autoMap["name"] = String(i);
      if (lower.includes("cdl") && lower.includes("number")) autoMap["cdl_number"] = String(i);
      if (lower.includes("cdlstate") || (lower.includes("cdl") && lower.includes("state"))) autoMap["cdl_state"] = String(i);
      if (lower.includes("cdlexp") || (lower.includes("cdl") && lower.includes("exp"))) autoMap["cdl_expiration"] = String(i);
      if (lower.includes("medcard") && lower.includes("number")) autoMap["med_card_number"] = String(i);
      if (lower.includes("medcard") && lower.includes("exp")) autoMap["med_card_expiration"] = String(i);
      if (lower.includes("truck")) autoMap["truck_number"] = String(i);
      if (lower.includes("job") || lower.includes("assignment")) autoMap["job_assignment"] = String(i);
      if (lower.includes("note") || lower.includes("comment")) autoMap["notes"] = String(i);
      if (lower.includes("company")) setCompanyCol(String(i));
    });
    setMapping(autoMap);
    setStep("map");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setRawText(text);
      parseTSV(text);
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  function parseDate(raw?: string): string | undefined {
    if (!raw) return undefined;
    // Try MM/DD/YYYY → YYYY-MM-DD
    const parts = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (parts) return `${parts[3]}-${parts[1].padStart(2,"0")}-${parts[2].padStart(2,"0")}`;
    // Try YYYY-MM-DD as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    return undefined;
  }

  function buildPreview() {
    const byCompany: Record<string, DriverRow[]> = {};
    rows.forEach(row => {
      const company = companyCol
        ? (row[Number(companyCol)] || defaultCompany || "Unknown Company")
        : (defaultCompany || "Unknown Company");
      const driver: DriverRow = {
        name:                row[Number(mapping["name"])]?.trim() || "",
        cdl_number:          mapping["cdl_number"]         ? row[Number(mapping["cdl_number"])]?.trim() : undefined,
        cdl_state:           mapping["cdl_state"]          ? row[Number(mapping["cdl_state"])]?.trim().toUpperCase() : undefined,
        cdl_expiration:      mapping["cdl_expiration"]     ? parseDate(row[Number(mapping["cdl_expiration"])]?.trim()) : undefined,
        med_card_number:     mapping["med_card_number"]    ? row[Number(mapping["med_card_number"])]?.trim() : undefined,
        med_card_expiration: mapping["med_card_expiration"]? parseDate(row[Number(mapping["med_card_expiration"])]?.trim()) : undefined,
        truck_number:        mapping["truck_number"]       ? row[Number(mapping["truck_number"])]?.trim() : undefined,
        job_assignment:      mapping["job_assignment"]     ? row[Number(mapping["job_assignment"])]?.trim() : undefined,
        notes:               mapping["notes"]              ? row[Number(mapping["notes"])]?.trim() : undefined,
        company_name:        company,
      };
      if (!driver.name) return;
      if (!byCompany[company]) byCompany[company] = [];
      byCompany[company].push(driver);
    });
    setPreview(byCompany);
    setStep("preview");
  }

  async function runImport() {
    setImporting(true);
    const companies = Object.entries(preview).map(([company_name, drivers]) => ({
      company_name,
      drivers: drivers.map(d => ({ ...d, company_name: undefined })),
    }));
    try {
      const res = await fetch("/api/ronyx/owner-operators/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companies }),
      });
      const data = await res.json();
      setResults(data.results || []);
      setStep("done");
    } catch {
      flash("Import failed — check console.");
    } finally {
      setImporting(false);
    }
  }

  const totalDrivers = Object.values(preview).reduce((s, d) => s + d.length, 0);

  return (
    <div style={{ maxWidth: 900 }}>
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 700, zIndex: 999 }}>
          {toast}
        </div>
      )}

      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>Owner Operators / Bulk Import</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Bulk Driver Import</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>Import drivers from a spreadsheet (TSV/CSV paste). Data is saved securely to the database.</p>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {["paste","map","preview","done"].map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: step === s ? "#1e40af" : ["paste","map","preview","done"].indexOf(step) > i ? "#15803d" : "#e2e8f0", color: step === s || ["paste","map","preview","done"].indexOf(step) > i ? "#fff" : "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.82rem" }}>
              {["paste","map","preview","done"].indexOf(step) > i ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: step === s ? "#1e40af" : "#94a3b8", textTransform: "capitalize" }}>{s === "paste" ? "Upload Data" : s === "map" ? "Map Columns" : s === "preview" ? "Preview" : "Done"}</span>
            {i < 3 && <div style={{ width: 24, height: 1, background: "#e2e8f0" }} />}
          </div>
        ))}
      </div>

      {/* Step 1: Paste / Upload */}
      {step === "paste" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px 28px" }}>
          <h3 style={{ margin: "0 0 12px", fontWeight: 800 }}>Step 1 — Upload or Paste Spreadsheet Data</h3>
          <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: "0.85rem" }}>Copy rows from Excel/Google Sheets and paste below, OR upload a .tsv / .csv file. The first row must be headers.</p>

          <div style={{ marginBottom: 16 }}>
            <input ref={fileRef} type="file" accept=".tsv,.csv,.txt" style={{ display: "none" }} onChange={handleFile} />
            <button onClick={() => fileRef.current?.click()} style={ghostBtn}>📁 Upload .TSV / .CSV file</button>
          </div>

          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Or paste tab-separated data here</label>
          <textarea
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            style={{ width: "100%", minHeight: 200, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.82rem", fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }}
            placeholder={"Driver Name\tCDL Number\tCDL State\tCDL Expiration\tTruck Number\tCompany Name\nSmith, John\tTX1234567\tTX\t12/31/2027\tTruck 5\tBAS Equipment LLC"}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button onClick={() => parseTSV(rawText)} style={primaryBtn} disabled={!rawText.trim()}>Parse Data →</button>
            <a href="/ronyx/owner-operators" style={{ ...ghostBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>← Back</a>
          </div>
        </div>
      )}

      {/* Step 2: Map columns */}
      {step === "map" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "24px 28px" }}>
          <h3 style={{ margin: "0 0 4px", fontWeight: 800 }}>Step 2 — Map Columns</h3>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.85rem" }}>Detected {headers.length} columns and {rows.length} driver rows. Match each field to the correct column.</p>

          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: "0.78rem", color: "#475569", marginBottom: 8 }}>Company Assignment</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 20px" }}>
              <div>
                <label style={lbl}>Company Name Column</label>
                <select value={companyCol} onChange={e => setCompanyCol(e.target.value)} style={inp}>
                  <option value="">— Use default below —</option>
                  {headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Default Company Name (if no column)</label>
                <input value={defaultCompany} onChange={e => setDefaultCompany(e.target.value)} style={inp} placeholder="e.g. BAS Equipment & Trucking Services LLC" />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px", marginBottom: 20 }}>
            {FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label style={lbl}>{label}</label>
                <select value={mapping[key] ?? ""} onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))} style={inp}>
                  <option value="">— Skip —</option>
                  {headers.map((h, i) => <option key={i} value={String(i)}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={buildPreview} style={primaryBtn} disabled={!mapping["name"]}>Preview Import →</button>
            <button onClick={() => setStep("paste")} style={ghostBtn}>← Back</button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 4px", fontWeight: 800 }}>Step 3 — Review Import</h3>
            <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
              Ready to import <strong>{totalDrivers} drivers</strong> into <strong>{Object.keys(preview).length} companies</strong>. Existing companies will be matched by name and drivers added under them.
            </p>
          </div>

          {Object.entries(preview).map(([company, drivers]) => (
            <div key={company} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: "#f8fafc", padding: "10px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{company}</div>
                <span style={{ background: "#eff6ff", color: "#1e40af", padding: "3px 10px", borderRadius: 10, fontWeight: 700, fontSize: "0.72rem" }}>{drivers.length} drivers</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Name","CDL #","State","CDL Exp","Med Card #","Med Card Exp","Truck","Job","Notes"].map(h => (
                        <th key={h} style={{ padding: "7px 12px", fontSize: "0.65rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "7px 12px", fontWeight: 700, color: "#0f172a" }}>{d.name}</td>
                        <td style={{ padding: "7px 12px", color: "#475569", fontFamily: "monospace" }}>{d.cdl_number || "—"}</td>
                        <td style={{ padding: "7px 12px" }}>{d.cdl_state ? <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 6px", borderRadius: 4, fontWeight: 700, fontSize: "0.68rem" }}>{d.cdl_state}</span> : "—"}</td>
                        <td style={{ padding: "7px 12px", color: d.cdl_expiration ? "#0f172a" : "#94a3b8" }}>{d.cdl_expiration || "—"}</td>
                        <td style={{ padding: "7px 12px", color: "#475569", fontFamily: "monospace", fontSize: "0.72rem" }}>{d.med_card_number || "—"}</td>
                        <td style={{ padding: "7px 12px", color: d.med_card_expiration ? "#0f172a" : "#94a3b8" }}>{d.med_card_expiration || "—"}</td>
                        <td style={{ padding: "7px 12px", color: "#475569" }}>{d.truck_number || "—"}</td>
                        <td style={{ padding: "7px 12px", color: "#475569", fontSize: "0.72rem" }}>{d.job_assignment || "—"}</td>
                        <td style={{ padding: "7px 12px", color: "#94a3b8", fontSize: "0.7rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.notes || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={runImport} style={{ ...primaryBtn, background: "#15803d" }} disabled={importing}>
              {importing ? "Importing…" : `✓ Import ${totalDrivers} Drivers`}
            </button>
            <button onClick={() => setStep("map")} style={ghostBtn} disabled={importing}>← Back</button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === "done" && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "28px 32px" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>✅</div>
          <h3 style={{ margin: "0 0 8px", fontWeight: 800, color: "#0f172a" }}>Import Complete</h3>
          <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.88rem" }}>All drivers have been saved securely to the database.</p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {results.map((r, i) => (
              <div key={i} style={{ background: r.errors.length > 0 ? "#fff1f2" : "#f0fdf4", border: `1px solid ${r.errors.length > 0 ? "#fda4af" : "#86efac"}`, borderRadius: 10, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{r.company} {r.created && <span style={{ background: "#eff6ff", color: "#1e40af", padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, marginLeft: 6 }}>New</span>}</div>
                  {r.errors.length > 0 && <div style={{ fontSize: "0.72rem", color: "#dc2626", marginTop: 2 }}>{r.errors.join(", ")}</div>}
                </div>
                <span style={{ fontWeight: 800, color: r.drivers_added > 0 ? "#15803d" : "#94a3b8" }}>{r.drivers_added} drivers</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <a href="/ronyx/owner-operators" style={{ ...primaryBtn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>← View Owner Operators</a>
            <button onClick={() => { setStep("paste"); setRawText(""); setHeaders([]); setRows([]); setMapping({}); setPreview({}); setResults([]); }} style={ghostBtn}>Import More</button>
          </div>
        </div>
      )}
    </div>
  );
}
