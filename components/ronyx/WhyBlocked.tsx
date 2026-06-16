"use client";

import { useEffect, useState } from "react";

type BlockReason = {
  code: string;
  label: string;
  detail: string;
  severity: "critical" | "warning" | "info";
  fix_label: string;
  fix_href: string;
  fix_action?: string;
};

type WhyBlockedResult = {
  subject: string;
  type: string;
  id: string;
  decision: "Blocked" | "Needs Review" | "Clear";
  reasons: BlockReason[];
};

type Props = {
  type: "dispatch_job" | "driver" | "truck" | "owner_operator";
  id: string;
  label?: string;
  trigger?: React.ReactNode;
  onFixApplied?: () => void;
};

const severityColor: Record<string, { border: string; bg: string; badge: string; text: string; dot: string }> = {
  critical: { border: "#fca5a5", bg: "#fff5f5", badge: "#fee2e2", text: "#dc2626", dot: "#dc2626" },
  warning:  { border: "#fde68a", bg: "#fffbeb", badge: "#fef9c3", text: "#d97706", dot: "#ca8a04" },
  info:     { border: "#bfdbfe", bg: "#f0f9ff", badge: "#eff6ff", text: "#2563eb", dot: "#3b82f6" },
};

const decisionStyle: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  Blocked:      { color: "#dc2626", bg: "#fee2e2", border: "#fca5a5", icon: "🚫" },
  "Needs Review": { color: "#d97706", bg: "#fef9c3", border: "#fde68a", icon: "⚠️" },
  Clear:        { color: "#16a34a", bg: "#f0fdf4", border: "#86efac", icon: "✅" },
};

export default function WhyBlocked({ type, id, label, trigger, onFixApplied }: Props) {
  const [open,    setOpen]    = useState(false);
  const [data,    setData]    = useState<WhyBlockedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixed,   setFixed]   = useState<Record<string, boolean>>({});

  const load = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/ronyx/admin/why-blocked?type=${type}&id=${id}`);
      if (!r.ok) throw new Error("Failed");
      setData(await r.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!data) load();
  };

  const handleFixNavigate = (reason: BlockReason) => {
    if (reason.fix_href) {
      window.location.href = reason.fix_href;
    }
  };

  const handleOneClickFix = async (reason: BlockReason) => {
    if (reason.fix_action === "send_reminder") {
      await fetch(`/api/ronyx/admin/fix-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: reason.fix_action, type, id, code: reason.code }),
      });
      setFixed(prev => ({ ...prev, [reason.code]: true }));
      onFixApplied?.();
      return;
    }
    handleFixNavigate(reason);
  };

  const ds = data ? decisionStyle[data.decision] : null;

  return (
    <>
      {/* Trigger */}
      <span onClick={handleOpen} style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
        {trigger ?? (
          <button style={{ padding: "4px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 11, fontWeight: 700, color: "#0f172a", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <span>🔍</span> {label || "Why Blocked?"}
          </button>
        )}
      </span>

      {/* Modal overlay */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,0.18)" }}>

            {/* Header */}
            <div style={{ padding: "18px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>Why Blocked?</div>
                {data && <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{data.subject}</div>}
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94a3b8", lineHeight: 1, padding: 0, marginTop: 2 }}>×</button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>
              {loading && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#64748b", fontSize: 13 }}>Checking records…</div>
              )}

              {!loading && !data && (
                <div style={{ textAlign: "center", padding: "32px 0", color: "#dc2626", fontSize: 13 }}>Could not load block reasons.</div>
              )}

              {!loading && data && (
                <>
                  {/* Decision banner */}
                  <div style={{ border: `1px solid ${ds!.border}`, background: ds!.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{ds!.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15, color: ds!.color }}>{data.decision}</div>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>{data.reasons.length} issue{data.reasons.length !== 1 ? "s" : ""} found</div>
                    </div>
                  </div>

                  {/* Reason list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {data.reasons.map(reason => {
                      const sc = severityColor[reason.severity];
                      return (
                        <div key={reason.code} style={{ border: `1px solid ${sc.border}`, background: sc.bg, borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot, display: "inline-block", flexShrink: 0, marginTop: 1 }} />
                              <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{reason.label}</span>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, background: sc.badge, color: sc.text, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                              {reason.severity}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 10, marginLeft: 15 }}>{reason.detail}</div>
                          {reason.fix_label && !fixed[reason.code] && (
                            <button onClick={() => handleOneClickFix(reason)} style={{ marginLeft: 15, padding: "7px 16px", borderRadius: 8, border: "none", background: reason.severity === "critical" ? "#dc2626" : reason.severity === "warning" ? "#ca8a04" : "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              {reason.fix_action === "send_reminder" ? "📧 " : "→ "}{reason.fix_label}
                            </button>
                          )}
                          {fixed[reason.code] && (
                            <span style={{ marginLeft: 15, fontSize: 12, color: "#16a34a", fontWeight: 700 }}>✓ Action sent</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { setData(null); load(); }} style={{ fontSize: 11, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                🔄 Refresh
              </button>
              <button onClick={() => setOpen(false)} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
