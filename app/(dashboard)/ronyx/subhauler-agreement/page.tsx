"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ── Constants ──────────────────────────────────────────────────────── */
const PRIME = {
  name:    "Ronyx Logistics, LLC",
  address: "3741 Graves Ave\nGroves Texas 77619",
  attn:    "Veronica Y Butanda",
  phone:   "337-930-0840",
  email:   "ar.ap@ronyxlogistics.llc",
};

const KNOWN_SUBHAULERS = [
  { name: "TC Red Wine Services, LLC",          address: "", attn: "", phone: "", email: "" },
  { name: "BAS Equipment & Trucking LLC",        address: "P.O. Box 36\nThrockmorton, TX 76483", attn: "", phone: "", email: "" },
  { name: "M.A. Mortenson Company",             address: "700 Meadow Ln\nMinneapolis MN 55422", attn: "", phone: "", email: "" },
  { name: "Denesse Group Inc",                  address: "23433 Dome St\nMoreno Valley, CA 92553", attn: "Denesse Duran", phone: "323-712-5010", email: "denesse4@gmail.com" },
  { name: "J&J Alvarado LLC",                   address: "", attn: "", phone: "", email: "" },
];

const KNOWN_GCS = [
  { name: "TC Redwine Services, LLC",           address: "" },
  { name: "BAS Equipment & Trucking LLC",        address: "P.O. Box 36\nThrockmorton, TX 76483" },
  { name: "M.A. Mortenson Company",             address: "700 Meadow Ln\nMinneapolis MN 55422" },
];

const TRUCK_TYPES = ["Tri-Axel", "Quad-Axel", "Quint-Axel", "End Dump", "Belly"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type TruckRow = { type: string; truck_number: string };
type AgreementRecord = {
  id: string;
  subhauler_name: string;
  subhauler_email: string | null;
  status: string;
  sign_token: string;
  sent_at: string | null;
  created_at: string;
  prime_carrier_signed_at: string | null;
  subhauler_signed_at: string | null;
  general_contractor: string | null;
  project_name: string | null;
};

const BLANK_TRUCKS: TruckRow[] = TRUCK_TYPES.map((t) => ({ type: t, truck_number: "" }));

/* ── Signature Canvas ────────────────────────────────────────────────── */
function SignatureCanvas({ onSave, onClear, label }: { onSave: (dataUrl: string) => void; onClear: () => void; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const last      = useRef<{ x: number; y: number } | null>(null);

  function getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const src  = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function start(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    drawing.current = true;
    last.current    = getPos(e, canvasRef.current!);
  }
  function move(e: MouseEvent | TouchEvent) {
    if (!drawing.current || !canvasRef.current) return;
    e.preventDefault();
    const ctx  = canvasRef.current.getContext("2d")!;
    const pos  = getPos(e, canvasRef.current);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth   = 2;
    ctx.lineCap     = "round";
    ctx.stroke();
    last.current = pos;
  }
  function end() { drawing.current = false; last.current = null; }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    onClear();
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, background: "#fafafa", display: "inline-block", touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          width={340}
          height={100}
          style={{ display: "block", cursor: "crosshair", borderRadius: 8 }}
          onMouseDown={start as any}
          onMouseMove={move as any}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start as any}
          onTouchMove={move as any}
          onTouchEnd={end}
        />
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={save} style={{ padding: "5px 14px", borderRadius: 7, border: "1px solid #86efac", background: "#f0fdf4", color: "#166534", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Apply Signature
        </button>
        <button onClick={clear} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontSize: 12, cursor: "pointer" }}>
          Clear
        </button>
      </div>
    </div>
  );
}

