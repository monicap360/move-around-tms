"use client";

import { useEffect, useState } from "react";
import Encouragement from "@/app/components/ronyx/Encouragement";

type Row = { id: string; name: string; phone: string | null; carrier: string | null; level: "critical" | "warning"; issues: string[] };
const chip: React.CSSProperties = { fontSize: "0.62rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, display: "inline-block" };

export default function FollowUp() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "critical" | "warning">("all");
  const [by, setBy] = useState("Sylvia P");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  function load() {
    setLoading(true);
    fetch("/api/ronyx/drivers/follow-up").then(r => r.json()).then(d => setRows(d.drivers || [])).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function contacted(id: string) {
    setBusy(id);
    try {
      const res = await fetch("/api/ronyx/drivers/follow-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driverId: id, by }) });
      if (res.ok) { setRows(rs => rs.filter(r => r.id !== id)); flash("Logged as followed up."); }
      else flash("Couldn't log — try again.");
    } catch { flash("Network error."); }
    finally { setBusy(null); }
  }

  const shown = rows.filter(r => filter === "all" || r.level === filter);
  const critical = rows.filter(r => r.level === "critical").length;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1040, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>📋 Driver Compliance Follow-Up</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700 }}>Working as</span>
          <select value={by} onChange={e => setBy(e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontWeight: 700, fontSize: "0.82rem" }}>
            <option>Sylvia P</option><option>Tabitha L</option><option>Office</option>
          </select>
          <button onClick={load} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", color: "#475569" }}>↻</button>
        </div>
      </div>
      <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: 4 }}>Drivers with a missing or expired document. Call the driver, then tap <strong>Mark contacted</strong> — it logs the date + your name to their record.</p>
      <Encouragement name={by.split(" ")[0]} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0 16px" }}>
        {([["all", `All (${rows.length})`], ["critical", `🔴 Critical (${critical})`], ["warning", `🟡 Expiring (${rows.length - critical})`]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ ...chip, cursor: "pointer", padding: "7px 13px", fontSize: "0.78rem", background: filter === k ? "#0f172a" : "#fff", color: filter === k ? "#fff" : "#475569", border: "1px solid " + (filter === k ? "#0f172a" : "#e2e8f0") }}>{lbl}</button>
        ))}
      </div>

      {loading ? <div style={{ color: "#94a3b8", padding: 40, textAlign: "center" }}>Loading…</div>
        : shown.length === 0 ? <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 12, padding: 20, textAlign: "center", fontWeight: 700 }}>✓ Nothing in this view. All caught up.</div>
        : (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
            {shown.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                <span style={{ ...chip, background: r.level === "critical" ? "#fee2e2" : "#fef9c3", color: r.level === "critical" ? "#dc2626" : "#b45309" }}>{r.level === "critical" ? "CRITICAL" : "EXPIRING"}</span>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.88rem" }}>{r.name}{r.carrier && <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: "0.78rem" }}> · {r.carrier}</span>}</div>
                  <div style={{ fontSize: "0.76rem", color: "#475569" }}>{r.issues.join(" · ")}</div>
                </div>
                {r.phone && <a href={`tel:${r.phone}`} style={{ fontWeight: 700, fontSize: "0.82rem", color: "#1d4ed8", textDecoration: "none", whiteSpace: "nowrap" }}>📞 {r.phone}</a>}
                <button onClick={() => contacted(r.id)} disabled={busy === r.id} style={{ background: busy === r.id ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 13px", fontWeight: 800, fontSize: "0.78rem", cursor: busy === r.id ? "default" : "pointer", whiteSpace: "nowrap" }}>✓ Mark contacted</button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
