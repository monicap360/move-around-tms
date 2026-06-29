"use client";

// Lightweight in-app guided tour: dims the screen, spotlights a target element,
// and shows a tooltip with Back / Next / Skip. Targets are CSS selectors; a step
// with no selector (or a missing element) shows a centered card. Completion is
// remembered in localStorage so it only auto-runs once per user.

import { useCallback, useEffect, useState } from "react";

export type TourStep = { selector?: string; title: string; body: string };

export default function GuidedTour({
  steps, open, onClose, tourId,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  tourId: string;
}) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const measure = useCallback(() => {
    const step = steps[idx];
    if (!step?.selector) { setRect(null); return; }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    setRect(el.getBoundingClientRect());
  }, [idx, steps]);

  useEffect(() => { if (open) setIdx(0); }, [open]);

  useEffect(() => {
    if (!open) return;
    measure();
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    const t = setInterval(measure, 350); // keep aligned through scroll animations
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
      clearInterval(t);
    };
  }, [open, idx, measure]);

  if (!open) return null;
  const step = steps[idx];
  if (!step) return null;
  const last = idx === steps.length - 1;

  const finish = () => { try { localStorage.setItem(`tour_done_${tourId}`, "1"); } catch { /* ignore */ } setIdx(0); onClose(); };
  const close = () => { setIdx(0); onClose(); }; // dismiss without marking done — stays available, reopen from the ? button
  const next = () => (last ? finish() : setIdx((i) => i + 1));
  const back = () => setIdx((i) => Math.max(0, i - 1));

  // Tooltip placement: below the target if there's room, else above; else centered.
  const TT_W = 330;
  const tt: React.CSSProperties = { position: "fixed", width: TT_W, zIndex: 100002, background: "#fff", borderRadius: 14, padding: "16px 18px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" };
  if (rect) {
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - TT_W - 12);
    if (window.innerHeight - rect.bottom > 220) { tt.top = rect.bottom + 14; tt.left = left; }
    else if (rect.top > 220) { tt.bottom = window.innerHeight - rect.top + 14; tt.left = left; }
    else { tt.top = Math.min(rect.bottom + 14, window.innerHeight - 220); tt.left = left; }
  } else {
    tt.top = "50%"; tt.left = "50%"; tt.transform = "translate(-50%, -50%)";
  }

  const pad = 6;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100000 }}>
      {/* click-catcher: blocks accidental navigation while the tour is open */}
      <div style={{ position: "absolute", inset: 0, cursor: "default" }} onClick={(e) => e.stopPropagation()} />

      {/* spotlight (visual only) */}
      {rect ? (
        <div style={{
          position: "fixed", top: rect.top - pad, left: rect.left - pad,
          width: rect.width + pad * 2, height: rect.height + pad * 2,
          borderRadius: 10, border: "2px solid #818cf8",
          boxShadow: "0 0 0 9999px rgba(15,23,42,0.74), 0 0 18px rgba(129,140,248,0.7)",
          pointerEvents: "none", transition: "top .2s, left .2s, width .2s, height .2s", zIndex: 100001,
        }} />
      ) : (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.74)", zIndex: 100001 }} />
      )}

      {/* tooltip */}
      <div style={tt}>
        <button onClick={close} aria-label="Close tour" title="Close — reopen anytime from the ? button in the top bar"
          style={{ position: "absolute", top: 8, right: 10, width: 26, height: 26, borderRadius: 7, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", fontSize: 16, lineHeight: 1, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#4f46e5", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6, paddingRight: 26 }}>
          Step {idx + 1} of {steps.length}
        </div>
        <div style={{ fontWeight: 800, fontSize: "1.02rem", color: "#0f172a", marginBottom: 6 }}>{step.title}</div>
        <div style={{ fontSize: "0.86rem", color: "#475569", lineHeight: 1.55, marginBottom: 14 }}>{step.body}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={finish} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "0.8rem", cursor: "pointer", fontWeight: 600 }}>Skip tour</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {idx > 0 && <button onClick={back} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>Back</button>}
            <button onClick={next} style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: "#4f46e5", color: "#fff", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>{last ? "Done 🎉" : "Next"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper: has this tour already been completed?
export function tourDone(tourId: string): boolean {
  try { return localStorage.getItem(`tour_done_${tourId}`) === "1"; } catch { return false; }
}
