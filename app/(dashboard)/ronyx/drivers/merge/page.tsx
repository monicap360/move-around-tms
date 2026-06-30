"use client";

import { useEffect, useState } from "react";
import Encouragement from "@/app/components/ronyx/Encouragement";

type Rec = { id: string; name: string; phone: string | null; license_number: string | null; notes: string | null; created_at: string | null; carrier_name: string | null; assigned_truck_number: string | null };

export default function MergeDrivers() {
  const [groups, setGroups] = useState<Rec[][]>([]);
  const [loading, setLoading] = useState(true);
  const [keep, setKeep] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); };

  function load() {
    setLoading(true);
    fetch("/api/ronyx/drivers/merge").then(r => r.json()).then(d => {
      const g: Rec[][] = d.groups || [];
      setGroups(g);
      const k: Record<number, string> = {}; g.forEach((grp, i) => { k[i] = grp[0]?.id; });
      setKeep(k);
    }).catch(() => {}).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function merge(gi: number) {
    const grp = groups[gi]; const keepId = keep[gi];
    if (!keepId) return;
    setBusy(gi);
    try {
      const mergeIds = grp.filter(r => r.id !== keepId).map(r => r.id);
      const res = await fetch("/api/ronyx/drivers/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keepId, mergeIds }) });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Merge failed."); return; }
      setGroups(gs => gs.filter((_, i) => i !== gi));
      flash(`✓ Merged ${d.merged} record${d.merged > 1 ? "s" : ""} into ${grp.find(r => r.id === keepId)?.name}.`);
    } catch { flash("Network error."); }
    finally { setBusy(null); }
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 980, margin: "0 auto" }}>
      {toast && <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 200, background: "#0f172a", color: "#fff", padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 700 }}>{toast}</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>🔗 Merge Duplicate Drivers</h1>
        <button onClick={load} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 14px", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", color: "#475569" }}>↻ Refresh</button>
      </div>
      <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: 0 }}>Same-name driver records grouped together. Pick the one to <strong>keep</strong> — the others merge into it (their phone, license, truck, and notes fill any blanks) and are archived. Nothing is permanently deleted.</p>
      <Encouragement />

      {loading ? <div style={{ color: "#94a3b8", padding: 40, textAlign: "center" }}>Scanning for duplicates…</div>
        : groups.length === 0 ? <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 12, padding: "20px", textAlign: "center", fontWeight: 700 }}>✓ No duplicate driver names found.</div>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {groups.map((grp, gi) => (
              <div key={gi} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{grp[0].name} <span style={{ ...chip, background: "#fef2f2", color: "#dc2626" }}>{grp.length} records</span></div>
                  <button onClick={() => merge(gi)} disabled={busy === gi} style={{ background: busy === gi ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: "0.82rem", cursor: busy === gi ? "default" : "pointer" }}>{busy === gi ? "Merging…" : "Merge into selected →"}</button>
                </div>
                <div>
                  {grp.map(r => {
                    const isKeep = keep[gi] === r.id;
                    return (
                      <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderTop: "1px solid #f8fafc", cursor: "pointer", background: isKeep ? "#f0f9ff" : "transparent" }}>
                        <input type="radio" name={`keep-${gi}`} checked={isKeep} onChange={() => setKeep(k => ({ ...k, [gi]: r.id }))} style={{ width: 17, height: 17 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0f172a" }}>{isKeep && <span style={{ ...chip, background: "#dbeafe", color: "#1d4ed8", marginRight: 6 }}>KEEP</span>}{r.phone || "no phone"} {r.license_number ? `· ${r.license_number}` : ""} {r.assigned_truck_number ? `· truck ${r.assigned_truck_number}` : ""}</div>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.carrier_name ? `${r.carrier_name} · ` : ""}{r.notes || "—"}{r.created_at ? ` · added ${r.created_at.slice(0, 10)}` : ""}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

const chip: React.CSSProperties = { fontSize: "0.62rem", fontWeight: 800, padding: "2px 8px", borderRadius: 999, display: "inline-block" };
