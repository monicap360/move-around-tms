"use client";

// Driver Hours (HOS) board — one place where the office sets every driver's hours
// each morning. Shares the same store (/api/ronyx/dispatch/hos) as the per-load
// "Log hours" panel, so the load page always reads fresh real numbers.
//
// Until an ELD is connected, staff enter hours USED (drive / on-duty / cycle) and
// we show the FMCSA property-carrying remaining clocks (11h / 14h / 70h).

import { useEffect, useMemo, useState } from "react";

type Driver = any;
type HosEntry = { driveUsed: number; dutyUsed: number; cycleUsed: number; updatedAt: string };
type Limits = { drive: number; duty: number; cycle: number };

const f1 = (n: number) => n.toFixed(1);

function remaining(e: HosEntry | undefined, lim: Limits) {
  if (!e) return null;
  return {
    drive: Math.max(0, lim.drive - (e.driveUsed || 0)),
    shift: Math.max(0, lim.duty - (e.dutyUsed || 0)),
    cycle: Math.max(0, lim.cycle - (e.cycleUsed || 0)),
  };
}
// Health for sorting/coloring: lower = needs attention first.
function rank(e: HosEntry | undefined, lim: Limits) {
  if (!e) return -1; // not logged → top
  const r = remaining(e, lim)!;
  if (r.drive <= 0 || r.cycle <= 0) return 0; // out of hours → top
  return r.drive; // otherwise least drive-time first
}

