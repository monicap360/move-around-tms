"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import Papa from "papaparse";

/* ─── OO field definitions ─────────────────────────────────────────────────── */
const OO_FIELDS: { key: string; label: string; required?: boolean; aliases: string[] }[] = [
  { key: "company_name",          label: "Company Name",          required: true,  aliases: ["company","company name","vendor","carrier name","carrier","business name","dba","name"] },
  { key: "contact_name",          label: "Contact Name",                           aliases: ["contact","contact name","primary contact","owner","rep","full name","person"] },
  { key: "contact_phone",         label: "Phone",                                  aliases: ["phone","cell","mobile","telephone","contact phone","ph"] },
  { key: "contact_email",         label: "Email",                                  aliases: ["email","contact email","email address","e-mail"] },
  { key: "business_address",      label: "Business Address",                        aliases: ["address","business address","street","location","city"] },
  { key: "ein",                   label: "EIN / Tax ID",                            aliases: ["ein","tax id","tax number","employer id","tin","fein"] },
  { key: "dot_number",            label: "DOT Number",                              aliases: ["dot","dot number","dot #","usdot","usdot number"] },
  { key: "mc_number",             label: "MC Number",                               aliases: ["mc","mc number","mc #","motor carrier","motor carrier #"] },
  { key: "insurance_agent_name",  label: "Insurance Agent",                         aliases: ["agent","insurance agent","agent name","ins agent"] },
  { key: "insurance_agent_email", label: "Insurance Agent Email",                   aliases: ["agent email","insurance email","ins email"] },
  { key: "insurance_agent_phone", label: "Insurance Agent Phone",                   aliases: ["agent phone","insurance phone","ins phone"] },
  { key: "notes",                 label: "Notes",                                   aliases: ["notes","comments","memo","remarks"] },
  { key: "status",                label: "Status",                                  aliases: ["status","active","enabled"] },
];

const SKIP_KEY = "__skip__";

/* ─── Types ────────────────────────────────────────────────────────────────── */
type ParsedRow = Record<string, string>;
type Mapping   = Record<string, string>; // header → OO field key (or SKIP_KEY)

/* ─── Auto-detect column mapping ───────────────────────────────────────────── */
function autoDetect(headers: string[]): Mapping {
  const m: Mapping = {};
  const used = new Set<string>();
  for (const h of headers) {
    const hn = h.toLowerCase().trim();
    let matched = SKIP_KEY;
    for (const f of OO_FIELDS) {
      if (used.has(f.key)) continue;
      if (f.aliases.some(a => hn === a || hn.includes(a))) {
        matched = f.key;
        used.add(f.key);
        break;
      }
    }
    m[h] = matched;
  }
  return m;
}

