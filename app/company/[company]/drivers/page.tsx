"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Driver = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  driver_type: string;
  license_number: string;
  license_state: string;
  license_expiration_date: string;
  mvr_expiration: string;
  medical_card_expiration: string;
  assigned_truck_number: string;
  status: string;
  rating: number;
  background_check_status: string;
  drug_test_status: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  position_role: string;
  pay_rate: string;
  supervisor_name: string;
  hire_date: string;
  orientation_completed: boolean;
  hazmat_training: boolean;
};

type DriverDocument = {
  id: string;
  doc_type: string;
  status: string;
  expires_on: string | null;
  uploaded_at: string | null;
  file_url: string | null;
};

const EMPTY: Partial<Driver> = {
  full_name: "",
  phone: "",
  email: "",
  driver_type: "W2",
  license_number: "",
  license_state: "",
  license_expiration_date: "",
  mvr_expiration: "",
  medical_card_expiration: "",
  assigned_truck_number: "",
  status: "active",
  position_role: "company driver",
  address: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  pay_rate: "",
  supervisor_name: "",
  hire_date: "",
  orientation_completed: false,
  hazmat_training: false,
};

const DOC_TYPES = [
  "CDL", "Medical Card", "MVR", "Insurance",
  "Drug Test", "Background Check", "W9", "W4",
  "Direct Deposit Form", "Driver Agreement", "Safety Form", "Other",
];

const STATUS_COLORS: Record<string, string> = {
  active:    "#2563eb",
  available: "#10b981",
  assigned:  "#0ea5e9",
  "off duty": "#f59e0b",
  suspended: "#ef4444",
  inactive:  "#6b7280",
};

function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return Math.ceil((dt.getTime() - Date.now()) / 86400000);
}

function expBadge(days: number | null): { label: string; color: string } {
  if (days === null) return { label: "Missing", color: "#6b7280" };
  if (days <= 0)    return { label: "Expired", color: "#ef4444" };
  if (days <= 14)   return { label: "Expiring", color: "#f59e0b" };
  return { label: "Valid", color: "#16a34a" };
}

