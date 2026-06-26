"use client";

import { useEffect, useMemo, useState } from "react";

// ── Document Vault — every owner-operator document organized into folders ──
// Folder tree: Company → doc-type category → files, with in-app preview.

type OODoc = { type: string; file_name?: string; file_url?: string; expires_on?: string };
type OO    = { id: string; company_name: string; documents?: OODoc[]; drivers?: { name: string }[] };

const CATEGORIES: { key: string; label: string; icon: string; match: (t: string) => boolean }[] = [
  { key: "insurance",  label: "Insurance & COIs",   icon: "🛡️", match: t => /insurance|coi|liability|cargo|workers/i.test(t) },
  { key: "contracts",  label: "Contracts & Tax",    icon: "📝", match: t => /contract|agreement|w-?9|tax|ein|voided|bank/i.test(t) },
  { key: "inspection", label: "Inspections & Reg.", icon: "🔧", match: t => /inspection|registration|cab.?card|permit|ifta/i.test(t) },
  { key: "driver",     label: "Driver Documents",   icon: "🧑‍✈️", match: t => /^\[|cdl|medical|med.?card|mvr|drug|background|psp|licen/i.test(t) },
  { key: "other",      label: "Other Documents",    icon: "📄", match: () => true },
];

function categoryOf(type: string) {
  return CATEGORIES.find(c => c.match(type)) || CATEGORIES[CATEGORIES.length - 1];
}

function daysUntil(d?: string): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function DocumentVaultPage() {
  const [oos, setOos]       = useState<OO[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openCo, setOpenCo] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    fetch("/api/ronyx/owner-operators")
      .then(r => r.json())
      .then(d => setOos(d.companies || d.owner_operators || []))
      .catch(() => setOos([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => oos.filter(o => !search || o.company_name.toLowerCase().includes(search.toLowerCase())),
    [oos, search]
  );

  const totalDocs = useMemo(
    () => oos.reduce((s, o) => s + (o.documents || []).filter(d => d.file_url).length, 0),
    [oos]
  );

  async function openDoc(fileUrl: string, name: string) {
    try {
      const res = await fetch(`/api/ronyx/view-doc?url=${encodeURIComponent(fileUrl)}`);
      const data = await res.json();
      setViewer({ url: data.signed_url || fileUrl, name });
    } catch {
      setViewer({ url: fileUrl, name });
    }
  }

  const toggle = (id: string) => setOpenCo(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div style={{ padding: "28px 32px", fontFamily: "'Inter','Segoe UI',sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.5px" }}>📁 Document Vault</div>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Every owner-operator document, organized by company and type. {totalDocs} stored file{totalDocs !== 1 ? "s" : ""} across {oos.length} companies.
        </div>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search company…"
        style={{ width: "100%", maxWidth: 360, padding: "9px 14px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: "0.85rem", marginBottom: 18, boxSizing: "border-box" }}
      />

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8" }}>Loading documents…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center", color: "#94a3b8", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14 }}>No companies match your search.</div>
      ) : (
        filtered.map(oo => {
          const docs = (oo.documents || []).filter(d => d.file_name || d.file_url);
          const stored = docs.filter(d => d.file_url).length;
          const isOpen = openCo.has(oo.id);
          return (
            <div key={oo.id} style={{ border: "1px solid #e2e8f0", borderRadius: 14, marginBottom: 10, overflow: "hidden", background: "#fff" }}>
              {/* Company folder header */}
              <div onClick={() => toggle(oo.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", background: isOpen ? "#f8fafc" : "#fff" }}>
                <span style={{ fontSize: 20 }}>{isOpen ? "📂" : "📁"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{oo.company_name}</div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{stored} file{stored !== 1 ? "s" : ""} · {docs.length} record{docs.length !== 1 ? "s" : ""}</div>
                </div>
                <span style={{ color: "#94a3b8", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
              </div>

              {/* Category subfolders */}
              {isOpen && (
                <div style={{ padding: "4px 18px 16px", borderTop: "1px solid #f1f5f9" }}>
                  {docs.length === 0 && <div style={{ fontSize: "0.8rem", color: "#94a3b8", padding: "10px 0" }}>No documents on file yet.</div>}
                  {CATEGORIES.map(cat => {
                    const inCat = docs.filter(d => categoryOf(d.type) === cat);
                    if (inCat.length === 0) return null;
                    return (
                      <div key={cat.key} style={{ marginTop: 12 }}>
                        <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                          {cat.icon} {cat.label} ({inCat.length})
                        </div>
                        {inCat.map((d, i) => {
                          const exp = daysUntil(d.expires_on);
                          const expColor = exp == null ? "#94a3b8" : exp < 0 ? "#dc2626" : exp <= 30 ? "#d97706" : "#16a34a";
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 9, background: "#f8fafc", border: "1px solid #f1f5f9", marginBottom: 6 }}>
                              <span style={{ fontSize: 15 }}>{d.file_url ? "📄" : "⚠️"}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.type}</div>
                                <div style={{ fontSize: "0.7rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file_name || "—"}</div>
                              </div>
                              {d.expires_on && <span style={{ fontSize: "0.7rem", fontWeight: 700, color: expColor }}>{exp != null && exp < 0 ? "Expired" : `${exp}d`}</span>}
                              {d.file_url ? (
                                <button onClick={() => openDoc(d.file_url!, d.file_name || d.type)} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: "0.72rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>👁 View</button>
                              ) : (
                                <span style={{ fontSize: "0.68rem", color: "#dc2626", fontWeight: 700, flexShrink: 0 }}>Not stored</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* In-app viewer */}
      {viewer && (
        <div onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 960, height: "90vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: "0.85rem", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{viewer.name}</span>
              <span style={{ padding: "3px 10px", background: "#ecfdf5", color: "#047857", borderRadius: 20, fontWeight: 700, fontSize: "0.68rem", border: "1px solid #a7f3d0" }}>🔒 Securely stored</span>
              <a href={viewer.url} download target="_blank" rel="noreferrer" style={{ padding: "5px 12px", background: "#f1f5f9", color: "#475569", borderRadius: 7, fontWeight: 700, fontSize: "0.72rem", textDecoration: "none", border: "1px solid #e2e8f0" }}>⬇ Download</a>
              <button onClick={() => setViewer(null)} style={{ padding: "5px 16px", background: "#16a34a", color: "#fff", borderRadius: 7, fontWeight: 800, fontSize: "0.72rem", border: "none", cursor: "pointer" }}>✓ Close</button>
            </div>
            <div style={{ flex: 1, background: "#475569" }}>
              {/\.(jpe?g|png|webp|gif)(\?|$)/i.test(viewer.url)
                ? <img src={viewer.url} alt={viewer.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <iframe src={viewer.url} title={viewer.name} style={{ width: "100%", height: "100%", border: "none" }} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
