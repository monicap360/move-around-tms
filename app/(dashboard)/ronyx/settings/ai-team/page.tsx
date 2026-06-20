"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  AVATAR_STYLES,
  TONE_OPTIONS,
  FILTER_CATEGORIES,
  type AvatarStyle,
  type ToneOption,
} from "@/lib/ai/assistantCatalog";

/* ── Types ─────────────────────────────────────────────────────── */

type AssistantRow = {
  id:              string | null;
  assistant_key:   string;
  default_name:    string;
  role_title:      string;
  description:     string;
  filter_category: string;
  example_prompt:  string;
  custom_name:     string | null;
  display_name:    string;
  avatar_style:    AvatarStyle;
  greeting:        string | null;
  tone:            ToneOption;
  is_enabled:      boolean;
  updated_at:      string | null;
};

type ModalState = {
  key:          string;
  custom_name:  string;
  avatar_style: AvatarStyle;
  greeting:     string;
  tone:         ToneOption;
  is_enabled:   boolean;
  saving:       boolean;
  error:        string;
  default_name: string;
  role_title:   string;
  example_prompt: string;
};

/* ── Style constants ────────────────────────────────────────────── */

const FONT   = "'Inter','Segoe UI',sans-serif";
const BLUE   = "#1d4ed8";
const DARK   = "#0f172a";
const MED    = "#475569";
const LIGHT  = "#64748b";
const BORD   = "#e2e8f0";
const WHITE  = "#fff";
const BGPAGE = "#f8fafc";

/* ── Avatar helpers ─────────────────────────────────────────────── */

function getAvatarMeta(style: AvatarStyle): { color: string; bg: string } {
  return AVATAR_STYLES.find(s => s.value === style) || AVATAR_STYLES[0];
}

function AvatarCircle({
  name,
  style,
  size = 44,
  fontSize = 18,
}: {
  name: string;
  style: AvatarStyle;
  size?: number;
  fontSize?: number;
}) {
  const { color, bg } = getAvatarMeta(style);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      border: `2px solid ${color}22`, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize, fontWeight: 800, color, flexShrink: 0,
      fontFamily: FONT, letterSpacing: "-0.5px",
    }}>
      {(name || "?")[0].toUpperCase()}
    </div>
  );
}

/* ── Category chip colors ────────────────────────────────────────── */

const CAT_COLORS: Record<string, string> = {
  Operations:   "#1d4ed8",
  Finance:      "#0891b2",
  Compliance:   "#dc2626",
  Fleet:        "#d97706",
  People:       "#7c3aed",
  Support:      "#16a34a",
  Intelligence: "#0891b2",
};

/* ── Preview panel ──────────────────────────────────────────────── */

function AssistantPreview({ modal }: { modal: ModalState }) {
  const name     = modal.custom_name.trim() || modal.default_name;
  const greeting = modal.greeting.trim() || `Hi, I'm ${name}. How can I help you today?`;
  const { color, bg } = getAvatarMeta(modal.avatar_style);
  const toneMeta = TONE_OPTIONS.find(t => t.value === modal.tone);

  return (
    <div style={{
      background: bg, border: `1px solid ${color}33`,
      borderRadius: 12, padding: "18px 20px", height: "100%",
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MED, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
        Preview
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <AvatarCircle name={name} style={modal.avatar_style} size={52} fontSize={22} />
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, color: DARK, lineHeight: 1.1 }}>{name}</div>
          {modal.custom_name.trim() && modal.custom_name.trim() !== modal.default_name && (
            <div style={{ fontSize: 10, color: LIGHT, marginTop: 2 }}>
              MoveAround default: {modal.default_name}
            </div>
          )}
          <div style={{ fontSize: 11, color: color, fontWeight: 600, marginTop: 2 }}>{modal.role_title}</div>
        </div>
      </div>

      <div style={{
        background: WHITE, borderRadius: 10, padding: "12px 14px",
        border: `1px solid ${color}22`, marginBottom: 10,
        fontSize: 13, color: DARK, lineHeight: 1.5, fontStyle: "italic",
      }}>
        "{greeting}"
      </div>

      <div style={{
        background: WHITE, borderRadius: 10, padding: "10px 14px",
        border: `1px solid ${color}22`,
        fontSize: 12, color: LIGHT, lineHeight: 1.4,
      }}>
        <span style={{ fontWeight: 700, color: MED }}>Sample task:</span>{" "}
        {modal.example_prompt}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: LIGHT }}>
        <span style={{ fontWeight: 700 }}>Tone:</span> {toneMeta?.label} — {toneMeta?.desc}
      </div>

      {!modal.is_enabled && (
        <div style={{
          marginTop: 12, background: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#dc2626", fontWeight: 600,
        }}>
          Hidden from staff view
        </div>
      )}
    </div>
  );
}

