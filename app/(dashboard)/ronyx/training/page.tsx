"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Training Center — written quick-start guides per module + an embeddable video
// slot for each. Video links are saved (per browser for now) so you can drop in
// your own Loom / YouTube / Vimeo / MP4 recordings as you make them.

type Module = {
  key: string;
  icon: string;
  title: string;
  blurb: string;
  href: string;
  steps: string[];
};

const MODULES: Module[] = [
  {
    key: "rory", icon: "🧭", title: "Rory — Operations Manager", href: "/ronyx/operations-manager",
    blurb: "Your AI ops manager. Ask plain questions about your live operations.",
    steps: [
      "Open Rory from the sidebar (Operations → Rory).",
      "Type a question like “Who can I dispatch tomorrow?” or “Which drivers have docs expiring?”.",
      "Use the Morning Brief tab for the day’s priorities.",
      "Every answer shows the data it used and links to the right module.",
    ],
  },
  {
    key: "dispatch", icon: "📋", title: "Dispatch & Smart Assign", href: "/ronyx/dispatch/board",
    blurb: "Import a daily dispatch, assign drivers, and get Smart Assign recommendations.",
    steps: [
      "Go to Dispatch → Daily Import and upload today’s dispatch sheet (CSV or Excel).",
      "Jobs appear on the Dispatch board grouped by status.",
      "Click ⚡ Smart Assign for recommended drivers on unassigned trips.",
      "Assign a driver to move a job to “Smart Assigned”.",
    ],
  },
  {
    key: "fastscan", icon: "⚡", title: "Fast Scan — Tickets", href: "/ronyx/fast-scan",
    blurb: "Snap or upload a load ticket and let OCR read it for you.",
    steps: [
      "Open Fast Scan and drop in a ticket photo or PDF (multi-page PDFs can be split into separate tickets).",
      "Claude reads the ticket and fills in the fields.",
      "Review, then route to Payroll and/or Billing.",
      "Exceptions (missing signature, low confidence) go to the review queue.",
    ],
  },
  {
    key: "ccb", icon: "🛡️", title: "CCB Compliance", href: "/ronyx/compliance",
    blurb: "Keep carriers and drivers cleared to dispatch.",
    steps: [
      "Check the Compliance Center for expiring documents.",
      "Use Clearance Check for customer dispatch requirements.",
      "Be Audit Ready keeps your records inspection-ready.",
      "Blocked carriers/drivers can’t be dispatched until resolved.",
    ],
  },
  {
    key: "drivers", icon: "👤", title: "Drivers", href: "/ronyx/drivers",
    blurb: "Your driver roster, compliance, and documents.",
    steps: [
      "Import drivers from a spreadsheet (any layout — columns auto-detect).",
      "Track CDL and medical-card expirations.",
      "Upload driver documents; multi-page PDFs split into the right slots.",
    ],
  },
  {
    key: "oo", icon: "🚛", title: "Owner Operators", href: "/ronyx/owner-operators",
    blurb: "Sub-haulers and OO companies — docs, COI compliance, settlements.",
    steps: [
      "Use Bulk Import to load all carriers at once.",
      "Open a carrier to manage documents in the Documents & Compliance card.",
      "Track COI / insurance status and run settlements.",
    ],
  },
  {
    key: "fleet", icon: "🔧", title: "Fleet & Maintenance", href: "/ronyx/fleet",
    blurb: "Truck readiness, maintenance, inspections, and availability.",
    steps: [
      "The Fleet Readiness Command Center shows availability at a glance.",
      "Log maintenance and inspections per unit.",
      "Out-of-service trucks are flagged for dispatch.",
    ],
  },
  {
    key: "setup", icon: "🚀", title: "Setup & Import", href: "/ronyx/implementation",
    blurb: "Load your data in phases to get up and running.",
    steps: [
      "Work through the 9 import phases (customers → drivers → trucks → … → daily dispatch).",
      "Each phase accepts several files at once — they’re combined and imported together.",
      "Re-upload anytime to fill in blanks.",
    ],
  },
];

