"use client";

import React, { useCallback, useRef, useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedField {
  key:        string;
  label:      string;
  value:      string | null;
  confidence: number;
  source:     string;
  category:   "identity" | "insurance" | "driver" | "compliance" | "financial";
  sensitive:  boolean;
  // local UI state
  approvedValue?:    string;
  userApproved?:     boolean;   // explicit approve click
  userRejected?:     boolean;
  editMode?:         boolean;
  sensitiveApproved?:boolean;
}

interface ExtractionResult {
  ok:           boolean;
  extraction_id: string | null;
  upload_id:     string | null;
  doc_type:      string;
  file_name:     string;
  fields:        ExtractedField[];
  high_confidence_fields: ExtractedField[];
  low_confidence_fields:  ExtractedField[];
  total_found:   number;
  extraction_error?: string | null;
}

interface ApproveResult {
  ok:      boolean;
  summary: string;
  results: { action: string; ok: boolean; detail?: string }[];
}

export interface IntelVerifyPanelProps {
  ooId?:     string;
  ooName?:   string;
  compact?:  boolean;         // drawer / embedded mode
  onClose?:  () => void;
  onDone?:   (result: ApproveResult) => void;
}

// ─── Category colors ──────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  identity:   { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  insurance:  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  driver:     { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  compliance: { bg: "#fefce8", text: "#a16207", border: "#fde047" },
  financial:  { bg: "#faf5ff", text: "#7c3aed", border: "#ddd6fe" },
};

const DOC_TYPE_LABEL: Record<string, string> = {
  coi: "Certificate of Insurance", cdl: "Driver License (CDL)",
  mvr: "Motor Vehicle Record", medical_card: "Medical Card",
  w9: "W-9 / Tax Form", contract: "Contract / Agreement",
  payroll: "Payroll / Settlement", driver_roster: "Driver Roster",
  general: "General Document",
};