export default function CompanyDriversPage({
  params,
}: {
  params: { company: string };
}) {
  const { company } = params;

  const [drivers, setDrivers]         = useState<Driver[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType]   = useState("all");
  const [filterDocs, setFilterDocs]   = useState("all");
  const [selected, setSelected]       = useState<Driver | null>(null);
  const [tab, setTab]                 = useState<"info" | "docs" | "history">("info");
  const [docs, setDocs]               = useState<DriverDocument[]>([]);
  const [showAdd, setShowAdd]         = useState(false);
  const [form, setForm]               = useState<Partial<Driver>>(EMPTY);
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState("");
  const [docUpload, setDocUpload]     = useState({ doc_type: "CDL", expires_on: "" });

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/ronyx/drivers/list?organization=${encodeURIComponent(company)}`, { cache: "no-store" });
      const data = await res.json();
      setDrivers(data.drivers || []);
    } catch {
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }, [company]);

  const loadDocs = useCallback(async (driverId: string) => {
    try {
      const res  = await fetch(`/api/ronyx/drivers/documents?driverId=${driverId}`, { cache: "no-store" });
      const data = await res.json();
      setDocs(data.documents || []);
    } catch {
      setDocs([]);
    }
  }, []);

  useEffect(() => { void loadDrivers(); }, [loadDrivers]);
  useEffect(() => { if (selected) void loadDocs(selected.id); }, [selected, loadDocs]);

  // Expiring within 7 days banner
  const expiring = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + 7);
    return drivers.filter((d) =>
      [d.mvr_expiration, d.medical_card_expiration, d.license_expiration_date].some((f) => {
        if (!f) return false;
        return new Date(f) <= cutoff;
      }),
    );
  }, [drivers]);

  const filtered = useMemo(() => drivers.filter((d) => {
    if (search && !`${d.full_name} ${d.email} ${d.assigned_truck_number}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "all" && d.status !== filterStatus) return false;
    if (filterType   !== "all" && d.driver_type !== filterType) return false;
    if (filterDocs === "expiring") {
      const min = Math.min(...[d.mvr_expiration, d.medical_card_expiration, d.license_expiration_date].map((f) => daysUntil(f) ?? 9999));
      if (min > 14) return false;
    }
    if (filterDocs === "missing" && d.license_number && d.mvr_expiration && d.medical_card_expiration) return false;
    return true;
  }), [drivers, search, filterStatus, filterType, filterDocs]);

  async function saveDriver() {
    setSaving(true);
    try {
      const res = await fetch("/api/ronyx/drivers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, organization_code: company }),
      });
      if (!res.ok) throw new Error();
      setShowAdd(false); setForm(EMPTY);
      flash("Driver added."); void loadDrivers();
    } catch { flash("Failed to add driver."); }
    finally { setSaving(false); }
  }

  async function patchDriver(field: keyof Driver, value: string | boolean) {
    if (!selected) return;
    const updated = { ...selected, [field]: value };
    setSelected(updated as Driver);
    setDrivers((prev) => prev.map((d) => d.id === selected.id ? updated as Driver : d));
    try {
      await fetch(`/api/ronyx/drivers/profile?driverId=${selected.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
    } catch { flash("Auto-save failed."); }
  }

  async function uploadDoc() {
    if (!selected) return;
    try {
      const res = await fetch("/api/ronyx/drivers/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driver_id: selected.id, doc_type: docUpload.doc_type, status: "pending", expires_on: docUpload.expires_on || null }),
      });
      if (res.ok) {
        const d = await res.json();
        setDocs((prev) => [d.document, ...prev]);
        flash("Document logged.");
      }
    } catch { flash("Upload failed."); }
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #d1d5db", borderRadius: 8,
    padding: "9px 12px", fontSize: "0.875rem", color: "#111827", background: "#fff",
  };

  const btn = (bg = "#2563eb", fg = "#fff"): React.CSSProperties => ({
    background: bg, color: fg, border: "none", borderRadius: 8,
    padding: "8px 16px", fontWeight: 700, fontSize: "0.82rem",
    cursor: "pointer", whiteSpace: "nowrap" as const,
  });

  const pill = (color: string): React.CSSProperties => ({
    display: "inline-block",
    background: `${color}18`, color,
    border: `1px solid ${color}44`,
    borderRadius: 999, padding: "2px 10px",
    fontSize: "0.72rem", fontWeight: 700,
    textTransform: "uppercase" as const, whiteSpace: "nowrap" as const,
  });

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #e5e7eb",
    borderRadius: 12, padding: 20, marginBottom: 18,
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
  };

  const lbl: React.CSSProperties = {
    fontSize: "0.72rem", color: "#6b7280", marginBottom: 4, display: "block",
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", color: "#111827" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: "0.7rem", color: "#2563eb", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>
            MoveAround TMS &nbsp;·&nbsp; powered by IGOTTA Technologies
          </p>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "4px 0 4px" }}>Driver Management</h1>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
            {company.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — Compliance, documents &amp; assignments
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {msg && <span style={{ fontSize: "0.8rem", color: "#16a34a", fontWeight: 600 }}>{msg}</span>}
          <button style={btn()} onClick={() => setShowAdd(true)}>+ Add Driver</button>
          <button style={btn("#6b7280")} onClick={() => flash("Export queued")}>Export CSV</button>
        </div>
      </div>

      {/* Expiring alert */}
      {expiring.length > 0 && (
        <div style={{ ...card, background: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "14px 18px" }}>
          <p style={{ fontWeight: 700, color: "#92400e", marginBottom: 8 }}>
            ⚠️ Documents expiring within 7 days — {expiring.length} driver{expiring.length > 1 ? "s" : ""}
          </p>
          {expiring.map((d) => {
            const fields: [string, string | undefined][] = [
              ["MVR", d.mvr_expiration],
              ["Medical Card", d.medical_card_expiration],
              ["CDL", d.license_expiration_date],
            ];
            return (
              <div key={d.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <span style={{ fontWeight: 600, minWidth: 160 }}>{d.full_name}</span>
                {fields.map(([label, val]) => {
                  const days = daysUntil(val);
                  if (days === null || days > 7) return null;
                  const color = days <= 0 ? "#ef4444" : "#f59e0b";
                  return <span key={label} style={pill(color)}>{label}: {days <= 0 ? "EXPIRED" : `${days}d left`}</span>;
                })}
                <button style={{ ...btn("#2563eb"), fontSize: "0.72rem", padding: "4px 10px" }} onClick={() => { setSelected(d); setTab("docs"); }}>
                  View Docs
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ ...card, padding: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input style={{ ...inp, maxWidth: 240 }} placeholder="Search name, email, truck…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={{ ...inp, width: "auto" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {["active", "available", "assigned", "off duty", "suspended", "inactive"].map((s) => (
              <option key={s} value={s}>{s.replace(/\b\w/g, (c) => c.toUpperCase())}</option>
            ))}
          </select>
          <select style={{ ...inp, width: "auto" }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="W2">W2</option>
            <option value="1099">1099</option>
            <option value="Owner Operator">Owner Operator</option>
          </select>
          <select style={{ ...inp, width: "auto" }} value={filterDocs} onChange={(e) => setFilterDocs(e.target.value)}>
            <option value="all">All</option>
            <option value="expiring">Expiring Docs</option>
            <option value="missing">Missing Docs</option>
          </select>
        </div>
      </div>

      {/* Driver table */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontWeight: 700 }}>All Drivers ({filtered.length})</span>
        </div>
        {loading ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: 32 }}>No drivers found. Add one above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                  {["Driver", "Type", "Phone", "CDL #", "CDL Exp", "MVR Exp", "Medical Exp", "Truck", "Status", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "10px 8px", color: "#2563eb", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const mvr  = daysUntil(d.mvr_expiration);
                  const med  = daysUntil(d.medical_card_expiration);
                  const cdl  = daysUntil(d.license_expiration_date);
                  const sc   = STATUS_COLORS[d.status?.toLowerCase() || "active"] || "#6b7280";
                  return (
                    <tr key={d.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ fontWeight: 600 }}>{d.full_name || "—"}</div>
                        {d.email && <div style={{ color: "#9ca3af", fontSize: "0.72rem" }}>{d.email}</div>}
                      </td>
                      <td style={{ padding: "10px 8px" }}><span style={pill("#2563eb")}>{d.driver_type || "W2"}</span></td>
                      <td style={{ padding: "10px 8px", color: "#6b7280" }}>{d.phone || "—"}</td>
                      <td style={{ padding: "10px 8px", fontFamily: "monospace" }}>{d.license_number || "—"}</td>
                      <td style={{ padding: "10px 8px" }}>
                        {d.license_expiration_date
                          ? <span style={{ color: cdl !== null && cdl <= 30 ? "#ef4444" : "inherit" }}>{d.license_expiration_date}</span>
                          : "—"}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {d.mvr_expiration
                          ? <span style={pill(expBadge(mvr).color)}>{d.mvr_expiration}</span>
                          : <span style={pill("#6b7280")}>Missing</span>}
                      </td>
                      <td style={{ padding: "10px 8px" }}>
                        {d.medical_card_expiration
                          ? <span style={pill(expBadge(med).color)}>{d.medical_card_expiration}</span>
                          : <span style={pill("#6b7280")}>Missing</span>}
                      </td>
                      <td style={{ padding: "10px 8px" }}>{d.assigned_truck_number || "—"}</td>
                      <td style={{ padding: "10px 8px" }}><span style={pill(sc)}>{d.status || "active"}</span></td>
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={{ ...btn(), fontSize: "0.72rem", padding: "4px 8px" }} onClick={() => { setSelected(d); setTab("info"); }}>View</button>
                          <button style={{ ...btn("#6b7280"), fontSize: "0.72rem", padding: "4px 8px" }} onClick={() => { setSelected(d); setTab("docs"); }}>Docs</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 18 }}>
        {[
          { label: "Total Drivers", value: drivers.length, color: "#2563eb" },
          { label: "Active", value: drivers.filter((d) => d.status === "active").length, color: "#10b981" },
          { label: "Available", value: drivers.filter((d) => d.status === "available").length, color: "#0ea5e9" },
          { label: "Expiring Docs", value: expiring.length, color: "#f59e0b" },
          { label: "Suspended", value: drivers.filter((d) => d.status === "suspended").length, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "0.72rem", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Footer brand */}
      <p style={{ textAlign: "center", fontSize: "0.72rem", color: "#d1d5db", marginTop: 24 }}>
        MoveAround TMS™ · powered by IGOTTA Technologies
      </p>

      {/* ── Add Driver Modal ──────────────────────────────────────────────── */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800 }}>Add Driver</h2>
              <button style={btn("#ef4444")} onClick={() => setShowAdd(false)}>✕</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([
                ["Full Name", "full_name", "text"],
                ["Phone", "phone", "tel"],
                ["Email", "email", "email"],
                ["Address", "address", "text"],
                ["CDL Number", "license_number", "text"],
                ["CDL State", "license_state", "text"],
                ["CDL Expiration", "license_expiration_date", "date"],
                ["MVR Expiration", "mvr_expiration", "date"],
                ["Medical Card Exp", "medical_card_expiration", "date"],
                ["Truck #", "assigned_truck_number", "text"],
                ["Hire Date", "hire_date", "date"],
                ["Supervisor", "supervisor_name", "text"],
                ["Emergency Contact", "emergency_contact_name", "text"],
                ["Emergency Phone", "emergency_contact_phone", "tel"],
              ] as [string, string, string][]).map(([l, k, t]) => (
                <div key={k}>
                  <span style={lbl}>{l}</span>
                  <input style={inp} type={t} value={(form as any)[k] || ""}
                    onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                </div>
              ))}
              <div>
                <span style={lbl}>Driver Type</span>
                <select style={inp} value={form.driver_type || "W2"} onChange={(e) => setForm({ ...form, driver_type: e.target.value })}>
                  <option value="W2">W2</option>
                  <option value="1099">1099</option>
                  <option value="Owner Operator">Owner Operator</option>
                </select>
              </div>
              <div>
                <span style={lbl}>Status</span>
                <select style={inp} value={form.status || "active"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {["active", "available", "off duty", "inactive"].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button style={btn("#6b7280")} onClick={() => setShowAdd(false)}>Cancel</button>
              <button style={btn()} onClick={saveDriver} disabled={saving}>{saving ? "Saving…" : "Save Driver"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Driver Profile Drawer ─────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", justifyContent: "flex-end", zIndex: 200 }}>
          <div style={{ background: "#f9fafb", width: "100%", maxWidth: 620, overflowY: "auto", padding: 28, boxShadow: "-6px 0 30px rgba(0,0,0,0.15)" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: "0.65rem", color: "#2563eb", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: 0 }}>Driver Profile</p>
                <h2 style={{ fontWeight: 800, fontSize: "1.3rem", margin: "4px 0" }}>{selected.full_name || "Unknown"}</h2>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={pill(STATUS_COLORS[selected.status?.toLowerCase() || "active"] || "#6b7280")}>{selected.status || "active"}</span>
                  <span style={pill("#2563eb")}>{selected.driver_type || "W2"}</span>
                  {selected.assigned_truck_number && <span style={pill("#6b7280")}>Truck #{selected.assigned_truck_number}</span>}
                </div>
              </div>
              <button style={btn("#ef4444")} onClick={() => setSelected(null)}>✕ Close</button>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {([
                ["Mark Available", "#10b981"],
                ["Mark Off Duty", "#f59e0b"],
                ["Suspend", "#ef4444"],
                ["Send Login Invite", "#2563eb"],
                ["Assign Load", "#0ea5e9"],
                ["View Pay Summary", "#6b7280"],
              ] as [string, string][]).map(([l, c]) => (
                <button key={l} style={{ ...btn(c), fontSize: "0.72rem", padding: "5px 12px" }} onClick={() => flash(`${l} (demo)`)}>
                  {l}
                </button>
              ))}
            </div>

            {msg && <p style={{ color: "#16a34a", fontSize: "0.82rem", marginBottom: 10 }}>{msg}</p>}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 18, borderBottom: "2px solid #e5e7eb", paddingBottom: 8 }}>
              {(["info", "docs", "history"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} style={{
                  padding: "7px 16px", borderRadius: 8, border: "none",
                  background: tab === t ? "#2563eb" : "transparent",
                  color: tab === t ? "#fff" : "#6b7280",
                  fontWeight: 700, cursor: "pointer",
                  textTransform: "capitalize" as const,
                }}>
                  {t === "info" ? "Info & Compliance" : t === "docs" ? "Documents" : "History"}
                </button>
              ))}
            </div>

            {/* Tab: Info */}
            {tab === "info" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {([
                  ["section", "Contact"],
                  ["Phone", "phone"],
                  ["Email", "email"],
                  ["Address", "address"],
                  ["Emergency Contact", "emergency_contact_name"],
                  ["Emergency Phone", "emergency_contact_phone"],
                  ["section", "Employment"],
                  ["Hire Date", "hire_date"],
                  ["Role", "position_role"],
                  ["Supervisor", "supervisor_name"],
                  ["Pay Rate", "pay_rate"],
                  ["Truck #", "assigned_truck_number"],
                  ["section", "CDL & Compliance"],
                  ["CDL Number", "license_number"],
                  ["CDL State", "license_state"],
                  ["CDL Expiration", "license_expiration_date"],
                  ["MVR Expiration", "mvr_expiration"],
                  ["Medical Card Exp", "medical_card_expiration"],
                ] as [string, string][]).map(([l, k]) => {
                  if (l === "section") return (
                    <div key={k} style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.8rem", color: "#2563eb", marginTop: 8, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>{k}</div>
                  );
                  return (
                    <div key={k}>
                      <span style={lbl}>{l}</span>
                      <input style={inp} value={(selected as any)[k] || ""}
                        onChange={(e) => patchDriver(k as keyof Driver, e.target.value)} />
                    </div>
                  );
                })}
                {/* Selects */}
                <div>
                  <span style={lbl}>Driver Type</span>
                  <select style={inp} value={selected.driver_type || "W2"} onChange={(e) => patchDriver("driver_type", e.target.value)}>
                    {["W2", "1099", "Owner Operator"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>Status</span>
                  <select style={inp} value={selected.status || "active"} onChange={(e) => patchDriver("status", e.target.value)}>
                    {["active", "available", "assigned", "off duty", "suspended", "inactive"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>Background Check</span>
                  <select style={inp} value={selected.background_check_status || "pending"} onChange={(e) => patchDriver("background_check_status", e.target.value)}>
                    {["clear", "pending", "failed"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <span style={lbl}>Drug Test</span>
                  <select style={inp} value={selected.drug_test_status || "pending"} onChange={(e) => patchDriver("drug_test_status", e.target.value)}>
                    {["pass", "pending", "fail"].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!selected.orientation_completed} onChange={(e) => patchDriver("orientation_completed", e.target.checked)} />
                  <span style={lbl}>Orientation Completed</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!selected.hazmat_training} onChange={(e) => patchDriver("hazmat_training", e.target.checked)} />
                  <span style={lbl}>Hazmat Training</span>
                </div>
              </div>
            )}

            {/* Tab: Documents */}
            {tab === "docs" && (
              <div>
                {/* Upload */}
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <p style={{ fontWeight: 700, marginBottom: 10 }}>Log / Upload Document</p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <span style={lbl}>Type</span>
                      <select style={inp} value={docUpload.doc_type} onChange={(e) => setDocUpload({ ...docUpload, doc_type: e.target.value })}>
                        {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <span style={lbl}>Expiration Date</span>
                      <input type="date" style={inp} value={docUpload.expires_on} onChange={(e) => setDocUpload({ ...docUpload, expires_on: e.target.value })} />
                    </div>
                    <button style={btn()} onClick={uploadDoc}>Log Document</button>
                  </div>
                </div>

                {/* Required checklist */}
                <p style={{ fontWeight: 700, marginBottom: 8 }}>Required Document Checklist</p>
                {["CDL", "Medical Card", "MVR", "Drug Test", "Background Check", "Insurance"].map((type) => {
                  const doc  = docs.find((d) => d.doc_type === type);
                  const days = daysUntil(doc?.expires_on);
                  const { label: bLabel, color } = expBadge(doc ? days : null);
                  return (
                    <div key={type} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: "0.82rem" }}>{type}</span>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {doc?.expires_on && <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{doc.expires_on}</span>}
                        <span style={pill(color)}>{bLabel}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Uploaded docs */}
                {docs.length > 0 && (
                  <>
                    <p style={{ fontWeight: 700, marginTop: 16, marginBottom: 8 }}>All Uploaded Documents</p>
                    {docs.map((doc) => {
                      const days = daysUntil(doc.expires_on);
                      const { label: bLabel, color } = expBadge(days);
                      return (
                        <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", marginBottom: 5 }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: "0.8rem" }}>{doc.doc_type}</span>
                            {doc.uploaded_at && <span style={{ color: "#9ca3af", fontSize: "0.7rem", marginLeft: 8 }}>{doc.uploaded_at.slice(0, 10)}</span>}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {doc.expires_on && <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>Exp: {doc.expires_on}</span>}
                            <span style={pill(color)}>{bLabel}</span>
                            {doc.file_url && (
                              <a href={doc.file_url} target="_blank" rel="noreferrer"
                                style={{ ...btn("#2563eb"), fontSize: "0.7rem", padding: "3px 8px", textDecoration: "none" }}>
                                View
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}

            {/* Tab: History */}
            {tab === "history" && (
              <div>
                <p style={{ fontWeight: 700, marginBottom: 12 }}>Activity Log</p>
                {[
                  "Profile created in MoveAround TMS.",
                  "Document upload required: MVR, Medical Card.",
                ].map((t, i) => (
                  <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 14px", marginBottom: 6, fontSize: "0.82rem", color: "#4b5563" }}>
                    {t}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button style={{ ...btn("#6b7280"), fontSize: "0.75rem" }} onClick={() => flash("Note added (demo)")}>Add Note</button>
                  <button style={{ ...btn("#6b7280"), fontSize: "0.75rem" }} onClick={() => flash("Call logged (demo)")}>Log Call</button>
                  <button style={{ ...btn("#6b7280"), fontSize: "0.75rem" }} onClick={() => flash("Exported")}>Export</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