/* ── Agreement Preview Component ─────────────────────────────────────── */
function AgreementPreview({ f, primeSig }: { f: ReturnType<typeof useFormState>; primeSig: string | null }) {
  const blank = (v: string, width = 120) =>
    v ? <strong style={{ borderBottom: "1.5px solid #0f172a", paddingBottom: 1, minWidth: width }}>{v}</strong>
      : <span style={{ display: "inline-block", borderBottom: "1.5px solid #0f172a", width, minWidth: width }}>&nbsp;</span>;

  const truckRows = f.trucks.filter((t) => t.truck_number);

  return (
    <div id="agreement-preview" style={{ fontFamily: "Times New Roman, serif", fontSize: 11.5, color: "#0f172a", lineHeight: 1.6, maxWidth: 720, margin: "0 auto", padding: "32px 40px", background: "#fff" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 900, letterSpacing: "0.08em", textDecoration: "underline", marginBottom: 4 }}>SUBHAULER AGREEMENT</div>
        <div style={{ fontSize: 12 }}>
          BETWEEN PRIME CARRIER: <strong>Ronyx Logistics, LLC</strong> AND SUBHAULER: {blank(f.subhaulerName, 180)}
        </div>
      </div>

      <p style={{ marginBottom: 12 }}>
        THIS SUBHAULER AGREEMENT (the "Subcontract") is executed by and between Prime Carrier, Ronyx Logistics, LLC ("Prime Carrier") and Subhauler, {blank(f.subhaulerName, 200)} ("Subhauler") whose information is provided below:
      </p>

      {/* Info table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "4px 8px", background: "#f1f5f9", width: "50%", textAlign: "left" }}>PRIME CARRIER:</th>
            <th style={{ border: "1px solid #000", padding: "4px 8px", background: "#f1f5f9", textAlign: "left" }}>SUBHAULER:</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["Name:", "Ronyx Logistics, LLC",            "Name:", f.subhaulerName],
            ["Address:", "3741 Graves Ave\nGroves Texas 77619", "Address:", f.subhaulerAddress],
            ["ATTN:", "Veronica Y Butanda",               "ATTN:", f.subhaulerAttn],
            ["Telephone:", "337-930-0840",               "Telephone:", f.subhaulerPhone],
            ["Email:", "ar.ap@ronyxlogistics.llc",       "Email:", f.subhaulerEmail],
          ].map(([lp, vp, ls, vs], i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #000", padding: "3px 8px", verticalAlign: "top" }}>
                <span style={{ fontWeight: 700 }}>{lp}</span> {vp.includes("\n") ? <><br />{vp.replace("\n", " ")}</> : vp}
              </td>
              <td style={{ border: "1px solid #000", padding: "3px 8px", verticalAlign: "top" }}>
                <span style={{ fontWeight: 700 }}>{ls}</span> {blank(vs as string, 140)}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} style={{ border: "1px solid #000", padding: "3px 8px" }}>
              <span style={{ fontWeight: 700 }}>USDOT No:</span> {blank(f.subhaulerUsdot, 120)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Truck table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "3px 8px", background: "#f1f5f9", textAlign: "left" }}>Type of Truck</th>
            <th style={{ border: "1px solid #000", padding: "3px 8px", background: "#f1f5f9", textAlign: "left" }}>Truck Number</th>
          </tr>
        </thead>
        <tbody>
          {f.trucks.map((t, i) => (
            <tr key={i}>
              <td style={{ border: "1px solid #000", padding: "3px 8px" }}>{t.type}:</td>
              <td style={{ border: "1px solid #000", padding: "3px 8px" }}>{blank(t.truck_number, 120)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ marginBottom: 10, fontSize: 10.5 }}>
        Prime Carrier and Subhauler are sometimes collectively referred to herein as the "Parties" or individually as a "Party." The Sub-Work described in Article I, below, shall be performed in accordance with the Subcontract Documents attached hereto as Exhibits A, B, and C (the "Subcontract Documents"), which are incorporated herein by reference.
      </p>
      <p style={{ marginBottom: 10, fontSize: 10.5 }}>
        NOW, THEREFORE, FOR GOOD AND VALUABLE CONSIDERATION, including the mutual agreements, understandings, stipulations, warranties and representations set forth herein, the sufficiency of such consideration being hereby acknowledged and confessed by each of the Parties hereto, the Parties agree as follows:
      </p>

      <div style={{ fontWeight: 900, textDecoration: "underline", marginBottom: 4 }}>ARTICLE I: SCOPE OF SUB-WORK</div>
      <p style={{ marginBottom: 10, fontSize: 10.5 }}>
        Subhauler agrees to furnish all labor, materials, equipment, property insurance, casualty insurance, and liability insurance, and/or other facilities required to complete the Sub-Work described in Exhibit A in accordance with the General Terms and Conditions (Exhibit B) and the Specific Working Conditions and Rules (Exhibit C).
      </p>

      <div style={{ fontWeight: 900, textDecoration: "underline", marginBottom: 4 }}>ARTICLE II: THE "SUB-CONTRACT SUM"</div>
      <p style={{ marginBottom: 10, fontSize: 10.5 }}>
        Prime Carrier agrees to pay Subhauler for the strict performance of the Sub-Work in accordance with and subject to the General Terms and Conditions set forth in Exhibit B.
      </p>

      <div style={{ fontWeight: 900, textDecoration: "underline", marginBottom: 4 }}>ARTICLE III: TIME OF PERFORMANCE</div>
      <p style={{ marginBottom: 4, fontSize: 10.5 }}>
        DATE OF COMMENCEMENT: {blank(f.commDay)} of {blank(f.commMonth, 90)} 20{blank(f.commYear, 40)}.
      </p>
      <p style={{ marginBottom: 10, fontSize: 10.5 }}>
        SUBSTANTIAL COMPLETION DATE: {blank(f.compDay)} of {blank(f.compMonth, 90)} 20{blank(f.compYear, 40)}.
      </p>
      <p style={{ fontSize: 10.5, marginBottom: 10 }}>
        These dates are subject to the General Terms and Conditions (Exhibit B) regarding changes in the Sub-Work and/or termination of this Subcontract.
      </p>

      <div style={{ fontWeight: 900, textDecoration: "underline", marginBottom: 4 }}>ARTICLE IV: THE SERVICE AGREEMENT</div>
      <p style={{ fontSize: 10.5, marginBottom: 12 }}>
        Subhauler is made aware that Prime Carrier has entered into a Service Agreement ("Service Agreement") with the following General Contractor {blank(f.gcName, 160)} ("General Contractor") for the benefit of the following Owner is Ronyx Logistics, LLC ("Owner") to provide transportation services for the project known as {blank(f.projectName, 180)}.
      </p>

      {/* GC / Prime table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24, fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #000", padding: "4px 8px", background: "#f1f5f9", textAlign: "left" }}>GENERAL CONTRACTOR:</th>
            <th style={{ border: "1px solid #000", padding: "4px 8px", background: "#f1f5f9", textAlign: "left" }}>PRIME CARRIER:</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #000", padding: "3px 8px" }}><strong>Name:</strong> {blank(f.gcName, 160)}</td>
            <td style={{ border: "1px solid #000", padding: "3px 8px" }}><strong>Name:</strong> Ronyx Logistics, LLC</td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #000", padding: "3px 8px", whiteSpace: "pre-line" }}><strong>Address:</strong> {blank(f.gcAddress, 160)}</td>
            <td style={{ border: "1px solid #000", padding: "3px 8px" }}><strong>Address:</strong> 3741 Graves Ave, Groves Texas 77619</td>
          </tr>
        </tbody>
      </table>

      {/* Signature block */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 24 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11 }}>PRIME CARRIER — Ronyx Logistics, LLC</div>
          {primeSig ? (
            <img src={primeSig} alt="Ronyx signature" style={{ height: 60, display: "block", marginBottom: 4 }} />
          ) : (
            <div style={{ height: 60, borderBottom: "1px solid #000", marginBottom: 4 }} />
          )}
          <div style={{ fontSize: 10, color: "#475569" }}>Authorized Signature</div>
          <div style={{ borderBottom: "1px solid #000", marginTop: 12, paddingBottom: 2, fontSize: 10, color: "#475569" }}>Printed Name / Title / Date</div>
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11 }}>SUBHAULER — {f.subhaulerName || "___________________"}</div>
          <div style={{ height: 60, borderBottom: "1px solid #000", marginBottom: 4 }} />
          <div style={{ fontSize: 10, color: "#475569" }}>Authorized Signature</div>
          <div style={{ borderBottom: "1px solid #000", marginTop: 12, paddingBottom: 2, fontSize: 10, color: "#475569" }}>Printed Name / Title / Date</div>
        </div>
      </div>
    </div>
  );
}

