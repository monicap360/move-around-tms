"use client";

import { useEffect, useMemo, useState } from "react";
import HqShell from "../HqShell";

// MoveAround HQ — Find Drivers. The screened driver pool for matching to fleets.
type Driver = {
  id: string; full_name: string; phone: string | null; email: string | null;
  license_class: string | null; license_state: string | null;
  license_expiration_date: string | null; medical_card_expiration: string | null;
  position_role: string | null; status: string | null; hire_date: string | null;
  dispatch_eligible: boolean | null; cdl_valid: boolean | null; med_valid: boolean | null;
};

export default function HqFindDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);

  useEffect(() => {
    fetch("/api/hq/drivers").then(r => r.status === 401 ? (window.location.href = "/hq/login?next=/hq/find-drivers", null) : r.json())
      .then(d => { if (d) setDrivers(d.drivers || []); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return drivers.filter(d => {
      if (onlyReady && !(d.cdl_valid && d.med_valid)) return false;
      if (!s) return true;
      return [d.full_name, d.phone, d.email, d.license_class, d.license_state, d.position_role].some(v => (v || "").toLowerCase().includes(s));
    });
  }, [drivers, q, onlyReady]);

  const ready = drivers.filter(d => d.cdl_valid && d.med_valid).length;
  const chip = (ok: boolean | null, label: string) => (
    <span style={{ fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: ok == null ? "#f1f5f9" : ok ? "#dcfce7" : "#fee2e2", color: ok == null ? "#94a3b8" : ok ? "#15803d" : "#dc2626" }}>{label}{ok == null ? " ?" : ok ? " ✓" : " ✕"}</span>
  );

  return (
    <HqShell active="drivers">
      <div style={{ padding: "22px 22px 60px", color: "#0f172a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>🧑‍✈️ Find Drivers</h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.86rem" }}>The screened driver pool — match available drivers to fleets that are hiring.</p>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{drivers.length}</div><div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>DRIVERS</div></div>
            <div style={{ textAlign: "right" }}><div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#16a34a" }}>{ready}</div><div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700 }}>READY NOW</div></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", margin: "18px 0 14px" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, license, role…" style={{ flex: "1 1 300px", maxWidth: 360, padding: "9px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.85rem", outline: "none" }} />
          <button onClick={() => setOnlyReady(v => !v)} style={{ cursor: "pointer", padding: "8px 14px", borderRadius: 999, fontSize: "0.78rem", fontWeight: 800, background: onlyReady ? "#0f172a" : "#fff", color: onlyReady ? "#fff" : "#475569", border: "1px solid " + (onlyReady ? "#0f172a" : "#e2e8f0") }}>{onlyReady ? "✓ " : ""}Ready to work only</button>
          <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>{shown.length} shown</span>
        </div>

        {loading ? <div style={{ color: "#94a3b8", padding: 50, textAlign: "center" }}>Loading driver pool…</div> : shown.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #cbd5e1", borderRadius: 14, padding: "40px 20px", textAlign: "center", color: "#64748b" }}>No drivers match.</div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
              <thead><tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                {["Driver", "Contact", "License", "Role", "Compliance", "Status"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "0.68rem", textTransform: "uppercase", color: "#64748b", fontWeight: 800 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {shown.map(d => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a" }}>{d.full_name}</td>
                    <td style={{ padding: "10px 14px" }}>
                      {d.phone && <a href={`tel:${d.phone}`} style={{ color: "#2563eb", textDecoration: "none", display: "block" }}>{d.phone}</a>}
                      {d.email && <a href={`mailto:${d.email}`} style={{ color: "#64748b", textDecoration: "none", fontSize: "0.76rem" }}>{d.email}</a>}
                      {!d.phone && !d.email && <span style={{ color: "#cbd5e1" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{[d.license_class, d.license_state].filter(Boolean).join(" · ") || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{d.position_role || "—"}</td>
                    <td style={{ padding: "10px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>{chip(d.cdl_valid, "CDL")}{chip(d.med_valid, "Med")}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{d.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HqShell>
  );
}
