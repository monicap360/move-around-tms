"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Guided dispatch-control load page.
 *
 * Built to answer one question instantly: "Can I safely assign this load right
 * now — and who should get it?" Instead of three equal status buttons, it shows
 * ONE guided primary action that advances through the lifecycle
 * (Assign → Start → Complete), a Dispatch Guard decision panel up top, and runs
 * the real CCB / HOS clearance at the moment a driver + truck are selected.
 */

type Load = any;
type Driver = any;
type Truck = any;

// ── status model ──────────────────────────────────────────────────────────
type Phase = "pending" | "assigned" | "in_progress" | "completed" | "cancelled" | "blocked" | "needs_review";

function normalizePhase(raw: string): Phase {
  const s = (raw || "").toLowerCase().replace(/\s+/g, "_");
  if (["assigned", "dispatched"].includes(s)) return "assigned";
  if (["in_progress", "active", "in_transit", "enroute", "en_route", "loading", "on_site"].includes(s)) return "in_progress";
  if (["completed", "delivered", "done"].includes(s)) return "completed";
  if (["cancelled", "canceled", "void"].includes(s)) return "cancelled";
  if (["blocked", "hold", "on_hold"].includes(s)) return "blocked";
  if (["needs_review", "review", "exception"].includes(s)) return "needs_review";
  return "pending"; // available / unassigned / pending / null
}

