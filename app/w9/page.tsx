"use client";

// Fillable, printable IRS Form W-9 (Request for Taxpayer Identification Number
// and Certification). IRS forms are U.S. Government works (public domain). Clean
// fillable layout of the standard W-9 fields — fill on screen, print/save, or use
// it as the blank the office hands to a carrier. Inputs are uncontrolled (fill +
// print only), so they keep focus/value while the classification boxes toggle.

import { useState } from "react";

const CLASSES = [
  "Individual / sole proprietor",
  "C Corporation",
  "S Corporation",
  "Partnership",
  "Trust / estate",
  "Limited liability company (LLC)",
  "Other",
];

function Fill({ ph, flex = 1 }: { ph?: string; flex?: number }) {
  return <input placeholder={ph} className="w9-fill"
    style={{ flex, minWidth: 40, border: "none", borderBottom: "1px solid #111", padding: "2px 4px", font: "inherit", background: "#fffde7", outline: "none" }} />;
}

export default function W9Form() {
  const [cls, setCls] = useState("");
  const box = (label: string) => (
    <label key={label} onClick={() => setCls(cls === label ? "" : label)} style={{ display: "inline-flex", alignItems: "center", gap: 5, marginRight: 14, marginBottom: 4, cursor: "pointer", fontSize: 12 }}>
      <span style={{ width: 14, height: 14, border: "1.5px solid #111", borderRadius: 3, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900 }}>{cls === label ? "✓" : ""}</span>
      {label}
    </label>
  );

  return (
    <div style={{ background: "#e8eef5", minHeight: "100vh", padding: "22px 14px", fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`
        @page { size: letter; margin: 14mm; }
        @media print { .no-print { display:none !important; } body { background:#fff; } .sheet { box-shadow:none !important; } .w9-fill { background: transparent !important; } }
        .w9-fill::placeholder { color:#cbd5e1; }
      `}</style>

      <div className="no-print" style={{ maxWidth: 820, margin: "0 auto 12px", display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <a href="/owner-operator-signup" style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 14px", fontWeight: 700, color: "#475569", textDecoration: "none", fontSize: 13 }}>← Back</a>
        <button onClick={() => window.print()} style={{ background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, cursor: "pointer" }}>🖨️ Print / Save PDF</button>
      </div>

      <div className="sheet" style={{ maxWidth: 820, margin: "0 auto", background: "#fff", borderRadius: 6, boxShadow: "0 8px 30px rgba(0,0,0,0.12)", padding: "30px 40px", color: "#111", fontSize: 13, lineHeight: 1.6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #111", paddingBottom: 8 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900 }}>Form W-9</div>
            <div style={{ fontSize: 11, color: "#444" }}>Request for Taxpayer Identification Number and Certification</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#444" }}>Give to the requester.<br />Do <strong>not</strong> send to the IRS.</div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "baseline" }}><strong>1.</strong> Name (as shown on your income tax return) <Fill ph="Legal name" /></div>
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "baseline" }}><strong>2.</strong> Business name / disregarded entity name, if different <Fill ph="DBA (optional)" /></div>
          <div style={{ marginBottom: 6 }}><strong>3.</strong> Federal tax classification (check one):</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginBottom: 6, paddingLeft: 16 }}>{CLASSES.map(box)}</div>
          <div style={{ paddingLeft: 16, marginBottom: 12, display: "flex", gap: 20, flexWrap: "wrap" }}>
            <span style={{ display: "flex", gap: 6, alignItems: "baseline" }}>If LLC, tax classification (C, S, or P): <Fill ph="C/S/P" flex={0} /></span>
            <span style={{ display: "flex", gap: 6, alignItems: "baseline", flex: 1 }}>If Other, describe: <Fill ph="describe" /></span>
          </div>
          <div style={{ marginBottom: 12, display: "flex", gap: 20, flexWrap: "wrap" }}><strong>4.</strong> <span style={{ display: "flex", gap: 6, alignItems: "baseline" }}>Exempt payee code <Fill ph="" flex={0} /></span> <span style={{ display: "flex", gap: 6, alignItems: "baseline" }}>FATCA exemption code <Fill ph="" flex={0} /></span></div>
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "baseline" }}><strong>5.</strong> Address (number, street, apt/suite) <Fill ph="Street address" /></div>
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "baseline" }}><strong>6.</strong> City, state, and ZIP code <Fill ph="City, ST ZIP" /></div>
          <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "baseline" }}><strong>7.</strong> List account number(s) here (optional) <Fill /></div>
          <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 12 }}>
            <strong>Requester's name and address:</strong> Ronyx Logistics, LLC · 3741 Graves Ave, Groves, TX 77619
          </div>
        </div>

        <div style={{ borderTop: "1px solid #111", paddingTop: 10 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Part I — Taxpayer Identification Number (TIN)</div>
          <div style={{ display: "flex", gap: 30, flexWrap: "wrap" }}>
            <span style={{ display: "flex", gap: 6, alignItems: "baseline" }}>Social security number (SSN): <Fill ph="___-__-____" flex={0} /></span>
            <span style={{ display: "flex", gap: 6, alignItems: "baseline" }}>Employer ID number (EIN): <Fill ph="__-_______" flex={0} /></span>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #111", paddingTop: 10, marginTop: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Part II — Certification</div>
          <div style={{ fontSize: 12, color: "#333", marginBottom: 14 }}>
            Under penalties of perjury, I certify that: (1) the number shown on this form is my correct taxpayer identification number (or I am waiting for a number to be issued); (2) I am not subject to backup withholding; (3) I am a U.S. person; and (4) any FATCA code(s) entered on this form are correct.
          </div>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginTop: 26 }}>
            <div style={{ flex: 2, minWidth: 240 }}><div style={{ borderTop: "1px solid #111", paddingTop: 3, fontSize: 11 }}>Signature of U.S. person</div></div>
            <div style={{ flex: 1, minWidth: 140 }}><Fill ph="Date" /><div style={{ borderTop: "1px solid #111", paddingTop: 3, fontSize: 11 }}>Date</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}
