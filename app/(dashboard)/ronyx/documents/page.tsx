"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type DocRecord = {
  id: string;
  driver_id: string;
  driver_name?: string;
  doc_type: string;
  file_url: string | null;
  status: string;
  expires_on: string | null;
  notes: string | null;
  created_at: string;
};

type DriverSummary = {
  id: string;
  full_name: string;
  company_name: string | null;
  status: string;
  license_expiration_date: string | null;
  medical_card_expiration: string | null;
  mvr_expiration: string | null;
  drug_test_status: string | null;
  background_check_status: string | null;
  docs: DocRecord[];
};

type HubStats = {
  total_drivers: number;
  complete: number;
  needs_action: number;
  critical: number;
  expiring_30: number;
  missing_cdl: number;
  missing_medical: number;
};

/* ─── Constants ──────────────────────────────────────────────────────────── */
const REQUIRED_DOCS = ["CDL Front", "CDL Back", "MVR", "Medical Card", "Drug Test", "Background Check"];
const BUCKET = "ronyx-driver-documents";

const DOC_COLORS: Record<string, string> = {
  "CDL Front": "#1d4ed8",
  "CDL Back":  "#2563eb",
  "MVR":       "#7c3aed",
  "Medical Card": "#0891b2",
  "Drug Test": "#15803d",
  "Background Check": "#64748b",
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function daysUntil(d: string | null | undefined): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getDriverStatus(driver: DriverSummary): "complete" | "expiring" | "missing" | "critical" {
  const cdlDays = daysUntil(driver.license_expiration_date);
  const medDays = daysUntil(driver.medical_card_expiration);
  const hasCdlFront = driver.docs.some(d => d.doc_type === "CDL Front");
  const hasCdlBack  = driver.docs.some(d => d.doc_type === "CDL Back");
  const hasMed      = driver.docs.some(d => d.doc_type === "Medical Card");

  if (
    (cdlDays !== null && cdlDays < 0) ||
    (medDays !== null && medDays < 0) ||
    driver.drug_test_status === "failed" ||
    driver.background_check_status === "failed"
  ) return "critical";

  if (!hasCdlFront || !hasCdlBack || !hasMed) return "missing";

  if (
    (cdlDays !== null && cdlDays <= 30) ||
    (medDays !== null && medDays <= 30)
  ) return "expiring";

  const missingRequired = REQUIRED_DOCS.filter(dt =>
    !driver.docs.some(d => d.doc_type === dt)
  );
  if (missingRequired.length > 0) return "missing";

  return "complete";
}

const STATUS_CFG = {
  complete:  { label: "Complete",     color: "#15803d", bg: "#f0fdf4", dot: "#10b981" },
  expiring:  { label: "Expiring Soon",color: "#d97706", bg: "#fefce8", dot: "#f59e0b" },
  missing:   { label: "Docs Missing", color: "#ea580c", bg: "#fff7ed", dot: "#f97316" },
  critical:  { label: "Critical",     color: "#dc2626", bg: "#fff1f2", dot: "#dc2626" },
};

/* ─── StatusBar ──────────────────────────────────────────────────────────── */
function StatusBar({ stats }: { stats: HubStats }) {
  const pct = stats.total_drivers > 0 ? Math.round((stats.complete / stats.total_drivers) * 100) : 0;
  const barColor = pct >= 90 ? "#10b981" : pct >= 70 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Fleet Document Compliance
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
            <span style={{ fontSize: "2rem", fontWeight: 900, color: barColor, lineHeight: 1 }}>{pct}%</span>
            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{stats.complete} of {stats.total_drivers} drivers fully documented</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "Critical",     value: stats.critical,      color: "#dc2626", bg: "#fff1f2" },
            { label: "Docs Missing", value: stats.missing_cdl + stats.missing_medical, color: "#ea580c", bg: "#fff7ed" },
            { label: "Expiring 30d", value: stats.expiring_30,   color: "#d97706", bg: "#fefce8" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 90 }}>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 12, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${barColor}, ${barColor}cc)`,
          borderRadius: 99,
          transition: "width 0.6s ease",
        }} />
      </div>

      {/* Segment legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CFG).map(([key, cfg]) => {
          const count =
            key === "complete"  ? stats.complete :
            key === "expiring"  ? stats.expiring_30 :
            key === "missing"   ? stats.needs_action :
            key === "critical"  ? stats.critical : 0;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.75rem", color: "#64748b" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
              <span>{cfg.label}: <strong style={{ color: cfg.color }}>{count}</strong></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── DocBadge ───────────────────────────────────────────────────────────── */
function DocBadge({ docType, doc }: { docType: string; doc?: DocRecord }) {
  const color = DOC_COLORS[docType] || "#64748b";
  const has   = !!doc;
  const days  = doc?.expires_on ? daysUntil(doc.expires_on) : null;
  const expired = days !== null && days < 0;
  const expiring = days !== null && days <= 30 && days >= 0;

  const bg = !has ? "#f8fafc" : expired ? "#fff1f2" : expiring ? "#fefce8" : "#f0fdf4";
  const border = !has ? "#e2e8f0" : expired ? "#fca5a5" : expiring ? "#fde68a" : "#86efac";
  const textColor = !has ? "#94a3b8" : expired ? "#dc2626" : expiring ? "#d97706" : "#15803d";

  const shortLabels: Record<string, string> = {
    "CDL Front": "CDL ▲", "CDL Back": "CDL ▼", "MVR": "MVR",
    "Medical Card": "Med", "Drug Test": "Drug", "Background Check": "BG",
  };

  return (
    <div title={has ? `${docType} · ${doc?.expires_on ? fmtDate(doc.expires_on) : "No expiry"} · Click to view` : `${docType} — missing`}
      style={{ background: bg, border: `1.5px solid ${border}`, borderRadius: 8, padding: "4px 10px", fontSize: "0.7rem", fontWeight: 800, color: textColor, cursor: has ? "pointer" : "default", whiteSpace: "nowrap" }}
      onClick={() => { if (doc?.file_url) window.open(doc.file_url, "_blank"); }}
    >
      {has ? (expired ? "⚠" : expiring ? "⏰" : "✓") : "✕"} {shortLabels[docType] || docType}
      {days !== null && days >= 0 && days <= 30 && <span style={{ marginLeft: 4, fontSize: "0.62rem" }}>{days}d</span>}
    </div>
  );
}

/* ─── DriverRow ──────────────────────────────────────────────────────────── */
function DriverRow({
  driver,
  onUpload,
  uploading,
}: {
  driver: DriverSummary;
  onUpload: (driverId: string, docType: string, file: File) => void;
  uploading: string | null;
}) {
  const driverStatus = getDriverStatus(driver);
  const cfg = STATUS_CFG[driverStatus];
  const isUploading = uploading === driver.id;

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${driverStatus === "critical" ? "#fca5a5" : driverStatus === "missing" ? "#fed7aa" : "#e2e8f0"}`,
      borderLeft: `4px solid ${cfg.dot}`,
      borderRadius: 12,
      padding: "14px 16px",
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* Driver info */}
        <div style={{ minWidth: 160, flex: "0 0 160px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#1e40af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem", flexShrink: 0 }}>
              {(driver.full_name || "?").charAt(0).toUpperCase()}
            </div>
            <div>
              <Link href={`/ronyx/drivers/${driver.id}`} style={{ fontWeight: 700, color: "#0f172a", textDecoration: "none", fontSize: "0.88rem" }}>
                {driver.full_name}
              </Link>
              {driver.company_name && <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{driver.company_name}</div>}
            </div>
          </div>
        </div>

        {/* Status badge */}
        <span style={{ background: cfg.bg, color: cfg.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 800, flexShrink: 0 }}>
          {cfg.label}
        </span>

        {/* Doc badges */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {REQUIRED_DOCS.map(dt => (
            <DocBadge key={dt} docType={dt} doc={driver.docs.find(d => d.doc_type === dt)} />
          ))}
        </div>

        {/* Upload button */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["CDL Front","CDL Back","Medical Card"].map(dt => {
              const has = driver.docs.some(d => d.doc_type === dt);
              return (
                <label
                  key={dt}
                  title={`Upload ${dt}`}
                  style={{
                    cursor: isUploading ? "not-allowed" : "pointer",
                    background: has ? "#f0fdf4" : "#eff6ff",
                    border: `1px solid ${has ? "#86efac" : "#93c5fd"}`,
                    borderRadius: 6,
                    padding: "3px 8px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: has ? "#15803d" : "#1d4ed8",
                    opacity: isUploading ? 0.5 : 1,
                    whiteSpace: "nowrap",
                  }}
                >
                  ↑ {dt === "CDL Front" ? "CDL▲" : dt === "CDL Back" ? "CDL▼" : "Med"}
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"
                    style={{ display: "none" }}
                    disabled={!!isUploading}
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) onUpload(driver.id, dt, f);
                      e.target.value = "";
                    }}
                  />
                </label>
              );
            })}
            <Link href={`/ronyx/drivers/${driver.id}?tab=Documents`} style={{ padding: "3px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: "0.68rem", fontWeight: 600, color: "#475569", textDecoration: "none" }}>
              All Docs →
            </Link>
          </div>
        </div>
      </div>

      {/* Expiry details for problem docs */}
      {(driverStatus === "critical" || driverStatus === "expiring") && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9", display: "flex", gap: 12, flexWrap: "wrap", fontSize: "0.75rem" }}>
          {driver.license_expiration_date && (() => {
            const d = daysUntil(driver.license_expiration_date);
            if (d !== null && d <= 60) return (
              <span style={{ color: d < 0 ? "#dc2626" : d <= 30 ? "#d97706" : "#64748b", fontWeight: 600 }}>
                CDL: {d < 0 ? `EXPIRED ${Math.abs(d)}d ago` : `${d}d left`} · {fmtDate(driver.license_expiration_date)}
              </span>
            );
          })()}
          {driver.medical_card_expiration && (() => {
            const d = daysUntil(driver.medical_card_expiration);
            if (d !== null && d <= 60) return (
              <span style={{ color: d < 0 ? "#dc2626" : d <= 30 ? "#d97706" : "#64748b", fontWeight: 600 }}>
                Med Card: {d < 0 ? `EXPIRED ${Math.abs(d)}d ago` : `${d}d left`} · {fmtDate(driver.medical_card_expiration)}
              </span>
            );
          })()}
          {driver.drug_test_status && driver.drug_test_status !== "cleared" && (
            <span style={{ color: "#dc2626", fontWeight: 600 }}>Drug Test: {driver.drug_test_status}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function SmartDocsHubPage() {
  const [drivers,    setDrivers]    = useState<DriverSummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [uploading,  setUploading]  = useState<string | null>(null);
  const [toast,      setToast]      = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search,     setSearch]     = useState("");
  const [importing,  setImporting]  = useState(false);
  const xlsxRef = useRef<HTMLInputElement>(null);

  // Derived stats
  const stats: HubStats = {
    total_drivers: drivers.length,
    complete:      drivers.filter(d => getDriverStatus(d) === "complete").length,
    needs_action:  drivers.filter(d => ["missing","critical"].includes(getDriverStatus(d))).length,
    critical:      drivers.filter(d => getDriverStatus(d) === "critical").length,
    expiring_30:   drivers.filter(d => getDriverStatus(d) === "expiring").length,
    missing_cdl:   drivers.filter(d => !d.docs.some(doc => doc.doc_type === "CDL Front")).length,
    missing_medical: drivers.filter(d => !d.docs.some(doc => doc.doc_type === "Medical Card")).length,
  };

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profiles + their documents in parallel
      const [profRes, docsRes] = await Promise.all([
        fetch("/api/ronyx/drivers/list"),
        fetch("/api/ronyx/drivers/documents/all"),
      ]);
      const profData = await profRes.json();
      const docsData = await docsRes.json();

      const docsByDriver: Record<string, DocRecord[]> = {};
      for (const doc of (docsData.documents || [])) {
        if (!docsByDriver[doc.driver_id]) docsByDriver[doc.driver_id] = [];
        docsByDriver[doc.driver_id].push(doc);
      }

      const list: DriverSummary[] = (profData.drivers || []).map((p: any) => ({
        id:                      p.id,
        full_name:               p.full_name || p.name || "Unknown",
        company_name:            p.company_name || p.carrier_name || null,
        status:                  p.status || "active",
        license_expiration_date: p.license_expiration_date || null,
        medical_card_expiration: p.medical_card_expiration || null,
        mvr_expiration:          p.mvr_expiration          || null,
        drug_test_status:        p.drug_test_status        || null,
        background_check_status: p.background_check_status || null,
        docs:                    docsByDriver[p.id] || [],
      }));

      setDrivers(list);
    } catch (e) {
      flash("Failed to load driver data.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(""), 5000); }

  async function handleUpload(driverId: string, docType: string, file: File) {
    setUploading(driverId);
    const expiresOn = docType === "Medical Card" || docType === "CDL Front" || docType === "CDL Back"
      ? prompt(`${docType} expiration date (YYYY-MM-DD):`, "") || undefined
      : undefined;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("driver_id", driverId);
    fd.append("doc_type", docType);
    if (expiresOn) fd.append("expires_on", expiresOn);

    const res  = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: fd });
    const data = await res.json();

    if (res.ok) {
      setDrivers(prev => prev.map(d => {
        if (d.id !== driverId) return d;
        return {
          ...d,
          docs: [data.document, ...d.docs.filter(doc => doc.doc_type !== docType)],
        };
      }));
      flash(`✅ ${docType} uploaded for ${drivers.find(d => d.id === driverId)?.full_name || "driver"}.`);
    } else {
      flash(`Upload error: ${data.error}`);
    }
    setUploading(null);
  }

  // XLSX import for CDL/Medical Card data
  async function handleXLSXImport(file: File) {
    setImporting(true);
    flash("Importing CDL/Medical Card data from spreadsheet…");
    const fd = new FormData();
    fd.append("file", file);
    const res  = await fetch("/api/ronyx/drivers/import-cdl-medical", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      flash(`✅ Imported ${data.updated || 0} drivers from spreadsheet.`);
      loadDrivers();
    } else {
      flash(`Import error: ${data.error}`);
    }
    setImporting(false);
  }

  // Filter + search
  const visible = drivers
    .filter(d => d.status !== "inactive")
    .filter(d => filterStatus === "all" || getDriverStatus(d) === filterStatus)
    .filter(d => !search || (d.full_name || "").toLowerCase().includes(search.toLowerCase()) || (d.company_name || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const order = { critical: 0, missing: 1, expiring: 2, complete: 3 };
      return (order[getDriverStatus(a)] ?? 9) - (order[getDriverStatus(b)] ?? 9);
    });

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: "#0f172a", color: "#fff", padding: "12px 20px", borderRadius: 10, fontSize: "0.85rem", fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", maxWidth: 420 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>RONYX TMS</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Smart Docs Hub</h1>
          <span style={{ background: "#f0f9ff", color: "#0891b2", padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700 }}>
            CDL · Medical Card · MVR · Drug Test · BG Check
          </span>
        </div>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.85rem" }}>
          Upload and track required compliance documents for all drivers in one place.
        </p>
      </div>

      {/* Status bar */}
      {!loading && <StatusBar stats={stats} />}

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Status filter tabs */}
        <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 10, padding: 3, gap: 2 }}>
          {[
            { key: "all",      label: "All",      count: drivers.filter(d => d.status !== "inactive").length },
            { key: "critical", label: "Critical", count: stats.critical },
            { key: "missing",  label: "Missing",  count: stats.needs_action - stats.critical },
            { key: "expiring", label: "Expiring", count: stats.expiring_30 },
            { key: "complete", label: "Complete", count: stats.complete },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              style={{
                padding: "5px 14px", border: "none", borderRadius: 8, cursor: "pointer",
                fontSize: "0.78rem", fontWeight: 700,
                background: filterStatus === key ? "#fff" : "transparent",
                color: filterStatus === key ? "#0f172a" : "#64748b",
                boxShadow: filterStatus === key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {label} {count > 0 && <span style={{ opacity: 0.7 }}>({count})</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search driver or company…"
          style={{ padding: "7px 14px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.85rem", width: 220, outline: "none" }}
        />

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {/* XLSX import */}
          <label style={{ ...primaryBtn, cursor: importing ? "not-allowed" : "pointer", opacity: importing ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}>
            📊 Import CDL/Med Sheet
            <input ref={xlsxRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} disabled={importing} onChange={e => { const f = e.target.files?.[0]; if (f) handleXLSXImport(f); e.target.value = ""; }} />
          </label>
          <button onClick={loadDrivers} style={ghostBtn}>🔄 Refresh</button>
        </div>
      </div>

      {/* Driver list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading driver documents…</div>
      ) : visible.length === 0 ? (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: 40, textAlign: "center", color: "#94a3b8" }}>
          {filterStatus === "all" ? "No active drivers found." : `No drivers match "${filterStatus}" filter.`}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {visible.length} driver{visible.length !== 1 ? "s" : ""} · sorted by urgency
          </div>
          {visible.map(driver => (
            <DriverRow
              key={driver.id}
              driver={driver}
              onUpload={handleUpload}
              uploading={uploading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const primaryBtn: React.CSSProperties = {
  background: "#1e40af", color: "#fff", border: "none", borderRadius: 8,
  padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem",
};
const ghostBtn: React.CSSProperties = {
  padding: "6px 14px", border: "1px solid #e2e8f0", borderRadius: 8,
  fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f8fafc", cursor: "pointer",
};