/* ── Customize modal ─────────────────────────────────────────────── */

function CustomizeModal({
  modal,
  onClose,
  onChange,
  onSave,
}: {
  modal:    ModalState;
  onClose:  () => void;
  onChange: (patch: Partial<ModalState>) => void;
  onSave:   () => void;
}) {
  const nameLen     = modal.custom_name.length;
  const greetingLen = modal.greeting.length;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px 16px",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: WHITE, borderRadius: 16, width: "100%", maxWidth: 860,
        maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        fontFamily: FONT,
      }}>
        {/* Modal header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${BORD}`,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 17, color: DARK }}>
              Customize {modal.default_name}
            </div>
            <div style={{ fontSize: 12, color: LIGHT, marginTop: 2 }}>
              Change how this assistant appears to your staff. Role and intelligence are protected.
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: LIGHT, lineHeight: 1 }}
          >×</button>
        </div>

        {/* Modal body — 2 columns */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 320px", gap: 0,
          minHeight: 420,
        }}>
          {/* Left — form */}
          <div style={{ padding: "22px 24px", borderRight: `1px solid ${BORD}` }}>

            {/* Your Team Name */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>
                Your Team Name
              </label>
              <input
                value={modal.custom_name}
                onChange={e => onChange({ custom_name: e.target.value.slice(0, 30) })}
                placeholder={`e.g. Big Mike (default: ${modal.default_name})`}
                maxLength={30}
                style={{
                  width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`,
                  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
                  fontFamily: FONT,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10.5, color: LIGHT }}>Leave blank to keep the MoveAround default name.</span>
                <span style={{ fontSize: 10.5, color: nameLen >= 25 ? "#dc2626" : LIGHT }}>{nameLen}/30</span>
              </div>
            </div>

            {/* Avatar Style */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 7 }}>
                Avatar Style
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {AVATAR_STYLES.map(s => {
                  const selected = modal.avatar_style === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => onChange({ avatar_style: s.value })}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12,
                        fontWeight: selected ? 700 : 500,
                        border: selected ? `2px solid ${s.color}` : `1px solid ${BORD}`,
                        background: selected ? s.bg : WHITE,
                        color: selected ? s.color : MED,
                        fontFamily: FONT,
                      }}
                    >
                      <span style={{
                        width: 18, height: 18, borderRadius: "50%", background: s.bg,
                        border: `1.5px solid ${s.color}55`, display: "inline-block",
                        flexShrink: 0,
                      }} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 5 }}>
                Greeting
              </label>
              <textarea
                value={modal.greeting}
                onChange={e => onChange({ greeting: e.target.value.slice(0, 180) })}
                placeholder={`e.g. Hi, I'm ${modal.custom_name.trim() || modal.default_name}. Ready to help with dispatch.`}
                rows={3}
                maxLength={180}
                style={{
                  width: "100%", padding: "9px 12px", border: `1px solid ${BORD}`,
                  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box",
                  resize: "vertical", fontFamily: FONT, lineHeight: 1.5,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10.5, color: LIGHT }}>Optional custom opening message for staff.</span>
                <span style={{ fontSize: 10.5, color: greetingLen >= 160 ? "#dc2626" : LIGHT }}>{greetingLen}/180</span>
              </div>
            </div>

            {/* Tone */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 7 }}>
                Communication Tone
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {TONE_OPTIONS.map(t => {
                  const selected = modal.tone === t.value;
                  return (
                    <label
                      key={t.value}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 8, cursor: "pointer",
                        border: selected ? `1.5px solid ${BLUE}` : `1px solid ${BORD}`,
                        background: selected ? "#eff6ff" : WHITE,
                      }}
                    >
                      <input
                        type="radio"
                        name="tone"
                        value={t.value}
                        checked={selected}
                        onChange={() => onChange({ tone: t.value })}
                        style={{ accentColor: BLUE }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: selected ? BLUE : DARK }}>
                          {t.label}
                        </div>
                        <div style={{ fontSize: 11, color: LIGHT }}>{t.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Show to staff toggle */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MED, marginBottom: 7 }}>
                Staff Visibility
              </label>
              <div
                onClick={() => onChange({ is_enabled: !modal.is_enabled })}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", border: `1px solid ${BORD}`,
                  borderRadius: 8, cursor: "pointer",
                  background: modal.is_enabled ? "#f0fdf4" : "#fef2f2",
                }}
              >
                <div style={{
                  width: 40, height: 22, borderRadius: 12, position: "relative",
                  background: modal.is_enabled ? "#16a34a" : "#94a3b8",
                  transition: "background 0.2s",
                }}>
                  <div style={{
                    position: "absolute", top: 3, left: modal.is_enabled ? 20 : 3,
                    width: 16, height: 16, borderRadius: "50%", background: WHITE,
                    transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: modal.is_enabled ? "#15803d" : "#dc2626" }}>
                    {modal.is_enabled ? "Visible to staff" : "Hidden from staff"}
                  </div>
                  <div style={{ fontSize: 11, color: LIGHT }}>
                    {modal.is_enabled
                      ? "This assistant appears in the staff workspace."
                      : "Hidden from staff UI. Background automation continues if required by the system."}
                  </div>
                </div>
              </div>
            </div>

            {/* Locked role — always shown */}
            <div style={{
              background: "#fafafa", border: `1px solid ${BORD}`,
              borderRadius: 10, padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 13 }}>🔒</span>
                <div style={{ fontSize: 11, fontWeight: 700, color: MED, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Protected Role
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 3 }}>{modal.role_title}</div>
              <div style={{ fontSize: 11.5, color: LIGHT, lineHeight: 1.5 }}>
                Role and intelligence are protected by MoveAround. Names can change — capabilities cannot.
              </div>
            </div>

            {modal.error && (
              <div style={{
                marginTop: 14, padding: "10px 14px", background: "#fef2f2",
                border: "1px solid #fca5a5", borderRadius: 8, fontSize: 12.5, color: "#dc2626",
              }}>
                {modal.error}
              </div>
            )}
          </div>

          {/* Right — preview */}
          <div style={{ padding: "22px 20px", background: "#f8fafc" }}>
            <AssistantPreview modal={modal} />
          </div>
        </div>

        {/* Modal footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10,
          padding: "16px 24px", borderTop: `1px solid ${BORD}`,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORD}`,
              background: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: MED, fontFamily: FONT,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={modal.saving}
            style={{
              padding: "9px 24px", borderRadius: 8, border: "none",
              background: modal.saving ? "#93c5fd" : BLUE,
              fontSize: 13, fontWeight: 700, cursor: modal.saving ? "default" : "pointer",
              color: WHITE, fontFamily: FONT,
            }}
          >
            {modal.saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Reset confirm modal ─────────────────────────────────────────── */

function ResetConfirm({
  name,
  onConfirm,
  onClose,
  resetting,
}: {
  name:      string;
  onConfirm: () => void;
  onClose:   () => void;
  resetting: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", fontFamily: FONT,
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: WHITE, borderRadius: 14, width: "100%", maxWidth: 420,
        padding: "26px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ fontSize: 18, marginBottom: 10 }}>🔄</div>
        <div style={{ fontWeight: 900, fontSize: 16, color: DARK, marginBottom: 8 }}>
          Reset {name} to Default?
        </div>
        <div style={{ fontSize: 13, color: LIGHT, lineHeight: 1.6, marginBottom: 20 }}>
          Reset this assistant to its MoveAround default identity? This will remove the custom name,
          greeting, tone, avatar selection, and visibility preference.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 8, border: `1px solid ${BORD}`,
              background: WHITE, fontSize: 13, fontWeight: 600, cursor: "pointer", color: MED,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={resetting}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "none",
              background: resetting ? "#fca5a5" : "#dc2626",
              fontSize: 13, fontWeight: 700, cursor: resetting ? "default" : "pointer", color: WHITE,
            }}
          >
            {resetting ? "Resetting…" : "Yes, Reset"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */

export default function AITeamPage() {
  const [assistants, setAssistants]   = useState<AssistantRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState<string>("All");
  const [modal, setModal]             = useState<ModalState | null>(null);
  const [resetKey, setResetKey]       = useState<string | null>(null);
  const [resetting, setResetting]     = useState(false);
  const [toast, setToast]             = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  async function loadAssistants() {
    try {
      const res = await fetch("/api/ronyx/ai-team");
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error || "Load failed");
      setAssistants(d.assistants || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load AI team.", false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssistants(); }, []);

  /* ── Search / filter ── */
  const visible = useMemo(() => {
    return assistants.filter(a => {
      const cat  = filter === "All" || a.filter_category === filter;
      const term = search.toLowerCase();
      const hit  = !term
        || a.display_name.toLowerCase().includes(term)
        || a.default_name.toLowerCase().includes(term)
        || a.role_title.toLowerCase().includes(term)
        || a.filter_category.toLowerCase().includes(term);
      return cat && hit;
    });
  }, [assistants, search, filter]);

  /* ── Open customize modal ── */
  function openModal(a: AssistantRow) {
    setModal({
      key:          a.assistant_key,
      custom_name:  a.custom_name || "",
      avatar_style: a.avatar_style,
      greeting:     a.greeting || "",
      tone:         a.tone,
      is_enabled:   a.is_enabled,
      saving:       false,
      error:        "",
      default_name: a.default_name,
      role_title:   a.role_title,
      example_prompt: a.example_prompt,
    });
  }

  /* ── Save customize ── */
  async function saveModal() {
    if (!modal) return;
    setModal(m => m ? { ...m, saving: true, error: "" } : m);

    try {
      const res = await fetch(`/api/ronyx/ai-team/${modal.key}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          custom_name:  modal.custom_name.trim() || null,
          avatar_style: modal.avatar_style,
          greeting:     modal.greeting.trim() || null,
          tone:         modal.tone,
          is_enabled:   modal.is_enabled,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Save failed");

      setModal(null);
      showToast(`${modal.custom_name.trim() || modal.default_name} updated.`);
      await loadAssistants();
    } catch (err: any) {
      setModal(m => m ? { ...m, saving: false, error: err.message || "Save failed." } : m);
    }
  }

  /* ── Reset ── */
  async function confirmReset() {
    if (!resetKey) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/ronyx/ai-team/${resetKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Reset failed");
      setResetKey(null);
      const a = assistants.find(x => x.assistant_key === resetKey);
      showToast(`${a?.default_name || resetKey} reset to default.`);
      await loadAssistants();
    } catch (err: any) {
      showToast(err.message || "Reset failed.", false);
    } finally {
      setResetting(false);
    }
  }

  const resetTarget = assistants.find(a => a.assistant_key === resetKey);

  /* ── Counts for filter bar ── */
  const catCounts = useMemo(() => {
    const counts: Record<string, number> = { All: assistants.length };
    for (const a of assistants) {
      counts[a.filter_category] = (counts[a.filter_category] || 0) + 1;
    }
    return counts;
  }, [assistants]);

  if (loading) {
    return (
      <div style={{
        padding: 60, textAlign: "center", color: LIGHT,
        fontFamily: FONT, fontSize: 14,
      }}>
        Loading AI team…
      </div>
    );
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT, maxWidth: 1340, margin: "0 auto", background: BGPAGE, minHeight: "100vh" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Link href="/ronyx/settings" style={{ fontSize: 12, color: BLUE, fontWeight: 600, textDecoration: "none" }}>
          ← Admin Control Center
        </Link>
        <span style={{ color: "#cbd5e1" }}>/</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: DARK }}>Build Your AI Team</span>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: "1.55rem", fontWeight: 900, color: DARK, letterSpacing: "-0.6px", marginBottom: 4 }}>
          Build Your AI Team
        </div>
        <div style={{ fontSize: 13.5, color: LIGHT, maxWidth: 600 }}>
          Name your assistants. Keep the intelligence.
        </div>
      </div>

      {/* Info banner */}
      <div style={{
        border: "1px solid #bfdbfe", borderRadius: 14,
        background: "linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)",
        padding: "16px 22px", marginBottom: 22,
        display: "flex", alignItems: "flex-start", gap: 14,
      }}>
        <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>🤖</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1e3a8a", marginBottom: 3 }}>
            Customize identity without changing intelligence
          </div>
          <div style={{ fontSize: 12.5, color: "#1e40af", lineHeight: 1.6, maxWidth: 780 }}>
            Each assistant has a locked role, capability set, and safety rules managed by MoveAround.
            You can change the name your staff sees, the greeting, tone, and avatar style.
            Renaming an assistant to "Big Mike" still runs all of Rory's dispatch logic — the name is a label, not a permission.
            Hidden assistants disappear from the staff workspace but continue running background automation if the system requires it.
          </div>
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, role, or category…"
          style={{
            flex: "1 1 220px", minWidth: 180, padding: "9px 14px",
            border: `1px solid ${BORD}`, borderRadius: 9, fontSize: 13,
            outline: "none", fontFamily: FONT, background: WHITE,
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTER_CATEGORIES.map(cat => {
            const active = filter === cat;
            const count  = catCounts[cat] || 0;
            return (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: "7px 13px", borderRadius: 8, cursor: "pointer",
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  border: active ? `1.5px solid ${CAT_COLORS[cat] || BLUE}` : `1px solid ${BORD}`,
                  background: active ? (cat === "All" ? "#eff6ff" : `${CAT_COLORS[cat]}11`) : WHITE,
                  color: active ? (CAT_COLORS[cat] || BLUE) : MED,
                  fontFamily: FONT,
                }}
              >
                {cat} {count > 0 && <span style={{ opacity: 0.65, fontSize: 10.5 }}>({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cards grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
        gap: 16, marginBottom: 40,
      }}>
        {visible.map(a => {
          const { color, bg } = getAvatarMeta(a.avatar_style);
          const hasCustom     = Boolean(a.custom_name);
          const catColor      = CAT_COLORS[a.filter_category] || "#64748b";

          return (
            <div
              key={a.assistant_key}
              style={{
                background: WHITE, borderRadius: 14,
                border: `1px solid ${BORD}`,
                padding: "18px 18px 16px",
                display: "flex", flexDirection: "column", gap: 0,
                opacity: a.is_enabled ? 1 : 0.7,
                position: "relative",
              }}
            >
              {/* Status chip */}
              <div style={{ position: "absolute", top: 14, right: 14 }}>
                {a.is_enabled
                  ? <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "2px 8px" }}>Enabled</span>
                  : <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 6, padding: "2px 8px" }}>Hidden</span>
                }
              </div>

              {/* Avatar + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, paddingRight: 70 }}>
                <AvatarCircle name={a.display_name} style={a.avatar_style} />
                <div>
                  <div style={{ fontWeight: 900, fontSize: 15, color: DARK, lineHeight: 1.1 }}>
                    {a.display_name}
                  </div>
                  {hasCustom && (
                    <div style={{ fontSize: 10, color: LIGHT, marginTop: 1 }}>
                      Default: {a.default_name}
                    </div>
                  )}
                </div>
              </div>

              {/* Role + category */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <span style={{
                  fontSize: 10.5, fontWeight: 700, color: catColor,
                  background: `${catColor}12`, border: `1px solid ${catColor}30`,
                  borderRadius: 5, padding: "1px 7px",
                }}>
                  {a.filter_category}
                </span>
                <span style={{ fontSize: 11, color: MED, fontWeight: 600 }}>{a.role_title}</span>
              </div>

              {/* Description */}
              <div style={{ fontSize: 12, color: LIGHT, lineHeight: 1.6, marginBottom: 12, flex: 1 }}>
                {a.description}
              </div>

              {/* Example prompt */}
              <div style={{
                background: bg, border: `1px solid ${color}22`, borderRadius: 8,
                padding: "8px 11px", marginBottom: 14, fontSize: 11.5, color: color,
                fontStyle: "italic", lineHeight: 1.5,
              }}>
                "{a.example_prompt}"
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                <button
                  onClick={() => openModal(a)}
                  style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                    background: BLUE, color: WHITE, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: FONT,
                  }}
                >
                  Customize
                </button>
                {hasCustom && (
                  <button
                    onClick={() => setResetKey(a.assistant_key)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, border: `1px solid ${BORD}`,
                      background: WHITE, color: MED, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: FONT,
                    }}
                    title="Reset to MoveAround default"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {visible.length === 0 && (
          <div style={{
            gridColumn: "1/-1", textAlign: "center",
            padding: "40px 20px", color: LIGHT, fontSize: 14,
          }}>
            No assistants match your search or filter.
          </div>
        )}
      </div>

      {/* Bottom "Your Team, Your Style" section */}
      <div style={{
        border: `1px solid ${BORD}`, borderRadius: 14, background: WHITE,
        padding: "24px 28px", marginBottom: 20,
      }}>
        <div style={{ fontWeight: 900, fontSize: 15, color: DARK, marginBottom: 6 }}>
          Your Team, Your Style
        </div>
        <div style={{ fontSize: 13, color: LIGHT, lineHeight: 1.7, maxWidth: 700 }}>
          Every company operates differently. Customize how your MoveAround AI team looks and speaks
          while MoveAround protects the workflows, permissions, and operational intelligence behind the scenes.
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12, marginTop: 18,
        }}>
          {[
            { icon: "🎨", title: "Custom Names", desc: "Call your dispatch assistant anything you want. The logic stays the same." },
            { icon: "🔒", title: "Protected Intelligence", desc: "Roles, permissions, and safety rules are locked and cannot be changed by staff." },
            { icon: "👁️", title: "Show or Hide", desc: "Keep assistants that aren't relevant yet out of the staff workspace." },
            { icon: "🔄", title: "Always Reversible", desc: "Reset any assistant to its MoveAround default at any time." },
          ].map(item => (
            <div key={item.title} style={{
              background: BGPAGE, borderRadius: 10,
              border: `1px solid ${BORD}`, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: DARK, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 11.5, color: LIGHT, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Customize modal */}
      {modal && (
        <CustomizeModal
          modal={modal}
          onClose={() => setModal(null)}
          onChange={patch => setModal(m => m ? { ...m, ...patch } : m)}
          onSave={saveModal}
        />
      )}

      {/* Reset confirm */}
      {resetKey && resetTarget && (
        <ResetConfirm
          name={resetTarget.display_name}
          onConfirm={confirmReset}
          onClose={() => setResetKey(null)}
          resetting={resetting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: toast.ok ? "#0f172a" : "#dc2626",
          color: WHITE, padding: "12px 20px",
          borderRadius: 12, fontWeight: 700, fontSize: 13,
          boxShadow: "0 4px 20px rgba(0,0,0,0.25)", fontFamily: FONT,
        }}>
          {toast.ok ? "✓" : "✗"} {toast.msg}
        </div>
      )}
    </div>
  );
}
