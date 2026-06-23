"use client";

import { useEffect, useState } from "react";

type InsuranceLine = {
  verified: boolean;
  amount?: number | null;
  expires?: string | null;
  provider?: string | null;
};

type NormalizedCarrierData = {
  legal_name?: string | null;
  mc_number?: string | null;
  dot_number?: string | null;
  authority: { status: string; common?: boolean; contract?: boolean };
  safety: { rating: string; out_of_service: boolean; oos_rate_vehicle?: number | null };
  insurance: {
    auto_liability?: InsuranceLine;
    cargo?: InsuranceLine;
    workers_comp?: InsuranceLine;
    general_liability?: InsuranceLine;
  };
  overall_status: string;
  compliance_issues: string[];
  data_source: string;
  snapshot_id?: string | null;
};

type Snapshot = { id: string; provider: string; verification_status: string; retrieved_at: string; normalized_data: NormalizedCarrierData | null };

type Props = {
  ooId: string;
  ooName: string;
  mcNumber?: string | null;
  dotNumber?: string | null;
  compact?: boolean;
};

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.floor(diff / 86_400_000);
}

function InsurBadge({ line, label }: { line?: InsuranceLine; label: string }) {
  if (!line) return null;
  const days = daysUntil(line.expires);
  const expired = days !== null && days <= 0;
  const expiring = days !== null && days > 0 && days <= 30;
  const color = !line.verified ? "#dc2626" : expired ? "#dc2626" : expiring ? "#d97706" : "#16a34a";
  const bg    = !line.verified ? "#fef2f2" : expired ? "#fef2f2" : expiring ? "#fffbeb" : "#f0fdf4";
  const icon  = !line.verified ? "✕" : expired ? "✕" : expiring ? "⚠" : "✓";
  const note  = !line.verified ? "Not on file" : expired ? `Expired ${Math.abs(days!)}d ago` : expiring ? `Expires in ${days}d` : "Verified";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: bg, borderRadius: 6, border: `1px solid ${color}22` }}>
      <span style={{ color, fontWeight: 800, fontSize: 12 }}>{icon}</span>
      <div>
        <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#475569" }}>{label}</div>
        <div style={{ fontSize: "0.6rem", color }}>{note}</div>
      </div>
    </div>
  );
}