// Build an embeddable player URL from a pasted link.
function embedFor(url: string): { type: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const u = url.trim();
  let m;
  if ((m = u.match(/youtube\.com\/watch\?v=([\w-]+)/)) || (m = u.match(/youtu\.be\/([\w-]+)/))) return { type: "iframe", src: `https://www.youtube.com/embed/${m[1]}` };
  if ((m = u.match(/loom\.com\/share\/([\w-]+)/))) return { type: "iframe", src: `https://www.loom.com/embed/${m[1]}` };
  if ((m = u.match(/vimeo\.com\/(\d+)/))) return { type: "iframe", src: `https://player.vimeo.com/video/${m[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { type: "video", src: u };
  // Already an embed URL
  if (/\/embed\/|player\./.test(u)) return { type: "iframe", src: u };
  return null;
}

export default function TrainingPage() {
  const [videos, setVideos] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try { setVideos(JSON.parse(localStorage.getItem("ronyx_training_videos") || "{}")); } catch { /* ignore */ }
  }, []);

  function save(key: string, url: string) {
    const next = { ...videos };
    if (url.trim()) next[key] = url.trim(); else delete next[key];
    setVideos(next);
    try { localStorage.setItem("ronyx_training_videos", JSON.stringify(next)); } catch { /* ignore */ }
    setEditing(null); setDraft("");
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px 64px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{ width: 50, height: 50, borderRadius: 14, background: "linear-gradient(135deg,#4f46e5,#0891b2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>🎓</div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>Training Center</h1>
          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 13 }}>Quick-start guides and how-to videos for every part of MoveAround TMS.</p>
        </div>
        <button onClick={() => { try { localStorage.removeItem("tour_done_ronyx_v1"); } catch {} location.href = "/ronyx/operations-manager"; }}
          style={{ marginLeft: "auto", padding: "9px 14px", background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          ▶ Replay app tour
        </button>
      </div>

      <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", margin: "14px 0 20px", fontSize: 13, color: "#0369a1" }}>
        💡 Paste a <strong>Loom, YouTube, Vimeo, or MP4</strong> link under any module to add a training video. (Saved on this device for now — ask to make them shared across your whole team.)
      </div>

      <div style={{ display: "grid", gap: 16 }}>
        {MODULES.map((m) => {
          const vid = videos[m.key];
          const embed = embedFor(vid || "");
          return (
            <section key={m.key} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "1.5rem" }}>{m.icon}</span>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>{m.title}</h2>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "#64748b" }}>{m.blurb}</p>
                </div>
                <Link href={m.href} style={{ padding: "7px 13px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#1e40af", textDecoration: "none", whiteSpace: "nowrap" }}>Open →</Link>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 0 }}>
                {/* Quick steps */}
                <div style={{ padding: "16px 18px" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Quick steps</div>
                  <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 7 }}>
                    {m.steps.map((s, i) => <li key={i} style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.45 }}>{s}</li>)}
                  </ol>
                </div>

                {/* Video */}
                <div style={{ padding: "16px 18px", borderLeft: "1px solid #f1f5f9", background: "#fafbff" }}>
                  <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Video</span>
                    <button onClick={() => { setEditing(m.key); setDraft(vid || ""); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#4f46e5", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      {vid ? "Change" : "+ Add video"}
                    </button>
                  </div>

                  {editing === m.key ? (
                    <div>
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Paste Loom / YouTube / Vimeo / MP4 link…"
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, marginBottom: 8 }} />
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => save(m.key, draft)} style={{ padding: "7px 14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Save</button>
                        {vid && <button onClick={() => save(m.key, "")} style={{ padding: "7px 12px", background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Remove</button>}
                        <button onClick={() => { setEditing(null); setDraft(""); }} style={{ padding: "7px 12px", background: "#f8fafc", color: "#475569", border: "1px solid #e2e8f0", borderRadius: 7, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : embed ? (
                    <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 10, overflow: "hidden", background: "#000" }}>
                      {embed.type === "iframe" ? (
                        <iframe src={embed.src} allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
                      ) : (
                        <video src={embed.src} controls style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                      )}
                    </div>
                  ) : vid ? (
                    <div style={{ fontSize: 12, color: "#b45309" }}>Couldn’t recognize that link — use a Loom, YouTube, Vimeo, or direct MP4 URL.</div>
                  ) : (
                    <div style={{ aspectRatio: "16/9", borderRadius: 10, border: "2px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 12 }}>
                      No video yet — click <strong style={{ margin: "0 4px" }}>+ Add video</strong> to embed one.
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