/* ── useFormState ─────────────────────────────────────────────────────── */
function useFormState() {
  const [subhaulerName,    setSubhaulerName]    = useState("");
  const [subhaulerAddress, setSubhaulerAddress] = useState("");
  const [subhaulerAttn,    setSubhaulerAttn]    = useState("");
  const [subhaulerPhone,   setSubhaulerPhone]   = useState("");
  const [subhaulerEmail,   setSubhaulerEmail]   = useState("");
  const [subhaulerUsdot,   setSubhaulerUsdot]   = useState("");
  const [trucks,           setTrucks]           = useState<TruckRow[]>([...BLANK_TRUCKS]);
  const [commDay,          setCommDay]          = useState("");
  const [commMonth,        setCommMonth]        = useState("");
  const [commYear,         setCommYear]         = useState("");
  const [compDay,          setCompDay]          = useState("");
  const [compMonth,        setCompMonth]        = useState("");
  const [compYear,         setCompYear]         = useState("");
  const [gcName,           setGcName]           = useState("");
  const [gcAddress,        setGcAddress]        = useState("");
  const [projectName,      setProjectName]      = useState("South Valley Phase 2");

  function resetForm() {
    setSubhaulerName(""); setSubhaulerAddress(""); setSubhaulerAttn(""); setSubhaulerPhone("");
    setSubhaulerEmail(""); setSubhaulerUsdot(""); setTrucks([...BLANK_TRUCKS]);
    setCommDay(""); setCommMonth(""); setCommYear(""); setCompDay(""); setCompMonth(""); setCompYear("");
    setGcName(""); setGcAddress(""); setProjectName("South Valley Phase 2");
  }

  return {
    subhaulerName, setSubhaulerName,
    subhaulerAddress, setSubhaulerAddress,
    subhaulerAttn, setSubhaulerAttn,
    subhaulerPhone, setSubhaulerPhone,
    subhaulerEmail, setSubhaulerEmail,
    subhaulerUsdot, setSubhaulerUsdot,
    trucks, setTrucks,
    commDay, setCommDay, commMonth, setCommMonth, commYear, setCommYear,
    compDay, setCompDay, compMonth, setCompMonth, compYear, setCompYear,
    gcName, setGcName, gcAddress, setGcAddress,
    projectName, setProjectName,
    resetForm,
  };
}