export default function CarrierIntelligenceCard({ ooId, ooName, mcNumber, dotNumber, compact }: Props) {
  const [snapshots,  setSnapshots]  = useState<Snapshot[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [searching,  setSearching]  = useState(false);
  const [syncing,    setSyncing]    = useState(false);
  const [latest,     setLatest]     = useState<NormalizedCarrierData | null>(null);
  const [searchMC,   setSearchMC]   = useState(mcNumber ?? "");
  const [searchDOT,  setSearchDOT]  = useState(dotNumber ?? "");
  const [error,      setError]      = useState("");
  const [rmisConnected, setRmisConnected] = useState<boolean | null>(null);
  const [confirmTasks, setConfirmTasks] = useState<any[] | null>(null);
  const [taskSnap, setTaskSnap]    = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadSnapshots();
    checkRMIS();
  }, [ooId]);

  async function checkRMIS() {
    try {
      const res = await fetch("/api/integrations/connections");
      const d = await res.json();
      const rmis = d.connections?.find((c: any) => c.provider === "rmis");
      setRmisConnected(rmis?.status === "connected");
    } catch { setRmisConnected(false); }
  }

  async function loadSnapshots() {
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/snapshots?oo_id=${ooId}&limit=5`);
      const d = await res.json();
      const snaps = d.snapshots ?? [];
      setSnapshots(snaps);
      if (snaps.length > 0 && snaps[0].normalized_data) setLatest(snaps[0].normalized_data);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleSearch() {
    if (!searchMC && !searchDOT) { setError("Enter MC# or DOT#"); return; }
    setSearching(true); setError("");
    try {
      const res = await fetch("/api/integrations/rmis/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mc_number: searchMC || null, dot_number: searchDOT || null, owner_operator_id: ooId, owner_operator_name: ooName }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Search failed"); return; }
      setLatest(d.normalized);
      if (d.ccb_tasks?.length > 0) { setConfirmTasks(d.ccb_tasks); setTaskSnap(d.snapshot_id); }
      loadSnapshots();
    } catch (e: any) { setError(e.message); }
    finally { setSearching(false); }
  }

  async function handleSync() {
    setSyncing(true); setError("");
    try {
      const res = await fetch("/api/integrations/rmis/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ owner_operator_id: ooId }) });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Sync failed"); return; }
      setLatest(d.normalized);
      loadSnapshots();
    } catch (e: any) { setError(e.message); }
    finally { setSyncing(false); }
  }

  async function createTasks() {
    if (!confirmTasks || !taskSnap) return;
    for (const spec of confirmTasks) {
      await fetch("/api/ronyx/staff-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...spec, owner_operator_id: ooId, owner_operator_name: ooName, entity_type: "owner_operator", entity_id: ooId, source_type: "carrier_verification", source_label: "RMIS" }) });
    }
    setConfirmTasks(null);
  }

  const authColor  = (s: string) => s === "active" ? "#16a34a" : s === "revoked" ? "#dc2626" : "#d97706";
  const safeColor  = (s: string) => s === "satisfactory" ? "#16a34a" : s === "unsatisfactory" ? "#dc2626" : "#d97706";
  const overallBg  = (s: string) => s === "clear" ? "#f0fdf4" : s === "blocked" ? "#fef2f2" : "#fffbeb";
  const overallClr = (s: string) => s === "clear" ? "#15803d" : s === "blocked" ? "#dc2626" : "#a16207";
  const overallLbl = (s: string) => s === "clear" ? "✓ Clear" : s === "blocked" ? "✕ Blocked" : "⚠ Needs Attention";

  const lastSnap = snapshots[0];

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "#0f172a", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.08em" }}>CCB™ Carrier Intelligence</div>
          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#f8fafc" }}>{ooName}</div>
        </div>
        {latest && (
          <span style={{ padding: "3px 10px", borderRadius: 99, background: overallBg(latest.overall_status), color: overallClr(latest.overall_status), fontSize: "0.68rem", fontWeight: 800 }}>
            {overallLbl(latest.overall_status)}
          </span>
        )}
      </div>

      <div style={{ padding: 14 }}>
        {/* Action row */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, flex: 1, minWidth: 180 }}>
            <input value={searchMC} onChange={e => setSearchMC(e.target.value)} placeholder="MC#" style={{ flex: 1, padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.72rem", fontFamily: "inherit", minWidth: 0 }} />
            <input value={searchDOT} onChange={e => setSearchDOT(e.target.value)} placeholder="DOT#" style={{ flex: 1, padding: "6px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.72rem", fontFamily: "inherit", minWidth: 0 }} />
          </div>
          <button onClick={handleSearch} disabled={searching || rmisConnected === false}
            style={{ padding: "6px 12px", background: rmisConnected === false ? "#94a3b8" : "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: rmisConnected === false ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
            {searching ? "Searching…" : "Verify MC / DOT"}
          </button>
          <button onClick={handleSync} disabled={syncing || !mcNumber && !dotNumber || rmisConnected === false}
            style={{ padding: "6px 12px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
            {syncing ? "Syncing…" : "Sync Compliance"}
          </button>
          <button onClick={() => setShowHistory(!showHistory)}
            style={{ padding: "6px 10px", background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>
            History
          </button>
        </div>

        {rmisConnected === false && (
          <div style={{ padding: "7px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, fontSize: "0.7rem", color: "#c2410c", marginBottom: 10 }}>
            RMIS not connected. <a href="/ronyx/admin/integrations" style={{ color: "#1e40af", fontWeight: 700 }}>Configure in Admin → Integrations →</a>
          </div>
        )}

        {error && <div style={{ padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 7, fontSize: "0.7rem", color: "#dc2626", marginBottom: 10 }}>{error}</div>}

        {/* Latest results */}
        {latest && (
          <div>
            {/* Authority + Safety strip */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
              <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>Authority</div>
                <div style={{ fontWeight: 800, color: authColor(latest.authority.status), fontSize: "0.8rem", textTransform: "capitalize" }}>{latest.authority.status}</div>
                <div style={{ fontSize: "0.6rem", color: "#64748b" }}>
                  {[latest.authority.common && "Common", latest.authority.contract && "Contract"].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div style={{ padding: "8px 10px", background: "#f8fafc", borderRadius: 8 }}>
                <div style={{ fontSize: "0.58rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 }}>Safety</div>
                <div style={{ fontWeight: 800, color: safeColor(latest.safety.rating), fontSize: "0.8rem", textTransform: "capitalize" }}>{latest.safety.rating.replace("_"," ")}</div>
                {latest.safety.out_of_service && <div style={{ fontSize: "0.6rem", color: "#dc2626", fontWeight: 700 }}>OUT OF SERVICE</div>}
                {latest.safety.oos_rate_vehicle != null && <div style={{ fontSize: "0.6rem", color: "#64748b" }}>OOS rate: {latest.safety.oos_rate_vehicle}%</div>}
              </div>
            </div>

            {/* Insurance grid */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Insurance</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <InsurBadge line={latest.insurance.auto_liability}    label="Auto Liability" />
                <InsurBadge line={latest.insurance.cargo}             label="Cargo" />
                <InsurBadge line={latest.insurance.workers_comp}      label="Workers Comp" />
                <InsurBadge line={latest.insurance.general_liability} label="General Liability" />
              </div>
            </div>

            {/* Issues */}
            {latest.compliance_issues.length > 0 && (
              <div style={{ marginBottom: 10, padding: "8px 10px", background: "#fef2f2", borderRadius: 8, border: "1px solid #fecaca" }}>
                <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#dc2626", marginBottom: 4 }}>Compliance Issues</div>
                {latest.compliance_issues.map((issue, i) => (
                  <div key={i} style={{ fontSize: "0.68rem", color: "#475569", display: "flex", gap: 5 }}>
                    <span style={{ color: "#dc2626" }}>✕</span> {issue}
                  </div>
                ))}
              </div>
            )}

            {/* Source + timestamp */}
            {lastSnap && (
              <div style={{ fontSize: "0.6rem", color: "#94a3b8", textAlign: "right" }}>
                Source: <strong style={{ color: "#64748b" }}>{latest.data_source?.toUpperCase()}</strong> · {new Date(lastSnap.retrieved_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        )}

        {!latest && !loading && (
          <div style={{ textAlign: "center", padding: "20px 0", color: "#94a3b8", fontSize: "0.78rem" }}>
            <div style={{ fontSize: "1.4rem", marginBottom: 6 }}>🔍</div>
            No verification data yet. Enter an MC# or DOT# above.
          </div>
        )}

        {/* Confirm task creation */}
        {confirmTasks && confirmTasks.length > 0 && (
          <div style={{ marginTop: 10, padding: "10px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9 }}>
            <div style={{ fontWeight: 800, color: "#1e40af", fontSize: "0.78rem", marginBottom: 6 }}>CCB found {confirmTasks.length} issue(s) requiring action</div>
            {confirmTasks.map((t, i) => (
              <div key={i} style={{ fontSize: "0.68rem", color: "#475569", marginBottom: 2 }}>
                <span style={{ fontWeight: 700, color: t.priority === "critical" ? "#dc2626" : t.priority === "high" ? "#d97706" : "#0f172a" }}>[{t.priority}]</span> {t.title}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={createTasks} style={{ padding: "5px 12px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>Create CCB Tasks</button>
              <button onClick={() => setConfirmTasks(null)} style={{ padding: "5px 12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>Dismiss</button>
            </div>
          </div>
        )}

        {/* Verification history */}
        {showHistory && snapshots.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", marginBottom: 6 }}>Verification History</div>
            {snapshots.map((s, i) => (
              <div key={s.id} style={{ display: "flex", gap: 8, padding: "5px 8px", background: i % 2 === 0 ? "#f8fafc" : "#fff", borderRadius: 6, marginBottom: 3 }}>
                <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "1px 6px", borderRadius: 4, background: s.verification_status === "clear" ? "#dcfce7" : s.verification_status === "blocked" ? "#fef2f2" : "#fef9c3", color: s.verification_status === "clear" ? "#15803d" : s.verification_status === "blocked" ? "#dc2626" : "#a16207" }}>{s.verification_status}</span>
                <span style={{ fontSize: "0.62rem", color: "#64748b", flex: 1 }}>{s.provider}</span>
                <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>{new Date(s.retrieved_at).toLocaleString([], { month: "short", day: "numeric" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