/* ─── Parse helpers ─────────────────────────────────────────────────────────── */
function parseXLSX(buffer: ArrayBuffer): { headers: string[]; rows: ParsedRow[] } {
  const wb   = XLSX.read(buffer, { type: "array" });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  if (data.length < 1) return { headers: [], rows: [] };
  const headers = data[0].map(String);
  const rows = data.slice(1).map(row => {
    const r: ParsedRow = {};
    headers.forEach((h, i) => { r[h] = String((row as string[])[i] ?? "").trim(); });
    return r;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

function parseCSV(text: string, delim?: string): { headers: string[]; rows: ParsedRow[] } {
  const result = Papa.parse<string[]>(text, { delimiter: delim, header: false, skipEmptyLines: true });
  const data   = result.data as string[][];
  if (data.length < 1) return { headers: [], rows: [] };
  const headers = data[0].map(String);
  const rows = data.slice(1).map(row => {
    const r: ParsedRow = {};
    headers.forEach((h, i) => { r[h] = String(row[i] ?? "").trim(); });
    return r;
  }).filter(r => Object.values(r).some(v => v));
  return { headers, rows };
}

function detectPaste(text: string) {
  const tabCount  = (text.match(/\t/g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;
  return tabCount >= commaCount ? parseCSV(text, "\t") : parseCSV(text, ",");
}

/* ─── Step indicator ────────────────────────────────────────────────────────── */
function Steps({ current }: { current: number }) {
  const steps = ["Upload Data", "Map Columns", "Preview", "Done"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 28 }}>
      {steps.map((s, i) => {
        const n = i + 1;
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: done ? "#10b981" : active ? "#1e40af" : "#e2e8f0",
                color: done || active ? "#fff" : "#94a3b8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: "0.85rem",
              }}>
                {done ? "✓" : n}
              </div>
              <span style={{ fontSize: "0.68rem", fontWeight: active ? 700 : 500, color: active ? "#1e40af" : done ? "#10b981" : "#94a3b8", whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 60, height: 2, background: done ? "#10b981" : "#e2e8f0", marginBottom: 18, margin: "0 4px 18px 4px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────────────── */
export default function BulkImportPage() {
  const [step,     setStep]     = useState(1);
  const [headers,  setHeaders]  = useState<string[]>([]);
  const [rows,     setRows]     = useState<ParsedRow[]>([]);
  const [mapping,  setMapping]  = useState<Mapping>({});
  const [pasteVal, setPasteVal] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [toast,    setToast]    = useState("");
  const [result,   setResult]   = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);
  const [saveFile, setSaveFile] = useState<File | null>(null);
  const [backupOpt, setBackupOpt] = useState(true);

  const fileRef = useRef<HTMLInputElement>(null);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 5000); }

  function applyParsed(h: string[], r: ParsedRow[], file?: File) {
    if (!h.length) { flash("No headers found — check your file has a header row."); return; }
    setHeaders(h);
    setRows(r);
    setMapping(autoDetect(h));
    if (file) setSaveFile(file);
    setStep(2);
  }

  async function handleFile(file: File) {
    setLoading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "xlsx" || ext === "xls") {
        const buf = await file.arrayBuffer();
        const { headers: h, rows: r } = parseXLSX(buf);
        applyParsed(h, r, file);
      } else if (ext === "csv") {
        const text = await file.text();
        const { headers: h, rows: r } = parseCSV(text, ",");
        applyParsed(h, r, file);
      } else if (ext === "tsv") {
        const text = await file.text();
        const { headers: h, rows: r } = parseCSV(text, "\t");
        applyParsed(h, r, file);
      } else if (ext === "pdf") {
        flash("PDF text extraction is experimental. For best results, export as Excel or CSV.");
        const text = await file.text();
        const { headers: h, rows: r } = detectPaste(text);
        applyParsed(h, r, file);
      } else {
        flash("Unsupported file type. Use .xlsx, .csv, .tsv, or .pdf");
      }
    } catch (e) {
      flash("Could not parse file: " + (e as Error).message);
    }
    setLoading(false);
  }

  function handlePaste() {
    if (!pasteVal.trim()) { flash("Paste some data first."); return; }
    const { headers: h, rows: r } = detectPaste(pasteVal);
    applyParsed(h, r);
  }

  // Build preview rows with mapped fields
  function buildMapped(): Record<string, string>[] {
    return rows.map(row => {
      const out: Record<string, string> = {};
      for (const [h, fieldKey] of Object.entries(mapping)) {
        if (fieldKey !== SKIP_KEY && row[h]) {
          out[fieldKey] = out[fieldKey] || row[h];
        }
      }
      return out;
    }).filter(r => r.company_name);
  }

  async function handleSave() {
    setLoading(true);
    const mapped = buildMapped();
    if (!mapped.length) { flash("No rows with Company Name found. Check your column mapping."); setLoading(false); return; }

    const fd = new FormData();
    fd.append("rows", JSON.stringify(mapped));
    fd.append("backup", backupOpt ? "1" : "0");
    if (saveFile && backupOpt) fd.append("file", saveFile, saveFile.name);

    const res  = await fetch("/api/ronyx/owner-operators/bulk-import/save", { method: "POST", body: fd });
    const data = await res.json();

    if (res.ok) {
      setResult({ inserted: data.inserted ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] });
      setStep(4);
    } else {
      flash("Save error: " + (data.error || "Unknown error"));
    }
    setLoading(false);
  }

  const mapped     = step >= 3 ? buildMapped() : [];
  const validCount = mapped.length;
  const skipCount  = rows.length - validCount;

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", maxWidth: 420 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          <Link href="/ronyx/owner-operators" style={{ color: "#475569", textDecoration: "none" }}>Owner Operators</Link>
          {" / "}Bulk Import
        </div>
        <h1 style={{ margin: "4px 0 2px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Bulk Driver Import</h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.85rem" }}>
          Import drivers from an Excel, CSV, PDF, or TSV file — or paste directly from Excel. Data is saved securely to the database.
        </p>
      </div>

      {/* Card */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "28px 32px", marginTop: 20 }}>
        <Steps current={step} />

        {/* ── Step 1: Upload ─────────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <h2 style={{ margin: "0 0 18px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Step 1 — Upload Your Spreadsheet</h2>
            <p style={{ margin: "0 0 20px", fontSize: "0.85rem", color: "#64748b" }}>
              Upload Excel (.xlsx), CSV, PDF, or TSV — or copy rows from Excel/Google Sheets and paste below. The first row must be column headers.
            </p>

            {/* Upload buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
              {[
                { label: "Upload Excel",  sub: ".xlsx or .xls — best for spreadsheets", emoji: "🟩", accept: ".xlsx,.xls", bg: "#f0fdf4", border: "#86efac", color: "#15803d" },
                { label: "Upload CSV",    sub: "Comma-separated export from Excel",       emoji: "📊", accept: ".csv",       bg: "#eff6ff", border: "#93c5fd", color: "#1d4ed8" },
                { label: "Upload PDF",    sub: "Spreadsheet exported as PDF",              emoji: "📄", accept: ".pdf",       bg: "#fff7ed", border: "#fcd34d", color: "#b45309" },
                { label: "Upload TSV",    sub: "Tab-separated text file",                  emoji: "📋", accept: ".tsv",       bg: "#fdf4ff", border: "#d8b4fe", color: "#7c3aed" },
              ].map(btn => (
                <label
                  key={btn.label}
                  style={{ background: btn.bg, border: `1.5px solid ${btn.border}`, borderRadius: 12, padding: "16px 14px", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}
                >
                  <span style={{ fontSize: "1.8rem" }}>{btn.emoji}</span>
                  <span style={{ fontWeight: 800, fontSize: "0.82rem", color: btn.color }}>{btn.label}</span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b", lineHeight: 1.3 }}>{btn.sub}</span>
                  <input type="file" accept={btn.accept} style={{ display: "none" }} disabled={loading}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
                </label>
              ))}
            </div>

            {/* Paste area */}
            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
              <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.82rem", marginBottom: 8 }}>OR PASTE DIRECTLY</div>
              <textarea
                value={pasteVal}
                onChange={e => setPasteVal(e.target.value)}
                placeholder={"Copy rows from Excel or Google Sheets and paste here.\nFirst row = headers  (e.g. Company Name, Phone, Email, DOT…)"}
                rows={7}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "12px 14px", fontSize: "0.82rem", fontFamily: "monospace", resize: "vertical", outline: "none", boxSizing: "border-box", background: "#f8fafc", color: "#0f172a" }}
              />
              <button
                onClick={handlePaste}
                disabled={!pasteVal.trim() || loading}
                style={{ marginTop: 10, background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "9px 22px", fontWeight: 700, fontSize: "0.85rem", cursor: pasteVal.trim() ? "pointer" : "not-allowed", opacity: pasteVal.trim() ? 1 : 0.5 }}
              >
                Parse Pasted Data →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Map Columns ───────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Step 2 — Map Columns</h2>
            <p style={{ margin: "0 0 18px", fontSize: "0.85rem", color: "#64748b" }}>
              Match your spreadsheet columns to the correct Owner Operator fields. We auto-detected what we could.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {headers.map(h => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 10, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ flex: 1, fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={h}>
                    {h}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>→</div>
                  <select
                    value={mapping[h] || SKIP_KEY}
                    onChange={e => setMapping(prev => ({ ...prev, [h]: e.target.value }))}
                    style={{ flex: 1, border: `1px solid ${mapping[h] && mapping[h] !== SKIP_KEY ? "#86efac" : "#e2e8f0"}`, borderRadius: 6, padding: "4px 8px", fontSize: "0.78rem", background: mapping[h] && mapping[h] !== SKIP_KEY ? "#f0fdf4" : "#fff", color: "#0f172a", outline: "none" }}
                  >
                    <option value={SKIP_KEY}>— skip this column —</option>
                    {OO_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}{f.required ? " *" : ""}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {/* Backup option */}
            <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="backup" checked={backupOpt} onChange={e => setBackupOpt(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
              <label htmlFor="backup" style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0369a1", cursor: "pointer" }}>
                💾 Save original file as backup in secure storage
              </label>
              <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Original data is never modified</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(1)} style={ghostBtn}>← Back</button>
              <button
                onClick={() => {
                  if (!Object.values(mapping).includes("company_name")) { flash("Please map at least one column to Company Name."); return; }
                  setStep(3);
                }}
                style={primaryBtn}
              >
                Preview Import →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ───────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Step 3 — Preview</h2>
            <p style={{ margin: "0 0 4px", fontSize: "0.85rem", color: "#64748b" }}>
              Review the data before importing. Only rows with a Company Name will be imported.
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ background: "#f0fdf4", color: "#15803d", padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>✓ {validCount} rows ready</span>
              {skipCount > 0 && <span style={{ background: "#fff7ed", color: "#ea580c", padding: "4px 12px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>⚠ {skipCount} rows skipped (no company name)</span>}
            </div>

            <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, marginBottom: 20 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                    <th style={thSt}>#</th>
                    {OO_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                      <th key={f.key} style={thSt}>{f.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mapped.slice(0, 200).map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...tdSt, color: "#94a3b8", fontWeight: 700 }}>{i + 1}</td>
                      {OO_FIELDS.filter(f => Object.values(mapping).includes(f.key)).map(f => (
                        <td key={f.key} style={{ ...tdSt, color: f.required && !row[f.key] ? "#dc2626" : "#0f172a", fontWeight: f.key === "company_name" ? 700 : 400 }}>
                          {row[f.key] || (f.required ? <span style={{ color: "#dc2626" }}>MISSING</span> : "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => setStep(2)} style={ghostBtn}>← Back</button>
              <button onClick={handleSave} disabled={loading || validCount === 0} style={{ ...primaryBtn, opacity: validCount === 0 ? 0.5 : 1 }}>
                {loading ? "Importing…" : `Import ${validCount} Companies →`}
              </button>
              {validCount === 0 && <span style={{ fontSize: "0.78rem", color: "#dc2626" }}>No valid rows to import.</span>}
            </div>
          </div>
        )}

        {/* ── Step 4: Done ─────────────────────────────────────────────────── */}
        {step === 4 && result && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>✅</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.2rem", fontWeight: 900, color: "#0f172a" }}>Import Complete</h2>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#15803d" }}>{result.inserted}</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase" }}>Imported</div>
              </div>
              <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "14px 24px", textAlign: "center" }}>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ea580c" }}>{result.skipped}</div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#ea580c", textTransform: "uppercase" }}>Already Existed</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", marginBottom: 16, textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 6, fontSize: "0.82rem" }}>⚠ {result.errors.length} errors</div>
                {result.errors.slice(0, 10).map((e, i) => <div key={i} style={{ fontSize: "0.75rem", color: "#dc2626" }}>{e}</div>)}
              </div>
            )}
            {backupOpt && <div style={{ fontSize: "0.78rem", color: "#15803d", marginBottom: 16 }}>💾 Original file saved as backup in secure storage.</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link href="/ronyx/owner-operators" style={primaryBtn}>View All Owner Operators →</Link>
              <button onClick={() => { setStep(1); setHeaders([]); setRows([]); setMapping({}); setPasteVal(""); setSaveFile(null); setResult(null); }} style={ghostBtn}>
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  background: "#1e40af", color: "#fff", border: "none", borderRadius: 8,
  padding: "9px 20px", fontWeight: 700, cursor: "pointer", fontSize: "0.85rem",
  display: "inline-block", textDecoration: "none",
};
const ghostBtn: React.CSSProperties = {
  padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: "0.82rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer",
};
const thSt: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const tdSt: React.CSSProperties = { padding: "7px 12px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
