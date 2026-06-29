"use client";

// PdfSplitModal — view a multi-page PDF as LARGE page thumbnails and assign each page
// directly to a destination (W-9, COI, Contract, …) with a dropdown right on the page.
// Click a page to zoom it full-screen. Splitting is done with pdf-lib; thumbnails with
// pdfjs-dist (loaded lazily from a CDN so it never touches the build graph).
//
// Reused by owner-operator document uploads and Fast Scan ticket uploads.

import { useEffect, useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";

export type DocOption = { value: string; label: string };
export type SplitPiece = { type: string; label: string; file: File };

// Cheap page-count check (pdf-lib). Returns 1 on any error (treat as single document).
export async function pdfPageCount(file: File): Promise<number> {
  try {
    const buf = await file.arrayBuffer();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
    return doc.getPageCount();
  } catch {
    return 1;
  }
}

// Load pdf.js from a CDN at runtime so it stays OUT of the build graph.
let pdfjsPromise: Promise<any> | null = null;
function loadPdfjs(): Promise<any> {
  if (!pdfjsPromise) {
    // @ts-ignore — runtime CDN ESM import, intentionally external (not resolved/bundled)
    pdfjsPromise = import(/* webpackIgnore: true */ /* turbopackIgnore: true */ "https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.min.mjs")
      .then((mod: any) => {
        const pdfjs = mod.default ?? mod;
        pdfjs.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs";
        return pdfjs;
      });
  }
  return pdfjsPromise;
}

const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#0d9488", "#db2777", "#2563eb", "#65a30d"];
const SKIP = "__skip";

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
  const [pageType, setPageType] = useState<Record<number, string>>({}); // page → docType value ("" = unassigned, SKIP = ignore)
  const [zoom, setZoom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const bufRef = useRef<ArrayBuffer | null>(null);

  // Color per destination type (stable by its position in docOptions).
  const colorFor = (type: string) => COLORS[Math.max(0, docOptions.findIndex(o => o.value === type)) % COLORS.length];
  const labelFor = (type: string) => docOptions.find(o => o.value === type)?.label || type;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const buf = await file.arrayBuffer();
      bufRef.current = buf;
      let count = 0;
      try { const d = await PDFDocument.load(buf.slice(0), { ignoreEncryption: true }); count = d.getPageCount(); } catch {}
      if (!cancelled && count) setNumPages(count);
      try {
        const pdfjs: any = await loadPdfjs();
        const pdf = await pdfjs.getDocument({ data: buf.slice(0) }).promise;
        if (cancelled) return;
        if (!count) setNumPages(pdf.numPages);
        const out: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          // Bigger render so the page is actually readable as a thumbnail.
          const vp = page.getViewport({ scale: Math.min(2.2, 420 / base.width) });
          const canvas = document.createElement("canvas");
          canvas.width = vp.width; canvas.height = vp.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) break;
          await page.render({ canvasContext: ctx, viewport: vp }).promise;
          out.push(canvas.toDataURL("image/jpeg", 0.82));
          setThumbs([...out]);
        }
      } catch {
        if (!cancelled) setRenderFailed(true);
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const allPages = Array.from({ length: numPages }, (_, i) => i + 1);
  const assignedTypes = Array.from(new Set(allPages.map(p => pageType[p]).filter(t => t && t !== SKIP)));
  const assignedPageCount = allPages.filter(p => pageType[p] && pageType[p] !== SKIP).length;
  const firstType = defaultType || docOptions[0]?.value || "";

  function setAll(type: string) { const next: Record<number, string> = {}; for (const p of allPages) next[p] = type; setPageType(next); }

  async function apply() {
    if (!bufRef.current || !assignedTypes.length) return;
    setBusy(true);
    try {
      const src = await PDFDocument.load(bufRef.current.slice(0), { ignoreEncryption: true });
      const base = file.name.replace(/\.pdf$/i, "");
      const out: SplitPiece[] = [];
      // One document per destination type (its pages kept together, in order).
      for (const type of assignedTypes) {
        const pages = allPages.filter(p => pageType[p] === type);
        const sub = await PDFDocument.create();
        const copied = await sub.copyPages(src, pages.map(n => n - 1));
        copied.forEach(pg => sub.addPage(pg));
        const bytes = await sub.save();
        const label = labelFor(type);
        const fname = `${base} - ${label}.pdf`.replace(/[\\/:*?"<>|]/g, "-");
        out.push({ type, label, file: new File([bytes as BlobPart], fname, { type: "application/pdf" }) });
      }
      await onComplete(out);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 9400, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 1040, maxHeight: "94vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* header */}
        <div style={{ padding: "16px 22px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>✂ {title}</div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>
              {numPages ? `${numPages}-page PDF` : "Reading PDF…"} · click a page to enlarge · pick where each page goes with the menu under it
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setAll(firstType)} disabled={!numPages} style={ghost}>Assign all → {labelFor(firstType)}</button>
            <button onClick={() => setPageType({})} disabled={!numPages} style={ghost}>Clear</button>
            <button onClick={() => onComplete([{ type: firstType, label: labelFor(firstType), file }])} style={ghost}>Keep as one file</button>
          </div>
        </div>

        {/* big thumbnails, each with its own destination dropdown */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 18, background: "#f8fafc" }}>
          {numPages === 0 ? (
            <div style={{ color: "#64748b", fontSize: "0.9rem", padding: 20 }}>Loading pages…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 18 }}>
              {allPages.map(pg => {
                const t = pageType[pg] || "";
                const skipped = t === SKIP;
                const color = t && !skipped ? colorFor(t) : "#cbd5e1";
                const thumb = thumbs[pg - 1];
                return (
                  <div key={pg} style={{ border: `3px solid ${color}`, borderRadius: 12, overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", opacity: skipped ? 0.55 : 1 }}>
                    <div onClick={() => thumb && setZoom(pg)} title="Click to enlarge"
                      style={{ position: "relative", aspectRatio: "0.77", background: "#f1f5f9", cursor: thumb ? "zoom-in" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {thumb ? (
                        <img src={thumb} alt={`Page ${pg}`} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.9rem", fontWeight: 700 }}>{renderFailed ? `Page ${pg}` : "…"}</span>
                      )}
                      <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(15,23,42,0.8)", color: "#fff", fontSize: "0.7rem", fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>Page {pg}</span>
                      {t && !skipped && <span style={{ position: "absolute", top: 6, right: 6, background: color, color: "#fff", fontSize: "0.66rem", fontWeight: 800, padding: "2px 8px", borderRadius: 6 }}>✓ {labelFor(t)}</span>}
                    </div>
                    <div style={{ padding: 8 }}>
                      <select value={t} onChange={e => setPageType(p => ({ ...p, [pg]: e.target.value }))}
                        style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: `1px solid ${t && !skipped ? color : "#e2e8f0"}`, fontSize: "0.82rem", fontWeight: 700, background: "#fff", color: t && !skipped ? "#0f172a" : "#64748b", cursor: "pointer" }}>
                        <option value="">— Assign this page to… —</option>
                        {docOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        <option value={SKIP}>Skip — don&apos;t file this page</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {loadingThumbs && numPages > 0 && <div style={{ marginTop: 12, fontSize: "0.78rem", color: "#94a3b8" }}>Rendering page previews…</div>}
        </div>

        {/* footer */}
        <div style={{ padding: "14px 22px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
            {assignedPageCount} page{assignedPageCount === 1 ? "" : "s"} assigned → {assignedTypes.length} document{assignedTypes.length === 1 ? "" : "s"}
            {assignedTypes.length > 0 && <span style={{ color: "#94a3b8" }}> ({assignedTypes.map(labelFor).join(", ")})</span>}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button onClick={onCancel} disabled={busy} style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer" }}>Cancel</button>
            <button onClick={apply} disabled={busy || assignedTypes.length === 0} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: busy || assignedTypes.length === 0 ? "#cbd5e1" : "#1e40af", color: "#fff", fontWeight: 800, fontSize: "0.85rem", cursor: busy || assignedTypes.length === 0 ? "default" : "pointer" }}>
              {busy ? "Filing…" : `File ${assignedTypes.length} document${assignedTypes.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>

      {/* full-screen page zoom */}
      {zoom !== null && thumbs[zoom - 1] && (
        <div onClick={(e) => { e.stopPropagation(); setZoom(null); }} style={{ position: "fixed", inset: 0, zIndex: 9500, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          <img src={thumbs[zoom - 1]} alt={`Page ${zoom}`} style={{ maxWidth: "95%", maxHeight: "95%", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }} />
          <div style={{ position: "absolute", top: 16, left: 0, right: 0, textAlign: "center", color: "#fff", fontWeight: 800, fontSize: "0.9rem" }}>Page {zoom} · click anywhere to close</div>
        </div>
      )}
    </div>
  );
}

const ghost: React.CSSProperties = { padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#1e40af", fontWeight: 700, fontSize: "0.76rem", cursor: "pointer", whiteSpace: "nowrap" };
