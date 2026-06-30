"use client";

import { useRef, useState } from "react";

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px" };

export default function RosterImport() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState("");

  async function run(mode: "preview" | "commit") {
    if (!file) { setErr("Choose the Excel/CSV file first."); return; }
    setBusy(true); setErr(""); if (mode === "preview") setResult(null);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("mode", mode);
      const res = await fetch("/api/ronyx/owner-operators/roster-import", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) { setErr(j.error || "Failed."); setBusy(false); return; }
      if (mode === "preview") setPreview(j);
      else { setResult(j); setPreview(null); }
    } catch { setErr("Network error."); }
    finally { setBusy(false); }
  }

  return (
    <div style={{ padding: "24px 28px 80px", maxWidth: 1040, margin: "0 auto", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>📋 Roster Import</h1>
      <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: 4 }}>
        Upload the office master roster (<strong>Excel or CSV</strong>). It adds <strong>only what's missing</strong> — new owner-operator companies and new drivers — and never creates duplicates. Always <strong>Preview first</strong> to see exactly what will be added.
      </p>

      <div style={{ ...card, marginTop: 16 }}>
        <div onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${file ? "#16a34a" : "#cbd5e1"}`, borderRadius: 10, background: file ? "#f0fdf4" : "#f8fafc", padding: "22px 16px", textAlign: "center", cursor: "pointer" }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(null); setResult(null); setErr(""); } }} />
          {file ? <>
            <div style={{ fontSize: "1.3rem" }}>✅</div>
            <div style={{ fontWeight: 700, color: "#16a34a" }}>{file.name}</div>
            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{(file.size / 1024).toFixed(0)} KB · click to change</div>
          </> : <>
            <div style={{ fontSize: "1.6rem" }}>📂</div>
            <div style={{ fontWeight: 700, color: "#475569" }}>Drop the roster here or click to browse</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 3 }}>.xlsx · .xls · .csv — not PDF</div>
          </>}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button onClick={() => run("preview")} disabled={busy || !file} style={{ flex: 1, padding: "11px 0", borderRadius: 9, background: busy ? "#94a3b8" : "#1e40af", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.88rem", cursor: busy || !file ? "default" : "pointer" }}>{busy ? "Working…" : "🔍 Preview what's missing"}</button>
        </div>
        {err && <div style={{ marginTop: 12, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 9, padding: "10px 14px", fontSize: "0.82rem", fontWeight: 600 }}>⚠ {err}</div>}
      </div>

      {preview && (
        <div style={{ ...card, marginTop: 16 }}>
          <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>Preview — nothing has been saved yet</div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 14 }}>{preview.file} · {preview.parsedDrivers} unique drivers found in {preview.totalRows} rows</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
            {[["New companies", preview.newCompanies.length, "#1e40af", "#eff6ff"], ["New drivers", preview.newDriverCount, "#16a34a", "#f0fdf4"], ["Fill blanks on existing", preview.enrichCount, "#b45309", "#fffbeb"], ["Already up to date", preview.skipped, "#64748b", "#f8fafc"]].map(([l, v, c, b]: any) => (
              <div key={l} style={{ background: b, border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c }}>{v}</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700 }}>{l}</div>
              </div>
            ))}
          </div>

          {preview.newCompanies.length > 0 && (
            <details style={{ marginBottom: 10 }} open>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.82rem", color: "#1e40af" }}>🏢 {preview.newCompanies.length} new companies to create</summary>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {preview.newCompanies.map((c: string) => <span key={c} style={{ background: "#eff6ff", color: "#1e40af", padding: "3px 10px", borderRadius: 999, fontSize: "0.74rem", fontWeight: 700 }}>{c}</span>)}
              </div>
            </details>
          )}

          {preview.newDriverCount > 0 && (
            <details style={{ marginBottom: 10 }} open>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.82rem", color: "#16a34a" }}>👤 {preview.newDriverCount} new drivers {preview.newDriverCount > 40 ? "(showing first 40)" : ""}</summary>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.76rem", marginTop: 8 }}>
                <thead><tr style={{ background: "#f8fafc" }}>{["Driver", "Company", "CDL #", "CDL Exp", "Med Exp"].map(h => <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#64748b", fontWeight: 700 }}>{h}</th>)}</tr></thead>
                <tbody>{preview.newDriversSample.map((d: any, i: number) => (
                  <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "5px 8px", fontWeight: 700 }}>{d.name}</td><td style={{ padding: "5px 8px" }}>{d.company}</td>
                    <td style={{ padding: "5px 8px" }}>{d.cdl || "—"}</td><td style={{ padding: "5px 8px" }}>{d.cdl_exp || "—"}</td><td style={{ padding: "5px 8px" }}>{d.med_exp || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </details>
          )}

          {preview.enrichCount > 0 && (
            <details style={{ marginBottom: 14 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: "0.82rem", color: "#b45309" }}>✏ {preview.enrichCount} existing drivers will get blank fields filled in</summary>
              <div style={{ marginTop: 8, fontSize: "0.76rem", color: "#475569" }}>{preview.enrichSample.map((e: any, i: number) => <div key={i}>{e.name} <span style={{ color: "#94a3b8" }}>({e.company})</span> — {e.fills.join(", ")}</div>)}</div>
            </details>
          )}

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => run("commit")} disabled={busy} style={{ padding: "12px 24px", borderRadius: 9, background: busy ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.9rem", cursor: busy ? "default" : "pointer" }}>{busy ? "Adding…" : `✓ Apply — add ${preview.newDriverCount} drivers + ${preview.newCompanies.length} companies`}</button>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>Existing records are never duplicated or overwritten.</span>
          </div>
        </div>
      )}

      {result && (
        <div style={{ ...card, marginTop: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "1.6rem" }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#15803d" }}>Roster imported</div>
          <div style={{ fontSize: "0.86rem", color: "#166534", marginTop: 6 }}>
            Created <strong>{result.companiesCreated}</strong> new companies and <strong>{result.driversCreated}</strong> new drivers · filled blanks on <strong>{result.enriched}</strong> existing drivers · <strong>{result.skipped}</strong> were already up to date.
          </div>
          <a href="/ronyx/drivers/cdl-medical" style={{ display: "inline-block", marginTop: 12, background: "#0f172a", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: 9, fontWeight: 800, fontSize: "0.82rem" }}>View all drivers →</a>
        </div>
      )}
    </div>
  );
}
