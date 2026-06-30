"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnonymousDriver = {
  id: string;
  anonymous_driver_id: string;
  city_area: string;
  preferred_work_area?: string;
  years_experience?: number;
  driver_type?: string;
  license_class?: string;
  endorsements?: string[];
  equipment_experience?: string[];
  material_experience?: string[];
  availability_status: string;
  hire_ready_score: number;
  compliance_summary?: string;
  redacted_experience_summary?: string;
  network_status: string;
  is_shortlisted: boolean;
  is_unlocked: boolean;
  full_name?: string;
  phone?: string;
  email?: string;
  _identity_locked: boolean;
  _contact_locked: boolean;
};

type UnlockState = Record<string, "idle" | "requesting" | "requested" | "unlocked">;

type OOPartner = {
  id: string;
  company_name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  business_address?: string;
  mc_number?: string;
  dot_number?: string;
  status?: string;
  start_date?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVAIL_LABEL: Record<string, string> = {
  available_now:    "Available Now",
  available_7_days: "Available in 7 Days",
  available_30_days:"Available in 30 Days",
  not_available:    "Not Available",
};

const AVAIL_COLOR: Record<string, { color: string; bg: string }> = {
  available_now:    { color: "#15803d", bg: "#dcfce7" },
  available_7_days: { color: "#0891b2", bg: "#cffafe" },
  available_30_days:{ color: "#b45309", bg: "#fef9c3" },
  not_available:    { color: "#64748b", bg: "#f1f5f9" },
};

function scoreColor(score: number) {
  if (score >= 90) return { color: "#15803d", bg: "#dcfce7" };
  if (score >= 75) return { color: "#0891b2", bg: "#cffafe" };
  if (score >= 50) return { color: "#b45309", bg: "#fef9c3" };
  return { color: "#dc2626", bg: "#fee2e2" };
}

// ─── Driver Card ──────────────────────────────────────────────────────────────

function DriverCard({
  driver,
  unlockState,
  shortlisted,
  onShortlist,
  onUnlock,
  onRequestIntro,
}: {
  driver: AnonymousDriver;
  unlockState: "idle" | "requesting" | "requested" | "unlocked";
  shortlisted: boolean;
  onShortlist: () => void;
  onUnlock: () => void;
  onRequestIntro: () => void;
}) {
  const avail  = AVAIL_COLOR[driver.availability_status] ?? AVAIL_COLOR.not_available;
  const score  = scoreColor(driver.hire_ready_score);
  const locked = driver._identity_locked;

  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${locked ? "#e2e8f0" : "#86efac"}`,
      borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14,
      position: "relative", boxShadow: locked ? "none" : "0 0 0 3px #dcfce7",
    }}>
      {/* Unlock badge */}
      {!locked && (
        <div style={{ position: "absolute", top: 14, right: 14, background: "#dcfce7", color: "#15803d",
          padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
          ✓ Unlocked
        </div>
      )}
      {shortlisted && locked && (
        <div style={{ position: "absolute", top: 14, right: 14, background: "#dbeafe", color: "#1d4ed8",
          padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
          ★ Shortlisted
        </div>
      )}

      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: locked ? "#f1f5f9" : "#dcfce7",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", flexShrink: 0 }}>
          {locked ? "👤" : "✓"}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: "1rem", color: locked ? "#64748b" : "#1e293b", marginBottom: 2 }}>
            {locked ? driver.anonymous_driver_id : (driver.full_name || driver.anonymous_driver_id)}
          </div>
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            📍 {driver.city_area} {driver.preferred_work_area ? `· ${driver.preferred_work_area}` : ""}
          </div>
          {!locked && driver.phone && (
            <div style={{ fontSize: "0.75rem", color: "#15803d", marginTop: 2 }}>📞 {driver.phone} · ✉️ {driver.email}</div>
          )}
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ background: score.bg, color: score.color, padding: "4px 12px", borderRadius: 20, fontWeight: 900, fontSize: "0.88rem" }}>
            {driver.hire_ready_score}%
          </div>
          <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 3 }}>Hire-Ready Score</div>
        </div>
      </div>

      {/* Info grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: "0.78rem" }}>
        <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Experience: </span><span style={{ color: "#1e293b", fontWeight: 700 }}>{driver.years_experience ? `${driver.years_experience}+ years` : "Not listed"}</span></div>
        <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>License: </span><span style={{ color: "#1e293b", fontWeight: 700 }}>{driver.license_class ? `CDL ${driver.license_class}` : "CDL"}</span></div>
        <div><span style={{ color: "#94a3b8", fontWeight: 600 }}>Type: </span><span style={{ color: "#1e293b", fontWeight: 700 }}>{driver.driver_type || "CDL Driver"}</span></div>
        <div>
          <span style={{ background: avail.bg, color: avail.color, padding: "2px 8px", borderRadius: 20, fontWeight: 700, fontSize: "0.7rem" }}>
            {AVAIL_LABEL[driver.availability_status] || "Unknown"}
          </span>
        </div>
      </div>

      {/* Equipment */}
      {(driver.equipment_experience ?? []).length > 0 && (
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Equipment</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {(driver.equipment_experience ?? []).map(eq => (
              <span key={eq} style={{ background: "#f1f5f9", color: "#475569", padding: "3px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600 }}>{eq}</span>
            ))}
          </div>
        </div>
      )}

      {/* Materials */}
      {(driver.material_experience ?? []).length > 0 && (
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>Materials</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {(driver.material_experience ?? []).map(m => (
              <span key={m} style={{ background: "#ede9fe", color: "#7c3aed", padding: "3px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 600 }}>{m}</span>
            ))}
          </div>
        </div>
      )}

      {/* Compliance summary */}
      {driver.compliance_summary && (
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 12px", fontSize: "0.72rem", color: "#475569", lineHeight: 1.7 }}>
          <span style={{ fontWeight: 700, color: "#1e293b" }}>Compliance: </span>
          {driver.compliance_summary}
        </div>
      )}

      {/* Experience summary (redacted) */}
      {driver.redacted_experience_summary && (
        <div style={{ fontSize: "0.75rem", color: "#64748b", lineHeight: 1.6, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
          {driver.redacted_experience_summary}
        </div>
      )}

      {/* Identity lock notice */}
      {locked && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 8, padding: "10px 14px",
          fontSize: "0.72rem", color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: "0.9rem" }}>🔒</span>
          <span>Full name, contact info, resume, CDL, medical card, MVR, and references are hidden until profile is unlocked.</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
        {locked && (
          <button onClick={onUnlock} disabled={unlockState === "requesting" || unlockState === "requested"}
            style={{ flex: 1, minWidth: 120, padding: "9px 14px", background: unlockState === "requested" ? "#475569" : "#1e293b",
              color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: unlockState === "requested" ? "default" : "pointer" }}>
            {unlockState === "requesting" ? "⏳ Requesting..." : unlockState === "requested" ? "✓ Unlock Requested" : "🔓 Unlock Profile — $99"}
          </button>
        )}
        {locked && (
          <button onClick={onRequestIntro}
            style={{ padding: "9px 14px", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8,
              fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
            📨 Request Intro
          </button>
        )}
        <button onClick={onShortlist}
          style={{ padding: "9px 14px", background: shortlisted ? "#dbeafe" : "#f1f5f9",
            color: shortlisted ? "#1d4ed8" : "#475569", border: `1px solid ${shortlisted ? "#93c5fd" : "#e2e8f0"}`,
            borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
          {shortlisted ? "★ Shortlisted" : "☆ Shortlist"}
        </button>
        {!locked && (
          <Link href={`/ronyx/drivers/${driver.id}`}
            style={{ padding: "9px 16px", background: "#15803d", color: "#fff", borderRadius: 8,
              fontWeight: 700, fontSize: "0.78rem", textDecoration: "none" }}>
            View Full Profile →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── OO Partner Card ─────────────────────────────────────────────────────────

function OOPartnerCard({ oo, shortlisted, onShortlist }: {
  oo: OOPartner;
  shortlisted: boolean;
  onShortlist: () => void;
}) {
  const initials = (oo.company_name || "??").split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const isActive = !oo.status || oo.status === "active";

  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${isActive ? "#86efac" : "#e2e8f0"}`,
      borderRadius: 14, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14,
      position: "relative", boxShadow: isActive ? "0 0 0 3px #f0fdf4" : "none",
    }}>
      {/* Status badge */}
      <div style={{ position: "absolute", top: 14, right: 14, background: isActive ? "#dcfce7" : "#f1f5f9",
        color: isActive ? "#15803d" : "#64748b", padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
        {isActive ? "✓ Active Partner" : "Inactive"}
      </div>
      {shortlisted && (
        <div style={{ position: "absolute", top: 38, right: 14, background: "#dbeafe", color: "#1d4ed8",
          padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 700 }}>
          ★ Shortlisted
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: "linear-gradient(135deg,#0f172a,#1e3a5f)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
          fontWeight: 900, color: "#93c5fd", flexShrink: 0, letterSpacing: 1 }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: "0.97rem", color: "#1e293b", marginBottom: 2, lineHeight: 1.3 }}>
            {oo.company_name}
          </div>
          {oo.contact_name && (
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>👤 {oo.contact_name}</div>
          )}
          {oo.business_address && (
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📍 {oo.business_address}
            </div>
          )}
        </div>
      </div>

      {/* MC / DOT row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", fontSize: "0.75rem" }}>
        <div style={{ background: "#f8fafc", borderRadius: 7, padding: "6px 10px" }}>
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>MC #</div>
          <div style={{ color: "#1e293b", fontWeight: 800 }}>{oo.mc_number || "—"}</div>
        </div>
        <div style={{ background: "#f8fafc", borderRadius: 7, padding: "6px 10px" }}>
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>DOT #</div>
          <div style={{ color: "#1e293b", fontWeight: 800 }}>{oo.dot_number || "—"}</div>
        </div>
        {oo.contact_phone && (
          <div style={{ background: "#f0fdf4", borderRadius: 7, padding: "6px 10px", gridColumn: "1 / -1" }}>
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact</div>
            <div style={{ color: "#15803d", fontWeight: 700 }}>📞 {oo.contact_phone}</div>
          </div>
        )}
        {oo.contact_email && (
          <div style={{ background: "#f0fdf4", borderRadius: 7, padding: "6px 10px", gridColumn: "1 / -1" }}>
            <div style={{ color: "#15803d", fontWeight: 700, fontSize: "0.75rem" }}>✉ {oo.contact_email}</div>
          </div>
        )}
        {oo.start_date && (
          <div style={{ background: "#f8fafc", borderRadius: 7, padding: "6px 10px" }}>
            <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: "0.63rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Partner Since</div>
            <div style={{ color: "#1e293b", fontWeight: 700 }}>
              {new Date(oo.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 4 }}>
        <a href={`/ronyx/owner-operators?id=${oo.id}`}
          style={{ flex: 1, minWidth: 120, padding: "9px 14px", background: "#1e293b", color: "#fff",
            border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer",
            textDecoration: "none", textAlign: "center" }}>
          View Full Profile →
        </a>
        <button onClick={onShortlist}
          style={{ padding: "9px 14px", background: shortlisted ? "#dbeafe" : "#f1f5f9",
            color: shortlisted ? "#1d4ed8" : "#475569", border: `1px solid ${shortlisted ? "#93c5fd" : "#e2e8f0"}`,
            borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
          {shortlisted ? "★ Saved" : "☆ Save"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DriverNetworkPage() {
  const [drivers, setDrivers]         = useState<AnonymousDriver[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [availFilter, setAvail]       = useState("all");
  const [minScore, setMinScore]       = useState(0);
  const [equipFilter, setEquip]       = useState("");
  const [unlockStates, setUnlock]     = useState<UnlockState>({});
  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [toast, setToast]             = useState("");
  const [activeTab, setTab]           = useState<"search" | "oo" | "shortlist" | "unlocked" | "pipeline" | "about">("search");
  const [ooPartners, setOOPartners]   = useState<OOPartner[]>([]);
  const [ooLoading, setOOLoading]     = useState(false);
  const [ooLoaded, setOOLoaded]       = useState(false);
  const [ooSearch, setOOSearch]       = useState("");
  const [ooShortlisted, setOOShortlisted] = useState<Set<string>>(new Set());

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 4000); };

  // ── Capacity Network pipeline (Phase 2) ──
  const [candidates, setCandidates] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [panelCand, setPanelCand] = useState<any | null>(null);
  const [pipeStage, setPipeStage] = useState<string | null>(null);
  const [candNotes, setCandNotes] = useState<any[]>([]);
  const [noteText, setNoteText] = useState("");
  function loadCandidates() { fetch("/api/ronyx/network-candidates").then(r => r.json()).then(d => { setCandidates(d.candidates || []); setCounts(d.counts || {}); }).catch(() => {}); }
  useEffect(() => { loadCandidates(); }, []);
  useEffect(() => { if (panelCand?.id) fetch(`/api/ronyx/network-candidates/notes?candidate_id=${panelCand.id}`).then(r => r.json()).then(d => setCandNotes(d.notes || [])).catch(() => setCandNotes([])); else setCandNotes([]); }, [panelCand?.id]);
  async function upsertCand(body: any) { await fetch("/api/ronyx/network-candidates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); loadCandidates(); }
  async function patchCand(body: any) { await fetch("/api/ronyx/network-candidates", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); loadCandidates(); if (panelCand && body.id === panelCand.id) setPanelCand((c: any) => ({ ...c, ...body })); }
  const PIPELINE = [
    { key: "saved", label: "Saved", color: "#64748b" }, { key: "unlocked", label: "Unlocked", color: "#0891b2" },
    { key: "contacted", label: "Contacted", color: "#2563eb" }, { key: "interested", label: "Interested", color: "#7c3aed" },
    { key: "screening", label: "Screening", color: "#d97706" }, { key: "compliance_review", label: "Compliance", color: "#dc2626" },
    { key: "offer", label: "Offer", color: "#ca8a04" }, { key: "ready_to_dispatch", label: "Ready to Dispatch", color: "#16a34a" },
  ];
  const assignBtn: React.CSSProperties = { border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: "0.74rem", cursor: "pointer", whiteSpace: "nowrap" };
  function reloadNotes(id: string) { fetch(`/api/ronyx/network-candidates/notes?candidate_id=${id}`).then(r => r.json()).then(d => setCandNotes(d.notes || [])).catch(() => {}); }
  function logNote() { if (!panelCand || !noteText.trim()) return; patchCand({ id: panelCand.id, note: noteText.trim(), last_contacted: true }); setNoteText(""); setTimeout(() => reloadNotes(panelCand.id), 350); }
  async function convertCand(cand: any) {
    const res = await fetch("/api/ronyx/network-candidates/convert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: cand.id, by: "Office" }) });
    const d = await res.json();
    if (d.ok) { showToast(`✓ ${d.already ? "Already in" : "Created in"} MoveAround as a ${d.type === "owner_operator" ? "Owner-Operator" : "Driver"} — onboarding tasks ready.`); loadCandidates(); setPanelCand((c: any) => c ? { ...c, pipeline_status: "hired", converted_link: d.link } : c); if (panelCand) reloadNotes(cand.id); }
    else showToast(`Couldn't add to MoveAround — ${d.error || "try again"}`);
  }

  useEffect(() => {
    const params = new URLSearchParams();
    if (minScore > 0) params.set("min_score", String(minScore));
    if (availFilter !== "all") params.set("availability", availFilter);

    fetch(`/api/ronyx/driver-network?${params}`)
      .then(r => r.json())
      .then(d => setDrivers(d.drivers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [minScore, availFilter]);

  const filtered = drivers.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [d.anonymous_driver_id, d.city_area, d.driver_type, d.license_class, ...(d.equipment_experience ?? []), ...(d.material_experience ?? [])]
      .some(v => (v || "").toLowerCase().includes(q));
  }).filter(d => {
    if (!equipFilter) return true;
    return (d.equipment_experience ?? []).some(e => e.toLowerCase().includes(equipFilter.toLowerCase()));
  });

  const handleShortlist = (driver: AnonymousDriver) => {
    const next = new Set(shortlisted);
    if (next.has(driver.id)) {
      next.delete(driver.id);
      showToast(`${driver.anonymous_driver_id} removed from shortlist`);
    } else {
      next.add(driver.id);
      showToast(`${driver.anonymous_driver_id} added to shortlist`);
      upsertCand({ candidate_ref: driver.anonymous_driver_id, candidate_type: "driver", display_name: driver.anonymous_driver_id, pipeline_status: "saved", service_area: driver.city_area, equipment: (driver.equipment_experience ?? [])[0] });
    }
    setShortlisted(next);
  };

  const handleUnlock = async (driver: AnonymousDriver) => {
    setUnlock(s => ({ ...s, [driver.id]: "requesting" }));
    await new Promise(r => setTimeout(r, 600));
    setUnlock(s => ({ ...s, [driver.id]: "requested" }));
    showToast(`🔓 Unlock requested for ${driver.anonymous_driver_id} — payment required ($99)`);
    upsertCand({ candidate_ref: driver.anonymous_driver_id, candidate_type: "driver", display_name: driver.anonymous_driver_id, pipeline_status: "unlocked", service_area: driver.city_area });
  };

  const handleRequestIntro = (driver: AnonymousDriver) => {
    showToast(`📨 Introduction requested for ${driver.anonymous_driver_id} — MoveAround will facilitate`);
  };

  // Lazy-load OO partners when that tab is first opened
  useEffect(() => {
    if (activeTab !== "oo" || ooLoaded) return;
    setOOLoading(true);
    fetch("/api/ronyx/owner-operators")
      .then(r => r.json())
      .then(d => { setOOPartners(d.companies ?? []); setOOLoaded(true); })
      .catch(() => setOOLoaded(true))
      .finally(() => setOOLoading(false));
  }, [activeTab, ooLoaded]);

  const handleOOShortlist = (oo: OOPartner) => {
    const next = new Set(ooShortlisted);
    if (next.has(oo.id)) { next.delete(oo.id); showToast(`${oo.company_name} removed from saved list`); }
    else { next.add(oo.id); showToast(`${oo.company_name} saved`); }
    setOOShortlisted(next);
  };

  const filteredOOs = ooPartners.filter(oo => {
    if (!ooSearch) return true;
    const q = ooSearch.toLowerCase();
    return [oo.company_name, oo.contact_name, oo.business_address, oo.mc_number, oo.dot_number]
      .some(v => (v || "").toLowerCase().includes(q));
  });

  const shortlistedDrivers = filtered.filter(d => shortlisted.has(d.id));
  const unlockedDrivers    = drivers.filter(d => !d._identity_locked);

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", minHeight: "100vh", background: "#f8fafc" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, background: "#1e293b", color: "#fff",
          padding: "12px 20px", borderRadius: 10, fontWeight: 600, fontSize: "0.85rem", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e293b 0%, #0891b2 60%, #7c3aed 100%)", padding: "32px 32px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 12, padding: "8px 12px", fontSize: "1.4rem" }}>🚛</div>
              <div>
                <h1 style={{ margin: 0, fontSize: "1.7rem", fontWeight: 900, color: "#fff", letterSpacing: "-0.5px" }}>
                  MoveAround Driver Network™
                </h1>
                <div style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.82rem", marginTop: 2 }}>
                  Driver Finder™ · Private driver marketplace · Drivers onboard once. Companies hire faster.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 20, fontSize: "0.78rem", color: "rgba(255,255,255,0.6)" }}>
              <span>🔒 Identity hidden until unlock</span>
              <span>✅ Compliance-verified profiles</span>
              <span>💼 5 unlocks/mo included</span>
              <span>🤝 MoveAround-facilitated introductions</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/ronyx/drivers/new"
              style={{ background: "#dc2626", color: "#fff", padding: "10px 20px", borderRadius: 8,
                fontWeight: 700, fontSize: "0.85rem", textDecoration: "none", display: "inline-flex", gap: 6 }}>
              + Invite Driver
            </Link>
            <Link href="/ronyx/settings/billing"
              style={{ background: "rgba(255,255,255,0.12)", color: "#fff", padding: "10px 20px", borderRadius: 8,
                fontWeight: 600, fontSize: "0.85rem", textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)" }}>
              💼 Driver Finder™ Plan
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {([["search","🔍 Browse Drivers"],["oo","🏢 Owner Operators"],["shortlist","★ Shortlist"],["unlocked","✓ Unlocked"],["pipeline","🚚 Pipeline"],["about","ℹ About"]] as [typeof activeTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: "10px 18px", background: "transparent", border: "none", cursor: "pointer",
                color: activeTab === key ? "#fff" : "rgba(255,255,255,0.5)",
                fontWeight: activeTab === key ? 700 : 500, fontSize: "0.82rem",
                borderBottom: activeTab === key ? "2px solid #0891b2" : "2px solid transparent" }}>
              {label}
              {key === "shortlist" && shortlisted.size > 0 && (
                <span style={{ background: "#0891b2", color: "#fff", padding: "1px 7px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 700, marginLeft: 6 }}>
                  {shortlisted.size}
                </span>
              )}
              {key === "oo" && ooShortlisted.size > 0 && (
                <span style={{ background: "#15803d", color: "#fff", padding: "1px 7px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 700, marginLeft: 6 }}>
                  {ooShortlisted.size}
                </span>
              )}
              {key === "pipeline" && candidates.length > 0 && (
                <span style={{ background: "#0891b2", color: "#fff", padding: "1px 7px", borderRadius: 20, fontSize: "0.65rem", fontWeight: 700, marginLeft: 6 }}>
                  {candidates.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* ── BROWSE TAB ─────────────────────────────────────────────── */}
        {activeTab === "search" && (
          <>
            {/* Filters */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <input type="text" placeholder="Search equipment, area, driver type..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 260 }} />
              <select value={availFilter} onChange={e => setAvail(e.target.value)}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.82rem", cursor: "pointer" }}>
                <option value="all">All Availability</option>
                <option value="available_now">Available Now</option>
                <option value="available_7_days">Available in 7 Days</option>
                <option value="available_30_days">Available in 30 Days</option>
              </select>
              <select value={String(minScore)} onChange={e => setMinScore(Number(e.target.value))}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.82rem", cursor: "pointer" }}>
                <option value="0">Any Score</option>
                <option value="70">70%+ Score</option>
                <option value="80">80%+ Score</option>
                <option value="90">90%+ Score</option>
              </select>
              <input type="text" placeholder="Filter by equipment (e.g. Dump Truck)..."
                value={equipFilter} onChange={e => setEquip(e.target.value)}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.82rem", minWidth: 220 }} />
              <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "#94a3b8" }}>
                {filtered.length} anonymous driver{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Pricing info banner */}
            <div style={{ background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 12, padding: "14px 20px", marginBottom: 20,
              display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontSize: "0.82rem", color: "#7c3aed", fontWeight: 600 }}>
                💼 <strong>Driver Finder™ — $299/mo</strong> · 5 driver unlocks included · Extra unlocks $49 each · $500 optional success fee
              </div>
              <div style={{ fontSize: "0.78rem", color: "#6d28d9" }}>
                🔒 Driver name, contact, CDL, medical card, and resume are hidden until payment/unlock is approved by MoveAround.
              </div>
              <Link href="/ronyx/settings/billing"
                style={{ background: "#7c3aed", color: "#fff", padding: "7px 16px", borderRadius: 7, fontWeight: 700, fontSize: "0.78rem", textDecoration: "none", flexShrink: 0 }}>
                Activate Driver Finder™
              </Link>
            </div>

            {loading && <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading anonymous driver profiles...</div>}

            {!loading && filtered.length === 0 && (
              <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 14, padding: "56px 32px", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: 14 }}>🚛</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>No drivers in the network yet</div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
                  Drivers join the MoveAround Driver Network™ by creating a profile and granting consent for anonymous listing.
                  Invite your drivers to get started.
                </div>
                <Link href="/ronyx/drivers/new"
                  style={{ background: "#0891b2", color: "#fff", padding: "12px 28px", borderRadius: 9, fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
                  + Invite a Driver
                </Link>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
                {filtered.map(driver => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    unlockState={unlockStates[driver.id] ?? (driver.is_unlocked ? "unlocked" : "idle")}
                    shortlisted={shortlisted.has(driver.id)}
                    onShortlist={() => handleShortlist(driver)}
                    onUnlock={() => handleUnlock(driver)}
                    onRequestIntro={() => handleRequestIntro(driver)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── OWNER OPERATORS TAB ──────────────────────────────────── */}
        {activeTab === "oo" && (
          <>
            <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                  Owner Operator Fleet Partners ({filteredOOs.length})
                </h2>
                <p style={{ margin: "4px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Owner operator companies working with Ronyx. View profiles, contact info, and compliance status.
                </p>
              </div>
              <input type="text" placeholder="Search company, MC#, DOT#, contact..."
                value={ooSearch} onChange={e => setOOSearch(e.target.value)}
                style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.85rem", minWidth: 280 }} />
              <a href="/ronyx/owner-operators"
                style={{ padding: "9px 16px", background: "#1e293b", color: "#fff", borderRadius: 8,
                  fontWeight: 700, fontSize: "0.78rem", textDecoration: "none", whiteSpace: "nowrap" }}>
                + Add OO Partner
              </a>
            </div>

            {ooLoading && (
              <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>Loading owner operator partners...</div>
            )}

            {!ooLoading && filteredOOs.length === 0 && (
              <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 14, padding: "56px 32px", textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: 14 }}>🏢</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
                  {ooSearch ? "No owner operators match your search" : "No owner operators on file yet"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: 24 }}>
                  {ooSearch ? "Try a different search term." : "Add owner operators from the Owner Operators page."}
                </div>
                {!ooSearch && (
                  <a href="/ronyx/owner-operators"
                    style={{ background: "#0891b2", color: "#fff", padding: "12px 28px", borderRadius: 9,
                      fontWeight: 700, fontSize: "0.9rem", textDecoration: "none" }}>
                    Go to Owner Operators →
                  </a>
                )}
              </div>
            )}

            {!ooLoading && filteredOOs.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
                {filteredOOs.map(oo => (
                  <OOPartnerCard
                    key={oo.id}
                    oo={oo}
                    shortlisted={ooShortlisted.has(oo.id)}
                    onShortlist={() => handleOOShortlist(oo)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SHORTLIST TAB ──────────────────────────────────────────── */}
        {activeTab === "shortlist" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                Shortlisted Drivers ({shortlisted.size})
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Drivers you've saved. Unlock or request an introduction when ready to hire.
              </p>
            </div>
            {shortlistedDrivers.length === 0 ? (
              <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>★</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>No drivers shortlisted yet</div>
                <div style={{ fontSize: "0.78rem", marginTop: 6 }}>Browse anonymous profiles and click Shortlist to save drivers here.</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
                {shortlistedDrivers.map(driver => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    unlockState={unlockStates[driver.id] ?? "idle"}
                    shortlisted={true}
                    onShortlist={() => handleShortlist(driver)}
                    onUnlock={() => handleUnlock(driver)}
                    onRequestIntro={() => handleRequestIntro(driver)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── UNLOCKED TAB ─────────────────────────────────────────── */}
        {activeTab === "unlocked" && (
          <>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                Unlocked Driver Profiles ({unlockedDrivers.length})
              </h2>
              <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Profiles your organization has unlocked. Full name, contact, and information are visible.
              </p>
            </div>
            {unlockedDrivers.length === 0 ? (
              <div style={{ background: "#fff", border: "2px dashed #cbd5e1", borderRadius: 12, padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>🔓</div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>No unlocked drivers yet</div>
                <div style={{ fontSize: "0.78rem", marginTop: 6 }}>
                  Click "Unlock Profile" on any anonymous driver to see full contact info. Unlock fee: $99 per driver.
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 16 }}>
                {unlockedDrivers.map(driver => (
                  <DriverCard
                    key={driver.id}
                    driver={driver}
                    unlockState="unlocked"
                    shortlisted={shortlisted.has(driver.id)}
                    onShortlist={() => handleShortlist(driver)}
                    onUnlock={() => {}}
                    onRequestIntro={() => handleRequestIntro(driver)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── PIPELINE TAB (Capacity Command Center) ───────────────── */}
        {activeTab === "pipeline" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 18 }}>
              {[
                { l: "In Pipeline", v: candidates.length, c: "#0f172a" },
                { l: "Unlocked", v: counts.unlocked || 0, c: "#0891b2" },
                { l: "In Screening", v: counts.screening || 0, c: "#d97706" },
                { l: "Compliance", v: counts.compliance_review || 0, c: "#dc2626" },
                { l: "Ready to Dispatch", v: counts.ready_to_dispatch || 0, c: "#16a34a" },
                { l: "Hired", v: counts.hired || 0, c: "#7c3aed" },
              ].map(m => <div key={m.l} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px" }}><div style={{ fontSize: "0.62rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>{m.l}</div><div style={{ fontSize: "1.5rem", fontWeight: 900, color: m.c, marginTop: 3 }}>{m.v}</div></div>)}
            </div>

            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
              {PIPELINE.map(st => { const n = counts[st.key] || 0; const on = pipeStage === st.key; return (
                <button key={st.key} onClick={() => setPipeStage(on ? null : st.key)} style={{ minWidth: 118, flex: "0 0 118px", background: on ? st.color : "#fff", color: on ? "#fff" : "#475569", border: `1px solid ${on ? st.color : "#e2e8f0"}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase" }}>{st.label}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, marginTop: 2 }}>{n}</div>
                </button>
              ); })}
            </div>

            {candidates.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", background: "#fff", border: "1px dashed #e2e8f0", borderRadius: 14 }}>No candidates in the pipeline yet. Save or unlock drivers/owner-operators to start your hiring funnel.</div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
                {candidates.filter(c => !pipeStage || c.pipeline_status === pipeStage).map(c => { const st = PIPELINE.find(s => s.key === c.pipeline_status) || { label: c.pipeline_status, color: "#64748b" }; return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: st.color + "22", color: st.color, whiteSpace: "nowrap" }}>{st.label}</span>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{c.display_name || c.candidate_ref}{c.candidate_type === "owner_operator" && <span style={{ fontSize: "0.66rem", color: "#7c3aed", marginLeft: 6, fontWeight: 800 }}>OO</span>}</div>
                      <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{[c.service_area, c.equipment, c.assigned_to ? "👤 " + c.assigned_to : "", c.next_task].filter(Boolean).join(" · ") || "—"}</div>
                    </div>
                    <button onClick={() => setPanelCand(c)} style={{ border: "none", borderRadius: 7, padding: "6px 13px", fontWeight: 800, fontSize: "0.76rem", cursor: "pointer", background: "#0f172a", color: "#fff", whiteSpace: "nowrap" }}>Open ▸</button>
                  </div>
                ); })}
              </div>
            )}
          </div>
        )}

        {/* ── ABOUT TAB ────────────────────────────────────────────── */}
        {activeTab === "about" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, maxWidth: 1100 }}>

            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "24px", gridColumn: "1 / -1" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem", fontWeight: 900, color: "#1e293b" }}>MoveAround Driver Network™</h2>
              <p style={{ margin: "0 0 8px", color: "#475569", fontSize: "0.88rem", lineHeight: 1.7 }}>
                A private driver marketplace where companies can discover hire-ready drivers without seeing personal contact details until an approved unlock.
                <strong> Drivers onboard once. Companies hire faster. MoveAround controls the introduction.</strong>
              </p>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.82rem", lineHeight: 1.7 }}>
                This protects driver privacy and protects your business — companies cannot bypass MoveAround and contact drivers directly until the unlock is complete.
              </p>
            </div>

            {[
              {
                icon: "🔒", title: "What's Always Hidden",
                items: ["Full name","Phone number","Email address","Street address","Resume file","CDL number & image","Medical card image","MVR document","References & contact details","Previous employer contacts"],
              },
              {
                icon: "👁️", title: "What Companies Can See",
                items: ["Anonymous Driver ID (MADN-XXXX)","City / area","Years of experience","License class","Equipment experience","Material experience","Availability status","Hire-Ready Score","Compliance status summary","Redacted experience summary"],
              },
              {
                icon: "✅", title: "What's Released After Unlock",
                items: ["Full name","Phone & email","Resume","Work history","References","Document packet","Application packet","Compliance packet"],
              },
              {
                icon: "💵", title: "Driver Finder™ Pricing",
                items: ["$299/mo — 5 driver unlocks included","Extra unlock: $49 per driver","Optional success fee: $500 (verified hire)","Browse unlimited anonymous profiles","Request introductions through MoveAround"],
              },
              {
                icon: "🤝", title: "How It Works",
                items: [
                  "1. Driver creates profile & uploads documents",
                  "2. Driver grants consent for anonymous listing",
                  "3. MoveAround verifies and scores the profile",
                  "4. Company browses anonymous profiles",
                  "5. Company shortlists and pays unlock fee",
                  "6. MoveAround releases contact or facilitates intro",
                  "7. Company moves driver to hiring pipeline",
                ],
              },
              {
                icon: "📋", title: "Driver Statuses",
                items: ["Anonymous Profile","Shortlisted","Intro Requested","Unlock Pending","Unlocked","Interview Requested","Hired","Not Selected"],
              },
            ].map(sec => (
              <div key={sec.title} style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: "20px 22px" }}>
                <h3 style={{ margin: "0 0 14px", fontSize: "0.9rem", fontWeight: 800, color: "#1e293b" }}>{sec.icon} {sec.title}</h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.78rem", color: "#475569", lineHeight: 2 }}>
                  {sec.items.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Candidate Command Panel ── */}
      {panelCand && (
        <div onClick={() => setPanelCand(null)} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(15,23,42,0.55)", display: "flex", justifyContent: "flex-end" }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 470, maxWidth: "95vw", height: "100%", background: "#fff", overflowY: "auto", boxShadow: "-10px 0 40px rgba(0,0,0,0.3)" }}>
            <div style={{ background: "#0f172a", color: "#fff", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>Candidate Command Panel</div>
                  <div style={{ fontSize: "1.15rem", fontWeight: 900, marginTop: 2 }}>{panelCand.display_name || panelCand.candidate_ref}</div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{panelCand.candidate_type === "owner_operator" ? "Owner Operator" : "Company Driver"}{panelCand.service_area ? ` · ${panelCand.service_area}` : ""}{panelCand.match_score ? ` · Match ${panelCand.match_score}%` : ""}</div>
                </div>
                <button onClick={() => setPanelCand(null)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Move through pipeline</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                {PIPELINE.map(st => { const on = panelCand.pipeline_status === st.key; return (
                  <button key={st.key} onClick={() => patchCand({ id: panelCand.id, pipeline_status: st.key, note: `Moved to ${st.label}` })} style={{ padding: "6px 11px", borderRadius: 999, border: `1px solid ${on ? st.color : "#e2e8f0"}`, background: on ? st.color : "#fff", color: on ? "#fff" : "#475569", fontWeight: 700, fontSize: "0.72rem", cursor: "pointer" }}>{st.label}</button>
                ); })}
              </div>

              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Owner &amp; actions</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
                {["Sylvia P", "Tabitha L"].map(n => <button key={n} onClick={() => patchCand({ id: panelCand.id, assigned_to: n, note: `Assigned to ${n}` })} style={{ ...assignBtn, background: panelCand.assigned_to === n ? "#1e40af" : "#eff6ff", color: panelCand.assigned_to === n ? "#fff" : "#1d4ed8" }}>👤 {n}</button>)}
                <button onClick={() => patchCand({ id: panelCand.id, pipeline_status: "compliance_review", note: "Started compliance review" })} style={{ ...assignBtn, background: "#fef2f2", color: "#dc2626" }}>Start Compliance</button>
                <button onClick={() => patchCand({ id: panelCand.id, pipeline_status: "not_a_fit", note: "Marked not a fit" })} style={{ ...assignBtn, background: "#f8fafc", color: "#475569" }}>Not a fit</button>
                <button onClick={() => convertCand(panelCand)} style={{ ...assignBtn, background: "#16a34a", color: "#fff" }}>✓ Hire → Add to MoveAround</button>
              </div>
              {panelCand.converted_link && (
                <a href={panelCand.converted_link} style={{ display: "block", textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", borderRadius: 8, padding: "9px 0", fontWeight: 800, fontSize: "0.8rem", textDecoration: "none", marginBottom: 16 }}>✓ Open the new MoveAround profile →</a>
              )}

              <div style={{ fontSize: "0.64rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Communication log</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <input value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Log a call, text, or note…" onKeyDown={e => { if (e.key === "Enter") logNote(); }} style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 10px", fontSize: "0.8rem", outline: "none", boxSizing: "border-box" }} />
                <button onClick={logNote} style={{ ...assignBtn, background: "#0f172a", color: "#fff" }}>Log</button>
              </div>
              {candNotes.length === 0 ? <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>No contact logged yet.</div> : candNotes.map(n => (
                <div key={n.id} style={{ padding: "7px 0", borderBottom: "1px solid #f1f5f9", fontSize: "0.8rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: "0.68rem" }}><span>{n.created_by}</span><span>{(n.created_at || "").slice(0, 10)}</span></div>
                  <div style={{ color: "#334155" }}>{n.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