export default function DriverHoursPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [hos, setHos] = useState<Record<string, HosEntry>>({});
  const [limits, setLimits] = useState<Limits>({ drive: 11, duty: 14, cycle: 70 });
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string>("");
  const [form, setForm] = useState({ drive: "", duty: "", cycle: "" });
  const [savingId, setSavingId] = useState<string>("");

  async function load() {
    setLoading(true);
    const [d, h] = await Promise.all([
      fetch("/api/ronyx/dispatch/drivers").then(r => r.json()).catch(() => ({})),
      fetch("/api/ronyx/dispatch/hos").then(r => r.json()).catch(() => ({})),
    ]);
    setDrivers(d.drivers || d || []);
    setHos(h.hos || {});
    if (h.limits) setLimits(h.limits);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => {
    return [...drivers].sort((a, b) => rank(hos[String(a.id)], limits) - rank(hos[String(b.id)], limits));
  }, [drivers, hos, limits]);

  const stats = useMemo(() => {
    let logged = 0, out = 0, missing = 0;
    for (const dr of drivers) {
      const e = hos[String(dr.id)];
      if (!e) { missing++; continue; }
      logged++;
      const r = remaining(e, limits)!;
      if (r.drive <= 0 || r.cycle <= 0) out++;
    }
    return { total: drivers.length, logged, out, missing };
  }, [drivers, hos, limits]);

  async function post(driverId: string, body: any) {
    setSavingId(driverId);
    const res = await fetch("/api/ronyx/dispatch/hos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId, ...body }),
    }).then(r => r.json()).catch(() => null);
    if (res?.hos) setHos(res.hos);
    setSavingId("");
  }
  function startEdit(dr: Driver) {
    const e = hos[String(dr.id)];
    setEditId(String(dr.id));
    setForm({ drive: e?.driveUsed != null ? String(e.driveUsed) : "", duty: e?.dutyUsed != null ? String(e.dutyUsed) : "", cycle: e?.cycleUsed != null ? String(e.cycleUsed) : "" });
  }
  async function saveEdit(dr: Driver) {
    await post(String(dr.id), { driveUsed: form.drive || 0, dutyUsed: form.duty || 0, cycleUsed: form.cycle || 0 });
    setEditId("");
  }
  async function reset10(dr: Driver) { // 10h off-duty: daily clocks reset, cycle stays
    const e = hos[String(dr.id)];
    await post(String(dr.id), { driveUsed: 0, dutyUsed: 0, cycleUsed: e?.cycleUsed || 0 });
  }
  async function restart34(dr: Driver) { // 34h restart: everything resets
    await post(String(dr.id), { driveUsed: 0, dutyUsed: 0, cycleUsed: 0 });
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>⏱️ Driver Hours (HOS)</div>
          <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 4 }}>Set each driver's hours used today — the load page reads these live for clearance. FMCSA limits: {limits.drive}h drive / {limits.duty}h shift / {limits.cycle}h cycle.</div>
        </div>
        <button onClick={load} style={ghost}>↻ Refresh</button>
      </div>

      {/* summary */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
        <Stat label="Drivers" value={stats.total} tone="#334155" />
        <Stat label="Hours logged" value={stats.logged} tone="#16a34a" />
        <Stat label="Need hours" value={stats.missing} tone={stats.missing ? "#b45309" : "#94a3b8"} />
        <Stat label="Out of drive time" value={stats.out} tone={stats.out ? "#b91c1c" : "#94a3b8"} />
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.6fr", gap: 8, padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em", color: "#94a3b8", textTransform: "uppercase" }}>
          <div>Driver</div><div>Drive left</div><div>Shift left</div><div>Cycle left</div><div style={{ textAlign: "right" }}>Hours used / actions</div>
        </div>

        {loading ? (
          <div style={{ padding: 24, color: "#64748b" }}>Loading drivers…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 24, color: "#94a3b8" }}>No drivers found — import them under Setup &amp; Import, then come back to set hours.</div>
        ) : rows.map((dr) => {
          const id = String(dr.id);
          const e = hos[id];
          const r = remaining(e, limits);
          const editing = editId === id;
          const saving = savingId === id;
          const driveTone = !r ? "#b45309" : r.drive <= 0 || r.cycle <= 0 ? "#b91c1c" : r.drive <= 2 ? "#b45309" : "#16a34a";
          return (
            <div key={id} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.6fr", gap: 8, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", alignItems: "center", fontSize: 13.5 }}>
              <div>
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{dr.name || "Driver"}</div>
                <div style={{ fontSize: 11, color: "#94a3b8" }}>{e?.updatedAt ? `logged ${new Date(e.updatedAt).toLocaleString()}` : "not logged yet"}</div>
              </div>
              <div style={{ fontWeight: 800, color: driveTone }}>{r ? `${f1(r.drive)}h` : "—"}</div>
              <div style={{ color: "#334155" }}>{r ? `${f1(r.shift)}h` : "—"}</div>
              <div style={{ color: r && r.cycle <= 0 ? "#b91c1c" : "#334155" }}>{r ? `${f1(r.cycle)}h` : "—"}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {editing ? (
                  <>
                    <Num ph="drive" v={form.drive} set={(x) => setForm(s => ({ ...s, drive: x }))} max={limits.drive} />
                    <Num ph="duty" v={form.duty} set={(x) => setForm(s => ({ ...s, duty: x }))} max={limits.duty} />
                    <Num ph="cycle" v={form.cycle} set={(x) => setForm(s => ({ ...s, cycle: x }))} max={limits.cycle} />
                    <button disabled={saving} onClick={() => saveEdit(dr)} style={primary}>Save</button>
                    <button onClick={() => setEditId("")} style={ghostSm}>✕</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => startEdit(dr)} style={ghostSm}>{e ? "Edit" : "Log hours"}</button>
                    <button disabled={saving || !e} onClick={() => reset10(dr)} title="10-hour break: resets today's drive & shift" style={e ? ghostSm : ghostSmDisabled}>10h reset</button>
                    <button disabled={saving || !e} onClick={() => restart34(dr)} title="34-hour restart: resets the weekly cycle too" style={e ? ghostSm : ghostSmDisabled}>34h restart</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 12 }}>
        Tip: set hours each morning. When you connect a Samsara or Motive ELD later, these numbers come straight from the device — this board becomes read-only and stays accurate automatically.
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "10px 16px", minWidth: 120 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: tone }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}
function Num({ ph, v, set, max }: { ph: string; v: string; set: (x: string) => void; max: number }) {
  return <input type="number" min={0} max={max} step={0.5} value={v} onChange={e => set(e.target.value)} placeholder={ph} title={`${ph} used`} style={{ width: 62, padding: "6px 7px", border: "1px solid #cbd5e1", borderRadius: 7, fontSize: 13 }} />;
}

const primary: React.CSSProperties = { padding: "7px 13px", borderRadius: 7, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer" };
const ghost: React.CSSProperties = { padding: "9px 15px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const ghostSm: React.CSSProperties = { padding: "6px 11px", borderRadius: 7, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" };
const ghostSmDisabled: React.CSSProperties = { ...ghostSm, color: "#cbd5e1", borderColor: "#eef2f7", cursor: "not-allowed" };
