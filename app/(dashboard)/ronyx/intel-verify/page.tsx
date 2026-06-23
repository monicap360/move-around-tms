"use client";

import React, { useEffect, useState } from "react";
import IntelVerifyPanel from "@/app/components/ronyx/IntelVerifyPanel";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type QueueItem = {
  id: string;
  oo_id: string | null;
  file_name: string;
  doc_type: string;
  status: "pending_review" | "approved" | "rejected" | "extraction_failed" | "research_needed";
  high_confidence_count: number;
  low_confidence_count: number;
  approved_by?: string;
  approved_at?: string;
  approved_fields?: unknown[];
  extraction_error?: string | null;
  created_at: string;
};

type Nav = "upload" | "review_queue" | "needs_approval" | "low_confidence" | "recent_approvals" | "audit_history";

const DOC_LABEL: Record<string, string> = {
  coi: "COI", cdl: "CDL", mvr: "MVR", medical_card: "Med Card",
  w9: "W-9", contract: "Contract", payroll: "Payroll",
  driver_roster: "Driver Roster", general: "General",
};

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pending_review:   { bg: "#fef9c3", text: "#a16207", label: "Pending Review" },
  approved:         { bg: "#dcfce7", text: "#15803d", label: "Approved" },
  rejected:         { bg: "#fef2f2", text: "#dc2626", label: "Rejected" },
  extraction_failed:{ bg: "#f1f5f9", text: "#64748b", label: "Extraction Failed" },
  research_needed:  { bg: "#fff7ed", text: "#c2410c", label: "Research Needed" },
};

function fmt(d: string) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Nav sections ─────────────────────────────────────────────────────────────