/* ── Status badge ─────────────────────────────────────────────────────── */
function StatusChip({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    draft:               ["#f1f5f9", "#475569"],
    awaiting_subhauler:  ["#fef9c3", "#854d0e"],
    sent:                ["#dbeafe", "#1e40af"],
    signed:              ["#dcfce7", "#166534"],
    completed:           ["#dcfce7", "#166534"],
  };
  const [bg, color] = map[status] || ["#f1f5f9", "#475569"];
  return (
    <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700, background: bg, color }}>
      {status === "awaiting_subhauler" ? "Awaiting Subhauler" : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────── */
export default function SubhaulerAgreementPage() {
  const f           = useFormState();
  const [tab, setTab]           = useState<"form" | "history">("form");
  const [showPreview, setShowPreview] = useState(false);
  const [primeSig, setPrimeSig] = useState<string | null>(null);
  const [primeName, setPrimeName] = useState("Veronica Y Butanda");
  const [saving, setSaving]     = useState(false);
  const [sending, setSending]   = useState(false);
  const [toast, setToast]       = useState<{ msg: string; ok: boolean } | null>(null);
  const [history, setHistory]   = useState<AgreementRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [customSubhauler, setCustomSubhauler] = useState(false);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadHistory() {
    setHistLoading(true);
    try {
      const res = await fetch("/api/ronyx/subhauler-agreements");
      const d   = await res.json();
      setHistory(d.agreements || []);
    } finally {
      setHistLoading(false);
    }
  }

  useEffect(() => { void loadHistory(); }, []);

  function selectKnownSubhauler(name: string) {
    const match = KNOWN_SUBHAULERS.find((s) => s.name === name);
    if (match) {
      f.setSubhaulerName(match.name);
      f.setSubhaulerAddress(match.address);
      f.setSubhaulerAttn(match.attn);
      f.setSubhaulerPhone(match.phone);
      f.setSubhaulerEmail(match.email);
    } else {
      f.setSubhaulerName(name);
    }
  }

  function selectKnownGC(name: string) {
    const match = KNOWN_GCS.find((g) => g.name === name);
    if (match) { f.setGcName(match.name); f.setGcAddress(match.address); }
    else { f.setGcName(name); }
  }

  function updateTruck(idx: number, field: keyof TruckRow, value: string) {
    f.setTrucks((prev) => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  async function saveAgreement(andSend = false) {
    if (!f.subhaulerName) { showToast("Subhauler name required", false); return; }
    setSaving(true);
    try {
      const payload = {
        subhauler_name:    f.subhaulerName,
        subhauler_address: f.subhaulerAddress,
        subhauler_attn:    f.subhaulerAttn,
        subhauler_phone:   f.subhaulerPhone,
        subhauler_email:   f.subhaulerEmail,
        subhauler_usdot:   f.subhaulerUsdot,
        trucks:            f.trucks.filter((t) => t.truck_number),
        commencement_day:  f.commDay, commencement_month: f.commMonth, commencement_year: f.commYear,
        completion_day:    f.compDay, completion_month: f.compMonth,   completion_year:   f.compYear,
        general_contractor: f.gcName, gc_address: f.gcAddress,
        project_name:      f.projectName,
        prime_carrier_sig: primeSig || undefined,
        prime_carrier_signed_by: primeSig ? primeName : undefined,
      };
      const res  = await fetch("/api/ronyx/subhauler-agreements", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (andSend) await sendEmail(data.agreement);
      else showToast("Agreement saved as draft.");

      f.resetForm(); setPrimeSig(null); setShowPreview(false);
      await loadHistory();
    } catch (err: any) {
      showToast(err.message || "Failed to save", false);
    } finally {
      setSaving(false);
    }
  }

  async function sendEmail(agreement: any) {
    if (!agreement.subhauler_email) {
      showToast("No subhauler email on file — agreement saved but not emailed.", false);
      return;
    }
    setSending(true);
    try {
      const signingUrl = `${window.location.origin}/ronyx/sign/${agreement.sign_token}`;
      const html = `
<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <div style="background:#0f172a;color:#fff;padding:16px 24px;border-radius:8px 8px 0 0">
    <strong>Ronyx Logistics, LLC</strong> — Subhauler Agreement
  </div>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px">
    <p>Dear <strong>${agreement.subhauler_name}</strong>,</p>
    <p>
      Ronyx Logistics, LLC has prepared a Subhauler Agreement for your review and signature.
      ${agreement.project_name ? `This agreement covers the <strong>${agreement.project_name}</strong> project.` : ""}
    </p>
    <p>Please review the agreement and sign electronically by clicking the button below:</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${signingUrl}" style="background:#0f172a;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block">
        Review &amp; Sign Agreement →
      </a>
    </div>
    <p style="font-size:12px;color:#64748b">
      Or copy this link: <a href="${signingUrl}">${signingUrl}</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0">
    <p style="font-size:12px;color:#64748b">
      Questions? Contact us at <a href="mailto:${PRIME.email}">${PRIME.email}</a> or call ${PRIME.phone}.
    </p>
  </div>
</div>`;

      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to:      agreement.subhauler_email,
          subject: `Subhauler Agreement — Ronyx Logistics, LLC${agreement.project_name ? ` / ${agreement.project_name}` : ""}`,
          html,
          from:    PRIME.email,
        }),
      });

      // Mark as sent
      await fetch("/api/ronyx/subhauler-agreements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agreement.id, status: "sent", sent_at: new Date().toISOString() }),
      });

      showToast(`Agreement emailed to ${agreement.subhauler_email}.`);
    } catch (err: any) {
      showToast(err.message || "Email failed", false);
    } finally {
      setSending(false);
    }
  }

  function printPreview() {
    const el = document.getElementById("agreement-preview");
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>Subhauler Agreement</title><style>body{margin:0;font-family:'Times New Roman',serif}@media print{body{margin:0}}</style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  }

  const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 13, background: "#fff", color: "#0f172a", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
  const section = (title: string) => (
    <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "2px solid #0f172a", paddingBottom: 4, marginBottom: 12, marginTop: 20 }}>
      {title}
    </div>
  );

  return (
    <div className="ronyx-shell">
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.ok ? "#166534" : "#991b1b", color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 8px 24px rgba(0,0,0,0.22)" }}>
          {toast.msg}
        </div>
      )}

      <header className="ronyx-header">
        <div>
          <p className="ronyx-kicker">Ronyx • Legal</p>
          <h1>Subhauler Agreement</h1>
          <p className="ronyx-muted">Fill, sign, and send subhauler agreements — all in one place.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/ronyx" className="ronyx-action" style={{ background: "transparent", border: "1px solid #e2e8f0", color: "#475569" }}>Dashboard</Link>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {[["form", "✏️  New Agreement"], ["history", "📋  Sent Agreements"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as any)}
            style={{ padding: "8px 20px", borderRadius: 20, border: "1px solid #e2e8f0", background: tab === key ? "#0f172a" : "#fff", color: tab === key ? "#fff" : "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── FORM TAB ── */}
      {tab === "form" && (
        <div style={{ display: "grid", gridTemplateColumns: showPreview ? "1fr 1fr" : "1fr", gap: 24 }}>
          {/* Left: Form */}
          <div>
            {/* Subhauler section */}
            <div className="ronyx-card">
              {section("Subhauler Information")}

              {/* Company picker */}
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Select Company *</label>
                <select
                  style={{ ...inp, fontWeight: 600 }}
                  value={customSubhauler ? "__custom__" : f.subhaulerName}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") { setCustomSubhauler(true); f.setSubhaulerName(""); }
                    else { setCustomSubhauler(false); selectKnownSubhauler(e.target.value); }
                  }}
                >
                  <option value="">— Pick a company —</option>
                  {KNOWN_SUBHAULERS.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                  <option value="__custom__">Other (type below)</option>
                </select>
              </div>

              {customSubhauler && (
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Company Name *</label>
                  <input style={inp} value={f.subhaulerName} onChange={(e) => f.setSubhaulerName(e.target.value)} placeholder="Enter company name" />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>Address</label>
                  <textarea style={{ ...inp, minHeight: 56, resize: "vertical" }} value={f.subhaulerAddress} onChange={(e) => f.setSubhaulerAddress(e.target.value)} placeholder="Street, City, State ZIP" />
                </div>
                <div>
                  <label style={lbl}>ATTN (Contact Name)</label>
                  <input style={inp} value={f.subhaulerAttn} onChange={(e) => f.setSubhaulerAttn(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Telephone</label>
                  <input style={inp} value={f.subhaulerPhone} onChange={(e) => f.setSubhaulerPhone(e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Email *</label>
                  <input type="email" style={inp} value={f.subhaulerEmail} onChange={(e) => f.setSubhaulerEmail(e.target.value)} placeholder="agreement will be emailed here" />
                </div>
                <div>
                  <label style={lbl}>USDOT No.</label>
                  <input style={inp} value={f.subhaulerUsdot} onChange={(e) => f.setSubhaulerUsdot(e.target.value)} />
                </div>
              </div>

              {/* Trucks */}
              {section("Trucks")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {f.trucks.map((truck, i) => (
                  <div key={truck.type} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", width: 90, flexShrink: 0 }}>{truck.type}:</span>
                    <input style={{ ...inp, flex: 1 }} placeholder="Truck #" value={truck.truck_number} onChange={(e) => updateTruck(i, "truck_number", e.target.value)} />
                  </div>
                ))}
              </div>

              {/* Performance dates */}
              {section("Time of Performance")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ ...lbl, marginBottom: 6 }}>Date of Commencement</div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px", gap: 6 }}>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Day</label><input style={inp} placeholder="1" value={f.commDay} onChange={(e) => f.setCommDay(e.target.value)} /></div>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Month</label>
                      <select style={inp} value={f.commMonth} onChange={(e) => f.setCommMonth(e.target.value)}>
                        <option value="">—</option>
                        {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Year</label><input style={inp} placeholder="25" value={f.commYear} onChange={(e) => f.setCommYear(e.target.value)} /></div>
                  </div>
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: 6 }}>Substantial Completion</div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 60px", gap: 6 }}>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Day</label><input style={inp} placeholder="1" value={f.compDay} onChange={(e) => f.setCompDay(e.target.value)} /></div>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Month</label>
                      <select style={inp} value={f.compMonth} onChange={(e) => f.setCompMonth(e.target.value)}>
                        <option value="">—</option>
                        {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div><label style={{ ...lbl, fontSize: 10 }}>Year</label><input style={inp} placeholder="25" value={f.compYear} onChange={(e) => f.setCompYear(e.target.value)} /></div>
                  </div>
                </div>
              </div>

              {/* General Contractor */}
              {section("General Contractor / Project")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={lbl}>General Contractor</label>
                  <select style={inp} value={f.gcName} onChange={(e) => selectKnownGC(e.target.value)}>
                    <option value="">— Select —</option>
                    {KNOWN_GCS.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Project Name</label>
                  <input style={inp} value={f.projectName} onChange={(e) => f.setProjectName(e.target.value)} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={lbl}>GC Address</label>
                  <textarea style={{ ...inp, minHeight: 48, resize: "vertical" }} value={f.gcAddress} onChange={(e) => f.setGcAddress(e.target.value)} />
                </div>
              </div>

              {/* Ronyx signature */}
              {section("Ronyx Signature (Prime Carrier)")}
              <div style={{ marginBottom: 8 }}>
                <label style={lbl}>Signed By (Ronyx)</label>
                <input style={inp} value={primeName} onChange={(e) => setPrimeName(e.target.value)} />
              </div>
              <SignatureCanvas
                label="Draw Ronyx Signature"
                onSave={(url) => { setPrimeSig(url); showToast("Signature applied.", true); }}
                onClear={() => setPrimeSig(null)}
              />
              {primeSig && (
                <div style={{ marginTop: 8, padding: "6px 12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, fontSize: 12, color: "#166534", fontWeight: 700 }}>
                  ✓ Ronyx signature captured
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  {showPreview ? "Hide Preview" : "Preview Agreement"}
                </button>
                <button
                  onClick={printPreview}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Print / PDF
                </button>
                <button
                  onClick={() => saveAgreement(false)}
                  disabled={saving}
                  style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#0f172a", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  {saving ? "Saving…" : "Save Draft"}
                </button>
                <button
                  onClick={() => saveAgreement(true)}
                  disabled={saving || sending}
                  style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  {sending ? "Sending…" : "✉ Save & Email to Subhauler"}
                </button>
              </div>
              {!primeSig && (
                <p style={{ fontSize: 11, color: "#f59e0b", marginTop: 8 }}>
                  Tip: Draw your signature above before sending so the agreement goes out pre-signed by Ronyx.
                </p>
              )}
            </div>
          </div>

          {/* Right: Preview */}
          {showPreview && (
            <div style={{ overflowY: "auto", maxHeight: "90vh", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
              <AgreementPreview f={f} primeSig={primeSig} />
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === "history" && (
        <div className="ronyx-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700 }}>Sent Agreements ({history.length})</h2>
            <button onClick={loadHistory} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", fontSize: 12, cursor: "pointer" }}>Refresh</button>
          </div>
          {histLoading ? (
            <div style={{ color: "#64748b", padding: "20px 0" }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ color: "#94a3b8", padding: "32px 0", textAlign: "center" }}>No agreements yet. Create one from the New Agreement tab.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                  {["Company", "Project", "Status", "Created", "Ronyx Signed", "Subhauler Signed", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "8px 10px", color: "#64748b", fontWeight: 600, fontSize: 11, textTransform: "uppercase", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 700 }}>{a.subhauler_name}</td>
                    <td style={{ padding: "10px 10px", color: "#475569" }}>{a.project_name || "—"}</td>
                    <td style={{ padding: "10px 10px" }}><StatusChip status={a.status} /></td>
                    <td style={{ padding: "10px 10px", color: "#64748b", fontSize: 12 }}>{new Date(a.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 10px", fontSize: 12 }}>
                      {a.prime_carrier_signed_at ? <span style={{ color: "#166534", fontWeight: 700 }}>✓ {new Date(a.prime_carrier_signed_at).toLocaleDateString()}</span> : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 10px", fontSize: 12 }}>
                      {a.subhauler_signed_at ? <span style={{ color: "#166534", fontWeight: 700 }}>✓ {new Date(a.subhauler_signed_at).toLocaleDateString()}</span> : <span style={{ color: "#94a3b8" }}>Pending</span>}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {a.sign_token && (
                          <button
                            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/ronyx/sign/${a.sign_token}`); showToast("Signing link copied!"); }}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            Copy Link
                          </button>
                        )}
                        {a.subhauler_email && a.status !== "signed" && (
                          <button
                            onClick={() => sendEmail(a)}
                            disabled={sending}
                            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                          >
                            Resend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
