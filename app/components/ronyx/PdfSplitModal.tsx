"use client";

// PdfSplitModal — split a multi-page PDF into separate documents and assign each
// to the right slot. Thumbnails are rendered with pdfjs-dist (loaded lazily so it
// never runs during SSR); the actual page-splitting is done with pdf-lib.
//
// Reused by owner-operator document uploads and Fast Scan ticket uploads.

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

export type DocOption = { value: string; label: string };
export type SplitPiece = { type: string; label: string; file: File };

// Cheap page-count check (pdf-lib) so callers only open the modal for real
// multi-page PDFs. Returns 1 on any error (treat as single document).
export async function pdfPageCount(file: File): Promise<number> {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 1;
  }
}

const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0d9488", "#db2777", "#2563eb", "#65a30d"];

type Piece = { id: string; type: string; pages: number[] };

let pieceSeq = 0;
const newId = () => `pc_${++pieceSeq}`;

export default function PdfSplitModal({
  file, docOptions, defaultType, title = "Split & Assign", onCancel, onComplete,
}: {
  file: File;
  docOptions: DocOption[];
  defaultType?: string;
  title?: string;
  onCancel: () => void;
  onComplete: (pieces: SplitPiece[]) => void | Promise<void>;
}) {
  const [numPages, setNumPages] = useState(0);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loadingThumbs, setLoadingThumbs] = useState(true);
  const [renderFailed, setRenderFailed] = useState(false);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false);
  const bufRef = useRef<ArrayBuffer | null>(null);

  const firstType = defaultType || docOptions[0]?.value || "";

  // Load page count + render thumbnails (pdfjs lazily imported).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const buf = await file.arrayBuffer();
      bufRef.current = buf;
      // page count first (cheap, reliable)
      let count = 0;
      try {
        const d = await PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
        count = d.getPageCount();
      } catch { /* fall through */ }
      if (!cancelled && count) setNumPages(count);

      // thumbnails
      try {
        const pdfjs: any = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
        if (cancelled) return;
        if (!count) setNumPages(pdf.numPages);
        const out: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const vp = page.getViewport({ scale: Math.min(1.5, 150 / base.width) });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) break;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          out.push(canvas.toDataURL("image/jpeg", 0.7));
          setThumbs([...out]);
        }
      } catch {
        if (!cancelled) setRenderFailed(true); // numbered boxes fallback — still selectable
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // Seed one empty piece once we know the page count.
  useEffect(() => {
    if (numPages > 0 && pieces.length === 0) {
      const id = newId();
      setPieces([{ id, type: firstType, pages: [] }]);
      setActiveId(id);
    }
  }, [numPages]); // eslint-disable-line react-hooks/exhaustive-deps

  const pieceColor = (id: string) => COLORS[pieces.findIndex(p => p.id === id) % COLORS.length];
  const pieceOfPage = (pg: number) => pieces.find(p => p.pages.includes(pg));

  function addPiece() {
    const id = newId();
    setPieces(ps => [...ps, { id, type: docOptions[0]?.value || firstType, pages: [] }]);
    setActiveId(id);
  }
  function removePiece(id: string) {
    setPieces(ps => {
      const next = ps.filter(p => p.id !== id);
      if (activeId === id) setActiveId(next[0]?.id || "");
      return next;
    });
  }
  function setPieceType(id: string, type: string) {
    setPieces(ps => ps.map(p => p.id === id ? { ...p, type } : p));
  }
  function togglePage(pg: number) {
    if (!activeId) return;
    setPieces(ps => ps.map(p => {
      if (p.id === activeId) {
        const has = p.pages.includes(pg);
        return { ...p, pages: has ? p.pages.filter(n => n !== pg) : [...p.pages, pg].sort((a, b) => a - b) };
      }
      return { ...p, pages: p.pages.filter(n => n !== pg) }; // a page belongs to exactly one piece
    }));
  }
  function splitEachPage() {
    const ps: Piece[] = [];
    for (let i = 1; i <= numPages; i++) ps.push({ id: newId(), type: firstType, pages: [i] });
    setPieces(ps);
    setActiveId(ps[0]?.id || "");
  }

  const assignedCount = pieces.filter(p => p.pages.length > 0).length;
  const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
  const unassigned = allPages.filter(pg => !pieceOfPage(pg));

  async function apply() {
    const assigned = pieces.filter(p => p.pages.length > 0);
    if (!assigned.length || !bufRef.current) return;
    setBusy(true);
    try {
      const src = await PDFDocument.load(bufRef.current.slice(0), { ignoreEncryption: true });
      const base = file.name.replace(/\.pdf$/i, "");
      const out: SplitPiece[] = [];
      for (let i = 0; i < assigned.length; i++) {
        const piece = assigned[i];
        const sub = await PDFDocument.create();
        const copied = await sub.copyPages(src, piece.pages.map(n => n - 1));
        copied.forEach(pg => sub.addPage(pg));
        const bytes = await sub.save();
        const label = docOptions.find(o => o.value === piece.type)?.label || piece.type || `Document ${i + 1}`;
        const fname = `${base} - ${label}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
        out.push({ type: piece.type, label, file: new File([bytes as BlobPart], fname, { type: "application/pdf" }) });
      }
      await onComplete(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 9400, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 900, maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>✂ {title}</div>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>
              {numPages ? `${numPages}-page PDF` : "Reading PDF…"} · click a page, then assign it to a document below
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={splitEachPage} disabled={!numPages} style={ghost}>Split every page</button>
            <button onClick={() => onComplete([{ type: firstType, label: docOptions.find(o => o.value === firstType)?.label || firstType, file }])} style={ghost}>Keep as one file</button>
          </div>
        </div>

        {/* body: pages (left) + pieces (right) */}
        <div style={{ display: "flex", gap: 0, flex: 1, minHeight: 0 }}>
          {/* page thumbnails */}
          <div style={{ flex: "1 1 60%", overflowY: "auto", padding: 16, background: "#f8fafc" }}>
            {numPages === 0 ? (
              <div style={{ color: "#64748b", fontSize: "0.85rem" }}>Loading pages…</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))", gap: 10 }}>
                {allPages.map(pg => {
                  const owner = pieceOfPage(pg);
                  const color = owner ? pieceColor(owner.id) : "#cbd5e1";
                  const thumb = thumbs[pg - 1];
                  return (
                    <button key={pg} onClick={() => togglePage(pg)} title={`Page ${pg}`}
                      style={{ position: "relative", padding: 0, border: `3px solid ${color}`, borderRadius: 8, background: "#fff", cursor: "pointer", overflow: "hidden", aspectRatio: "0.77", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {thumb ? (
                        <img src={thumb} alt={`Page ${pg}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 700 }}>{renderFailed ? `Page ${pg}` : "…"}</span>
                      )}
                      <span style={{ position: "absolute", top: 3, left: 3, background: "rgba(15,23,42,0.78)", color: "#fff", fontSize: "0.6rem", fontWeight: 800, padding: "1px 5px", borderRadius: 5 }}>{pg}</span>
                      {owner && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: color, color: "#fff", fontSize: "0.58rem", fontWeight: 800, padding: "2px 4px", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{docOptions.find(o => o.value === owner.type)?.label || owner.type}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {loadingThumbs && numPages > 0 && <div style={{ marginTop: 10, fontSize: "0.72rem", color: "#94a3b8" }}>Rendering page previews…</div>}
          </div>

          {/* pieces */}
          <div style={{ flex: "1 1 40%", borderLeft: "1px solid #e2e8f0", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Documents to create</div>
            {pieces.map(p => {
              const active = p.id === activeId;
              return (
                <div key={p.id} onClick={() => setActiveId(p.id)}
                  style={{ border: `2px solid ${active ? pieceColor(p.id) : "#e2e8f0"}`, borderRadius: 10, padding: "10px 11px", cursor: "pointer", background: active ? "#fff" : "#f8fafc" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: pieceColor(p.id), flexShrink: 0 }} />
                    <select value={p.type} onClick={e => e.stopPropagation()} onChange={e => setPieceType(p.id, e.target.value)}
                      style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: "1px solid #e2e8f0", fontSize: "0.8rem", fontWeight: 600, background: "#fff" }}>
                      {docOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {pieces.length > 1 && <button onClick={e => { e.stopPropagation(); removePiece(p.id); }} title="Remove" style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "1rem", lineHeight: 1 }}>×</button>}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: p.pages.length ? "#334155" : "#94a3b8" }}>
                    {p.pages.length ? `Pages: ${p.pages.join(", ")}` : (active ? "Click pages on the left to add them here" : "No pages yet")}
                  </div>
                </div>
              );
            })}
            <button onClick={addPiece} style={{ ...ghost, alignSelf: "flex-start" }}>+ Add document</button>
            {unassigned.length > 0 && <div style={{ fontSize: "0.72rem", color: "#b45309", marginTop: 2 }}>⚠ {unassigned.length} page{unassigned.length > 1 ? "s" : ""} not assigned ({unassigned.join(", ")}) — they won't be saved.</div>}
          </div>
        </div>

        {/* footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{assignedCount} document{assignedCount === 1 ? "" : "s"} ready</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={onCancel} disabled={busy} style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            <button onClick={apply} disabled={busy || assignedCount === 0} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: busy || assignedCount === 0 ? "#cbd5e1" : "#1e40af", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: busy || assignedCount === 0 ? "default" : "pointer" }}>
              {busy ? "Splitting…" : `Split & file ${assignedCount} document${assignedCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ghost: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#1e40af", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer", whiteSpace: "nowrap" };