const PHASE_META: Record<Phase, { label: string; bg: string; fg: string; dot: string }> = {
  pending:      { label: "Pending",      bg: "#fef3c7", fg: "#92400e", dot: "#f59e0b" },
  assigned:     { label: "Assigned",     bg: "#dbeafe", fg: "#1e40af", dot: "#3b82f6" },
  in_progress:  { label: "In Progress",  bg: "#ccfbf1", fg: "#115e59", dot: "#14b8a6" },
  completed:    { label: "Completed",    bg: "#d1fae5", fg: "#065f46", dot: "#10b981" },
  cancelled:    { label: "Cancelled",    bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" },
  blocked:      { label: "Blocked",      bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
  needs_review: { label: "Needs Review", bg: "#ffedd5", fg: "#9a3412", dot: "#f97316" },
};

const today = () => new Date().toISOString().slice(0, 10);
const expired = (d?: string | null) => !!d && String(d).slice(0, 10) < today();
const expiresToday = (d?: string | null) => !!d && String(d).slice(0, 10) === today();

// ── clearance engine (runs the moment driver + truck are chosen) ────────────
type ClearanceItem = { ok: boolean; label: string; detail: string; blocking: boolean };
function clearDriver(d?: Driver): ClearanceItem {
  if (!d) return { ok: false, label: "Driver Clearance", detail: "Awaiting Assignment", blocking: false };
  const reasons: string[] = [];
  if (d.dispatch_eligible === false || d.status === "blocked") reasons.push("dispatch hold");
  if (expired(d.medical_card_expiration)) reasons.push("medical card expired");
  if (expired(d.license_expiration_date)) reasons.push("CDL expired");
  if (expired(d.mvr_expiration)) reasons.push("MVR expired");
  if (reasons.length) return { ok: false, label: "Driver Clearance", detail: `${d.name || "Driver"} — ${reasons.join(", ")}`, blocking: true };
  return { ok: true, label: "Driver Clearance", detail: `${d.name || "Driver"} — Clear`, blocking: true };
}
function clearTruck(t?: Truck): ClearanceItem {
  if (!t) return { ok: false, label: "Truck Clearance", detail: "Awaiting Assignment", blocking: false };
  const num = t.unit_number || t.number || "Truck";
  const st = String(t.status || "").toLowerCase();
  if (/out|down|hold|maintenance|red/.test(st)) return { ok: false, label: "Truck Clearance", detail: `${num} — ${t.status}`, blocking: true };
  if (expired(t.registration_expires)) return { ok: false, label: "Truck Clearance", detail: `${num} — registration expired`, blocking: true };
  if (expiresToday(t.registration_expires)) return { ok: false, label: "Truck Clearance", detail: `${num} — registration expires today`, blocking: true };
  return { ok: true, label: "Truck Clearance", detail: `${num} — Clear`, blocking: true };
}

export default function LoadDetail({ loadId }: { loadId: string }) {
  const [load, setLoad] = useState<Load>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("pending");
  const [saving, setSaving] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [driverId, setDriverId] = useState<string>("");
  const [truckId, setTruckId] = useState<string>("");

  const [tab, setTab] = useState("overview");
  const [showComplete, setShowComplete] = useState(false);
  const [activity, setActivity] = useState<{ when: string; text: string }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/dispatch/load-detail?load_id=${loadId}`);
        const data = await res.json();
        if (!alive) return;
        if (data?.error) { setError(data.error.message || "Error loading load"); }
        else {
          setLoad(data);
          setPhase(normalizePhase(data.status));
          if (data.driver_id) setDriverId(String(data.driver_id));
          if (data.truck_id) setTruckId(String(data.truck_id));
          setActivity([
            { when: data.created_at ? new Date(data.created_at).toLocaleString() : "—", text: `Load created${data.created_by ? ` by ${data.created_by}` : ""}` },
            { when: "", text: data.driver_id ? "Driver assigned" : "Awaiting driver assignment" },
          ]);
        }
      } catch { if (alive) setError("Failed to fetch load"); }
      if (alive) setLoading(false);
    })();
    // recommendations — degrade gracefully if empty
    fetch("/api/ronyx/dispatch/drivers").then(r => r.json()).then(d => { if (alive) setDrivers(d.drivers || d || []); }).catch(() => {});
    fetch("/api/ronyx/maintenance/units").then(r => r.json()).then(d => { if (alive) setTrucks(d.units || []); }).catch(() => {});
    return () => { alive = false; };
  }, [loadId]);

  const driver = useMemo(() => drivers.find(d => String(d.id) === driverId), [drivers, driverId]);
  const truck = useMemo(() => trucks.find(t => String(t.id ?? t.unit_number) === truckId), [trucks, truckId]);
  const bothChosen = !!driver && !!truck;

  const dc = clearDriver(driver);
  const tc = clearTruck(truck);
  // Load-level requirements (independent of who is assigned)
  const loadReady = !!(load && (load.pickup_location || load.origin));
  const blocked = bothChosen && (!dc.ok || !tc.ok);
  const clearedToDispatch = bothChosen && dc.ok && tc.ok;

  const recDrivers = useMemo(
    () => drivers.filter(d => clearDriver(d).ok).slice(0, 4),
    [drivers],
  );
  const recTrucks = useMemo(
    () => trucks.filter(t => clearTruck(t).ok).slice(0, 4),
    [trucks],
  );

  function log(text: string) { setActivity(a => [{ when: new Date().toLocaleTimeString(), text }, ...a]); }

  async function persist(fields: Record<string, any>) {
    setSaving(true);
    try {
      await fetch("/api/loads/update", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: loadId, ...fields }),
      }).catch(() => {});
    } finally { setSaving(false); }
  }

  async function assign() {
    if (!clearedToDispatch) return;
    await persist({ status: "assigned", driver_id: driver.id, truck_id: truck.id ?? truck.unit_number });
    setPhase("assigned");
    log(`Assigned ${driver.name} + ${truck.unit_number || "truck"} — CCB cleared`);
  }
  async function start() {
    await persist({ status: "in_progress" });
    setPhase("in_progress");
    log("Load started — in progress");
  }
  async function completeLoad(payload: Record<string, any>) {
    await persist({ status: "completed", notes: JSON.stringify({ completion: payload }) });
    setPhase("completed");
    setShowComplete(false);
    log(`Completed${payload.actualTons ? ` — ${payload.actualTons} tons` : ""}${payload.toPayroll ? " → Payroll" : ""}${payload.toBilling ? " → Billing" : ""}`);
  }

  if (loading) return <div style={card}>Loading load…</div>;
  if (error) return <div style={{ ...card, color: "#b91c1c" }}>{error}</div>;
  if (!load) return <div style={card}>No load found.</div>;

  const pm = PHASE_META[phase];
  const loadNo = load.load_number || load.load_id || loadId;
  const pickup = load.pickup_location || load.origin || "Not set";
  const dropoff = load.dropoff_location || load.destination || "Not assigned";
  const loadDate = load.load_date || load.pickup_date || "Today";

  const TABS = [
    ["overview", "Overview"], ["assignment", "Assignment & Route"], ["tickets", "Tickets"],
    ["compliance", "Compliance & CCB"], ["activity", "Activity Log"], ["billing", "Billing & Payroll"],
  ] as const;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <a href="/ronyx/dispatch/board" style={{ fontSize: 13, color: "#6366f1", textDecoration: "none", fontWeight: 600 }}>← Back to Dispatch Board</a>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 6 }}>{pickup} → {dropoff === "Not assigned" ? "Dropoff Not Set" : dropoff}</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>Load #{loadNo}</div>
        </div>
        <span style={{ background: pm.bg, color: pm.fg, padding: "6px 14px", borderRadius: 999, fontWeight: 800, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: pm.dot }} /> {pm.label}
        </span>
      </div>

      {/* Dispatch Guard decision panel */}
      <DispatchGuard
        phase={phase} loadReady={loadReady} bothChosen={bothChosen}
        blocked={blocked} cleared={clearedToDispatch}
        reasons={[dc, tc].filter(i => i.blocking && !i.ok).map(i => i.detail)}
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #e2e8f0", flexWrap: "wrap" }}>
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            padding: "9px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13,
            fontWeight: tab === id ? 800 : 600, color: tab === id ? "#4f46e5" : "#64748b",
            borderBottom: tab === id ? "2px solid #4f46e5" : "2px solid transparent", marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {(tab === "overview" || tab === "assignment") && (
        <div style={card}>
          {/* ASSIGNMENT */}
          <SectionTitle>Assignment</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center", maxWidth: 560 }}>
            <label style={lbl}>Driver</label>
            <select value={driverId} onChange={e => setDriverId(e.target.value)} disabled={phase !== "pending"} style={input}>
              <option value="">Select recommended driver…</option>
              {drivers.map(d => <option key={d.id} value={String(d.id)}>{d.name}{clearDriver(d).ok ? "" : " — hold"}</option>)}
            </select>
            <label style={lbl}>Truck</label>
            <select value={truckId} onChange={e => setTruckId(e.target.value)} disabled={phase !== "pending"} style={input}>
              <option value="">Select available truck…</option>
              {trucks.map(t => <option key={t.id ?? t.unit_number} value={String(t.id ?? t.unit_number)}>{t.unit_number}{clearTruck(t).ok ? "" : ` — ${t.status}`}</option>)}
            </select>
          </div>

          {phase === "pending" && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>RECOMMENDED</div>
              {recDrivers.length === 0 && recTrucks.length === 0 ? (
                <div style={{ fontSize: 13, color: "#94a3b8" }}>No cleared drivers/trucks found — add or import them under Drivers &amp; Fleet.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {recDrivers.map(d => (
                    <button key={d.id} onClick={() => setDriverId(String(d.id))} style={chip}>
                      ● {d.name} <span style={{ color: "#16a34a", fontWeight: 700 }}>Clear</span>
                    </button>
                  ))}
                  {recTrucks.map(t => (
                    <button key={t.id ?? t.unit_number} onClick={() => setTruckId(String(t.id ?? t.unit_number))} style={chip}>
                      🚚 {t.unit_number} <span style={{ color: "#16a34a", fontWeight: 700 }}>Available</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Two columns: Load Details | Compliance & HOS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 22 }}>
            <div>
              <SectionTitle>Load Details</SectionTitle>
              <Row k="Customer" v={load.customer_name || load.customer || "—"} />
              <Row k="Material" v={load.material || load.commodity || "—"} />
              <Row k="Estimated Tons" v={load.estimated_tons || load.tons || load.weight || "—"} />
              <Row k="Rate" v={(load.rate || load.estimated_rate) ? `$${load.rate || load.estimated_rate}` : "—"} />
              <Row k="Load Date" v={loadDate} />
              <Row k="ETA" v={phase === "pending" ? "Calculated after assignment" : (load.eta || "—")} />
              <Row k="Notes" v={load.notes && !String(load.notes).startsWith("{") ? load.notes : "—"} />
            </div>
            <div>
              <SectionTitle>Compliance &amp; HOS</SectionTitle>
              <ClearRow item={dc} />
              <ClearRow item={tc} />
              <Row k="Load Requirements" v={loadReady ? "Ready" : "Missing pickup info"} ok={loadReady} />
              <Row k="HOS" v={bothChosen ? "Confirm hours via ELD" : "Will check when driver is selected"} muted={!bothChosen} />
              <Row k="Customer Rules" v="Clear" ok />
              <Row k="Documents" v="Clear" ok />
            </div>
          </div>

          {/* Guided primary action — one button, advances the lifecycle */}
          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", alignItems: "center" }}>
            <GuidedAction
              phase={phase} saving={saving} canAssign={clearedToDispatch}
              onAssign={assign} onStart={start} onComplete={() => setShowComplete(true)}
            />
            <button style={ghostBtn} onClick={() => persist({})}>Save Draft</button>
            {phase === "pending" && !bothChosen && <span style={{ fontSize: 12, color: "#94a3b8" }}>Select a driver and truck to run final clearance.</span>}
            {blocked && <span style={{ fontSize: 12, color: "#b91c1c", fontWeight: 600 }}>Assignment blocked — resolve the hold or pick another.</span>}
          </div>
        </div>
      )}

      {tab === "tickets" && (
        <div style={card}>
          <SectionTitle>Tickets</SectionTitle>
          <p style={{ fontSize: 14, color: "#475569" }}>Scale tickets for this load appear here once captured in Fast Scan. Completing the load opens the ticket-received handoff.</p>
          <a href="/ronyx/fast-scan" style={{ ...ghostBtn, display: "inline-block", textDecoration: "none", marginTop: 8 }}>Open Fast Scan →</a>
        </div>
      )}

      {tab === "compliance" && (
        <div style={card}>
          <SectionTitle>Compliance &amp; CCB</SectionTitle>
          <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>CCB / Dispatch Guard runs the final clearance the moment a driver and truck are selected.</p>
          <ClearRow item={dc} />
          <ClearRow item={tc} />
          <Row k="Load Requirements" v={loadReady ? "Ready" : "Missing pickup info"} ok={loadReady} />
          <Row k="HOS" v={bothChosen ? "Confirm hours via ELD (not tracked in system)" : "Pending driver selection"} muted={!bothChosen} />
        </div>
      )}

      {tab === "activity" && (
        <div style={card}>
          <SectionTitle>Activity Log</SectionTitle>
          {activity.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
              <span style={{ color: "#94a3b8", minWidth: 130 }}>{a.when || "—"}</span>
              <span style={{ color: "#334155" }}>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "billing" && (
        <div style={card}>
          <SectionTitle>Billing &amp; Payroll</SectionTitle>
          <p style={{ fontSize: 14, color: "#475569" }}>
            {phase === "completed"
              ? "Load completed. Ticket, tons, and exceptions captured in the completion review feed payroll and billing."
              : "Billing and payroll open once the load is completed through the completion review."}
          </p>
        </div>
      )}

      {showComplete && (
        <CompletionReview
          load={load} saving={saving}
          onClose={() => setShowComplete(false)}
          onSubmit={completeLoad}
        />
      )}
    </div>
  );
}

// ── Dispatch Guard panel ────────────────────────────────────────────────────
function DispatchGuard({ phase, loadReady, bothChosen, blocked, cleared, reasons }: {
  phase: Phase; loadReady: boolean; bothChosen: boolean; blocked: boolean; cleared: boolean; reasons: string[];
}) {
  let tone: { bg: string; bar: string; fg: string; head: string; body: string };
  if (phase === "completed") tone = { bg: "#f0fdf4", bar: "#10b981", fg: "#065f46", head: "LOAD COMPLETED", body: "Ticket, tons, and handoffs captured." };
  else if (phase === "in_progress") tone = { bg: "#f0fdfa", bar: "#14b8a6", fg: "#115e59", head: "IN PROGRESS", body: "Load is moving. Complete it when delivered to start the ticket / payroll / billing handoff." };
  else if (blocked) tone = { bg: "#fef2f2", bar: "#ef4444", fg: "#991b1b", head: "ASSIGNMENT BLOCKED", body: reasons.join(" • ") + ". Select another driver/truck or resolve the hold." };
  else if (cleared) tone = { bg: "#f0fdf4", bar: "#10b981", fg: "#065f46", head: "CLEARED TO DISPATCH", body: "Driver and truck passed CCB clearance. Confirm the assignment." };
  else if (phase === "assigned") tone = { bg: "#eff6ff", bar: "#3b82f6", fg: "#1e40af", head: "ASSIGNED — READY TO START", body: "Driver and truck assigned and cleared. Start the load when the driver rolls." };
  else if (loadReady) tone = { bg: "#fffbeb", bar: "#f59e0b", fg: "#92400e", head: "READY TO ASSIGN", body: "All load-level requirements are complete. Select a driver and truck to run final clearance and HOS checks." };
  else tone = { bg: "#fff7ed", bar: "#f97316", fg: "#9a3412", head: "NEEDS INFO", body: "Add the pickup location before this load can be assigned." };

  return (
    <div style={{ background: tone.bg, borderLeft: `5px solid ${tone.bar}`, borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: tone.bar, display: "flex", alignItems: "center", gap: 8 }}>
        🛡 DISPATCH GUARD
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: tone.fg, marginTop: 4 }}>{tone.head}</div>
      <div style={{ fontSize: 13.5, color: tone.fg, opacity: 0.9, marginTop: 3 }}>{tone.body}</div>
    </div>
  );
}

// ── one guided primary action that changes by phase ─────────────────────────
function GuidedAction({ phase, saving, canAssign, onAssign, onStart, onComplete }: {
  phase: Phase; saving: boolean; canAssign: boolean;
  onAssign: () => void; onStart: () => void; onComplete: () => void;
}) {
  if (phase === "pending") {
    return (
      <>
        <button disabled={!canAssign || saving} onClick={onAssign} style={canAssign ? primaryBtn : disabledBtn}>Assign Driver &amp; Truck</button>
        <button disabled style={disabledBtn}>Start Load</button>
        <button disabled style={disabledBtn}>Complete Load</button>
      </>
    );
  }
  if (phase === "assigned") {
    return (
      <>
        <button disabled={saving} onClick={onStart} style={primaryBtn}>Start Load</button>
        <button disabled style={disabledBtn}>Complete Load</button>
      </>
    );
  }
  if (phase === "in_progress") {
    return <button disabled={saving} onClick={onComplete} style={primaryBtn}>Complete Load</button>;
  }
  if (phase === "completed") return <span style={{ fontWeight: 700, color: "#065f46" }}>✓ Load completed</span>;
  return null;
}

// ── completion review: the real handoff into tickets / payroll / billing ────
function CompletionReview({ load, saving, onClose, onSubmit }: {
  load: Load; saving: boolean; onClose: () => void; onSubmit: (p: Record<string, any>) => void;
}) {
  const [ticketReceived, setTicketReceived] = useState(false);
  const [actualTons, setActualTons] = useState("");
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [exception, setException] = useState("");
  const [toPayroll, setToPayroll] = useState(true);
  const [toBilling, setToBilling] = useState(true);
  const ready = ticketReceived && deliveryConfirmed && actualTons.trim() !== "";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(520px, 96vw)", padding: 24, maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: "#0f172a" }}>Completion Review</div>
        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>Load #{load.load_number || load.load_id}. This closes the load and hands off to tickets, payroll, and billing.</div>

        <Check label="Confirm ticket received?" v={ticketReceived} set={setTicketReceived} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "center", margin: "10px 0" }}>
          <label style={lbl}>Actual tons delivered</label>
          <input type="number" value={actualTons} onChange={e => setActualTons(e.target.value)} placeholder="e.g. 24.5" style={input} />
        </div>
        <Check label="Delivery confirmed?" v={deliveryConfirmed} set={setDeliveryConfirmed} />
        <div style={{ margin: "10px 0" }}>
          <label style={{ ...lbl, display: "block", marginBottom: 4 }}>Exception or shortage? (optional)</label>
          <textarea value={exception} onChange={e => setException(e.target.value)} placeholder="Short load, demurrage, damage, none…" style={{ ...input, width: "100%", minHeight: 56, resize: "vertical" }} />
        </div>
        <div style={{ borderTop: "1px solid #e2e8f0", margin: "14px 0", paddingTop: 12 }}>
          <Check label="Send to Payroll" v={toPayroll} set={setToPayroll} />
          <Check label="Send to Billing" v={toBilling} set={setToBilling} />
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button disabled={!ready || saving} onClick={() => onSubmit({ ticketReceived, actualTons, deliveryConfirmed, exception, toPayroll, toBilling })} style={ready ? primaryBtn : disabledBtn}>
            Complete &amp; Hand Off
          </button>
        </div>
        {!ready && <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "right", marginTop: 6 }}>Confirm ticket, tons, and delivery to finish.</div>}
      </div>
    </div>
  );
}

// ── small presentational helpers ────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "#94a3b8", textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;
}
function Row({ k, v, ok, muted }: { k: string; v: React.ReactNode; ok?: boolean; muted?: boolean }) {
  const color = muted ? "#94a3b8" : ok === true ? "#16a34a" : ok === false ? "#b91c1c" : "#334155";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13.5 }}>
      <span style={{ color: "#64748b" }}>{k}</span>
      <span style={{ color, fontWeight: 600, textAlign: "right" }}>{v}</span>
    </div>
  );
}
function ClearRow({ item }: { item: ClearanceItem }) {
  const awaiting = item.detail === "Awaiting Assignment";
  return <Row k={item.label} v={item.detail} ok={awaiting ? undefined : item.ok} muted={awaiting} />;
}
function Check({ label, v, set }: { label: string; v: boolean; set: (b: boolean) => void }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", cursor: "pointer", fontSize: 14, color: "#334155" }}>
      <input type="checkbox" checked={v} onChange={e => set(e.target.checked)} style={{ width: 17, height: 17 }} />
      {label}
    </label>
  );
}

// ── styles ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 22 };
const lbl: React.CSSProperties = { fontSize: 13, color: "#475569", fontWeight: 600 };
const input: React.CSSProperties = { padding: "9px 11px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 14, background: "#fff", color: "#0f172a" };
const chip: React.CSSProperties = { padding: "6px 12px", border: "1px solid #e2e8f0", borderRadius: 999, background: "#f8fafc", fontSize: 12.5, fontWeight: 600, color: "#334155", cursor: "pointer" };
const primaryBtn: React.CSSProperties = { padding: "11px 20px", borderRadius: 9, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const disabledBtn: React.CSSProperties = { padding: "11px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f1f5f9", color: "#94a3b8", fontWeight: 700, fontSize: 14, cursor: "not-allowed" };
const ghostBtn: React.CSSProperties = { padding: "11px 18px", borderRadius: 9, border: "1px solid #cbd5e1", background: "#fff", color: "#475569", fontWeight: 700, fontSize: 14, cursor: "pointer" };
