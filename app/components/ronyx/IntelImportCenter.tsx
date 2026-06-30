"use client";

import { useRef, useState, useEffect } from "react";

const IMPORT_TYPES = [
  { value: "auto",           label: "🔍 Auto Detect"           },
  { value: "drivers",        label: "👤 Drivers"                },
  { value: "trucks",         label: "🚛 Trucks / Fleet"         },
  { value: "drivers_trucks", label: "👤🚛 Drivers + Trucks"     },
  { value: "owner_ops",      label: "🏢 Owner Operators"        },
  { value: "tickets",        label: "🎫 Tickets"                },
  { value: "invoices",       label: "🧾 Invoices"               },
  { value: "driver_docs",    label: "📄 Driver Documents"       },
  { value: "truck_docs",     label: "📋 Truck Documents"        },
  { value: "customers",      label: "🏗 Customers / Projects"   },
  { value: "fuel",           label: "⛽ Fuel Receipts"          },
  { value: "maintenance",    label: "🔩 Maintenance Records"    },
  { value: "rate_cards",     label: "💵 Rate Cards"             },
];

const QUICK_CHIPS = [
  "Match by truck #",
  "Match by driver name",
  "Flag duplicates",
  "Skip header row",
  "Convert dates to MM/DD/YYYY",
];

type Stage = "select" | "review" | "uploading" | "done" | "error";

// Live processing steps shown while a file is being analyzed, so the user can see
// what's happening and that it's routing to the right place.
const PROC_STEPS = [
  { icon: "📄", label: "Reading file" },
  { icon: "🔍", label: "Detecting data type" },
  { icon: "🧩", label: "Mapping columns to the system" },
  { icon: "✅", label: "Checking data quality" },
  { icon: "📍", label: "Routing to the right place" },
];

