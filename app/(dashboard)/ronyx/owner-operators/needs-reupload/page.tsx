"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  oo_id: string;
  company_name: string;
  doc_type: string;
  file_name: string;
};

type RowState = "idle" | "uploading" | "done" | "error";

export default function NeedsReuploadPage() {
  const [items, setItems]   = useState<Item[]>([]);
  const [loading, setLoad]  = useState(true);
  const [rowState, setRow]  = useState<Record<string, RowState>>({});
  const [rowMsg, setMsg]    = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoad(true);
    try {
      const r = await fetch("/api/ronyx/owner-operators/docs-needing-upload");
      const d = await r.json();
      setItems(d.items || []);
    } catch {
      setItems([]);
    }
    setLoad(false);
  }
  useEffect(() => { load(); }, []);

  async function uploadFor(item: Item, file: File) {
    setRow((s) => ({ ...s, [item.id]: "uploading" }));
    setMsg((s) => ({ ...s, [item.id]: "Uploading & storing…" }));
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("module", "compliance");
      fd.append("oo_id", item.oo_id);
      const upRes  = await fetch("/api/ronyx/upload-file", { method: "POST", body: fd });
      const upData = await upRes.json();
      if (!upData.ok || !upData.url) throw new Error(upData.error || "Storage upload failed");

      const recRes = await fetch(`/api/ronyx/owner-operators/${item.oo_id}/documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_type: item.doc_type, file_url: upData.url, file_name: file.name }),
      });
      const recData = await recRes.json();
      if (recData.error) throw new Error(recData.error);

      setRow((s) => ({ ...s, [item.id]: "done" }));
      setMsg((s) => ({ ...s, [item.id]: `✓ Uploaded & linked (${file.name})` }));
    } catch (e: any) {
      setRow((s) => ({ ...s, [item.id]: "error" }));
      setMsg((s) => ({ ...s, [item.id]: `Error: ${e.message || "upload failed"}` }));
    }
  }

  // Group by company
  const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.company_name] = acc[it.company_name] || []).push(it);
    return acc;
  }, {});
  const remaining = items.filter((i) => rowState[i.id] !== "done").length;

  return (
    <div style={{ maxWidth: 900, fontFamily: "Inter, sans-serif" }}>
      <Link href="/ronyx/owner-operators" style={{ color: "#64748b", fontSize: "0.83rem", textDecoration: "none" }}>← Owner Operators</Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "12px 0 6px", flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>⚠ Documents Needing Re-Upload</h1>
        <button onClick={load} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: "0.8rem", fontWeight: 700, color: "#475569", cursor: "pointer" }}>↻ Refresh</button>
      </div>
      <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: "0.88rem", lineHeight: 1.5 }}>
        These documents have a filename on record but their actual file was never stored (an old upload bug).
        Click <strong>Upload</strong> on each to re-add the file — it will now store and link correctly, so preview / email / print work.
      </p>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, color: "#15803d", fontWeight: 700 }}>
          ✅ All documents have stored files — nothing to re-upload.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontSize: "0.85rem", color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 14px", fontWeight: 700, display: "inline-block" }}>
            {remaining} document{remaining !== 1 ? "s" : ""} across {Object.keys(groups).length} compan{Object.keys(groups).length !== 1 ? "ies" : "y"} need re-upload
          </div>

          {Object.entries(groups).map(([company, docs]) => (
            <div key={company} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, marginBottom: 14, overflow: "hidden" }}>
              <div style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", padding: "10px 16px", fontWeight: 800, color: "#0f172a", fontSize: "0.92rem" }}>
                🏢 {company}
              </div>
              {docs.map((item) => {
                const st = rowState[item.id] || "idle";
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", opacity: st === "done" ? 0.6 : 1 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.86rem" }}>{item.doc_type}</div>
                      <div style={{ color: "#94a3b8", fontSize: "0.74rem", marginTop: 2 }}>was: {item.file_name}</div>
                      {rowMsg[item.id] && (
                        <div style={{ fontSize: "0.74rem", marginTop: 4, fontWeight: 700, color: st === "error" ? "#dc2626" : st === "done" ? "#15803d" : "#1e40af" }}>{rowMsg[item.id]}</div>
                      )}
                    </div>
                    {st === "done" ? (
                      <span style={{ background: "#f0fdf4", color: "#15803d", padding: "6px 14px", borderRadius: 8, fontSize: "0.8rem", fontWeight: 800, border: "1px solid #bbf7d0" }}>✓ Done</span>
                    ) : (
                      <>
                        <input
                          ref={(el) => { fileRefs.current[item.id] = el; }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.tiff"
                          style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFor(item, f); e.target.value = ""; }}
                        />
                        <button
                          disabled={st === "uploading"}
                          onClick={() => fileRefs.current[item.id]?.click()}
                          style={{ background: st === "uploading" ? "#94a3b8" : "linear-gradient(135deg,#1e40af,#4f46e5)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: "0.82rem", fontWeight: 700, cursor: st === "uploading" ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}
                        >
                          {st === "uploading" ? "Uploading…" : st === "error" ? "↻ Retry" : "📤 Upload"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