const CAT_LABEL: Record<string, string> = {
  identity: "Identity / Registration", insurance: "Insurance",
  driver: "Driver Compliance", compliance: "Compliance / Dates",
  financial: "Financial",
};

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfBadge({ v }: { v: number }) {
  const col = v >= 90 ? "#16a34a" : v >= 75 ? "#d97706" : "#dc2626";
  const bg  = v >= 90 ? "#f0fdf4" : v >= 75 ? "#fffbeb" : "#fef2f2";
  return (
    <span style={{ fontSize: 10, fontWeight: 800, color: col, background: bg, padding: "2px 6px", borderRadius: 5 }}>
      {v}%
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function IntelVerifyPanel({ ooId, ooName, compact = false, onClose, onDone }: IntelVerifyPanelProps) {
  type Phase = "idle" | "extracting" | "review" | "approving" | "done";

  const [phase,      setPhase]      = useState<Phase>("idle");
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [fields,     setFields]     = useState<ExtractedField[]>([]);
  const [approveRes, setApproveRes] = useState<ApproveResult | null>(null);
  const [dragging,   setDragging]   = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [staffName,  setStaffName]  = useState("Staff");
  const fileRef = useRef<HTMLInputElement>(null);

  const t   = (px: number) => px;
  const lbl: React.CSSProperties = { fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 };
  const inp: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const handleFile = useCallback(async (file: File) => {
    setPhase("extracting");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (ooId) fd.append("oo_id", ooId);
      const res = await fetch("/api/ronyx/intel-verify/extract", { method: "POST", body: fd });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ExtractionResult = await res.json();
      if (!data.ok && !data.fields?.length) throw new Error(data.extraction_error ?? "Extraction failed");
      setExtraction(data);
      // Initialise field state
      setFields((data.fields ?? []).map(f => ({ ...f, approvedValue: f.value ?? "", userApproved: false, userRejected: false, editMode: false, sensitiveApproved: false })));
      setPhase("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
      setPhase("idle");
    }
  }, [ooId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  function setField(key: string, update: Partial<ExtractedField>) {
    setFields(prev => prev.map(f => f.key === key ? { ...f, ...update } : f));
  }

  function approveAllHigh() {
    setFields(prev => prev.map(f =>
      (f.confidence ?? 0) >= 85 && f.value && !f.sensitive ? { ...f, userApproved: true } : f
    ));
  }

  async function submitApproval() {
    if (!extraction) return;
    setPhase("approving");
    try {
      const approvedFields = fields.filter(f => f.userApproved || (f.sensitiveApproved && f.sensitive));
      const rejectedFields = fields.filter(f => f.userRejected);
      const res = await fetch("/api/ronyx/intel-verify/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraction_id: extraction.extraction_id,
          oo_id:         ooId,
          file_name:     extraction.file_name,
          doc_type:      extraction.doc_type,
          approved_fields: approvedFields.map(f => ({ key: f.key, label: f.label, value: f.approvedValue ?? f.value, sensitive: f.sensitive, approved_value: f.approvedValue })),
          rejected_fields: rejectedFields.map(f => ({ key: f.key, label: f.label, value: f.value })),
          staff_name:    staffName,
          create_ccb_tasks: true,
        }),
      });
      const result: ApproveResult = await res.json();
      setApproveRes(result);
      setPhase("done");
      onDone?.(result);
    } catch {
      setError("Approval failed — check your connection.");
      setPhase("review");
    }
  }

  const approvedCount  = fields.filter(f => f.userApproved || f.sensitiveApproved).length;
  const rejectedCount  = fields.filter(f => f.userRejected).length;
  const highFields     = fields.filter(f => (f.confidence ?? 0) >= 85 && f.value && !f.sensitive);
  const lowFields      = fields.filter(f => (f.confidence ?? 0) < 85 && f.value);
  const sensitiveFields= fields.filter(f => f.sensitive && f.value);

  const gap = compact ? 12 : 20;
  const panelPad = compact ? 14 : 20;

  // ── Idle phase ────────────────────────────────────────────────────────────
  if (phase === "idle") return (
    <div style={{ display: "flex", flexDirection: "column", gap, padding: panelPad }}>
      {ooName && (
        <div style={{ background: "#eff6ff", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, color: "#1e40af" }}>
          Verifying documents for: <strong>{ooName}</strong>
        </div>
      )}
      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#dc2626", fontWeight: 600 }}>
          {error}
        </div>
      )}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => fileRef.current?.click()}
        style={{ border: `2px dashed ${dragging ? "#3b82f6" : "#cbd5e1"}`, borderRadius: 14, padding: compact ? "32px 20px" : "52px 32px", textAlign: "center", cursor: "pointer", background: dragging ? "#eff6ff" : "#fff", transition: "all 0.15s" }}
      >
        <div style={{ fontSize: compact ? 32 : 44, marginBottom: 10 }}>⬆</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 6 }}>
          Upload a document to verify
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: compact ? 10 : 16 }}>
          COI · CDL · MVR · Medical Card · W-9 · Contract · Excel · CSV
        </div>
        <button style={{ padding: "8px 20px", background: "#1e40af", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
          Browse Files
        </button>
      </div>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }} />
    </div>
  );

  // ── Extracting phase ──────────────────────────────────────────────────────
  if (phase === "extracting") return (
    <div style={{ padding: panelPad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 16 }}>
      <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#1e40af", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>Extracting fields…</div>
      <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
        Reading document, detecting fields, scoring confidence…
      </div>
    </div>
  );

  // ── Review phase ──────────────────────────────────────────────────────────
  if (phase === "review" && extraction) {
    const byCategory = fields.reduce<Record<string, ExtractedField[]>>((acc, f) => {
      if (!f.value) return acc;
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    }, {});

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: compact ? 10 : 16, padding: panelPad }}>
        {/* File identity */}
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: "12px 14px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", marginBottom: 3 }}>{extraction.file_name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{DOC_TYPE_LABEL[extraction.doc_type] ?? extraction.doc_type}</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#dcfce7", color: "#16a34a", padding: "2px 8px", borderRadius: 6 }}>{highFields.length} high-confidence</span>
              {lowFields.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#fef9c3", color: "#a16207", padding: "2px 8px", borderRadius: 6 }}>{lowFields.length} needs review</span>}
              {sensitiveFields.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#ede9fe", color: "#7c3aed", padding: "2px 8px", borderRadius: 6 }}>{sensitiveFields.length} sensitive</span>}
            </div>
          </div>
        </div>

        {extraction.extraction_error && (
          <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#c2410c" }}>
            ⚠ Partial extraction: {extraction.extraction_error}
          </div>
        )}

        {/* High confidence section */}
        {highFields.length > 0 && (
          <div style={{ border: "1px solid #bbf7d0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#f0fdf4", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                High Confidence — {highFields.length} field{highFields.length !== 1 ? "s" : ""}
              </span>
              <button onClick={approveAllHigh}
                style={{ padding: "4px 12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: 7, fontWeight: 700, fontSize: 11, cursor: "pointer" }}>
                Approve All →
              </button>
            </div>
            <div style={{ padding: "4px 0" }}>
              {highFields.map(f => (
                <div key={f.key} style={{ padding: "8px 14px", borderBottom: "1px solid #f0fdf4", display: "flex", alignItems: "center", gap: 8, background: f.userApproved ? "#f0fdf4" : "#fff" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{f.userApproved ? "✓" : "○"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{f.label}</div>
                    {f.editMode ? (
                      <input value={f.approvedValue ?? ""} onChange={e => setField(f.key, { approvedValue: e.target.value })}
                        style={{ ...inp, fontSize: 12, marginTop: 2 }} />
                    ) : (
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.approvedValue ?? f.value}</div>
                    )}
                    {f.source && <div style={{ fontSize: 10, color: "#94a3b8" }}>{f.source}</div>}
                  </div>
                  <ConfBadge v={f.confidence} />
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    {!f.userApproved && !f.userRejected && (
                      <>
                        <button onClick={() => setField(f.key, { userApproved: true, userRejected: false })}
                          style={{ padding: "3px 8px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#16a34a", cursor: "pointer" }}>✓</button>
                        <button onClick={() => setField(f.key, { editMode: !f.editMode })}
                          style={{ padding: "3px 8px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#64748b", cursor: "pointer" }}>Edit</button>
                        <button onClick={() => setField(f.key, { userRejected: true })}
                          style={{ padding: "3px 8px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>✕</button>
                      </>
                    )}
                    {f.userApproved && <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>Approved</span>}
                    {f.userRejected && (
                      <button onClick={() => setField(f.key, { userRejected: false })}
                        style={{ fontSize: 11, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>Undo</button>
                    )}
                    {f.editMode && f.userApproved !== true && (
                      <button onClick={() => setField(f.key, { userApproved: true, editMode: false })}
                        style={{ padding: "3px 8px", background: "#1e40af", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>Save</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low confidence / needs review */}
        {lowFields.length > 0 && (
          <div style={{ border: "1px solid #fde68a", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#fffbeb", padding: "10px 14px" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#a16207", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Needs Review — {lowFields.length} field{lowFields.length !== 1 ? "s" : ""}
              </span>
              <div style={{ fontSize: 11, color: "#92400e", marginTop: 2 }}>Verify each value before approving</div>
            </div>
            <div style={{ padding: "4px 0" }}>
              {lowFields.map(f => (
                <div key={f.key} style={{ padding: "10px 14px", borderBottom: "1px solid #fffbeb", background: f.userApproved ? "#fefce8" : "#fff" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>{f.label}</span>
                        <ConfBadge v={f.confidence} />
                        {f.source && <span style={{ fontSize: 10, color: "#94a3b8" }}>· {f.source}</span>}
                      </div>
                      <input value={f.approvedValue ?? f.value ?? ""}
                        onChange={e => setField(f.key, { approvedValue: e.target.value })}
                        style={{ ...inp, marginBottom: 6 }}
                        placeholder="Verify or correct value…" />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setField(f.key, { userApproved: true, userRejected: false })}
                          style={{ padding: "4px 12px", background: f.userApproved ? "#16a34a" : "#f0fdf4", border: "1px solid #86efac", borderRadius: 7, fontSize: 11, fontWeight: 700, color: f.userApproved ? "#fff" : "#16a34a", cursor: "pointer" }}>
                          {f.userApproved ? "✓ Approved" : "Approve Edited"}
                        </button>
                        <button onClick={() => setField(f.key, { userRejected: true, userApproved: false })}
                          style={{ padding: "4px 10px", background: f.userRejected ? "#fef2f2" : "#fff", border: "1px solid #fca5a5", borderRadius: 7, fontSize: 11, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sensitive fields */}
        {sensitiveFields.length > 0 && (
          <div style={{ border: "1px solid #ddd6fe", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ background: "#faf5ff", padding: "10px 14px" }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Sensitive Fields — Require Explicit Approval
              </span>
              <div style={{ fontSize: 11, color: "#6d28d9", marginTop: 2 }}>
                MC#, DOT#, policy numbers, expirations — each must be individually approved
              </div>
            </div>
            <div style={{ padding: "4px 0" }}>
              {sensitiveFields.map(f => (
                <div key={f.key} style={{ padding: "10px 14px", borderBottom: "1px solid #faf5ff", background: f.sensitiveApproved ? "#faf5ff" : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", marginBottom: 2 }}>{f.label}</div>
                      <input value={f.approvedValue ?? f.value ?? ""}
                        onChange={e => setField(f.key, { approvedValue: e.target.value })}
                        style={{ ...inp, marginBottom: 4 }} />
                      {f.source && <div style={{ fontSize: 10, color: "#94a3b8" }}>Source: {f.source}</div>}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                      <ConfBadge v={f.confidence} />
                      {!f.sensitiveApproved ? (
                        <>
                          <button onClick={() => setField(f.key, { sensitiveApproved: true, userRejected: false })}
                            style={{ padding: "4px 10px", background: "#7c3aed", border: "none", borderRadius: 7, fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
                            Approve
                          </button>
                          <button onClick={() => setField(f.key, { userRejected: true })}
                            style={{ padding: "4px 10px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 7, fontSize: 11, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>
                            Reject
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>✓ Approved</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Staff name + action bar */}
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <label style={{ ...lbl, marginBottom: 0 }}>Approving as:</label>
            <input value={staffName} onChange={e => setStaffName(e.target.value)}
              style={{ ...inp, width: 180 }} placeholder="Your name" />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#64748b", flex: 1 }}>
              {approvedCount} approved · {rejectedCount} rejected · {fields.filter(f => f.value && !f.userApproved && !f.sensitiveApproved && !f.userRejected).length} pending
            </div>
            <button onClick={() => { setPhase("idle"); setExtraction(null); setFields([]); setError(null); }}
              style={{ padding: "8px 14px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#475569" }}>
              ← Upload Different File
            </button>
            <button onClick={submitApproval} disabled={approvedCount === 0}
              style={{ padding: "8px 20px", background: approvedCount > 0 ? "#1e40af" : "#94a3b8", color: "#fff", border: "none", borderRadius: 9, fontWeight: 800, fontSize: 12, cursor: approvedCount > 0 ? "pointer" : "not-allowed" }}>
              Approve {approvedCount} field{approvedCount !== 1 ? "s" : ""} & Save →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Approving phase ───────────────────────────────────────────────────────
  if (phase === "approving") return (
    <div style={{ padding: panelPad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 200, gap: 12 }}>
      <div style={{ width: 36, height: 36, border: "4px solid #e2e8f0", borderTopColor: "#1e40af", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>Saving approvals…</div>
    </div>
  );

  // ── Done phase ────────────────────────────────────────────────────────────
  if (phase === "done" && approveRes) {
    const ooUpdateResult = approveRes.results.find(r => r.action === "oo_update");
    const ccbResult      = approveRes.results.find(r => r.action === "ccb_tasks");
    return (
      <div style={{ padding: panelPad, display: "flex", flexDirection: "column", gap: compact ? 10 : 16 }}>
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{approveRes.ok ? "✓" : "⚠"}</div>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a", marginBottom: 4 }}>
            {approveRes.ok ? "Approval complete" : "Partial approval"}
          </div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{approveRes.summary}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ooUpdateResult?.ok && (
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#15803d", fontWeight: 600 }}>
              ✓ {ooUpdateResult.detail ?? "Owner operator record updated"}
            </div>
          )}
          {ccbResult?.ok && (
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#1e40af", fontWeight: 600 }}>
              ✓ {ccbResult.detail ?? "CCB tasks created"}
            </div>
          )}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 11, color: "#64748b" }}>
            This approval has been logged with your name and a reference to the source file.
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => { setPhase("idle"); setExtraction(null); setFields([]); setApproveRes(null); }}
            style={{ flex: 1, padding: "9px 0", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#475569" }}>
            Verify Another
          </button>
          {!compact && (
            <Link href="/ronyx/owner-operators" style={{ flex: 1, padding: "9px 0", background: "#1e40af", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#fff", textDecoration: "none", textAlign: "center" }}>
              Back to Owner Operators
            </Link>
          )}
          {compact && onClose && (
            <button onClick={onClose}
              style={{ flex: 1, padding: "9px 0", background: "#0f172a", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 12, cursor: "pointer", color: "#fff" }}>
              Close & Return
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