export default function IntelImportCenter({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver]       = useState(false);
  const [file, setFile]               = useState<File | null>(null);
  const [importType, setImportType]   = useState("auto");
  const [instructions, setInst]       = useState("");
  const [chips, setChips]             = useState<Set<string>>(new Set());
  const [stage, setStage]             = useState<Stage>("select");
  const [uploadResult, setResult]     = useState<any>(null);
  const [errorMsg, setError]          = useState("");
  const [procStep, setProcStep]       = useState(0);

  // Advance the visible processing steps while the file is uploading/analyzing.
  useEffect(() => {
    if (stage !== "uploading") return;
    setProcStep(0);
    const id = setInterval(() => {
      setProcStep(s => (s < PROC_STEPS.length - 1 ? s + 1 : s));
    }, 850);
    return () => clearInterval(id);
  }, [stage]);

  function toggleChip(c: string) {
    setChips(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  }

  function pickFile(f: File) {
    setFile(f);
    setStage("review");
    setResult(null);
    setError("");
  }

  async function runImport() {
    if (!file) return;
    setStage("uploading");
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const isSheet = ["csv", "xlsx", "xls", "tsv"].includes(ext);
      const rosterTypes = ["auto", "drivers", "owner_ops", "drivers_trucks"];

      // Spreadsheet of drivers/owner-operators → run the real roster engine so the
      // data (truck #, CDL, med card #/exp) actually lands in Fleet CDL & Medical,
      // deduped. If it's not a roster sheet it errors → fall through to file storage.
      if (isSheet && rosterTypes.includes(importType)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("mode", "commit");
        const res = await fetch("/api/ronyx/owner-operators/roster-import", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          // Remember exactly which driver rows were touched so Fleet CDL & Medical
          // can highlight them in yellow.
          try { localStorage.setItem("fleet_recent_import", JSON.stringify({ ids: data.affectedIds || [], at: Date.now() })); } catch {}
          setResult({ kind: "roster", ...data }); setStage("done"); return;
        }
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("import_type", importType);
      fd.append("instructions", instructions);
      fd.append("chips", Array.from(chips).join(", "));

      const res = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setResult({ kind: "file", ...data });
      setStage("done");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setStage("error");
    }
  }

  function reset() {
    setFile(null);
    setImportType("auto");
    setInst("");
    setChips(new Set());
    setStage("select");
    setResult(null);
    setError("");
  }

  function close() {
    reset();
    onClose();
  }

  const ext = file?.name.split(".").pop()?.toUpperCase() ?? "";

  const inp: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: "0.84rem",
    background: "#f8fafc", color: "#0f172a", outline: "none",
    boxSizing: "border-box",
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.48)",
          zIndex: 10000,
        }}
      />

      {/* Slide-over panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(100vw, 520px)",
        background: "#fff",
        zIndex: 10001,
        display: "flex",
        flexDirection: "column",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        fontFamily: "Inter, sans-serif",
      }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #1e40af 0%, #4f46e5 100%)",
          padding: "20px 24px 18px",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.4rem" }}>📥</span>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: "1.1rem", letterSpacing: "-0.3px" }}>
                  Smart Import Center™
                </span>
              </div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.75rem", marginTop: 4, marginLeft: 2 }}>
                Upload, review, and import data into MoveAround TMS
              </div>
            </div>
            <button
              onClick={close}
              style={{
                background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8,
                width: 34, height: 34, cursor: "pointer", color: "#fff",
                fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

          {/* ── STAGE: SELECT / REVIEW ── */}
          {(stage === "select" || stage === "review") && (
            <>
              {/* Drop zone */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  File to Import
                </label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => {
                    e.preventDefault(); setDragOver(false);
                    const f = e.dataTransfer.files[0];
                    if (f) pickFile(f);
                  }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? "#4f46e5" : file ? "#16a34a" : "#cbd5e1"}`,
                    borderRadius: 10,
                    background: dragOver ? "#eff6ff" : file ? "#f0fdf4" : "#f8fafc",
                    padding: "18px 16px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 140ms",
                  }}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    /* Accept ANY file — photos, scans, PDFs, Word, Excel, CSV, etc. */
                    style={{ display: "none" }}
                    onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
                  />
                  {file ? (
                    <div>
                      <div style={{ fontSize: "1.3rem", marginBottom: 4 }}>✅</div>
                      <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.84rem" }}>{file.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2 }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB · {ext} · Click to change
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: "1.6rem", marginBottom: 6 }}>📂</div>
                      <div style={{ fontWeight: 700, color: "#475569", fontSize: "0.84rem" }}>
                        Drop file here or click to browse
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 4 }}>
                        Any file — photo · scan · PDF · Word · Excel · CSV · HEIC · Max 50 MB
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Import Type */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Import Type
                </label>
                <select
                  value={importType}
                  onChange={e => setImportType(e.target.value)}
                  style={inp}
                >
                  {IMPORT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Instruction Desk */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Instruction Desk
                  <span style={{ fontWeight: 400, fontSize: "0.65rem", marginLeft: 6, color: "#94a3b8", textTransform: "none" }}>
                    Optional notes for the system
                  </span>
                </label>
                <textarea
                  value={instructions}
                  onChange={e => setInst(e.target.value)}
                  placeholder="e.g. Match trucks by number in column B. Ignore rows where status is 'inactive'. Skip the first 3 rows — those are headers from the old system."
                  rows={4}
                  style={{ ...inp, resize: "vertical", minHeight: 90 }}
                />
              </div>

              {/* Quick Chips */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Quick Instructions
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {QUICK_CHIPS.map(c => (
                    <button
                      key={c}
                      onClick={() => toggleChip(c)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: "0.74rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: `1.5px solid ${chips.has(c) ? "#4f46e5" : "#e2e8f0"}`,
                        background: chips.has(c) ? "#eff6ff" : "#f8fafc",
                        color: chips.has(c) ? "#3730a3" : "#64748b",
                        transition: "all 120ms",
                      }}
                    >
                      {chips.has(c) ? "✓ " : ""}{c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Before Import Panel */}
              {file && stage === "review" && (
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "14px 16px",
                  marginBottom: 20,
                }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Review Before Import
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      { label: "File",        value: file.name },
                      { label: "Type",        value: IMPORT_TYPES.find(t => t.value === importType)?.label.replace(/^[^\s]+ /, "") ?? importType },
                      { label: "Size",        value: `${(file.size / 1024).toFixed(1)} KB` },
                      { label: "Format",      value: ext || "Unknown" },
                      { label: "Instructions", value: instructions.trim() || "None" },
                      ...(chips.size > 0 ? [{ label: "Quick Opts", value: Array.from(chips).join(", ") }] : []),
                    ].map(row => (
                      <div key={row.label} style={{ display: "flex", gap: 8, fontSize: "0.8rem" }}>
                        <span style={{ color: "#94a3b8", fontWeight: 600, width: 90, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ color: "#0f172a", wordBreak: "break-word" }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── STAGE: UPLOADING ── */}
          {stage === "uploading" && (
            <div style={{ padding: "30px 8px" }}>
              <div style={{ textAlign: "center", marginBottom: 22 }}>
                <div style={{ fontSize: "2.2rem", marginBottom: 8 }}>⏳</div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1rem" }}>Processing your file…</div>
                <div style={{ color: "#64748b", fontSize: "0.8rem", marginTop: 4 }}>
                  {file?.name} → <strong>{IMPORT_TYPES.find(t => t.value === importType)?.label.replace(/^[^\s]+ /, "") ?? importType}</strong>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 360, margin: "0 auto" }}>
                {PROC_STEPS.map((s, i) => {
                  const isDone = i < procStep;
                  const isActive = i === procStep;
                  return (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: isActive ? "#eff6ff" : isDone ? "#f0fdf4" : "#f8fafc", border: `1px solid ${isActive ? "#bfdbfe" : isDone ? "#bbf7d0" : "#e2e8f0"}`, transition: "all 0.2s" }}>
                      <span style={{ fontSize: "1rem", width: 22, textAlign: "center" }}>{isDone ? "✓" : isActive ? "⏳" : s.icon}</span>
                      <span style={{ fontSize: "0.82rem", fontWeight: isDone || isActive ? 700 : 500, color: isDone ? "#15803d" : isActive ? "#1e40af" : "#94a3b8" }}>{s.label}</span>
                      {isActive && <span style={{ marginLeft: "auto", fontSize: "0.66rem", color: "#1e40af", fontWeight: 700 }}>working…</span>}
                      {isDone && <span style={{ marginLeft: "auto", fontSize: "0.66rem", color: "#15803d", fontWeight: 700 }}>done</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STAGE: DONE ── */}
          {stage === "done" && (
            <div style={{ padding: "20px 0" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1.05rem", marginBottom: 6 }}>
                  {uploadResult?.kind === "roster" ? "Roster Imported" : "Upload Complete"}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.83rem" }}>
                  {uploadResult?.kind === "roster" ? "Here's exactly what was added or updated:" : "Your file was stored and filed automatically."}
                </div>
              </div>

              {uploadResult?.kind === "roster" && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[
                      ["New drivers", uploadResult.driversCreated ?? 0, "#16a34a", "#f0fdf4"],
                      ["Updated (truck/med filled)", uploadResult.enriched ?? 0, "#b45309", "#fffbeb"],
                      ["New companies", uploadResult.companiesCreated ?? 0, "#1e40af", "#eff6ff"],
                      ["Already up to date", uploadResult.skipped ?? 0, "#64748b", "#f8fafc"],
                    ].map(([l, v, c, b]: any) => (
                      <div key={l} style={{ background: b, border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c }}>{v}</div>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: "0.8rem", color: "#854d0e", fontWeight: 600 }}>
                    ✨ The {(uploadResult.driversCreated ?? 0) + (uploadResult.enriched ?? 0)} added/updated drivers are <strong>highlighted in yellow</strong> on Fleet CDL &amp; Medical.
                  </div>
                  <a href="/ronyx/drivers/cdl-medical" style={{ display: "block", textAlign: "center", background: "#0f172a", color: "#fff", textDecoration: "none", padding: "11px 0", borderRadius: 9, fontWeight: 800, fontSize: "0.86rem", marginBottom: 8 }}>
                    🪪 View highlighted drivers →
                  </a>
                </>
              )}

              {uploadResult?.kind === "file" && (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
                  {[
                    { label: "File", value: uploadResult.file_name || file?.name },
                    uploadResult.routed_to_oo
                      ? { label: "Filed to", value: `${uploadResult.routed_to_oo.company_name}${uploadResult.routed_to_oo.driver ? " · " + uploadResult.routed_to_oo.driver : ""} (${uploadResult.routed_to_oo.doc_type})` }
                      : { label: "Stored as", value: uploadResult.module || "document" },
                  ].filter(Boolean).map((row: any) => (
                    <div key={row.label} style={{ display: "flex", gap: 8, fontSize: "0.78rem", marginBottom: 4 }}>
                      <span style={{ color: "#15803d", fontWeight: 700, width: 80, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ color: "#0f172a", wordBreak: "break-word", opacity: 0.85 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => { setStage("select"); setFile(null); setResult(null); }}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 9,
                  background: "linear-gradient(135deg,#1e40af,#4f46e5)",
                  color: "#fff", border: "none", fontWeight: 700,
                  fontSize: "0.88rem", cursor: "pointer", marginBottom: 8,
                }}
              >
                Import Another File
              </button>
              <button
                onClick={close}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 9,
                  background: "#f1f5f9", color: "#475569", border: "none",
                  fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          )}

          {/* ── STAGE: ERROR ── */}
          {stage === "error" && (
            <div style={{ padding: "24px 0" }}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>❌</div>
                <div style={{ fontWeight: 800, color: "#dc2626", fontSize: "1rem", marginBottom: 8 }}>
                  Import Failed
                </div>
                <div style={{ color: "#64748b", fontSize: "0.83rem" }}>
                  {errorMsg}
                </div>
              </div>
              <button
                onClick={() => setStage("review")}
                style={{
                  width: "100%", padding: "11px 0", borderRadius: 9,
                  background: "#0f172a", color: "#fff", border: "none",
                  fontWeight: 700, fontSize: "0.88rem", cursor: "pointer",
                }}
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* ── Footer action bar ── */}
        {(stage === "select" || stage === "review") && (
          <div style={{
            padding: "14px 24px 18px",
            borderTop: "1px solid #e2e8f0",
            background: "#fff",
            flexShrink: 0,
            display: "flex",
            gap: 10,
          }}>
            {stage === "review" ? (
              <>
                <button
                  onClick={runImport}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 9,
                    background: "linear-gradient(135deg,#1e40af,#4f46e5)",
                    color: "#fff", border: "none", fontWeight: 800,
                    fontSize: "0.9rem", cursor: "pointer",
                  }}
                >
                  📥 Import Now
                </button>
                <button
                  onClick={() => setStage("select")}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 9,
                    background: "#f1f5f9", color: "#475569", border: "none",
                    fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                  }}
                >
                  Back
                </button>
              </>
            ) : (
              <button
                onClick={close}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 9,
                  background: "#f1f5f9", color: "#475569", border: "none",
                  fontWeight: 600, fontSize: "0.85rem", cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