function QueueTable({ items, loading, onSelect }: { items: QueueItem[]; loading: boolean; onSelect?: (id: string) => void }) {
  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Loading…</div>;
  if (!items.length) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>No items in this section</div>
    </div>
  );
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["File", "Type", "Status", "High Conf.", "Needs Review", "Date"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.pending_review;
            return (
              <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}
                onClick={() => onSelect?.(item.id)}>
                <td style={{ padding: "10px 14px", maxWidth: 220 }}>
                  <div style={{ fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.file_name}</div>
                  {item.extraction_error && <div style={{ fontSize: 10, color: "#dc2626", marginTop: 1 }}>⚠ {item.extraction_error.slice(0, 60)}</div>}
                </td>
                <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                  <span style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 5, fontWeight: 700, fontSize: 11 }}>{DOC_LABEL[item.doc_type] ?? item.doc_type}</span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: st.bg, color: st.text, padding: "2px 8px", borderRadius: 5, fontWeight: 700, fontSize: 11 }}>{st.label}</span>
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#16a34a" }}>{item.high_confidence_count}</td>
                <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: item.low_confidence_count > 0 ? "#d97706" : "#94a3b8" }}>{item.low_confidence_count || "—"}</td>
                <td style={{ padding: "10px 14px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmt(item.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function IntelVerifyPage() {
  const [nav,     setNav]     = useState<Nav>("upload");
  const [items,   setItems]   = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [qNote,   setQNote]   = useState<string | null>(null);

  async function loadQueue(statusFilter?: string) {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : "";
      const r  = await fetch(`/api/ronyx/intel-verify/queue${qs}`);
      const d  = await r.json();
      setItems(d.items ?? []);
      if (d.note) setQNote(d.note);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (nav === "review_queue")    loadQueue();
    if (nav === "needs_approval")  loadQueue("pending_review");
    if (nav === "low_confidence")  loadQueue("pending_review");
    if (nav === "recent_approvals")loadQueue("approved");
    if (nav === "audit_history")   loadQueue();
  }, [nav]);

  const lowConfItems = items.filter(x => x.low_confidence_count > 0);

  const NAV_ITEMS: { key: Nav; label: string; icon: string }[] = [
    { key: "upload",          label: "Upload & Verify",    icon: "⬆" },
    { key: "review_queue",    label: "Review Queue",       icon: "📋" },
    { key: "needs_approval",  label: "Needs Approval",     icon: "✔" },
    { key: "low_confidence",  label: "Low Confidence",     icon: "⚠" },
    { key: "recent_approvals",label: "Recent Approvals",   icon: "✓" },
    { key: "audit_history",   label: "Audit History",      icon: "🕓" },
  ];

  const panelContent = (() => {
    if (nav === "upload") {
      return (
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <IntelVerifyPanel />
        </div>
      );
    }
    if (nav === "review_queue") return <QueueTable items={items} loading={loading} />;
    if (nav === "needs_approval") return <QueueTable items={items.filter(x => x.status === "pending_review")} loading={loading} />;
    if (nav === "low_confidence") return <QueueTable items={lowConfItems} loading={loading} />;
    if (nav === "recent_approvals") return <QueueTable items={items.filter(x => x.status === "approved")} loading={loading} />;
    if (nav === "audit_history") return (
      <div>
        <QueueTable items={items} loading={loading} />
        <div style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8", borderTop: "1px solid #f1f5f9" }}>
          Full audit trail (including approval details) available once the intel_verify_audit table is created via database migration.
        </div>
      </div>
    );
    return null;
  })();

  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* ── Hero ── */}
      <div className="premium-hero" style={{ marginBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
              MoveAround TMS
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", margin: "0 0 6px", letterSpacing: "-0.02em" }}>
              MoveAround Intel Verify™
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0, maxWidth: 540 }}>
              Upload transportation documents — COIs, CDLs, medical cards, W-9s, contracts — extract fields with confidence scoring, review each value, and approve directly to the owner operator record.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link href="/ronyx/owner-operators" style={{ padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, fontSize: 12, color: "#475569", textDecoration: "none" }}>
              ← Owner Operators
            </Link>
            <Link href="/ronyx/intel-import-center" style={{ padding: "8px 16px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, fontSize: 12, color: "#475569", textDecoration: "none" }}>
              Intel Import Center™
            </Link>
          </div>
        </div>
      </div>

      {/* ── Body: sidebar + content ── */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 160px)" }}>
        {/* Sidebar nav */}
        <aside style={{ width: 216, flexShrink: 0, background: "#fff", borderRight: "1px solid #f1f5f9", padding: "20px 0" }}>
          {NAV_ITEMS.map(n => (
            <button key={n.key} onClick={() => setNav(n.key)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 20px", border: "none", cursor: "pointer", fontWeight: nav === n.key ? 800 : 600, fontSize: 13, color: nav === n.key ? "#1e40af" : "#475569", background: nav === n.key ? "#eff6ff" : "transparent", borderRight: nav === n.key ? "3px solid #1e40af" : "3px solid transparent", textAlign: "left", transition: "all 0.12s" }}>
              <span style={{ fontSize: 15, width: 20, textAlign: "center", flexShrink: 0 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}

          {/* Separator + DB status note */}
          {qNote && (
            <div style={{ margin: "16px 14px 0", padding: "10px 12px", background: "#fffbeb", borderRadius: 8, fontSize: 10, color: "#a16207", fontWeight: 600, border: "1px solid #fde68a" }}>
              ⚠ Queue storage not yet active — run migration to persist extractions.
            </div>
          )}
        </aside>

        {/* Content panel */}
        <div style={{ flex: 1, padding: "24px", overflowX: "auto" }}>
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", minHeight: 400, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>
                {NAV_ITEMS.find(n => n.key === nav)?.icon}{" "}
                {NAV_ITEMS.find(n => n.key === nav)?.label}
              </div>
              {nav !== "upload" && (
                <button onClick={() => setNav("upload")}
                  style={{ padding: "6px 14px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  + Verify New Document
                </button>
              )}
            </div>
            {panelContent}
          </div>
        </div>
      </div>
    </main>
  );
}
