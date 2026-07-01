"use client";

// Ronyx-branded New Owner-Operator (Subhauler) Agreement — now e-signable
// (DocuSign-style): the carrier draws or types a signature, agrees, and it is
// captured, filed to their owner-operator record as the Contract, and stamped.

import { useEffect, useRef, useState } from "react";

const RULE: React.CSSProperties = { borderBottom: "1px solid #000", display: "inline-block", minWidth: 240 };
function Line({ w = 240, label }: { w?: number; label?: string }) {
  return <span style={{ display: "inline-block" }}>{label ? <span style={{ fontWeight: 600 }}>{label} </span> : null}<span style={{ ...RULE, minWidth: w }}>&nbsp;</span></span>;
}

// Reusable inline signature pad (draw or type). The visible canvas prints, so
// the signature appears on the saved/printed copy; onChange gives a PNG dataURL.
function MiniSign({ onChange }: { onChange: (dataUrl: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const g = () => ref.current?.getContext("2d") || null;
  const xy = (e: React.PointerEvent<HTMLCanvasElement>) => { const c = ref.current!; const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }; };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => { const ctx = g(); if (!ctx || mode !== "draw") return; drawing.current = true; ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; const { x, y } = xy(e); ctx.beginPath(); ctx.moveTo(x, y); ref.current!.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawing.current) return; const ctx = g(); if (!ctx) return; const { x, y } = xy(e); ctx.lineTo(x, y); ctx.stroke(); };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (ref.current) onChange(ref.current.toDataURL("image/png")); };
  const drawTyped = (t: string) => { const c = ref.current, ctx = g(); if (!c || !ctx) return; ctx.clearRect(0, 0, c.width, c.height); ctx.fillStyle = "#0f172a"; ctx.font = "40px 'Segoe Script','Brush Script MT',cursive"; ctx.textBaseline = "middle"; ctx.fillText(t, 14, c.height / 2); onChange(t ? c.toDataURL("image/png") : ""); };
  const clear = () => { const c = ref.current, ctx = g(); if (c && ctx) ctx.clearRect(0, 0, c.width, c.height); setTyped(""); onChange(""); };
  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        {(["draw", "type"] as const).map(m => <button key={m} onClick={() => { setMode(m); clear(); }} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${mode === m ? "#1d4ed8" : "#cbd5e1"}`, background: mode === m ? "#eff6ff" : "#fff", color: mode === m ? "#1d4ed8" : "#64748b", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>{m === "draw" ? "✍️ Draw" : "⌨️ Type"}</button>)}
        <button onClick={clear} style={{ marginLeft: "auto", padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Clear</button>
      </div>
      <canvas ref={ref} width={420} height={90} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        style={{ width: "100%", maxWidth: 420, height: 90, border: "1px solid #94a3b8", borderRadius: 8, background: "#fff", touchAction: "none", cursor: mode === "draw" ? "crosshair" : "default", display: "block" }} />
      {mode === "type" && <input className="no-print" value={typed} onChange={e => { setTyped(e.target.value); drawTyped(e.target.value); }} placeholder="Type your name" style={{ marginTop: 4, width: "100%", maxWidth: 420, padding: "6px 8px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box" }} />}
    </div>
  );
}

export default function OwnerOperatorAgreement() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [agree, setAgree] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  const [signedImg, setSignedImg] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const [err, setErr] = useState("");
  const [ooId, setOoId] = useState("");
  const [achSig, setAchSig] = useState("");
  const [filing, setFiling] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const setF = (k: string, v: string) => setFields(s => ({ ...s, [k]: v }));
  // Fillable blank — type on screen; prints with the typed value.
  const F = ({ k, w = 180, ph }: { k: string; w?: number; ph?: string }) => (
    <input value={fields[k] || ""} onChange={e => setF(k, e.target.value)} placeholder={ph} className="fillable"
      style={{ border: "none", borderBottom: "1px solid #000", minWidth: w, width: w, font: "inherit", padding: "0 3px", background: "#fffde7", outline: "none" }} />
  );

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      setOoId(p.get("oo_id") || "");
      const co = p.get("company") || "";
      if (co) { setCompany(co); setFields(s => ({ ...s, sub_name: co, w9_business: co })); }
    } catch {}
  }, []);

  const ctx = () => canvasRef.current?.getContext("2d") || null;
  const xy = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = ctx(); if (!g) return; drawingRef.current = true; setHasInk(true);
    g.strokeStyle = "#0f172a"; g.lineWidth = 2.6; g.lineCap = "round"; g.lineJoin = "round";
    const { x, y } = xy(e); g.beginPath(); g.moveTo(x, y); canvasRef.current!.setPointerCapture(e.pointerId);
  };
  const moveP = (e: React.PointerEvent<HTMLCanvasElement>) => { if (!drawingRef.current) return; const g = ctx(); if (!g) return; const { x, y } = xy(e); g.lineTo(x, y); g.stroke(); };
  const up = () => { drawingRef.current = false; };
  const clearSig = () => { const g = ctx(); const c = canvasRef.current; if (g && c) g.clearRect(0, 0, c.width, c.height); setHasInk(false); };

  function renderTyped(text: string): string {
    const c = document.createElement("canvas"); c.width = 560; c.height = 170;
    const g = c.getContext("2d")!; g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "#0f172a"; g.font = "52px 'Segoe Script','Brush Script MT','Snell Roundhand',cursive"; g.textBaseline = "middle";
    g.fillText(text, 24, c.height / 2); return c.toDataURL("image/png");
  }

  // Capture the packet's sections and file each to its matching document slot.
  async function fileSplitDocs() {
    if (!ooId) return;
    try {
      setFiling("Filing your documents to the office…");
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const groups: { docType: string; nodes: Element[] }[] = [
        { docType: "Contract", nodes: Array.from(document.querySelectorAll(".doc .page:not(.doc-w9):not(.doc-banking)")) },
        { docType: "W-9 / Tax Form", nodes: Array.from(document.querySelectorAll(".doc .page.doc-w9")) },
        { docType: "Voided Check / Banking", nodes: Array.from(document.querySelectorAll(".doc .page.doc-banking")) },
      ];
      for (const grp of groups) {
        if (!grp.nodes.length) continue;
        const pdf = new jsPDF({ unit: "pt", format: "a4" });
        const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
        let first = true;
        for (const node of grp.nodes) {
          const canvas = await html2canvas(node as HTMLElement, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
          let w = pw, h = (canvas.height / canvas.width) * pw;
          if (h > ph) { h = ph; w = (canvas.width / canvas.height) * ph; }
          if (!first) pdf.addPage(); first = false;
          pdf.addImage(canvas.toDataURL("image/jpeg", 0.82), "JPEG", (pw - w) / 2, 0, w, h);
        }
        const blob = pdf.output("blob");
        const fd = new FormData();
        fd.append("file", new File([blob], `${grp.docType.replace(/[^a-z0-9]+/gi, "_")}.pdf`, { type: "application/pdf" }));
        fd.append("oo_id", ooId); fd.append("doc_type", grp.docType);
        await fetch("/api/onboarding-docs", { method: "POST", body: fd });
      }
      setFiling("✓ Filed: Subhauler Agreement, W-9/DWC, and ACH/Banking to your record.");
    } catch { setFiling(""); }
  }

  async function sign() {
    setErr("");
    if (!name.trim()) { setErr("Enter your printed name."); return; }
    if (!agree) { setErr("Please check the box to agree before signing."); return; }
    let dataUrl = "";
    if (mode === "draw") { if (!hasInk) { setErr("Draw your signature in the box."); return; } dataUrl = canvasRef.current!.toDataURL("image/png"); }
    else { if (!typed.trim()) { setErr("Type your signature."); return; } dataUrl = renderTyped(typed.trim()); }
    const at = new Date().toLocaleString();
    setSigning(true);
    try {
      const res = await fetch("/api/onboarding-sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ oo_id: ooId || undefined, company_name: company || undefined, signer_name: name.trim(), signer_title: title.trim(), signature_data_url: dataUrl, signed_at: new Date().toISOString() }) });
      const d = await res.json();
      if (res.ok && d.ok) {
        setSignedImg(dataUrl); setSignedAt(at); setDone(true);
        // Split the packet: capture each section and file it to its slot
        // (Subhauler Agreement -> Contract, DWC/W-9 -> W-9, ACH/Direct Deposit
        // -> Banking). Runs after the signature renders into the document.
        setTimeout(() => { void fileSplitDocs(); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }, 400);
      }
      else setErr(d.error || "Could not submit your signature. Try again.");
    } catch { setErr("Network error — please try again."); }
    finally { setSigning(false); }
  }

  const fieldInp: React.CSSProperties = { width: "100%", padding: "9px 11px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, boxSizing: "border-box", fontFamily: "system-ui, sans-serif" };

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh" }}>
      <style>{`
        @media print { .no-print { display: none !important; } .doc { box-shadow:none !important; margin:0 !important; } .page { page-break-after: always; } .fillable { background: transparent !important; } }
        .fillable::placeholder { color: #cbd5e1; }
        .doc { max-width: 820px; margin: 0 auto; padding: 40px 56px; line-height: 1.5; font-size: 13px; font-family: Georgia, 'Times New Roman', serif; }
        .doc h1 { font-size: 18px; text-align:center; margin: 6px 0; letter-spacing:0.04em; }
        .doc h2 { font-size: 14px; margin: 18px 0 6px; border-bottom: 1px solid #999; padding-bottom: 3px; }
        .doc h3 { font-size: 13px; margin: 14px 0 4px; }
        .doc p { margin: 8px 0; text-align: justify; }
        .doc .num { margin: 9px 0; }
        .doc table { width:100%; border-collapse: collapse; margin: 8px 0; font-size:12px; }
        .doc td, .doc th { border: 1px solid #555; padding: 6px 8px; text-align:left; vertical-align:top; }
        .brand { text-align:center; margin-bottom: 8px; }
        .brand .name { font-size: 22px; font-weight: 800; letter-spacing: 0.18em; color: #8a6d1d; }
        .brand .sub { font-size: 10px; letter-spacing: 0.35em; color:#8a6d1d; }
        .sigblock { margin-top: 26px; }
        .sigrow { margin: 22px 0; }
      `}</style>

      <div className="no-print" style={{ position: "sticky", top: 0, zIndex: 10, background: "#0f172a", color: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 14, fontFamily: "system-ui, sans-serif", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 15 }}>Ronyx Logistics — Subhauler Agreement</strong>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>Read the agreement, then sign electronically at the bottom.</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {!done && <button onClick={() => document.getElementById("esign")?.scrollIntoView({ behavior: "smooth" })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, cursor: "pointer" }}>✍️ Sign the agreement ↓</button>}
          <button onClick={() => window.print()} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}>🖨️ Print / Save PDF</button>
        </div>
      </div>

      <div className="doc" style={{ boxShadow: "0 1px 10px rgba(0,0,0,0.1)" }}>
        {/* ── Cover / Parties ── */}
        <div className="page">
          <div className="brand"><div className="name">RONYX</div><div className="sub">L O G I S T I C S&nbsp;&nbsp;L L C</div></div>
          <p style={{ textAlign: "center", fontSize: 11 }}>Ronyx Logistics, LLC — Subhauler Agreement — EXHIBIT B</p>
          <h1>SUBHAULER AGREEMENT</h1>
          <p style={{ textAlign: "center" }}>BETWEEN PRIME CARRIER: <strong>Ronyx Logistics, LLC</strong><br />AND SUBHAULER: {F({ k: "sub_name", w: 300 })}</p>
          <p>THIS SUBHAULER AGREEMENT (the &ldquo;Subcontract&rdquo;) is executed by and between Prime Carrier, <strong>Ronyx Logistics, LLC</strong> (&ldquo;Prime Carrier&rdquo;) and Subhauler, {F({ k: "sub_name", w: 260 })} (&ldquo;Subhauler&rdquo;) whose information is provided below:</p>

          <table>
            <tbody>
              <tr><th style={{ width: "50%" }}>PRIME CARRIER</th><th>SUBHAULER</th></tr>
              <tr><td>Name: Ronyx Logistics, LLC</td><td>Name: {F({ k: "sub_name", w: 200 })}</td></tr>
              <tr><td>Address: 3741 Graves Ave, Groves, Texas 77619</td><td>Address: {F({ k: "sub_addr", w: 190 })}</td></tr>
              <tr><td>ATTN: Veronica Y Butanda</td><td>ATTN: {F({ k: "sub_attn", w: 200 })}</td></tr>
              <tr><td>Telephone: 432-803-8003</td><td>Telephone: {F({ k: "sub_phone", w: 170 })}</td></tr>
              <tr><td>Email: ronyxlogistics@gmail.com</td><td>Email: {F({ k: "sub_email", w: 190 })}</td></tr>
              <tr><td></td><td>USDOT No: {F({ k: "sub_usdot", w: 180 })}</td></tr>
            </tbody>
          </table>

          <table>
            <tbody>
              <tr><th>Type of Truck</th><th>Truck Number</th></tr>
              <tr><td>Tri-Axle</td><td>{F({ k: "tt_tri", w: 160 })}</td></tr>
              <tr><td>Quad-Axle</td><td>{F({ k: "tt_quad", w: 160 })}</td></tr>
              <tr><td>Quint-Axle</td><td>{F({ k: "tt_quint", w: 160 })}</td></tr>
              <tr><td>End Dump</td><td>{F({ k: "tt_end", w: 160 })}</td></tr>
              <tr><td>Belly</td><td>{F({ k: "tt_belly", w: 160 })}</td></tr>
            </tbody>
          </table>
          <p>Prime Carrier and Subhauler are sometimes collectively referred to herein as the &ldquo;Parties&rdquo; or individually as a &ldquo;Party.&rdquo; The Sub-Work described in Article I, below, shall be performed in accordance with the Subcontract Documents attached hereto as Exhibits A, B, and C, which are incorporated herein by reference.</p>

          <h3>ARTICLE I: SCOPE OF SUB-WORK</h3>
          <p>Subhauler agrees to furnish all labor, materials, equipment, property insurance, casualty insurance, and liability insurance, and/or other facilities required to complete the Sub-Work described in Exhibit A in accordance with the General Terms and Conditions (Exhibit B) and the Specific Working Conditions and Rules (Exhibit C).</p>
          <h3>ARTICLE II: THE &ldquo;SUB-CONTRACT SUM&rdquo;</h3>
          <p>Prime Carrier agrees to pay Subhauler for the strict performance of the Sub-Work in accordance with and subject to the General Terms and Conditions set forth in Exhibit B.</p>
          <h3>ARTICLE III: TIME OF PERFORMANCE</h3>
          <p>DATE OF COMMENCEMENT: {F({ k: "comm_day", w: 55 })} of {F({ k: "comm_month", w: 130 })} 20{F({ k: "comm_year", w: 45 })}.<br />SUBSTANTIAL COMPLETION DATE: {F({ k: "compl_day", w: 55 })} of {F({ k: "compl_month", w: 130 })} 20{F({ k: "compl_year", w: 45 })}.</p>
          <h3>ARTICLE IV: THE SERVICE AGREEMENT</h3>
          <p>Subhauler is made aware that Prime Carrier has entered into a Service Agreement with the General Contractor named below for the benefit of Owner, Ronyx Logistics, LLC, to provide transportation services for the project known as {F({ k: "project_name", w: 300 })}.</p>
          <table><tbody>
            <tr><th>GENERAL CONTRACTOR</th><th>OWNER</th></tr>
            <tr><td>Name: {F({ k: "gc_name", w: 170 })}</td><td>Name: Ronyx Logistics, LLC</td></tr>
            <tr><td>Address: {F({ k: "gc_addr", w: 160 })}</td><td>Address: 3741 Graves Ave, Groves, Texas 77619</td></tr>
          </tbody></table>
          <p>In consideration of the mutual covenants set forth herein, Prime Carrier and Subhauler have signed this contract, which becomes binding and effective immediately, and shall be interpreted and construed according to applicable law.</p>
          <p>SIGNED AND EXECUTED THIS {F({ k: "exec_day", w: 130 })}, 20{F({ k: "exec_year", w: 45 })} (the &ldquo;Effective Date&rdquo;).</p>
          <div className="sigblock">
            <div className="sigrow"><strong>BY: PRIME CARRIER — Ronyx Logistics, LLC</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;&nbsp;{F({ k: "prime_name", w: 200 })} Printed Name&nbsp;&nbsp;&nbsp;&nbsp;Manager</div>
            <div className="sigrow"><strong>BY: SUBHAULER</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;&nbsp;{F({ k: "sub_signer_name", w: 200 })} Printed Name&nbsp;&nbsp;&nbsp;&nbsp;Title {F({ k: "sub_signer_title", w: 120 })}</div>
          </div>
        </div>

        {/* ── Exhibit A ── */}
        <div className="page">
          <h2>EXHIBIT A — SUBHAULER&rsquo;S SUB-WORK</h2>
          <p>The Subhauler shall perform its portion of the Sub-Work on the Project as described below and in accordance with the Subcontract Documents, including all labor, materials, equipment, services, and other items required to complete such portion of the Sub-Work, except to the extent specifically indicated to be the responsibility of others. The Sub-Work of Subhauler, including any of its employees, sub-subhaulers, and sub-tier entities, is as follows:</p>
          <p>Subhauler shall transport freight (including, but not limited to, aggregate, soil, liquid, rock, construction material, non-hazardous and hazardous waste and materials, and/or anything that can be legally transported) to and from the Project and in accordance with this Subcontract.</p>
          <p>Prime Carrier shall notify Subhauler of material to be transported and of the time and location to load, all within a reasonable time prior to the required delivery time, and thereafter Subhauler will, without delay, cause said material to be transported to the place designated by Prime Carrier or its representative.</p>
          <p>The Subhauler acknowledges that certain asphalt products are perishable and that time is of the essence in making proper and timely delivery of all materials. Subhauler shall use all reasonable diligence to deliver such materials promptly, expeditiously, and safely to the proper locations and by the proper delivery dates and times as specified by Prime Carrier. Prime Carrier shall have no responsibility to engage Subhauler at all or for any minimum number of deliveries during the Term.</p>
          <p>BY SIGNING BELOW, PRIME CARRIER AND SUBHAULER AGREE TO THE SUBHAULER&rsquo;S SUB-WORK EXPRESSED HEREIN. SIGNED THIS {F({ k: "exec_day", w: 130 })}, 20{F({ k: "exec_year", w: 45 })}.</p>
        </div>

        {/* ── Exhibit B — General Terms ── */}
        <div className="page">
          <h2>EXHIBIT B — GENERAL TERMS AND CONDITIONS</h2>
          {[
            ["1. Statement of Sub-Work", "The term “Sub-Work” means the transport services provided by the Subhauler to and from the Project to fulfill the Subhauler’s obligations to Prime Carrier arising from this Subcontract and related to the Service Agreement between Prime Carrier and General Contractor for the benefit of Owner."],
            ["2. Clarifications & Descriptions", "Subhauler agrees that it is an independent contractor. Subhauler is solely responsible for, and has control over, all transportation means, methods, techniques, sequences, procedures, and coordination of the Sub-Work, and for the safety of its employees and sub-subhaulers. Prime Carrier shall have no control over Subhauler’s vehicles, employees, or sub-subhaulers. Subhauler agrees to employ capable and responsible personnel and to maintain its vehicles to efficiently perform the Sub-Work."],
            ["3. Time of Performance", "Time is of the essence. Subhauler will begin Sub-Work by the Date of Commencement, or, if none is designated, within two (2) days after being notified by Prime Carrier to proceed, and shall complete no later than the Substantial Completion Date."],
            ["4. Delay", "Subhauler will proceed promptly and diligently. If performance is delayed by acts or omissions of Owner, General Contractor, or Prime Carrier (excluding Subhauler), Subhauler may request an extension of time but shall not be entitled to any increase in price or to damages except to the extent Prime Carrier actually receives such monies from the Owner. No extension is valid without Prime Carrier’s written consent. Failure to timely complete may result in liquidated damages of $500.00/day."],
            ["5. Subcontract Sum", "The Subcontract Sum includes all taxes, duties, fees, and permits applicable to the Sub-Work, and all charges for freight, packing, loading, and unloading of materials and supplies."],
            ["6. Billing / Payment", "Prime Carrier will perform all billing and collecting and agrees to pay Subhauler an amount equal to the daily freight rate, less the commissions and fees in Section 7. Subhauler must deliver the bill of lading, hand tag, manifest, and/or weight certificate by email no later than the Sunday following the last day of Sub-Work performed for the Project."],
            ["7. Prime Carrier’s Commission / Administrative Fees", "Prime Carrier shall subtract a 10% (or other) commission fee based on project freight rates from each truck ticket. Tickets with incomplete or illegible information are subject to an additional 5% administration fee."],
            ["8. Condition Precedent to Payment", "Final payment shall not become due until: (A) approval and acceptance of the work by Owner, General Contractor, and Prime Carrier; (B) receipt of final payment from the General Contractor by Prime Carrier; and (C) satisfactory evidence that all labor and material accounts incurred by Subhauler have been paid in full. Subhauler expressly assumes the risk of non-payment by the General Contractor to Prime Carrier."],
            ["9. Modification", "Changes to the Sub-Work shall be made by written change order. If a change affects the Subcontract Sum or time of performance, it shall be equitably adjusted."],
            ["10. Warranties and Guarantees", "Subhauler warrants that its services conform to the terms of this Subcontract and applicable standards, and that it holds all necessary federal, state, county, or city certificates, permits, licenses, registrations, and insurance required to perform the Sub-Work. Subhauler shall never use Prime Carrier’s name or address on any truck registration document, and will immediately notify Prime Carrier if any permits lapse, are suspended, or revoked."],
            ["11. Insurance and Bond", "Subhauler shall maintain, at its own expense, without interruption: (a) Workers’ Compensation per applicable law plus a minimum $500,000 Employers Liability, with a waiver of subrogation in favor of Prime Carrier; (b) Commercial General Liability of not less than $1,000,000 per occurrence with a $1,000,000 general aggregate and $1,000,000 products/completed operations aggregate; and (c) Auto Vehicle Liability of not less than $1,000,000 (per person / per occurrence bodily injury / property damage) covering owned, hired, and non-owned vehicles. Prime Carrier shall be named as an additional insured. Insurers shall have a Best rating of not less than A-. Subhauler shall require its insurer to notify Prime Carrier thirty (30) days prior to cancellation or material change."],
            ["12. Indemnity and Duty to Defend", "Subhauler shall indemnify and hold harmless Owner, General Contractor, Prime Carrier, and their agents and employees from all claims, damages, losses, and expenses (including attorney’s fees) arising out of Subhauler’s performance, even if caused in part by their negligence, except claims caused by the sole negligence of Prime Carrier."],
            ["13. Dispute Resolution", "Prior to filing a lawsuit, the Parties agree to first attempt to resolve disputes through mediation in accordance with the accepted mediation rules of the State of Texas."],
            ["14. Consequential / Punitive Damages", "Neither Party shall be liable to the other for loss of profits, revenue, opportunity, goodwill, cost of capital, or for special, indirect, consequential, punitive, or exemplary damages."],
            ["15. Safety", "Subhauler shall take all reasonable safety precautions, comply with all safety measures initiated by Prime Carrier and applicable laws, and submit all incident reports to Prime Carrier within three (3) days."],
            ["16. Cleanup", "Subhauler shall keep the premises free from waste and debris caused by its personnel and shall leave its Sub-Work area clean. Prime Carrier may remove rubbish and deduct the cost from Subhauler’s payment."],
            ["17. Use of Prime Carrier’s Equipment", "If Subhauler uses Prime Carrier’s equipment, materials, or facilities, Subhauler shall reimburse Prime Carrier at a predetermined rate and assumes all related liabilities. Such use must be approved by Prime Carrier in writing."],
            ["18. Subhauler’s Default", "It shall be an Event of Default if Subhauler, among other things, abandons or fails to diligently prosecute the Sub-Work; fails to pay its employees, sub-subhaulers, or suppliers; fails to accelerate when required; declares bankruptcy/insolvency; or otherwise fails to perform under this Subcontract."],
            ["19. Remedies on Default", "On Default, Prime Carrier may withhold sums due; supplement labor/materials and deduct the cost; terminate and take possession of materials, tools, and equipment at the site; offset amounts due; and pursue any remedy at law or equity, after providing not less than two (2) working days’ written notice to cure."],
            ["20. Termination at Prime Carrier’s Convenience", "Prime Carrier may terminate the whole or part of this Subcontract for convenience. Subhauler’s sole remedy shall be payment for work properly performed, less prior payments, and Subhauler waives all claims for damages including lost or anticipated profits."],
            ["21. Miscellaneous Provisions", "Subhauler shall secure and pay for necessary permits; shall not assign or subcontract without written consent; bears all operating and maintenance expenses for its trucks (fuel, oil, supplies, maintenance, parts, taxes, fines); shall never use Prime Carrier’s name on truck registration; shall participate in a DOT-compliant drug and alcohol testing program and provide written proof; shall maintain a proper CB radio and a TWIC card; and shall provide an active wireless number able to receive text dispatch, responding to dispatch nightly by 6:00 pm."],
            ["22. Non-Compete / Confidentiality", "During the term, Subhauler shall not compete with Prime Carrier as to the Project and Sub-Work, and shall not disclose Prime Carrier’s trade secrets (including customer lists and pricing). Breach of non-compete may result in $500.00/day liquidated damages."],
            ["23. Non-Solicitation", "During the term and for sixty (60) days thereafter, Subhauler shall not hire away Prime Carrier’s employees or solicit its customers or business relationships."],
            ["24. Non-Disparagement", "Subhauler shall not make disparaging statements about Prime Carrier or its affiliates."],
            ["25. Licensing", "Subhauler shall obtain and maintain all licenses, certifications, permits, and registrations required by law; failure to maintain them is a material breach."],
            ["26. Governing Law", "This Subcontract shall be governed by the Laws of the State of Texas."],
            ["27. Attorney’s Fees", "If Subhauler defaults and Prime Carrier seeks to enforce this Subcontract, Subhauler agrees to pay Prime Carrier’s reasonable attorneys’ fees and expenses, whether or not suit is filed."],
            ["28. Interpretation", "These terms shall not be construed against either Party as drafter."],
            ["29. Severability", "If any part is invalid or unenforceable, the remainder shall remain valid and enforceable to the fullest extent permitted by law."],
            ["30. Entire Agreement", "This Subcontract, including all Subcontract Documents, represents the entire agreement between the Parties and supersedes any prior representations."],
          ].map(([h, b]) => (
            <p key={h} className="num"><strong>{h}.</strong> {b}</p>
          ))}
          <p style={{ marginTop: 14 }}><strong>ATTENTION: THIS DOCUMENT HAS IMPORTANT LEGAL CONSEQUENCES. CONSULTATION WITH AN ATTORNEY PRIOR TO EXECUTION IS ENCOURAGED.</strong></p>
          <p>SIGNED AND EXECUTED THIS {F({ k: "exec_day", w: 130 })}, 20{F({ k: "exec_year", w: 45 })} (the &ldquo;Effective Date&rdquo;).</p>
          <div className="sigblock">
            <div className="sigrow"><strong>BY: PRIME CARRIER — Ronyx Logistics, LLC</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;{F({ k: "prime_name", w: 200 })} Printed Name&nbsp;&nbsp;&nbsp;Manager</div>
            <div className="sigrow"><strong>BY: SUBHAULER</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;{F({ k: "sub_signer_name", w: 200 })} Printed Name&nbsp;&nbsp;&nbsp;Title {F({ k: "sub_signer_title", w: 120 })}</div>
          </div>
        </div>

        {/* ── Exhibit C ── */}
        <div className="page">
          <h2>EXHIBIT C — SPECIFIC WORKING CONDITIONS AND RULES</h2>
          <p>Safety, consideration for others, and proper behavior while performing the Sub-Work are obligations of Prime Carrier to the General Contractor and Owner. The Subhauler, including its sub-tier entities, employees, and sub-subhaulers, will abide by the following:</p>
          <ul>
            <li>Drugs, alcohol, or weapons are not permitted at the Project site or while performing the Sub-Work. Any individual under the influence or possessing weapons will be immediately dismissed and removed.</li>
            <li>Required personal protective equipment must be used at all times while performing Sub-Work activities.</li>
            <li>All accidents and injuries of any type must be reported immediately to Prime Carrier.</li>
            <li>Safety rules and precautions must be abided by all individuals performing the Sub-Work; Subhauler is responsible for the safety of its own personnel.</li>
            <li>All individuals will deal with each other courteously; physical encounters, foul language, and verbal abuse are prohibited and cause for immediate dismissal.</li>
            <li>Subhauler shall operate and maintain its trucks in compliance with all applicable state and federal laws and shall perform daily pre-trip and post-trip inspections, ensuring no leaks or mechanical defects before beginning dispatch.</li>
            <li>Subhauler shall keep all haul loads free of contamination and is responsible for any load refused due to contamination.</li>
            <li>Subhauler shall use only environmentally safe release agents; the use of diesel as a release agent is strictly prohibited.</li>
          </ul>
          <p>BY SIGNING BELOW, PRIME CARRIER AND SUBHAULER AGREE TO THE SPECIFIC WORKING CONDITIONS AND RULES. SIGNED THIS {F({ k: "exec_day", w: 150 })}.</p>
          <div className="sigblock">
            <div className="sigrow"><strong>BY: PRIME CARRIER — Ronyx Logistics, LLC</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;{F({ k: "prime_name", w: 200 })} Printed Name&nbsp;&nbsp;&nbsp;Manager</div>
            <div className="sigrow"><strong>BY: SUBHAULER</strong><br /><br />______________________________ Signature&nbsp;&nbsp;&nbsp;{F({ k: "sub_signer_name", w: 200 })} Printed Name&nbsp;&nbsp;&nbsp;Title {F({ k: "sub_signer_title", w: 120 })}</div>
          </div>
        </div>

        {/* ── Supplementary forms ── */}
        <div className="page doc-w9">
          <h2>TEXAS DWC FORM-85 — Independent Contractor Notice</h2>
          <p>Agreement between General Contractor (Ronyx Logistics, LLC) and Subcontractor to establish an independent relationship under the Texas Workers&rsquo; Compensation Act, Section 406.121. <em>Do not send this agreement to TDI-DWC.</em></p>
          <table><tbody>
            <tr><td>Term: FROM {F({ k: "dwc_from", w: 110 })} TO {F({ k: "dwc_to", w: 110 })}</td><td>Estimated employees affected: {F({ k: "dwc_emp", w: 70 })}</td></tr>
            <tr><td>General Contractor: Ronyx Logistics, LLC<br />Fed Tax ID: 93-3345170<br />3741 Graves, Groves, TX 77619</td><td>Subcontractor: {F({ k: "sub_name", w: 180 })}<br />Fed Tax ID: {F({ k: "w9_ein", w: 170 })}<br />Address: {F({ k: "sub_addr", w: 180 })}</td></tr>
            <tr><td>Job sites: ☐ Blanket agreement — covers all job sites</td><td>Signature / Date: {F({ k: "dwc_sigdate", w: 160 })}</td></tr>
          </tbody></table>

          <h2>FORM W-9 — Request for Taxpayer Identification</h2>
          <p>Subhauler to complete and return an IRS Form W-9 (name, business name, federal tax classification, address, and TIN/EIN), with the requester listed as Ronyx Logistics, LLC, 3741 Graves Ave, Groves, Texas 77619.</p>
          <table><tbody>
            <tr><td>Name (as on tax return): {F({ k: "w9_name", w: 260 })}</td></tr>
            <tr><td>Business name (if different): {F({ k: "w9_business", w: 250 })}</td></tr>
            <tr><td>Tax classification: ☐ Individual/Sole proprietor ☐ C-Corp ☐ S-Corp ☐ Partnership ☐ LLC ☐ Other</td></tr>
            <tr><td>Address: {F({ k: "w9_addr", w: 220 })}  EIN / SSN: {F({ k: "w9_ein", w: 150 })}</td></tr>
          </tbody></table>
        </div>

        <div className="page doc-banking">
          <h2>ACH PAYMENT AUTHORIZATION</h2>
          <p>Ronyx Logistics, LLC offers ACH payments for your convenience, making secure electronic payments directly to your bank account. A processing fee will apply to each ACH transaction. Funds will be deposited the next business day after processing.</p>
          <p><strong>I agree to the ACH processing terms, including the processing fee of $14.99 per transaction.</strong></p>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8 }}>
            <div style={{ fontSize: 13 }}>Name: {F({ k: "sub_signer_name", w: 180 })}</div>
            <div style={{ fontSize: 13 }}>Date: {F({ k: "ach_date", w: 110 })}</div>
          </div>
          <div style={{ marginTop: 8, maxWidth: 420 }}>
            <div style={{ fontSize: 11, marginBottom: 3, color: "#334155" }}>Signature (ACH authorization):</div>
            <MiniSign onChange={setAchSig} />
          </div>

          <h2 style={{ marginTop: 28 }}>DIRECT DEPOSIT AUTHORIZATION</h2>
          <p>As a payment option, Ronyx Logistics, LLC offers payees electronic payment in lieu of check. Complete this form, attach a voided check, and return by email to ronyxlogistics@gmail.com.</p>
          <table><tbody>
            <tr><td>Payee Name: {F({ k: "dd_payee", w: 150 })}</td><td>Email: {F({ k: "dd_email", w: 150 })}</td></tr>
            <tr><td>Address: {F({ k: "dd_addr", w: 150 })}</td><td>Phone: {F({ k: "dd_phone", w: 150 })}</td></tr>
            <tr><td>Financial Institution: {F({ k: "dd_bank", w: 130 })}</td><td>Institution Address: {F({ k: "dd_bankaddr", w: 120 })}</td></tr>
            <tr><td>Routing Number: {F({ k: "dd_routing", w: 130 })}</td><td>Account Number: {F({ k: "dd_account", w: 130 })}</td></tr>
            <tr><td>Account Type: ☐ Checking ☐ Savings</td><td>Verification: ☐ Voided check ☐ Bank letter</td></tr>
          </tbody></table>
        </div>

        <div className="page">
          <div className="brand"><div className="name">RONYX</div><div className="sub">L O G I S T I C S&nbsp;&nbsp;L L C</div></div>
          <p style={{ textAlign: "center" }}>3741 Graves Ave, Groves, Texas 77619</p>
          <h2>TRUCK &amp; TRAILER LIST</h2>
          <p>Subhauler Name: {F({ k: "sub_name", w: 190 })}  Contact Person: {F({ k: "sub_attn", w: 180 })}  Phone: {F({ k: "sub_phone", w: 160 })}</p>
          <p>List all trucks and trailers that may be utilized. Attach additional pages as necessary.</p>
          <table><tbody>
            <tr><th>Truck #</th><th>Type (truck/trailer/dump/belly)</th><th>Year/Make/Model</th><th>VIN #</th><th>License Plate &amp; State</th><th>License Exp. Date</th></tr>
            {Array.from({ length: 25 }).map((_, i) => (
              <tr key={i}>
                {(["tn", "type", "ymm", "vin", "plate", "exp"] as const).map(c => <td key={c}>{F({ k: `tl_${i}_${c}`, w: c === "ymm" || c === "vin" ? 120 : 80 })}</td>)}
              </tr>
            ))}
          </tbody></table>
        </div>

        <div className="page">
          <div className="brand"><div className="name">RONYX</div><div className="sub">L O G I S T I C S&nbsp;&nbsp;L L C</div></div>
          <h2>DRIVER LIST</h2>
          <p>List all drivers who will operate under this Agreement. Attach additional pages as necessary.</p>
          <table><tbody>
            <tr><th>Driver Name</th><th>CDL #</th><th>State</th><th>CDL Exp.</th><th>Medical Exp.</th><th>Phone</th></tr>
            {Array.from({ length: 25 }).map((_, i) => (
              <tr key={i}>
                {(["name", "cdl", "st", "cdlexp", "medexp", "phone"] as const).map(c => <td key={c}>{F({ k: `dl_${i}_${c}`, w: c === "name" ? 130 : c === "st" ? 50 : 90 })}</td>)}
              </tr>
            ))}
          </tbody></table>
        </div>

        {/* ── Electronic execution (DocuSign-style) ── */}
        <div className="page" id="esign">
          <h2>ELECTRONIC EXECUTION — SUBHAULER</h2>
          <p>By signing below, the Subhauler agrees to and executes this Subhauler Agreement together with Exhibits A, B, and C and the forms herein, and intends this electronic signature to have the same legal force and effect as a handwritten signature.</p>

          {done ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ border: "1px solid #16a34a", background: "#f0fdf4", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontWeight: 800, color: "#15803d", fontSize: 15, marginBottom: 4 }} className="no-print">✅ Signed &amp; submitted — a copy has been filed to your Ronyx record.</div>
                {filing && <div style={{ fontSize: 12, color: "#166534", marginBottom: 10 }} className="no-print">{filing}</div>}
                <div style={{ display: "flex", gap: 30, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div>
                    <img src={signedImg} alt="Signature" style={{ height: 70, display: "block", borderBottom: "1px solid #000", paddingBottom: 2 }} />
                    <div style={{ fontSize: 11, marginTop: 3 }}>Subhauler Signature</div>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <div><strong>{name}</strong>{title ? `, ${title}` : ""}</div>
                    {company && <div>{company}</div>}
                    <div style={{ color: "#475569" }}>Executed electronically on {signedAt}</div>
                  </div>
                </div>
              </div>
              <button className="no-print" onClick={() => window.print()} style={{ marginTop: 14, background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 800, cursor: "pointer", fontFamily: "system-ui" }}>🖨️ Print / save your signed copy</button>
            </div>
          ) : (
            <div className="no-print" style={{ marginTop: 16, fontFamily: "system-ui, sans-serif" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div style={{ gridColumn: "1 / -1" }}><label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Company (Subhauler)</label><input value={company} onChange={e => setCompany(e.target.value)} style={fieldInp} placeholder="Your trucking company" /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Printed Name *</label><input value={name} onChange={e => setName(e.target.value)} style={fieldInp} placeholder="Full name" /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>Title</label><input value={title} onChange={e => setTitle(e.target.value)} style={fieldInp} placeholder="Owner / Manager" /></div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {(["draw", "type"] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)} style={{ padding: "6px 14px", borderRadius: 8, border: `1.5px solid ${mode === m ? "#1d4ed8" : "#cbd5e1"}`, background: mode === m ? "#eff6ff" : "#fff", color: mode === m ? "#1d4ed8" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{m === "draw" ? "✍️ Draw signature" : "⌨️ Type signature"}</button>
                ))}
                <button onClick={clearSig} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Clear</button>
              </div>

              {mode === "draw" ? (
                <canvas ref={canvasRef} width={560} height={170} onPointerDown={down} onPointerMove={moveP} onPointerUp={up} onPointerLeave={up}
                  style={{ width: "100%", maxWidth: 560, height: 170, border: "1.5px dashed #94a3b8", borderRadius: 10, background: "#fff", touchAction: "none", cursor: "crosshair", display: "block" }} />
              ) : (
                <input value={typed} onChange={e => setTyped(e.target.value)} placeholder="Type your full name" style={{ ...fieldInp, maxWidth: 560, height: 84, fontSize: 40, fontFamily: "'Segoe Script','Brush Script MT',cursive", color: "#0f172a" }} />
              )}
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Sign in the box above ({mode === "draw" ? "use your mouse or finger" : "your typed name becomes your signature"}).</div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: 9, margin: "14px 0", cursor: "pointer" }}>
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ marginTop: 3, width: 17, height: 17 }} />
                <span style={{ fontSize: 13, color: "#334155", lineHeight: 1.45 }}>I have read and agree to be legally bound by this Subhauler Agreement and all Exhibits, and I consent to sign electronically.</span>
              </label>

              {err && <div style={{ color: "#dc2626", fontWeight: 700, fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
              <button onClick={sign} disabled={signing} style={{ background: signing ? "#94a3b8" : "#16a34a", color: "#fff", border: "none", borderRadius: 9, padding: "12px 26px", fontWeight: 800, fontSize: 15, cursor: signing ? "default" : "pointer" }}>
                {signing ? "Submitting…" : "✔ Sign & Submit Agreement"}
              </button>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 8 }}>Your signature is filed to your Ronyx owner-operator record automatically.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
