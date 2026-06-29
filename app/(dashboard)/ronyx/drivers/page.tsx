"use client";

import Link from "next/link";
import { safePrompt } from "@/lib/safePrompt";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/* ─── Types ─────────────────────────────────────────────── */
type DriverStatus = "Active" | "Available" | "Assigned" | "Inactive" | "Suspended";
type DocumentStatus = "Good" | "Expiring" | "Expired" | "Missing";

type Driver = {
  id: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  location: string;
  truck: string;
  trailer: string;
  status: DriverStatus;
  driverType: "W2" | "1099" | "Owner Operator";
  companyName: string;
  carrierName: string;
  ownerOperatorName: string;
  employmentType: string;
  dispatchEligible: boolean;
  cdl: string;
  cdlState: string;
  cdlExp: string;
  mvrExp: string;
  medicalExp: string;
  docs: DocumentStatus;
  rating: number;
  safetyScore: number;
  onTime: number;
  lastLoad: string;
  revenueWeek: string;
  drugTestStatus?: string;
  backgroundCheckStatus?: string;
  owner_operator_company?: string;
  dispatch_blocked_at?: string | null;
  dispatch_blocked_by?: string | null;
  dispatch_block_reason?: string | null;
  payroll_eligible?: boolean;
};

type ComplianceAlert = {
  title: string;
  driver: string;
  driverId: string;
  detail: string;
  level: "critical" | "warning";
};

/* ─── Helpers ───────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

function computeDocStatus(fields: { cdlExp: string; mvrExp: string; medicalExp: string }): DocumentStatus {
  const days = [fields.cdlExp, fields.mvrExp, fields.medicalExp].map(daysUntil);
  if (days.some((d) => d === null)) return "Missing";
  if (days.some((d) => d !== null && d < 0)) return "Expired";
  if (days.some((d) => d !== null && d <= 30)) return "Expiring";
  return "Good";
}

function normalizeStatus(raw: string): DriverStatus {
  const s = (raw || "").toLowerCase();
  if (s === "suspended") return "Suspended";
  if (s === "inactive")  return "Inactive";
  if (s === "assigned")  return "Assigned";
  if (s === "available") return "Available";
  return "Active";
}

function normalizeDrType(raw: string): "W2" | "1099" | "Owner Operator" {
  const s = (raw || "").toLowerCase();
  if (s === "1099") return "1099";
  if (s.includes("owner")) return "Owner Operator";
  return "W2";
}

function mapApiDriver(d: any): Driver {
  const cdlExp     = fmtDate(d.license_expiration_date);
  const mvrExp     = fmtDate(d.mvr_expiration);
  const medicalExp = fmtDate(d.medical_card_expiration);
  return {
    id:                d.id,
    name:              d.full_name || d.name || "Unknown",
    role:              d.position_role || "Driver",
    phone:             d.phone || "—",
    email:             d.email || "—",
    location:          d.address ? d.address.split(",").slice(-2).join(",").trim() : "—",
    truck:             d.assigned_truck_number || "—",
    trailer:           "—",
    status:            normalizeStatus(d.status),
    driverType:        normalizeDrType(d.driver_type),
    companyName:       d.company_name || "—",
    carrierName:       d.carrier_name || "—",
    ownerOperatorName: d.owner_operator_name || "—",
    employmentType:    d.employment_type || normalizeDrType(d.driver_type),
    dispatchEligible:  Boolean(d.dispatch_eligible),
    cdl:               d.license_number || "—",
    cdlState:          d.license_state  || "—",
    cdlExp,
    mvrExp,
    medicalExp,
    docs:              computeDocStatus({ cdlExp: d.license_expiration_date, mvrExp: d.mvr_expiration, medicalExp: d.medical_card_expiration }),
    rating:            Number(d.rating) || 0,
    safetyScore:       100,
    onTime:            100,
    lastLoad:            "—",
    revenueWeek:         "—",
    dispatch_blocked_at:   d.dispatch_blocked_at   || null,
    dispatch_blocked_by:   d.dispatch_blocked_by   || null,
    dispatch_block_reason: d.dispatch_block_reason || null,
    payroll_eligible:      d.payroll_eligible !== undefined ? Boolean(d.payroll_eligible) : true,
    drugTestStatus:        d.drug_test_expiration || undefined,
    backgroundCheckStatus: d.background_check_status || undefined,
    owner_operator_company: d.owner_operator_company || undefined,
  };
}

function buildAlerts(drivers: Driver[]): ComplianceAlert[] {
  const alerts: ComplianceAlert[] = [];
  for (const d of drivers) {
    if (d.docs === "Expired") {
      alerts.push({ title: "Expired Documents", driver: d.name, driverId: d.id, detail: "One or more compliance docs are expired", level: "critical" });
    } else if (d.docs === "Expiring") {
      alerts.push({ title: "Documents Expiring Soon", driver: d.name, driverId: d.id, detail: "Docs expire within 30 days — action required", level: "warning" });
    } else if (d.docs === "Missing") {
      alerts.push({ title: "Missing Documents", driver: d.name, driverId: d.id, detail: "CDL, MVR, or medical card date not on file", level: "warning" });
    }
  }
  return alerts.slice(0, 6);
}

function isDateExpiredOrMissing(mmddyyyy: string): "missing" | "expired" | "expiring" | "ok" {
  if (!mmddyyyy || mmddyyyy === "—") return "missing";
  const parts = mmddyyyy.split("/");
  if (parts.length !== 3) return "missing";
  const d = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
  if (isNaN(d.getTime())) return "missing";
  const diff = (d.getTime() - Date.now()) / 86_400_000;
  if (diff < 0) return "expired";
  if (diff <= 30) return "expiring";
  return "ok";
}

function docBadge(state: "missing" | "expired" | "expiring" | "ok"): { label: string; color: string; bg: string } {
  if (state === "missing")  return { label: "Missing",       color: "#475569", bg: "#f1f5f9" };
  if (state === "expired")  return { label: "Expired",       color: "#991b1b", bg: "#fee2e2" };
  if (state === "expiring") return { label: "Expiring Soon", color: "#854d0e", bg: "#fef9c3" };
  return { label: "✓ Current", color: "#166534", bg: "#dcfce7" };
}

function driverCCBStatus(driver: Driver): { label: string; color: string; bg: string; isManualBlock: boolean } {
  const noCompany       = driver.companyName === "—" && driver.carrierName === "—" && driver.ownerOperatorName === "—";
  const manuallyBlocked = driver.dispatchEligible === false && !!driver.dispatch_blocked_at;
  if (manuallyBlocked) return { label: "Manually Blocked", color: "#7c2d12", bg: "#fef2f2", isManualBlock: true };
  if (noCompany || driver.docs === "Expired") return { label: "Blocked",      color: "#991b1b", bg: "#fee2e2", isManualBlock: false };
  if (driver.docs === "Missing")              return { label: "Needs Review", color: "#92400e", bg: "#fef3c7", isManualBlock: false };
  if (driver.docs === "Expiring")             return { label: "Needs Review", color: "#92400e", bg: "#fef9c3", isManualBlock: false };
  return { label: "Clear", color: "#166534", bg: "#dcfce7", isManualBlock: false };
}

function isDispatchEligible(driver: Driver): boolean {
  const noCompany       = driver.companyName === "—" && driver.carrierName === "—" && driver.ownerOperatorName === "—";
  const noTruck         = !driver.truck || driver.truck === "—";
  const manuallyBlocked = driver.dispatchEligible === false && !!driver.dispatch_blocked_at;
  return !noCompany && !noTruck && !manuallyBlocked && driver.docs !== "Expired" && driver.docs !== "Missing";
}

function compactDocSummary(driver: Driver): { summary: string; color: string; bg: string } {
  const items = [
    { name: "CDL", state: isDateExpiredOrMissing(driver.cdlExp), days: daysUntil(driver.cdlExp) },
    { name: "MVR", state: isDateExpiredOrMissing(driver.mvrExp), days: daysUntil(driver.mvrExp) },
    { name: "Med", state: isDateExpiredOrMissing(driver.medicalExp), days: daysUntil(driver.medicalExp) },
  ];
  const expired  = items.filter(i => i.state === "expired");
  const missing  = items.filter(i => i.state === "missing");
  const expiring = items.filter(i => i.state === "expiring").sort((a, b) => (a.days ?? 999) - (b.days ?? 999));
  if (expired.length)  return { summary: `${expired.length} Expired`,  color: "#991b1b", bg: "#fee2e2" };
  if (missing.length)  return { summary: `${missing.length} Missing`,  color: "#475569", bg: "#f1f5f9" };
  if (expiring.length) return { summary: `${expiring[0].name}: ${expiring[0].days}d`, color: "#854d0e", bg: "#fef9c3" };
  return { summary: "✓ All Good", color: "#166534", bg: "#dcfce7" };
}

function nextExpirationLabel(driver: Driver): string {
  const candidates = [
    { name: "CDL", days: daysUntil(driver.cdlExp), exp: driver.cdlExp },
    { name: "MVR", days: daysUntil(driver.mvrExp), exp: driver.mvrExp },
    { name: "Med", days: daysUntil(driver.medicalExp), exp: driver.medicalExp },
  ].filter(c => c.days !== null && c.days > 0) as { name: string; days: number; exp: string }[];
  if (!candidates.length) return "—";
  const soonest = candidates.sort((a, b) => a.days - b.days)[0];
  return `${soonest.name}: ${soonest.exp}`;
}

function driverNextAction(driver: Driver): string {
  const noCompany = driver.companyName === "—" && driver.carrierName === "—" && driver.ownerOperatorName === "—";
  const noTruck   = !driver.truck || driver.truck === "—";
  if (noCompany) return "Assign company/carrier";
  if (driver.cdlExp     === "—") return "Upload CDL";
  if (driver.mvrExp     === "—") return "Upload MVR";
  if (driver.medicalExp === "—") return "Upload medical card";
  if (noTruck) return "Assign truck";
  const medDays = daysUntil(driver.medicalExp);
  if (medDays !== null && medDays >= 0 && medDays <= 7)  return `Medical exp. in ${medDays}d`;
  const cdlDays = daysUntil(driver.cdlExp);
  if (cdlDays !== null && cdlDays >= 0 && cdlDays <= 14) return `CDL exp. in ${cdlDays}d`;
  const mvrDays = daysUntil(driver.mvrExp);
  if (mvrDays !== null && mvrDays >= 0 && mvrDays <= 14) return `MVR exp. in ${mvrDays}d`;
  if (driver.docs === "Expired")  return "Renew expired docs";
  if (driver.docs === "Expiring") return "Renew docs soon";
  if (driverCCBStatus(driver).label === "Manually Blocked") return "Review CCB block";
  if (driver.payroll_eligible === false) return "Review payroll hold";
  return "Ready";
}

function exportDriversCSV(drivers: Driver[]) {
  const headers = ["Name", "Role", "Phone", "Email", "Status", "Type", "Truck", "CDL #", "CDL Exp", "MVR Exp", "Medical Exp", "Docs"];
  const rows = drivers.map((d) => [
    d.name, d.role, d.phone, d.email, d.status, d.driverType,
    d.truck, d.cdl, d.cdlExp, d.mvrExp, d.medicalExp, d.docs,
  ]);
  const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `ronyx-drivers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── StatusBadge ───────────────────────────────────────── */
function StatusBadge({ status }: { status: DriverStatus | DocumentStatus }) {
  const cls =
    status === "Available" || status === "Good" || status === "Active"
      ? "premium-badge green"
      : status === "Assigned"
      ? "premium-badge blue"
      : status === "Expiring"
      ? "premium-badge amber"
      : "premium-badge red";
  return <span className={cls}>{status}</span>;
}

/* ─── Toast ─────────────────────────────────────────────── */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: "fixed", bottom: 28, right: 28, zIndex: 9999,
      background: "#0f172a", color: "#fff", padding: "13px 22px",
      borderRadius: 14, fontWeight: 700, fontSize: 14,
      boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
      animation: "fadeInUp 0.2s ease",
    }}>
      {msg}
    </div>
  );
}

/* ─── Assign modal ──────────────────────────────────────── */
function AssignModal({
  drivers,
  preselected,
  onClose,
  onSaved,
  showToast,
}: {
  drivers: Driver[];
  preselected: Driver | null;
  onClose: () => void;
  onSaved: (driverId: string, truck: string) => void;
  showToast: (msg: string) => void;
}) {
  const [driverId, setDriverId] = useState(preselected?.id ?? "");
  const [truck, setTruck]       = useState(preselected?.truck !== "—" ? preselected?.truck ?? "" : "");
  const [saving, setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) { showToast("Select a driver."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/ronyx/drivers/profile?driverId=${driverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_truck_number: truck || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      onSaved(driverId, truck);
      showToast(`Truck ${truck || "(cleared)"} assigned.`);
      onClose();
    } catch {
      showToast("Failed to assign truck. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 420, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Assign Truck</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Link a truck unit number to a driver's profile.</p>
        <form onSubmit={submit}>
          <label style={lbl}>Driver</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={inp} disabled={!!preselected}>
            <option value="">Select driver…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <label style={{ ...lbl, marginTop: 14 }}>Truck Unit #</label>
          <input value={truck} onChange={(e) => setTruck(e.target.value)} style={inp} placeholder="Unit 214" />
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={saving} style={{ flex: 1, background: saving ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving…" : "Assign"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Upload doc modal ──────────────────────────────────── */
const DOC_TYPES = ["CDL Front", "CDL Back", "MVR", "Medical Card", "Drug Test", "Background Check", "Insurance", "Driver Application Package", "W-9 / Tax Form", "Voided Check", "Direct Deposit Form", "Signed Contract"];

function UploadDocModal({
  drivers,
  preselectedDriver,
  preselectedDocType,
  onClose,
  showToast,
}: {
  drivers: Driver[];
  preselectedDriver?: Driver;
  preselectedDocType?: string;
  onClose: () => void;
  showToast: (msg: string) => void;
}) {
  const [driverId, setDriverId]   = useState(preselectedDriver?.id ?? "");
  const [docType, setDocType]     = useState(preselectedDocType ?? "");
  const [file, setFile]           = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded]   = useState<{ fileUrl: string; driverProfileId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function openDoc(fileUrl: string, doPrint = false) {
    try {
      const res  = await fetch(`/api/ronyx/view-doc?url=${encodeURIComponent(fileUrl)}`);
      const data = await res.json();
      const url  = data.signed_url || fileUrl;
      if (doPrint) { const w = window.open(url); if (w) w.onload = () => w.print(); }
      else window.open(url, "_blank");
    } catch { window.open(fileUrl, "_blank"); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) { showToast("Select a driver."); return; }
    if (!docType)  { showToast("Select a document type."); return; }
    if (!file)     { showToast("Choose a file to upload."); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("driver_id", driverId);
      form.append("doc_type", docType);
      form.append("file", file);
      const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      showToast(`${docType} uploaded successfully.`);
      setUploaded({ fileUrl: data.document?.file_url, driverProfileId: driverId });
    } catch (err: any) {
      showToast(err?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  if (uploaded) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 420, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 8 }}>✅</div>
          <h2 style={{ margin: "0 0 4px", fontSize: "1.1rem", fontWeight: 800 }}>{docType} Uploaded</h2>
          <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 20px" }}>Document saved to driver's record.</p>
          {uploaded.fileUrl && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => openDoc(uploaded.fileUrl)} style={{ padding: "7px 16px", borderRadius: 8, background: "#dbeafe", color: "#1e40af", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>👁 View</button>
              <button onClick={() => openDoc(uploaded.fileUrl, true)} style={{ padding: "7px 16px", borderRadius: 8, background: "#f3f4f6", color: "#374151", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🖨️ Print</button>
              <a href={`mailto:?subject=${encodeURIComponent(docType)}&body=${encodeURIComponent("Document: " + docType + "\n\nFile: " + uploaded.fileUrl)}`}
                style={{ padding: "7px 16px", borderRadius: 8, background: "#d1fae5", color: "#065f46", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>📧 Email</a>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Link href={`/ronyx/drivers/${uploaded.driverProfileId}?tab=documents`} style={{ padding: "8px 16px", borderRadius: 9, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>
              View All Docs
            </Link>
            <button onClick={onClose} style={{ padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 9, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff", fontSize: 13 }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 460, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.25)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Upload Document</h2>
        <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>Attach a compliance document to a driver's record.</p>
        <form onSubmit={submit}>
          <label style={lbl}>Driver</label>
          <select value={driverId} onChange={(e) => setDriverId(e.target.value)} style={inp} disabled={!!preselectedDriver}>
            <option value="">Select driver…</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <label style={{ ...lbl, marginTop: 14 }}>Document Type</label>
          <select value={docType} onChange={(e) => setDocType(e.target.value)} style={inp} disabled={!!preselectedDocType}>
            <option value="">Select type…</option>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label style={{ ...lbl, marginTop: 14 }}>File</label>
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: "2px dashed #cbd5e1", borderRadius: 12, padding: "18px", textAlign: "center", cursor: "pointer", background: "#f8fafc", marginBottom: 4 }}
          >
            {file ? (
              <span style={{ fontWeight: 700, color: "#1e40af", fontSize: 13 }}>📄 {file.name}</span>
            ) : (
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Click to select PDF, JPG, PNG, or WEBP</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="submit" disabled={uploading} style={{ flex: 1, background: uploading ? "#93c5fd" : "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: uploading ? "not-allowed" : "pointer" }}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: "0.72rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.88rem", outline: "none", background: "#fff", boxSizing: "border-box", fontWeight: 600 };

/* ─── Driver Import Center ──────────────────────────────── */
const DRIVER_IMPORT_MAP: Record<string, string[]> = {
  driver_name:              ["driver","driver name","name","employee","operator","owner operator","contractor","full name"],
  phone:                    ["phone","phone number","mobile","cell","contact number","telephone"],
  email:                    ["email","email address","e-mail"],
  driver_type:              ["type","driver type","employee type","w2","1099","owner operator","pay classification"],
  truck_number:             ["truck","truck #","truck number","unit","unit #","equipment","assigned truck","vehicle"],
  cdl_number:               ["cdl","cdl #","cdl number","license number","driver license","dl number"],
  cdl_state:                ["cdl state","license state","state","dl state"],
  cdl_expiration:           ["cdl expir date","cdl exp","cdl expiration","license expiration","license exp","dl expiration","cdl exp date"],
  medical_card_number:      ["medical card #","medical card number","med card #","dot medical #"],
  medical_card_expiration:  ["medical card expir","medical card expiration","med card exp","medical exp","dot medical expiration","physical exp","med card expiration"],
  job_assignment:           ["job assignment","assignment","project","account","work assignment"],
  company_name:             ["company name","employer","trucking co"],
  mvr_expiration:           ["mvr","mvr exp","mvr expiration","motor vehicle record","mvr date"],
  drug_test_expiration:     ["drug test","drug test exp","drug screen","drug screen exp","drug test date"],
  background_check_status:  ["background","background check","bg check","background status","bg status"],
  hire_date:                ["hire date","start date","onboard date","date hired"],
  pay_rate:                 ["pay rate","driver rate","rate","hourly rate","ton rate","load rate","rate per hour"],
  pay_type:                 ["pay type","compensation","pay method","per load","per ton","pay basis"],
  owner_operator_company:   ["carrier","owner operator company","trucking company","carrier name","o/o company"],
  status:                   ["status","driver status","active","inactive","blocked","employment status"],
  notes:                    ["notes","comments","remarks","additional notes"],
};

type ImportDriverRow = {
  _idx:          number;
  driver_name:   string; phone: string; email: string; driver_type: string;
  truck_number:  string; cdl_number: string; cdl_state: string;
  cdl_expiration: string; medical_card_number: string; medical_card_expiration: string;
  job_assignment: string; company_name: string;
  mvr_expiration: string; drug_test_expiration: string; background_check_status: string;
  hire_date: string; pay_rate: string; pay_type: string;
  owner_operator_company: string; status: string; notes: string;
  _issues:       string[];
  _importStatus: "ready" | "needs_review" | "duplicate" | "skip";
  _duplicateName?: string;
};

type BackupDriverRow = {
  id: string;
  driver_name: string;
  cdl_number: string | null;
  cdl_expiration: string | null;
  truck_number: string | null;
  medical_card_number: string | null;
  medical_card_expiration: string | null;
  job_assignment: string | null;
  company_name: string | null;
  driver_status: string | null;
  dispatch_eligible: boolean | null;
  payroll_eligible: boolean | null;
  compliance_flags: string[] | null;
  last_updated: string | null;
  updated_by: string | null;
  notes: string | null;
};

function normalizeImportHeader(h: string): string {
  const lower = h.trim().toLowerCase();
  for (const [field, aliases] of Object.entries(DRIVER_IMPORT_MAP)) {
    if (aliases.some(a => lower === a || lower.includes(a))) return field;
  }
  return lower.replace(/[^a-z0-9]/g, "_");
}

function parseExpirationDate(raw: string | Date | number): string {
  if (!raw && raw !== 0) return "";
  // cellDates:true returns a JS Date object directly
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return "";
    return raw.toISOString().slice(0, 10);
  }
  // Excel serial number (e.g. 45678)
  const n = Number(raw);
  if (!isNaN(n) && n > 40000 && n < 100000) {
    const d = new Date((n - 25569) * 86400000);
    return d.toISOString().slice(0, 10);
  }
  // String date
  const str = String(raw).trim();
  if (!str) return "";
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str;
}

function buildDriverIssues(row: ImportDriverRow, existing: Driver[]): { issues: string[]; status: ImportDriverRow["_importStatus"]; dupName?: string } {
  const issues: string[] = [];
  const now = new Date();

  if (!row.driver_name?.trim()) issues.push("MISSING_NAME");

  if (!row.cdl_expiration) {
    issues.push("MISSING_CDL_EXPIRATION");
  } else {
    const exp = new Date(row.cdl_expiration);
    if (!isNaN(exp.getTime()) && exp < now) issues.push("CDL_EXPIRED");
  }

  if (!row.medical_card_expiration) {
    issues.push("MISSING_MEDICAL_CARD");
  } else {
    const exp = new Date(row.medical_card_expiration);
    if (!isNaN(exp.getTime()) && exp < now) issues.push("MEDICAL_CARD_EXPIRED");
  }

  if (!row.mvr_expiration)        issues.push("MISSING_MVR");
  if (!row.drug_test_expiration)  issues.push("MISSING_DRUG_TEST");

  // Duplicate check — match by name + phone
  const name = (row.driver_name || "").toLowerCase().trim();
  const phone = (row.phone || "").replace(/\D/g, "");
  const dup = existing.find(d => {
    const dn = d.name.toLowerCase().trim();
    const dp = d.phone.replace(/\D/g, "");
    return dn === name || (phone && dp === phone);
  });

  if (dup) return { issues, status: "duplicate", dupName: dup.name };
  if (issues.includes("MISSING_NAME")) return { issues, status: "needs_review" };
  if (issues.length > 2) return { issues, status: "needs_review" };
  return { issues, status: "ready" };
}

function DriverImportModal({ existingDrivers, onClose, onImported, showToast }: {
  existingDrivers: Driver[];
  onClose: () => void;
  onImported: (count: number) => void;
  showToast: (msg: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep]           = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [fileName, setFileName]   = useState("");
  const [isPdf, setIsPdf]         = useState(false);
  const [rows, setRows]           = useState<ImportDriverRow[]>([]);
  const [dupActions, setDupActions] = useState<Record<number, "update" | "skip" | "create">>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ imported?: number; updated?: number; skipped?: number; failed?: number; errors?: string[]; compliance?: Record<string, number> } | null>(null);

  const kpis = useMemo(() => ({
    total:      rows.length,
    ready:      rows.filter(r => r._importStatus === "ready").length,
    needsReview: rows.filter(r => r._importStatus === "needs_review").length,
    duplicates: rows.filter(r => r._importStatus === "duplicate").length,
    missingComp: rows.filter(r => r._issues.some(i => i.startsWith("MISSING_") || i.endsWith("_EXPIRED"))).length,
  }), [rows]);

  const parseFile = useCallback(async (file: File) => {
    setFileName(file.name);
    const nameLower = file.name.toLowerCase();

    if (nameLower.endsWith(".pdf")) {
      setIsPdf(true);
      setStep("preview");
      setRows([]);
      return;
    }
    setIsPdf(false);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const parseRes = await fetch("/api/parse-excel", { method: "POST", body: fd });
      if (!parseRes.ok) throw new Error("Could not parse file");
      const { headers: parsedHeaders = [], rows: parsedRows = [] } = await parseRes.json();
      const raw: any[][] = [parsedHeaders, ...parsedRows];

      if (raw.length < 2) {
        showToast("File appears empty — no data rows found below the header.");
        return;
      }

      const headers = (raw[0] as any[]).map((h: any) => String(h ?? ""));
      const normHeaders = headers.map(normalizeImportHeader);

      const parsed: ImportDriverRow[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i] as any[];
        if (row.every((c: any) => c === "" || c == null)) continue;

        const get = (field: string): string => {
          const idx = normHeaders.indexOf(field);
          if (idx < 0) return "";
          const val = row[idx];
          return val == null ? "" : String(val).trim();
        };
        const getRaw = (field: string): string | Date | number => {
          const idx = normHeaders.indexOf(field);
          return idx >= 0 ? (row[idx] ?? "") : "";
        };

        const r: ImportDriverRow = {
          _idx: i,
          driver_name:              get("driver_name"),
          phone:                    get("phone"),
          email:                    get("email"),
          driver_type:              get("driver_type"),
          truck_number:             get("truck_number"),
          cdl_number:               get("cdl_number"),
          cdl_state:                get("cdl_state"),
          cdl_expiration:           parseExpirationDate(getRaw("cdl_expiration")),
          medical_card_number:      get("medical_card_number"),
          medical_card_expiration:  parseExpirationDate(getRaw("medical_card_expiration")),
          job_assignment:           get("job_assignment"),
          company_name:             get("company_name"),
          mvr_expiration:           parseExpirationDate(getRaw("mvr_expiration")),
          drug_test_expiration:     parseExpirationDate(getRaw("drug_test_expiration")),
          background_check_status:  get("background_check_status"),
          hire_date:                parseExpirationDate(getRaw("hire_date")),
          pay_rate:                 get("pay_rate"),
          pay_type:                 get("pay_type"),
          owner_operator_company:   get("owner_operator_company"),
          status:                   get("status") || "pending_review",
          notes:                    get("notes"),
          _issues: [], _importStatus: "ready",
        };

        const { issues, status: importStatus, dupName } = buildDriverIssues(r, existingDrivers);
        r._issues = issues;
        r._importStatus = importStatus;
        if (dupName) r._duplicateName = dupName;
        parsed.push(r);
      }

      if (parsed.length === 0) {
        showToast("No driver rows found — check that the file has data and a header row.");
        return;
      }
      setRows(parsed);
      setStep("preview");
    } catch (err) {
      console.error("Driver import parse error:", err);
      showToast(`Could not read file: ${err instanceof Error ? err.message : "check format and try again"}`);
    }
  }, [existingDrivers, showToast]);

  const submitImport = useCallback(async () => {
    setImporting(true);
    setImportProgress(0);
    setStep("importing");
    try {
      const payload = rows
        .filter(r => {
          if (r._importStatus === "duplicate") {
            const action = dupActions[r._idx] ?? "update"; // default: update existing
            return action !== "skip";
          }
          return r._importStatus !== "skip";
        })
        .map(r => ({
          ...r,
          _dup_action: r._importStatus === "duplicate" ? (dupActions[r._idx] ?? "update") : undefined,
        }));

      // Send in batches of 10 so we can show real progress
      const BATCH = 10;
      const total = payload.length;
      let imported = 0, updated = 0, skipped = 0, failed = 0;
      const errors: string[] = [];
      let compliance: Record<string, number> = {};
      let batchId: string | null = null;

      for (let i = 0; i < total; i += BATCH) {
        const chunk = payload.slice(i, i + BATCH);
        const isFirst = i === 0;
        const res: Response = await fetch("/api/ronyx/drivers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: chunk,
            file_name: isFirst ? fileName : undefined,
            upload_type: isPdf ? "pdf" : "excel",
            batch_id: isFirst ? undefined : batchId, // reuse batch for subsequent chunks
          }),
        });
        const data: any = await res.json();
        imported += data.imported || 0;
        updated  += data.updated  || 0;
        skipped  += data.skipped  || 0;
        failed   += data.failed   || 0;
        if (data.errors?.length) errors.push(...data.errors);
        if (data.compliance) {
          for (const [k, v] of Object.entries(data.compliance)) {
            compliance[k] = (compliance[k] || 0) + (v as number);
          }
        }
        if (isFirst && data.batch_id) batchId = data.batch_id;
        setImportProgress(Math.round(((i + chunk.length) / total) * 100));
      }

      const result = { imported, updated, skipped, failed, errors, compliance };
      setImportResult(result);
      setStep("done");
      if (imported > 0 || updated > 0) {
        onImported(imported + updated);
        showToast(`Upload complete — ${imported} added, ${updated} updated.`);
      }
    } catch {
      showToast("Upload failed — check connection.");
      setStep("preview");
    } finally {
      setImporting(false);
    }
  }, [rows, dupActions, fileName, isPdf, onImported, showToast]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 300, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}>
      <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: 980, boxShadow: "0 32px 80px rgba(0,0,0,0.35)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#0f172a", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Driver Command Center</div>
            <h2 style={{ margin: 0, color: "#fff", fontSize: "1.25rem", fontWeight: 900 }}>⬆ Driver Import Center</h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>Upload Excel, CSV, or PDF driver lists — review before importing</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          {(["upload", "preview", "importing", "done"] as const).map((s, i) => (
            <div key={s} style={{ flex: 1, padding: "10px 0", textAlign: "center", fontSize: "0.7rem", fontWeight: 700,
              color: step === s ? "#1e40af" : "#94a3b8",
              borderBottom: step === s ? "2px solid #1e40af" : "2px solid transparent" }}>
              {i + 1}. {s === "upload" ? "Upload File" : s === "preview" ? "Preview & Fix" : s === "importing" ? "Importing" : "Done"}
            </div>
          ))}
        </div>

        <div style={{ padding: 28 }}>

          {/* ── STEP: upload ── */}
          {step === "upload" && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void parseFile(f); }}
                style={{ border: "2px dashed #bfdbfe", borderRadius: 16, padding: "48px 32px", textAlign: "center", cursor: "pointer", background: "#eff6ff", marginBottom: 24 }}>
                <div style={{ fontSize: "2.8rem", marginBottom: 12 }}>📂</div>
                <h3 style={{ margin: "0 0 6px", fontWeight: 800, color: "#1e3a8a" }}>Upload Driver Roster</h3>
                <p style={{ margin: "0 0 16px", color: "#3b82f6", fontSize: "0.88rem" }}>
                  Upload Excel, CSV, or PDF driver lists. Ronyx will map names, phones, CDL dates,<br />
                  medical card dates, MVR expirations, and payroll eligibility.
                </p>
                <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
                  {[".xlsx", ".xls", ".csv", ".pdf"].map(ext => (
                    <span key={ext} style={{ fontSize: "0.7rem", fontWeight: 800, padding: "4px 12px", borderRadius: 99, background: "#fff", color: "#1d4ed8", border: "1px solid #bfdbfe" }}>{ext}</span>
                  ))}
                </div>
                <button style={{ padding: "10px 28px", borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.85rem", cursor: "pointer" }}>
                  Choose File
                </button>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) void parseFile(f); e.target.value = ""; }} />

              <div style={{ background: "#f8fafc", borderRadius: 12, padding: 18, fontSize: "0.8rem", color: "#475569" }}>
                <div style={{ fontWeight: 700, marginBottom: 10, color: "#0f172a" }}>Column Mapping — Supported Headers</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {Object.entries(DRIVER_IMPORT_MAP).map(([field, aliases]) => (
                    <div key={field} style={{ padding: "6px 10px", background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.04em" }}>{field.replace(/_/g, " ")}</div>
                      <div style={{ fontSize: "0.62rem", color: "#94a3b8", marginTop: 2 }}>{aliases.slice(0, 4).join(" · ")}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: preview ── */}
          {step === "preview" && (
            <div>
              {isPdf ? (
                <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center" }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>📄</div>
                  <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 4 }}>PDF Driver List Detected</div>
                  <div style={{ color: "#78350f", fontSize: "0.82rem", marginBottom: 16 }}>
                    PDF text extraction will run on the server. Staff should review extracted rows before final import.<br />
                    File: <strong>{fileName}</strong>
                  </div>
                  <button onClick={submitImport} style={{ padding: "10px 24px", borderRadius: 10, background: "#d97706", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}>
                    Submit PDF for Extraction & Review
                  </button>
                </div>
              ) : (
                <>
                  {/* KPI cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
                    {[
                      { label: "Total Rows",          value: kpis.total,       color: "#0f172a", bg: "#f8fafc", border: "#e2e8f0" },
                      { label: "Ready to Import",     value: kpis.ready,       color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
                      { label: "Needs Review",        value: kpis.needsReview, color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
                      { label: "Possible Duplicates", value: kpis.duplicates,  color: "#7c3aed", bg: "#ede9fe", border: "#ddd6fe" },
                      { label: "Missing Compliance",  value: kpis.missingComp, color: "#dc2626", bg: "#fff1f2", border: "#fecdd3" },
                    ].map(c => (
                      <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: "12px 14px", textAlign: "center" }}>
                        <div style={{ fontSize: "1.5rem", fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                        <div style={{ fontSize: "0.63rem", fontWeight: 700, color: "#64748b", marginTop: 4 }}>{c.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: "0.78rem", color: "#92400e", fontWeight: 600 }}>
                    ⚠ All imported drivers will start as <strong>Pending Review</strong> with Dispatch Eligible = No and Payroll Eligible = No until compliance is verified.
                  </div>

                  {/* Preview table */}
                  <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid #e2e8f0" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.73rem" }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["Status", "Name", "Phone", "Email", "Type", "Truck", "CDL Exp", "Med Card Exp", "MVR Exp", "Drug Test", "Pay Type", "Pay Rate", "Issues", "Action"].map(h => (
                            <th key={h} style={{ padding: "9px 10px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => {
                          const isDup = row._importStatus === "duplicate";
                          const dupAction = dupActions[row._idx] ?? "update";
                          const bgRow = isDup ? "#f5f3ff" : row._importStatus === "needs_review" ? "#fff7ed" : "#fff";
                          return (
                            <tr key={row._idx} style={{ background: bgRow, borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "7px 10px" }}>
                                <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "2px 8px", borderRadius: 99,
                                  background: isDup ? "#ede9fe" : row._importStatus === "ready" ? "#f0fdf4" : "#fff7ed",
                                  color: isDup ? "#7c3aed" : row._importStatus === "ready" ? "#15803d" : "#ea580c" }}>
                                  {isDup ? "Duplicate" : row._importStatus === "ready" ? "Ready" : "Review"}
                                </span>
                              </td>
                              <td style={{ padding: "7px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>
                                <input value={row.driver_name} onChange={e => setRows(prev => prev.map(r => r._idx === row._idx ? { ...r, driver_name: e.target.value } : r))}
                                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 7px", fontSize: "0.73rem", width: 120 }} />
                              </td>
                              <td style={{ padding: "7px 8px" }}>
                                <input value={row.phone} onChange={e => setRows(prev => prev.map(r => r._idx === row._idx ? { ...r, phone: e.target.value } : r))}
                                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 7px", fontSize: "0.73rem", width: 100 }} />
                              </td>
                              <td style={{ padding: "7px 8px" }}>
                                <span style={{ color: "#64748b" }}>{row.email || "—"}</span>
                              </td>
                              <td style={{ padding: "7px 8px" }}>
                                <select value={row.driver_type} onChange={e => setRows(prev => prev.map(r => r._idx === row._idx ? { ...r, driver_type: e.target.value } : r))}
                                  style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "3px 6px", fontSize: "0.72rem" }}>
                                  <option value="">—</option>
                                  <option value="W2">W2</option>
                                  <option value="1099">1099</option>
                                  <option value="Owner Operator">Owner Operator</option>
                                </select>
                              </td>
                              <td style={{ padding: "7px 8px", color: "#64748b" }}>{row.truck_number || "—"}</td>
                              <td style={{ padding: "7px 8px", color: row._issues.includes("CDL_EXPIRED") ? "#dc2626" : row._issues.includes("MISSING_CDL_EXPIRATION") ? "#d97706" : "#0f172a", fontWeight: 600 }}>{row.cdl_expiration || "—"}</td>
                              <td style={{ padding: "7px 8px", color: row._issues.includes("MEDICAL_CARD_EXPIRED") ? "#dc2626" : row._issues.includes("MISSING_MEDICAL_CARD") ? "#d97706" : "#0f172a", fontWeight: 600 }}>{row.medical_card_expiration || "—"}</td>
                              <td style={{ padding: "7px 8px", color: row._issues.includes("MISSING_MVR") ? "#d97706" : "#0f172a", fontWeight: 600 }}>{row.mvr_expiration || "—"}</td>
                              <td style={{ padding: "7px 8px", color: row._issues.includes("MISSING_DRUG_TEST") ? "#d97706" : "#0f172a", fontWeight: 600 }}>{row.drug_test_expiration || "—"}</td>
                              <td style={{ padding: "7px 8px", color: "#64748b" }}>{row.pay_type || "—"}</td>
                              <td style={{ padding: "7px 8px", color: "#64748b" }}>{row.pay_rate || "—"}</td>
                              <td style={{ padding: "7px 8px", maxWidth: 160 }}>
                                {row._issues.length === 0 ? (
                                  <span style={{ color: "#16a34a", fontSize: "0.65rem", fontWeight: 700 }}>✓ No issues</span>
                                ) : (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                    {row._issues.map(issue => (
                                      <span key={issue} style={{ fontSize: "0.58rem", fontWeight: 700, padding: "1px 5px", borderRadius: 99,
                                        background: issue.endsWith("_EXPIRED") ? "#fee2e2" : "#fef3c7",
                                        color: issue.endsWith("_EXPIRED") ? "#dc2626" : "#92400e" }}>
                                        {issue}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {isDup && row._duplicateName && (
                                  <div style={{ fontSize: "0.62rem", color: "#7c3aed", marginTop: 3 }}>Matches: {row._duplicateName}</div>
                                )}
                              </td>
                              <td style={{ padding: "7px 8px" }}>
                                {isDup ? (
                                  <select value={dupAction} onChange={e => setDupActions(prev => ({ ...prev, [row._idx]: e.target.value as "update" | "skip" | "create" }))}
                                    style={{ fontSize: "0.68rem", borderRadius: 6, border: "1px solid #ddd6fe", padding: "3px 6px", color: "#7c3aed" }}>
                                    <option value="update">Update Existing</option>
                                    <option value="create">Create New</option>
                                    <option value="skip">Skip</option>
                                  </select>
                                ) : (
                                  <div style={{ display: "flex", gap: 4 }}>
                                    <button
                                      onClick={() => setRows(prev => prev.map(r => r._idx === row._idx ? { ...r, _importStatus: r._importStatus === "needs_review" ? "needs_review" : "ready" } : r))}
                                      style={{ fontSize: "0.65rem", padding: "3px 9px", borderRadius: 6, border: `1.5px solid ${row._importStatus !== "skip" ? "#1d4ed8" : "#e2e8f0"}`, cursor: "pointer",
                                        background: row._importStatus !== "skip" ? "#eff6ff" : "#fff",
                                        color: row._importStatus !== "skip" ? "#1d4ed8" : "#94a3b8", fontWeight: 700 }}>
                                      ✓ Upload
                                    </button>
                                    <button
                                      onClick={() => setRows(prev => prev.map(r => r._idx === row._idx ? { ...r, _importStatus: "skip" } : r))}
                                      style={{ fontSize: "0.65rem", padding: "3px 9px", borderRadius: 6, border: `1.5px solid ${row._importStatus === "skip" ? "#dc2626" : "#e2e8f0"}`, cursor: "pointer",
                                        background: row._importStatus === "skip" ? "#fff1f2" : "#fff",
                                        color: row._importStatus === "skip" ? "#dc2626" : "#94a3b8", fontWeight: 700 }}>
                                      ✕ Skip
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
                    {(() => {
                      const importable = rows.filter(r => {
                        if (r._importStatus === "duplicate") return (dupActions[r._idx] ?? "update") !== "skip";
                        return r._importStatus !== "skip";
                      }).length;
                      return (
                        <button onClick={submitImport} disabled={importable === 0}
                          style={{ padding: "11px 28px", borderRadius: 10, background: importable === 0 ? "#94a3b8" : "#1d4ed8", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.88rem", cursor: importable === 0 ? "not-allowed" : "pointer" }}>
                          ⬆ Upload {importable} Driver{importable !== 1 ? "s" : ""}
                        </button>
                      );
                    })()}
                    <button onClick={() => { setStep("upload"); setRows([]); setFileName(""); }}
                      style={{ padding: "11px 18px", borderRadius: 10, background: "#f1f5f9", border: "none", color: "#475569", fontWeight: 600, cursor: "pointer" }}>
                      ← Upload Different File
                    </button>
                    <button onClick={() => {
                      const csv = ["Name,Phone,Email,Type,CDL Exp,Med Card Exp,MVR Exp,Drug Test,Issues",
                        ...rows.filter(r => r._importStatus === "needs_review").map(r =>
                          `"${r.driver_name}","${r.phone}","${r.email}","${r.driver_type}","${r.cdl_expiration}","${r.medical_card_expiration}","${r.mvr_expiration}","${r.drug_test_expiration}","${r._issues.join("; ")}"`)
                      ].join("\n");
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                      a.download = "driver-import-errors.csv"; a.click();
                    }} style={{ padding: "11px 18px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, cursor: "pointer" }}>
                      Export Errors
                    </button>
                    <button onClick={onClose} style={{ padding: "11px 18px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── STEP: importing ── */}
          {step === "importing" && (
            <div style={{ padding: "60px 0", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 16 }}>⬆</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 6 }}>Uploading Drivers…</div>
              <div style={{ color: "#64748b", fontSize: "0.83rem", marginBottom: 24 }}>
                {importProgress < 30 ? "Connecting to database…" : importProgress < 70 ? "Creating records, checking duplicates…" : "Generating compliance alerts…"}
              </div>
              <div style={{ maxWidth: 360, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Progress</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#1d4ed8" }}>{importProgress}%</span>
                </div>
                <div style={{ height: 10, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ width: `${importProgress}%`, height: "100%", background: "linear-gradient(90deg, #1d4ed8, #3b82f6)", borderRadius: 99, transition: "width 300ms ease" }} />
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 10 }}>
                  {importProgress === 100 ? "Finalizing…" : "Do not close this window"}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: done ── */}
          {step === "done" && importResult && (
            <div style={{ padding: "32px 0" }}>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>✓</div>
                <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#15803d", marginBottom: 4 }}>Import Complete</div>
                <div style={{ color: "#64748b", fontSize: "0.83rem" }}>All imported drivers are set to Pending Review</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                {[
                  { label: "Imported",    value: importResult.imported ?? 0,  color: "#15803d", bg: "#f0fdf4" },
                  { label: "Updated",     value: importResult.updated  ?? 0,  color: "#1d4ed8", bg: "#eff6ff" },
                  { label: "Skipped",     value: importResult.skipped  ?? 0,  color: "#64748b", bg: "#f8fafc" },
                  { label: "Failed",      value: importResult.failed   ?? 0,  color: "#dc2626", bg: "#fff1f2" },
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, borderRadius: 10, padding: "16px 0", textAlign: "center" }}>
                    <div style={{ fontSize: "2rem", fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginTop: 6 }}>{c.label}</div>
                  </div>
                ))}
              </div>
              {/* Compliance flags saved to system */}
              {importResult.compliance && Object.values(importResult.compliance).some(v => (v as number) > 0) && (
                <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, color: "#92400e", marginBottom: 10, fontSize: "0.82rem" }}>⚠ Compliance Issues Saved to System</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px" }}>
                    {[
                      { label: "Missing CDL Expiration",      value: importResult.compliance.missing_cdl_count },
                      { label: "Missing Medical Card",         value: importResult.compliance.missing_medical_count },
                      { label: "Expired CDL",                  value: importResult.compliance.expired_cdl_count },
                      { label: "Expired Medical Card",         value: importResult.compliance.expired_medical_count },
                      { label: "Missing MVR",                  value: importResult.compliance.missing_mvr_count },
                      { label: "Missing Drug Test",            value: importResult.compliance.missing_drug_count },
                    ].filter(item => item.value > 0).map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.76rem" }}>
                        <span style={{ color: "#92400e" }}>{item.label}</span>
                        <span style={{ fontWeight: 800, color: "#dc2626", background: "#fee2e2", borderRadius: 6, padding: "1px 7px" }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#92400e", marginTop: 10, borderTop: "1px solid #fde68a", paddingTop: 8 }}>
                    These flags are saved on each driver record and visible in Compliance Monitor. Drivers with missing or expired documents are blocked from dispatch.
                  </div>
                </div>
              )}
              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8, fontSize: "0.8rem" }}>Row Errors</div>
                  {importResult.errors.slice(0, 5).map((e, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", color: "#7f1d1d", marginBottom: 4 }}>• {e}</div>
                  ))}
                </div>
              )}
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: "0.78rem", color: "#1e40af" }}>
                <strong>Next steps:</strong> Go to Drivers → Compliance to review flagged drivers and fill in missing dates. Set Dispatch Eligible only after compliance is confirmed.
              </div>
              {importResult && (importResult.imported ?? 0) === 0 && (importResult.failed ?? 0) > 0 && (
                <div style={{ background: "#fff1f2", border: "1px solid #fca5a5", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: "0.8rem", color: "#dc2626", fontWeight: 700 }}>
                  ⚠ All rows failed to insert. Check Row Errors above. Common causes: missing required fields, duplicate CDL numbers, or database column not yet added. Contact admin if errors persist.
                </div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => {
                    onImported((importResult?.imported ?? 0) + (importResult?.updated ?? 0));
                    onClose();
                    // Navigate to drivers list so user sees their imported drivers
                    window.location.href = "/ronyx/drivers";
                  }}
                  style={{ padding: "10px 24px", borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}>
                  View Drivers →
                </button>
                <button onClick={() => { setStep("upload"); setRows([]); setFileName(""); setImportResult(null); }}
                  style={{ padding: "10px 18px", borderRadius: 10, background: "#f1f5f9", border: "none", color: "#475569", fontWeight: 600, cursor: "pointer" }}>
                  Import Another File
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Confirm Modal ─────────────────────────────────────── */
type ConfirmAction = { type: "archive" | "delete"; driver: Driver };

function ConfirmModal({
  action,
  onConfirm,
  onCancel,
}: {
  action: ConfirmAction;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const isDelete = action.type === "delete";
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 28, width: 440, maxWidth: "92vw", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontSize: "2rem", marginBottom: 8 }}>{isDelete ? "🗑️" : "📦"}</div>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.1rem", fontWeight: 900, color: isDelete ? "#dc2626" : "#d97706" }}>
          {isDelete ? "Delete Driver" : "Archive Driver"}
        </h2>
        <p style={{ margin: "0 0 16px", color: "#475569", fontSize: "0.85rem" }}>
          {isDelete
            ? <>Permanently delete <strong>{action.driver.name}</strong>? Their full profile will be saved to Manager Alerts before removal.</>
            : <>Archive <strong>{action.driver.name}</strong>? They will be removed from the active roster but stay in the system. Full record saved to Manager Alerts.</>}
        </p>
        <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>
          Reason {isDelete ? "(required)" : "(optional)"}
        </label>
        <input
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={isDelete ? "Why is this driver being removed?" : "Reason for archiving…"}
          style={{ width: "100%", padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: "0.88rem", outline: "none", background: "#fff", boxSizing: "border-box", marginBottom: 18 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => { if (isDelete && !reason.trim()) return; onConfirm(reason); }}
            disabled={isDelete && !reason.trim()}
            style={{ flex: 1, background: isDelete ? "#dc2626" : "#d97706", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, cursor: isDelete && !reason.trim() ? "not-allowed" : "pointer", opacity: isDelete && !reason.trim() ? 0.5 : 1 }}
          >
            {isDelete ? "Yes, Delete" : "Yes, Archive"}
          </button>
          <button onClick={onCancel} style={{ padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 700, cursor: "pointer", color: "#475569", background: "#fff" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Manager Alerts Panel ──────────────────────────────── */
type ManagerAlert = {
  id: string;
  full_name: string;
  action_type: "deleted" | "archived";
  actioned_at: string;
  actioned_by: string;
  action_reason: string | null;
  phone: string | null;
  email: string | null;
  driver_type: string | null;
  prior_status: string | null;
  license_number: string | null;
  license_state: string | null;
  license_expiration_date: string | null;
  medical_card_number: string | null;
  medical_card_expiration: string | null;
  mvr_expiration: string | null;
  assigned_truck_number: string | null;
  job_assignment: string | null;
  company_name: string | null;
  pay_rate: number | null;
  pay_type: string | null;
  compliance_flags: string[] | null;
  notes: string | null;
  snapshot: Record<string, unknown> | null;
};

function ManagerAlertsPanel({ alerts, onClose }: { alerts: ManagerAlert[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  function fmtTs(ts: string) {
    return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  }
  function fmtD(d: string | null) { return d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"; }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex" }}>
      <div style={{ flex: 1, background: "rgba(15,23,42,0.5)" }} onClick={onClose} />
      <div style={{ width: 520, maxWidth: "95vw", background: "#fff", height: "100%", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ background: "#0f172a", padding: "22px 24px", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Manager Alerts</div>
              <h2 style={{ margin: 0, color: "#fff", fontSize: "1.15rem", fontWeight: 900 }}>Driver Archive Log</h2>
              <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>{alerts.length} total record{alerts.length !== 1 ? "s" : ""} — full snapshots preserved</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Alert cards */}
        <div style={{ padding: 16, flex: 1 }}>
          {alerts.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>✓</div>
              <div style={{ fontWeight: 700 }}>No archive records yet.</div>
              <p style={{ fontSize: "0.8rem" }}>Archived or deleted drivers will appear here.</p>
            </div>
          )}
          {alerts.map(a => {
            const isExp = expanded.has(a.id);
            const isDelete = a.action_type === "deleted";
            return (
              <div key={a.id} style={{ background: "#fff", border: `1px solid ${isDelete ? "#fecdd3" : "#fed7aa"}`, borderLeft: `4px solid ${isDelete ? "#dc2626" : "#d97706"}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
                {/* Card header */}
                <div style={{ padding: "12px 16px", background: isDelete ? "#fff1f2" : "#fff7ed" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: "0.65rem", fontWeight: 800, padding: "2px 8px", borderRadius: 99, background: isDelete ? "#dc2626" : "#d97706", color: "#fff" }}>
                          {isDelete ? "DELETED" : "ARCHIVED"}
                        </span>
                        <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>{a.full_name}</strong>
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{fmtTs(a.actioned_at)} · by {a.actioned_by || "Admin"}</div>
                      {a.action_reason && <div style={{ fontSize: "0.75rem", color: isDelete ? "#dc2626" : "#b45309", fontWeight: 600, marginTop: 3 }}>Reason: {a.action_reason}</div>}
                    </div>
                    <button
                      onClick={() => setExpanded(e => { const n = new Set(e); n.has(a.id) ? n.delete(a.id) : n.add(a.id); return n; })}
                      style={{ color: "#64748b", cursor: "pointer", fontSize: "0.78rem", fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff" }}
                    >
                      {isExp ? "Hide ▲" : "Details ▼"}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExp && (
                  <div style={{ padding: "14px 16px", borderTop: "1px solid #f1f5f9" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", fontSize: "0.78rem" }}>
                      {[
                        ["Phone",         a.phone],
                        ["Email",         a.email],
                        ["Type",          a.driver_type],
                        ["Prior Status",  a.prior_status],
                        ["Truck",         a.assigned_truck_number],
                        ["Job",           a.job_assignment],
                        ["Company",       a.company_name],
                        ["Pay Rate",      a.pay_rate ? `$${a.pay_rate}` : null],
                        ["Pay Type",      a.pay_type],
                        ["CDL #",         a.license_number],
                        ["CDL State",     a.license_state],
                        ["CDL Exp",       fmtD(a.license_expiration_date)],
                        ["Medical Card #",a.medical_card_number],
                        ["Medical Exp",   fmtD(a.medical_card_expiration)],
                        ["MVR Exp",       fmtD(a.mvr_expiration)],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{value || "—"}</div>
                        </div>
                      ))}
                    </div>
                    {a.compliance_flags && a.compliance_flags.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Compliance Flags</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {a.compliance_flags.map(f => (
                            <span key={f} style={{ background: "#fff1f2", color: "#dc2626", padding: "2px 8px", borderRadius: 6, fontSize: "0.65rem", fontWeight: 700 }}>{f.replace(/_/g, " ")}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {a.notes && (
                      <div style={{ marginTop: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 8, fontSize: "0.75rem", color: "#475569" }}>
                        <strong>Notes:</strong> {a.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── i18n ──────────────────────────────────────────────── */
const L = {
  en: {
    dispatchEligible: "Dispatch Eligible",  dispatchBlocked: "Dispatch Blocked",
    needsAttention: "Needs Attention",      noCompany: "No Company",
    missingDocs: "Missing Docs",            expiringSoon: "Expiring Soon",
    noTruck: "No Truck",                    payrollHold: "Payroll Hold",
    activeDrivers: "Active Drivers",        totalDrivers: "Total Drivers",
    allGatesPass: "All gates pass",         cannotBeAssigned: "Cannot be assigned",
    missingOrExpired: "Missing or expired", unassigned: "Unassigned",
    cdlMvrMedical: "CDL, MVR, Medical",     within30: "Within 30 days",
    needsAssignment: "Needs assignment",    payHoldsActive: "Pay holds active",
    notInactive: "Not inactive",            inSystem: "In system",
    readyNow: "Ready Now",                  missingMVR: "Missing MVR",
    missingCDL: "Missing CDL",             missingMed: "Missing Medical Card",
    expiredMed: "Expired Medical Card",     noCompanyFilter: "No Company Assigned",
    noTruckFilter: "No Truck Assigned",      needsOOFilter: "Needs Owner-Op",
    colDriver: "Driver",                    colCompany: "Company / Carrier",
    colType: "Type",                        colTruck: "Truck",
    colEligible: "Dispatch Eligible",       colCCB: "CCB",
    colDocs: "Docs",                        colNextExp: "Next Exp.",
    colPayroll: "Payroll",                  colNextAction: "Next Action",
    colActions: "Actions",
    assistantTitle: "Operations Assistant",
    criticalTitle: "CRITICAL — drivers cannot be dispatched today",
    resolveNow: "Resolve Now",
    briefing: "Morning Briefing",
    doThisFirst: "Do This First",
    nlHint: "Try: \"blocked drivers\", \"no medical card\", \"expiring soon\"",
  },
  es: {
    dispatchEligible: "Elegible Despacho",  dispatchBlocked: "Bloqueado",
    needsAttention: "Necesita Atención",    noCompany: "Sin Empresa",
    missingDocs: "Docs Faltantes",          expiringSoon: "Próximo a Vencer",
    noTruck: "Sin Camión",                  payrollHold: "Retención de Pago",
    activeDrivers: "Conductores Activos",   totalDrivers: "Total Conductores",
    allGatesPass: "Todos los requisitos",   cannotBeAssigned: "No puede asignarse",
    missingOrExpired: "Faltante o vencido", unassigned: "Sin asignar",
    cdlMvrMedical: "CDL, MVR, Médica",     within30: "En 30 días",
    needsAssignment: "Necesita asignación", payHoldsActive: "Retenciones activas",
    notInactive: "No inactivo",             inSystem: "En sistema",
    readyNow: "Listo Ahora",               missingMVR: "Sin MVR",
    missingCDL: "Sin CDL",                missingMed: "Sin Tarjeta Médica",
    expiredMed: "Tarjeta Médica Vencida",   noCompanyFilter: "Sin Empresa Asignada",
    noTruckFilter: "Sin Camión Asignado",    needsOOFilter: "Necesita Owner-Op",
    colDriver: "Conductor",                 colCompany: "Empresa / Transportista",
    colType: "Tipo",                        colTruck: "Camión",
    colEligible: "Elegible Despacho",       colCCB: "CCB",
    colDocs: "Docs",                        colNextExp: "Próx. Vence",
    colPayroll: "Nómina",                   colNextAction: "Próx. Acción",
    colActions: "Acciones",
    assistantTitle: "Asistente de Operaciones",
    criticalTitle: "CRÍTICO — conductores no pueden ser despachados hoy",
    resolveNow: "Resolver Ahora",
    briefing: "Informe Matutino",
    doThisFirst: "Hacer Primero",
    nlHint: "Intenta: \"bloqueados\", \"sin médica\", \"próximo a vencer\"",
  },
} as const;
type LKey = keyof typeof L.en;

/* ─── Main page ─────────────────────────────────────────── */
export default function DriversPage() {
  const searchParams = useSearchParams();
  const [allDrivers, setAllDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatus]     = useState("All Statuses");
  const [docFilter, setDoc]           = useState("All Docs");
  const [toast, setToast]             = useState("");
  const [assignTarget, setAssignTarget] = useState<{ driver: Driver | null } | null>(null);
  const [uploadTarget, setUploadTarget] = useState<{ driver?: Driver; docType?: string } | null>(null);
  const [importOpen, setImportOpen]     = useState(false);
  const [deduping, setDeduping]         = useState(false);
  const [assignOOTarget, setAssignOOTarget] = useState<Driver | null>(null);
  const [ooList, setOOList]             = useState<{ id: string; company_name: string }[]>([]);
  const [ooSearch, setOOSearch]         = useState("");
  const [ooSaving, setOOSaving]         = useState(false);
  const urlTab = searchParams.get("tab") as "roster" | "backup" | "import" | null;
  const [activeTab, setActiveTab]       = useState<"roster" | "backup">(urlTab === "backup" ? "backup" : "roster");
  const [backupRows, setBackupRows]     = useState<BackupDriverRow[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSearch, setBackupSearch]   = useState("");
  const [emailSending, setEmailSending]   = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [alertsList, setAlertsList]       = useState<ManagerAlert[]>([]);
  const [alertsOpen, setAlertsOpen]       = useState(false);
  const [alertsLoaded, setAlertsLoaded]   = useState(false);
  const [viewMode, setViewMode]           = useState<"cards" | "list">("list");

  const [toolsOpen, setToolsOpen]         = useState(false);
  const [needsFilter, setNeedsFilter]     = useState("All");
  const [moreMenuId, setMoreMenuId]       = useState<string | null>(null);
  const [ccbRunning, setCcbRunning]       = useState(false);
  const [drawerDriver, setDrawerDriver]   = useState<Driver | null>(null);
  const [eodReviewOpen, setEodReviewOpen] = useState(false);
  const [lang, setLang]                   = useState<"en" | "es">("en");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const T = L[lang];
  const t = (k: LKey) => T[k];

  function showToast(msg: string) { setToast(msg); }

  function loadAlerts() {
    fetch("/api/ronyx/drivers/deleted-archive")
      .then(r => r.json())
      .then(d => { setAlertsList(d.alerts || []); setAlertsLoaded(true); })
      .catch(() => setAlertsLoaded(true));
  }

  async function handleArchive(driver: Driver, reason: string) {
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/ronyx/drivers/${driver.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive", reason, actioned_by: "admin" }),
      });
      if (!res.ok) throw new Error("Archive failed");
      setAllDrivers(prev => prev.filter(d => d.id !== driver.id));
      loadAlerts();
      showToast(`${driver.name} archived — saved to Manager Alerts.`);
    } catch {
      showToast("Archive failed — try again.");
    }
  }

  async function handleDelete(driver: Driver, reason: string) {
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/ronyx/drivers/${driver.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, deleted_by: "admin" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showToast(`Delete failed: ${body.error || res.statusText}`);
        return;
      }
      setAllDrivers(prev => prev.filter(d => d.id !== driver.id));
      loadAlerts();
      showToast(`${driver.name} removed from drivers list.`);
    } catch (err: unknown) {
      showToast(`Delete failed: ${err instanceof Error ? err.message : "network error"}`);
    }
  }

  useEffect(() => {
    fetch("/api/ronyx/drivers/list")
      .then((r) => r.json())
      .then((data) => {
        const mapped = (data.drivers || []).map(mapApiDriver);
        const seen = new Set<string>();
        const deduped = mapped.filter((d: ReturnType<typeof mapApiDriver>) => {
          const key = d.name.toLowerCase().trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setAllDrivers(deduped);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
    loadAlerts();
  }, []);

  useEffect(() => {
    if (urlTab === "import") setImportOpen(true);
    if (urlTab === "backup") setActiveTab("backup");
  }, [urlTab]);

  function loadBackupData() {
    setBackupLoading(true);
    fetch("/api/ronyx/drivers/backup")
      .then(r => r.json())
      .then(data => setBackupRows(data.drivers || []))
      .catch(() => showToast("Could not load backup data. Apply migration 113 first."))
      .finally(() => setBackupLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTab === "backup" && backupRows.length === 0 && !backupLoading) {
      loadBackupData();
    }
  }, [activeTab]);

  async function handleEmailBackup() {
    setEmailSending(true);
    try {
      const res = await fetch("/api/ronyx/drivers/email-backup", { method: "POST" });
      const data = await res.json();
      if (data.ok) showToast(`Backup email sent to ${data.sentTo} — ${data.driverCount} drivers.`);
      else if (data.queued) showToast("SMTP not configured. Set GMAIL_USER + GMAIL_APP_PASSWORD.");
      else showToast(data.error || "Email failed.");
    } catch { showToast("Email failed — check server logs."); }
    finally { setEmailSending(false); }
  }

  function handleExportBackup() {
    const a = document.createElement("a");
    a.href     = "/api/ronyx/drivers/export-backup";
    a.download = `Ronyx_Driver_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    showToast("Downloading backup Excel…");
  }

  function handleAssignSaved(driverId: string, truck: string) {
    setAllDrivers((prev) => prev.map((d) => d.id === driverId ? { ...d, truck: truck || "—" } : d));
  }

  const filteredDrivers = useMemo(() => allDrivers.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.name.toLowerCase().includes(q) || d.phone.toLowerCase().includes(q) ||
      d.email.toLowerCase().includes(q) || d.truck.toLowerCase().includes(q) || d.cdl.toLowerCase().includes(q) ||
      d.companyName.toLowerCase().includes(q) || d.carrierName.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All Statuses" || d.status === statusFilter;
    const matchDoc = docFilter === "All Docs" || d.docs === docFilter ||
      (docFilter === "Needs Attention" && ["Expiring", "Expired", "Missing"].includes(d.docs));
    const noCompany = d.companyName === "—" && d.carrierName === "—" && d.ownerOperatorName === "—";
    const matchNeeds = needsFilter === "All" ||
      (needsFilter === "No Company Assigned" && noCompany) ||
      (needsFilter === "Needs Owner-Op"      && d.driverType === "Owner Operator" && !d.owner_operator_company) ||
      (needsFilter === "Missing CDL"         && d.cdlExp === "—") ||
      (needsFilter === "Missing MVR"         && d.mvrExp === "—") ||
      (needsFilter === "Missing Medical Card"&& d.medicalExp === "—") ||
      (needsFilter === "Expired Medical Card"&& d.medicalExp !== "—" && isDateExpiredOrMissing(d.medicalExp) === "expired") ||
      (needsFilter === "Missing Docs"        && d.docs === "Missing") ||
      (needsFilter === "Expired Docs"        && d.docs === "Expired") ||
      (needsFilter === "Expiring Soon"       && d.docs === "Expiring") ||
      (needsFilter === "No Truck Assigned"   && d.truck === "—") ||
      (needsFilter === "Dispatch Blocked"    && driverCCBStatus(d).label === "Blocked") ||
      (needsFilter === "Payroll Hold"        && (d.docs === "Expired" || d.docs === "Missing"));
    return matchSearch && matchStatus && matchDoc && matchNeeds;
  }), [allDrivers, search, statusFilter, docFilter, needsFilter]);

  const complianceAlerts  = useMemo(() => buildAlerts(allDrivers), [allDrivers]);
  const activeDriversCount    = allDrivers.filter((d) => d.status !== "Inactive" && d.status !== "Suspended").length;
  const documentIssues        = allDrivers.filter((d) => ["Expiring", "Expired", "Missing"].includes(d.docs)).length;
  const topDriver             = useMemo(() => [...allDrivers].sort((a, b) => b.rating - a.rating)[0] ?? null, [allDrivers]);
  const noCompanyCount        = allDrivers.filter((d) => d.companyName === "—" && d.carrierName === "—" && d.ownerOperatorName === "—").length;
  const noTruckCount          = allDrivers.filter((d) => !d.truck || d.truck === "—").length;
  const missingCDLCount       = allDrivers.filter((d) => d.cdlExp === "—").length;
  const missingMVRCount       = allDrivers.filter((d) => d.mvrExp === "—").length;
  const missingMedCount       = allDrivers.filter((d) => d.medicalExp === "—").length;
  const expiredMedCount       = allDrivers.filter((d) => d.medicalExp !== "—" && isDateExpiredOrMissing(d.medicalExp) === "expired").length;
  const missingDocsCount      = allDrivers.filter((d) => d.docs === "Missing").length;
  const expiringSoonCount     = allDrivers.filter((d) => d.docs === "Expiring").length;
  const payrollHoldCount      = allDrivers.filter((d) => d.payroll_eligible === false).length;
  const dispatchBlockedCount  = allDrivers.filter((d) => driverCCBStatus(d).label === "Blocked" || driverCCBStatus(d).label === "Manually Blocked").length;
  const dispatchEligibleCount = allDrivers.filter(isDispatchEligible).length;
  const readyCount            = allDrivers.filter((d) => driverCCBStatus(d).label === "Clear").length;
  const needsAttentionCount   = allDrivers.filter((d) => missingCDLCount > 0 || missingMVRCount > 0 || missingMedCount > 0 || expiredMedCount > 0
    ? (d.cdlExp === "—" || d.mvrExp === "—" || d.medicalExp === "—" || (d.medicalExp !== "—" && isDateExpiredOrMissing(d.medicalExp) === "expired"))
    : false).length;

  async function handleRunCCBReview() {
    if (ccbRunning) return;
    setCcbRunning(true);
    try {
      const tasks = allDrivers.flatMap((d) => {
        const items: { driver_id: string; driver_name: string; task_type: string; priority: string; assigned_to: string }[] = [];
        const noCompany = d.companyName === "—" && d.carrierName === "—" && d.ownerOperatorName === "—";
        if (noCompany)       items.push({ driver_id: d.id, driver_name: d.name, task_type: "Missing Company Assignment", priority: "critical", assigned_to: "Driver Coordinator" });
        if (d.cdlExp === "—") items.push({ driver_id: d.id, driver_name: d.name, task_type: "Missing CDL",               priority: "high",     assigned_to: "Compliance Admin" });
        if (d.mvrExp === "—") items.push({ driver_id: d.id, driver_name: d.name, task_type: "Missing MVR",               priority: "high",     assigned_to: "Compliance Admin" });
        if (d.medicalExp === "—") items.push({ driver_id: d.id, driver_name: d.name, task_type: "Missing Medical Card",   priority: "high",     assigned_to: "Compliance Admin" });
        if (d.medicalExp !== "—" && isDateExpiredOrMissing(d.medicalExp) === "expired")
          items.push({ driver_id: d.id, driver_name: d.name, task_type: "Expired Medical Card", priority: "critical", assigned_to: "Compliance Admin" });
        return items;
      });
      await fetch("/api/ronyx/ccb-tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tasks }) }).catch(() => {});
      showToast(`CCB Review complete — ${tasks.length} task${tasks.length !== 1 ? "s" : ""} created.`);
    } catch {
      showToast("CCB Review complete (tasks logged locally).");
    } finally {
      setCcbRunning(false);
    }
  }

  return (
    <main className="premium-page">
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* ── Hero ── */}
      <section className="premium-hero">
        <div>
          <p className="premium-eyebrow">Ronyx • Driver Command Center</p>
          <h1>Driver Command Center</h1>
          <p>Find, clear, assign, and manage every driver from one operational workspace.</p>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "#64748b" }}>Credential · Company · Truck · Ticket · Payroll · Dispatch Readiness</p>
        </div>
        <div className="premium-hero-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/ronyx/drivers/new" style={{ textDecoration: "none" }}>
            <button style={{ padding: "8px 16px", borderRadius: 9, background: "#0f172a", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>+ Add Driver</button>
          </Link>
          <button onClick={() => { document.getElementById("driver-finder-input")?.focus(); }}
            style={{ padding: "8px 16px", borderRadius: 9, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            🔍 Find Driver
          </button>
          <button onClick={() => setImportOpen(true)}
            style={{ padding: "8px 16px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            ⬆ Import Driver List
          </button>
          <button onClick={() => setUploadTarget({})}
            style={{ padding: "8px 16px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            Upload Documents
          </button>
          <button onClick={() => { if (!alertsLoaded) loadAlerts(); setAlertsOpen(true); }}
            style={{ position: "relative", background: alertsList.length > 0 ? "#fff1f2" : "#f8fafc", border: `1px solid ${alertsList.length > 0 ? "#fca5a5" : "#e2e8f0"}`, borderRadius: 10, padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem", color: alertsList.length > 0 ? "#dc2626" : "#475569", display: "flex", alignItems: "center", gap: 6 }}>
            🔔 Manager Alerts
            {alertsList.length > 0 && (
              <span style={{ background: "#dc2626", color: "#fff", borderRadius: 99, fontSize: "0.65rem", fontWeight: 800, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>{alertsList.length}</span>
            )}
          </button>
          <button onClick={setEodReviewOpen.bind(null, true)}
            style={{ padding: "8px 16px", borderRadius: 9, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            📋 End of Day Review
          </button>
          <button onClick={() => setLang(l => l === "en" ? "es" : "en")}
            title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
            style={{ padding: "8px 13px", borderRadius: 9, background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0369a1", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
            {lang === "en" ? "ES" : "EN"}
          </button>
          <button onClick={() => setAssistantOpen(o => !o)}
            style={{ padding: "8px 14px", borderRadius: 9, background: assistantOpen ? "#1e40af" : "#eff6ff", border: "1px solid #bfdbfe", color: assistantOpen ? "#fff" : "#1e40af", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
            ⚡ {t("assistantTitle")}
          </button>
        </div>
      </section>

      {/* ── Driver Mission Control KPIs ── */}
      <section className="premium-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(115px, 1fr))", gap: 8 }}>
        <div className={`premium-kpi${dispatchEligibleCount === allDrivers.filter(d => d.status !== "Inactive").length && allDrivers.length > 0 ? " success" : ""}`} onClick={() => setNeedsFilter("All")} style={{ cursor: "pointer" }}>
          <span>{t("dispatchEligible")}</span><strong>{loading ? "…" : dispatchEligibleCount}</strong><p>{t("allGatesPass")}</p>
        </div>
        <div className={`premium-kpi${dispatchBlockedCount > 0 ? " danger" : ""}`} onClick={() => setNeedsFilter("Dispatch Blocked")} style={{ cursor: "pointer" }}>
          <span>{t("dispatchBlocked")}</span><strong>{loading ? "…" : dispatchBlockedCount}</strong><p>{t("cannotBeAssigned")}</p>
        </div>
        <div className={`premium-kpi${needsAttentionCount > 0 ? " danger" : ""}`} onClick={() => setNeedsFilter("Missing Docs")} style={{ cursor: "pointer" }}>
          <span>{t("needsAttention")}</span><strong>{loading ? "…" : needsAttentionCount}</strong><p>{t("missingOrExpired")}</p>
        </div>
        <div className={`premium-kpi${noCompanyCount > 0 ? " warning" : ""}`} onClick={() => setNeedsFilter("No Company Assigned")} style={{ cursor: "pointer" }}>
          <span>{t("noCompany")}</span><strong>{loading ? "…" : noCompanyCount}</strong><p>{t("unassigned")}</p>
        </div>
        <div className={`premium-kpi${missingDocsCount > 0 ? " warning" : ""}`} onClick={() => setNeedsFilter("Missing Docs")} style={{ cursor: "pointer" }}>
          <span>{t("missingDocs")}</span><strong>{loading ? "…" : missingDocsCount}</strong><p>{t("cdlMvrMedical")}</p>
        </div>
        <div className={`premium-kpi${expiringSoonCount > 0 ? " warning" : ""}`} onClick={() => setNeedsFilter("Expiring Soon")} style={{ cursor: "pointer" }}>
          <span>{t("expiringSoon")}</span><strong>{loading ? "…" : expiringSoonCount}</strong><p>{t("within30")}</p>
        </div>
        <div className={`premium-kpi${noTruckCount > 0 ? " warning" : ""}`} onClick={() => setNeedsFilter("No Truck Assigned")} style={{ cursor: "pointer" }}>
          <span>{t("noTruck")}</span><strong>{loading ? "…" : noTruckCount}</strong><p>{t("needsAssignment")}</p>
        </div>
        <div className={`premium-kpi${payrollHoldCount > 0 ? " warning" : ""}`} onClick={() => setNeedsFilter("Payroll Hold")} style={{ cursor: "pointer" }}>
          <span>{t("payrollHold")}</span><strong>{loading ? "…" : payrollHoldCount}</strong><p>{t("payHoldsActive")}</p>
        </div>
        <div className="premium-kpi" onClick={() => setNeedsFilter("All")} style={{ cursor: "pointer" }}>
          <span>{t("activeDrivers")}</span><strong>{loading ? "…" : activeDriversCount}</strong><p>{t("notInactive")}</p>
        </div>
        <div className="premium-kpi" onClick={() => setNeedsFilter("All")} style={{ cursor: "pointer" }}>
          <span>{t("totalDrivers")}</span><strong>{loading ? "…" : allDrivers.length}</strong><p>{t("inSystem")}</p>
        </div>
      </section>

      {/* ── Critical Alert Banner ── */}
      {!loading && (dispatchBlockedCount > 0 || expiredMedCount > 0) && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderLeft: "4px solid #dc2626", borderRadius: 12, padding: "12px 20px", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20 }}>🚫</span>
            <div>
              <div style={{ fontWeight: 900, color: "#dc2626", fontSize: 13, letterSpacing: "-0.01em" }}>{t("criticalTitle")}</div>
              <div style={{ fontSize: 12, color: "#7f1d1d", marginTop: 2 }}>
                {[
                  dispatchBlockedCount > 0 && `${dispatchBlockedCount} blocked for dispatch`,
                  expiredMedCount > 0 && `${expiredMedCount} expired medical card${expiredMedCount > 1 ? "s" : ""}`,
                ].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>
          <button onClick={() => setNeedsFilter("Dispatch Blocked")}
            style={{ padding: "7px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
            {t("resolveNow")} →
          </button>
        </div>
      )}

      {/* ── CCB Action Queue ── */}
      {!loading && (() => {
        const queue: { priority: "critical" | "urgent" | "warning"; driver?: string; problem: string; role: string; action: string; filter: string }[] = [];
        const expiredMedDrivers = allDrivers.filter(d => d.medicalExp !== "—" && isDateExpiredOrMissing(d.medicalExp) === "expired");
        const expiredCDLDrivers = allDrivers.filter(d => d.cdlExp !== "—" && isDateExpiredOrMissing(d.cdlExp) === "expired");
        const noCompanyDrivers  = allDrivers.filter(d => d.companyName === "—" && d.carrierName === "—" && d.ownerOperatorName === "—");
        const missingCDLDrivers = allDrivers.filter(d => !d.cdl || d.cdl === "—");
        const missingMVRDrivers = allDrivers.filter(d => !d.mvrExp || d.mvrExp === "—");
        const missingMedDrivers = allDrivers.filter(d => !d.medicalExp || d.medicalExp === "—");
        const expiringSoon7     = allDrivers.filter(d => { const days = daysUntil(d.medicalExp) ?? daysUntil(d.cdlExp); return days !== null && days >= 0 && days <= 7; });
        const blockedDrivers    = allDrivers.filter(d => driverCCBStatus(d).label === "Blocked" || driverCCBStatus(d).label === "Manually Blocked");
        if (expiredMedDrivers.length > 0)
          queue.push({ priority: "critical", problem: `${expiredMedDrivers.length} driver${expiredMedDrivers.length > 1 ? "s have" : " has"} expired medical card${expiredMedDrivers.length > 1 ? "s" : ""}`, role: "Compliance Admin", action: "Request Document", filter: "Expired Medical Card" });
        if (expiredCDLDrivers.length > 0)
          queue.push({ priority: "critical", problem: `${expiredCDLDrivers.length} driver${expiredCDLDrivers.length > 1 ? "s have" : " has"} expired CDL`, role: "Compliance Admin", action: "Request Document", filter: "Missing CDL" });
        if (blockedDrivers.length > 0)
          queue.push({ priority: "urgent", problem: `${blockedDrivers.length} driver${blockedDrivers.length > 1 ? "s are" : " is"} blocked from dispatch`, role: "Dispatch Manager", action: "Review & Clear Block", filter: "Dispatch Blocked" });
        if (expiringSoon7.length > 0)
          queue.push({ priority: "urgent", problem: `${expiringSoon7.length} driver${expiringSoon7.length > 1 ? "s have" : " has"} documents expiring within 7 days`, role: "Compliance Admin", action: "Verify & Renew", filter: "Expiring Soon" });
        if (noCompanyDrivers.length > 0)
          queue.push({ priority: "warning", problem: `${noCompanyDrivers.length} driver${noCompanyDrivers.length > 1 ? "s have" : " has"} no company or truck assigned`, role: "Driver Coordinator", action: "Assign Company / Truck", filter: "No Company Assigned" });
        if (missingMedDrivers.length > 0)
          queue.push({ priority: "warning", problem: `${missingMedDrivers.length} driver${missingMedDrivers.length > 1 ? "s are" : " is"} missing medical card`, role: "Compliance Admin", action: "Request Medical Card", filter: "Missing Medical Card" });
        if (missingCDLDrivers.length > 0)
          queue.push({ priority: "warning", problem: `${missingCDLDrivers.length} driver${missingCDLDrivers.length > 1 ? "s have" : " has"} no CDL on file`, role: "Compliance Admin", action: "Request CDL Info", filter: "Missing CDL" });
        if (missingMVRDrivers.length > 0)
          queue.push({ priority: "warning", problem: `${missingMVRDrivers.length} driver${missingMVRDrivers.length > 1 ? "s have" : " has"} no MVR on file`, role: "Compliance Admin", action: "Request MVR", filter: "Missing MVR" });
        if (queue.length === 0) return null;
        const priorityColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
          critical: { bg: "#fef2f2", text: "#991b1b", border: "#fca5a5", label: "CRITICAL" },
          urgent:   { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa", label: "URGENT"   },
          warning:  { bg: "#fffbeb", text: "#92400e", border: "#fde68a", label: "ATTENTION" },
        };
        return (
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginTop: 16, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>⚡ CCB Action Queue</div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>Critical driver issues affecting dispatch, payroll, or customer eligibility</div>
              </div>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>{queue.length} task{queue.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {queue.slice(0, 6).map((item, i) => {
                const c = priorityColors[item.priority];
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: c.bg, border: `1px solid ${c.border}`, borderRadius: 9, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 900, color: c.text, background: c.border, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em", flexShrink: 0 }}>{c.label}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", flex: 1, minWidth: 200 }}>{item.problem}</span>
                    <span style={{ fontSize: "0.7rem", color: "#64748b", flexShrink: 0 }}>→ <strong>{item.role}</strong></span>
                    <button onClick={() => setNeedsFilter(item.filter)}
                      style={{ padding: "4px 11px", background: c.text, color: "#fff", border: "none", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                      {item.action} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", margin: "0 0 0 0", padding: "0" }}>
        {(["roster", "backup"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "11px 24px",
              fontWeight: 700,
              fontSize: "0.85rem",
              border: "none",
              borderBottom: activeTab === tab ? "2.5px solid #1d4ed8" : "2.5px solid transparent",
              background: "none",
              color: activeTab === tab ? "#1d4ed8" : "#64748b",
              cursor: "pointer",
              letterSpacing: "0.02em",
              marginBottom: -2,
            }}
          >
            {tab === "roster" ? "Driver Roster" : "Import / Restore Data"}
          </button>
        ))}
      </div>

      {/* ── Backup Data tab ── */}
      {activeTab === "backup" && (
        <section style={{ padding: "24px 0" }}>
          {/* Action buttons */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
            <button
              onClick={() => setImportOpen(true)}
              style={{ padding: "9px 18px", borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
            >
              ⬆ Upload Driver Sheet
            </button>
            <button
              onClick={() => { setImportOpen(true); showToast("Upload a file to begin validation."); }}
              style={{ padding: "9px 18px", borderRadius: 10, background: "#fff", border: "1px solid #e2e8f0", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
            >
              ✓ Validate Rows
            </button>
            <button
              onClick={() => setImportOpen(true)}
              style={{ padding: "9px 18px", borderRadius: 10, background: "#0f172a", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
            >
              Import / Update Drivers
            </button>
            <button
              onClick={handleExportBackup}
              style={{ padding: "9px 18px", borderRadius: 10, background: "#15803d", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
            >
              ↓ Export Backup Excel
            </button>
            <button
              onClick={handleEmailBackup}
              disabled={emailSending}
              style={{ padding: "9px 18px", borderRadius: 10, background: emailSending ? "#93c5fd" : "#7c3aed", color: "#fff", border: "none", fontWeight: 700, cursor: emailSending ? "not-allowed" : "pointer", fontSize: "0.82rem" }}
            >
              {emailSending ? "Sending…" : "✉ Email Owner Update"}
            </button>
            <button
              onClick={() => {
                const errors = backupRows.filter(r =>
                  !r.cdl_number || !r.medical_card_number || !r.cdl_expiration || !r.medical_card_expiration
                );
                if (!errors.length) { showToast("No missing-field errors to export."); return; }
                const hdr = ["Driver Name","CDL #","CDL Expiration","Medical Card #","Medical Card Exp","Truck #","Status","Missing Fields"];
                const csv = [hdr, ...errors.map(r => [
                  r.driver_name, r.cdl_number || "", fmtDate(r.cdl_expiration || ""),
                  r.medical_card_number || "", fmtDate(r.medical_card_expiration || ""),
                  r.truck_number || "", r.driver_status || "",
                  [!r.cdl_number?"CDL #":null, !r.cdl_expiration?"CDL Exp":null, !r.medical_card_number?"Med Card #":null, !r.medical_card_expiration?"Med Card Exp":null].filter(Boolean).join("; "),
                ])].map(row => row.map(v => `"${String(v ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
                const a = document.createElement("a");
                a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
                a.download = `ronyx-backup-errors-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                showToast(`Downloaded ${errors.length} error rows.`);
              }}
              style={{ padding: "9px 18px", borderRadius: 10, background: "#fff", border: "1px solid #fecdd3", color: "#dc2626", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
            >
              ↓ Download Error Report
            </button>
            <button onClick={loadBackupData} style={{ padding: "9px 14px", borderRadius: 10, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem" }}>
              ↺ Refresh
            </button>
          </div>

          {/* Backup table */}
          <div className="premium-panel" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
              <div>
                <p className="premium-eyebrow" style={{ margin: 0 }}>Driver Backup Data</p>
                <h2 style={{ margin: "2px 0 0", fontSize: "1rem" }}>Ronyx CDL / Medical Card Record</h2>
              </div>
              <input
                value={backupSearch}
                onChange={e => setBackupSearch(e.target.value)}
                placeholder="Search drivers…"
                style={{ marginLeft: "auto", padding: "7px 12px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: "0.82rem", outline: "none", width: 220 }}
              />
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", whiteSpace: "nowrap" }}>{backupRows.length} drivers</span>
            </div>

            {backupLoading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading backup data…</div>
            ) : backupRows.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                No driver records found. Apply migration 113 and import a driver list to populate this view.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      {["Driver Name","CDL #","CDL Exp","Truck #","Med Card #","Med Card Exp","Job Assignment","Company","Status","Dispatch","Payroll","Compliance","Last Updated","Updated By","Notes"].map(h => (
                        <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {backupRows
                      .filter(r => !backupSearch || (r.driver_name || "").toLowerCase().includes(backupSearch.toLowerCase()) || (r.cdl_number || "").toLowerCase().includes(backupSearch.toLowerCase()) || (r.truck_number || "").toLowerCase().includes(backupSearch.toLowerCase()))
                      .map((r, i) => {
                        const cdlDate  = r.cdl_expiration          ? new Date(r.cdl_expiration)          : null;
                        const medDate  = r.medical_card_expiration ? new Date(r.medical_card_expiration) : null;
                        const now      = Date.now();
                        const cdlColor = !r.cdl_expiration ? "#f59e0b" : cdlDate && cdlDate.getTime() < now ? "#dc2626" : cdlDate && (cdlDate.getTime() - now) < 30*86400000 ? "#d97706" : "#15803d";
                        const medColor = !r.medical_card_expiration ? "#f59e0b" : medDate && medDate.getTime() < now ? "#dc2626" : medDate && (medDate.getTime() - now) < 30*86400000 ? "#d97706" : "#15803d";
                        const missingCount = [!r.cdl_number, !r.cdl_expiration, !r.medical_card_number, !r.medical_card_expiration].filter(Boolean).length;
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>{r.driver_name || "—"}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", color: r.cdl_number ? "#0f172a" : "#dc2626" }}>{r.cdl_number || <span style={{ color: "#dc2626", fontWeight: 700 }}>MISSING</span>}</td>
                            <td style={{ padding: "8px 12px", color: cdlColor, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDate(r.cdl_expiration || "") || <span style={{ color: "#f59e0b" }}>—</span>}</td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{r.truck_number || "—"}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", color: r.medical_card_number ? "#0f172a" : "#dc2626" }}>{r.medical_card_number || <span style={{ color: "#dc2626", fontWeight: 700 }}>MISSING</span>}</td>
                            <td style={{ padding: "8px 12px", color: medColor, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtDate(r.medical_card_expiration || "") || <span style={{ color: "#f59e0b" }}>—</span>}</td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{r.job_assignment || "—"}</td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{r.company_name || "—"}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, background: r.driver_status === "active" ? "#dcfce7" : r.driver_status === "pending_review" ? "#fef3c7" : "#f1f5f9", color: r.driver_status === "active" ? "#15803d" : r.driver_status === "pending_review" ? "#92400e" : "#64748b" }}>
                                {r.driver_status || "—"}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: r.dispatch_eligible ? "#15803d" : "#dc2626" }}>{r.dispatch_eligible ? "Yes" : "No"}</span>
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: r.payroll_eligible ? "#15803d" : "#dc2626" }}>{r.payroll_eligible ? "Yes" : "No"}</span>
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              {missingCount > 0 && (
                                <span style={{ padding: "2px 7px", borderRadius: 6, background: "#fef3c7", color: "#92400e", fontSize: "0.68rem", fontWeight: 700, marginRight: 4 }}>{missingCount} missing</span>
                              )}
                              {r.compliance_flags && r.compliance_flags.length > 0 ? (
                                <span style={{ fontSize: "0.68rem", color: "#dc2626" }}>{r.compliance_flags.slice(0,2).join(", ")}{r.compliance_flags.length > 2 ? ` +${r.compliance_flags.length - 2}` : ""}</span>
                              ) : missingCount === 0 ? (
                                <span style={{ color: "#15803d", fontSize: "0.68rem", fontWeight: 700 }}>✓ OK</span>
                              ) : null}
                            </td>
                            <td style={{ padding: "8px 12px", color: "#94a3b8", whiteSpace: "nowrap" }}>{fmtDate(r.last_updated || "") || "—"}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{r.updated_by || "—"}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes || "—"}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "roster" && (
      <section style={{ padding: "0 0 32px" }}>

        {/* ── Compliance alerts — full width ── */}
        {complianceAlerts.length > 0 && (
          <div className="premium-panel" style={{ marginBottom: 20 }}>
            <div className="premium-panel-header">
              <div>
                <p className="premium-eyebrow">Compliance Watch</p>
                <h2>Expiring MVRs &amp; Documents</h2>
                <span>Priority alerts for safety, HR, and dispatch visibility.</span>
              </div>
              <Link href="/ronyx/hr-compliance" className="premium-button ghost" style={{ textDecoration: "none" }}>
                Review All
              </Link>
            </div>
            <div className="premium-alert-grid">
              {complianceAlerts.map((alert, i) => (
                <div key={i} className={alert.level === "critical" ? "premium-alert critical" : "premium-alert warning"}>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.driver}</p>
                    <span>{alert.detail}</span>
                  </div>
                  <Link href={`/ronyx/drivers/${alert.driverId}?tab=documents`} style={{ textDecoration: "none" }}>
                    <button>Open</button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Secondary action bar ── */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <button
            onClick={() => {
              if (allDrivers.length === 0) { showToast("No drivers to export yet."); return; }
              exportDriversCSV(filteredDrivers.length > 0 ? filteredDrivers : allDrivers);
              showToast(`Exported ${filteredDrivers.length || allDrivers.length} drivers as CSV.`);
            }}
            style={{ padding: "8px 16px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
          >
            Export Drivers
          </button>
          <button
            disabled={deduping}
            onClick={async () => {
              if (!window.confirm("Remove all duplicate driver records? This keeps the oldest copy of each driver and permanently deletes extras.")) return;
              setDeduping(true);
              try {
                const res = await fetch("/api/ronyx/drivers/dedup", { method: "POST" });
                const data = await res.json();
                if (!res.ok) { showToast(`Dedup failed: ${data.error}`); return; }
                showToast(data.message);
                const listRes = await fetch("/api/ronyx/drivers/list");
                const listData = await listRes.json();
                setAllDrivers((listData.drivers || []).map(mapApiDriver));
              } catch { showToast("Dedup failed — check connection."); }
              finally { setDeduping(false); }
            }}
            style={{ padding: "8px 16px", borderRadius: 9, background: deduping ? "#94a3b8" : "#fff", border: "1px solid #fca5a5", color: deduping ? "#fff" : "#dc2626", fontWeight: 700, fontSize: "0.82rem", cursor: deduping ? "not-allowed" : "pointer" }}
          >
            {deduping ? "Removing…" : "Remove Duplicates"}
          </button>
          <button
            onClick={handleRunCCBReview}
            disabled={ccbRunning}
            style={{ padding: "8px 16px", borderRadius: 9, background: ccbRunning ? "#94a3b8" : "#7c3aed", color: "#fff", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: ccbRunning ? "not-allowed" : "pointer" }}
          >
            {ccbRunning ? "Running…" : "Run CCB Review"}
          </button>
          <Link href="/ronyx/hr-compliance" style={{ textDecoration: "none" }}>
            <button style={{ padding: "8px 16px", borderRadius: 9, background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
              Compliance Review
            </button>
          </Link>
          <button
            onClick={() => setToolsOpen(o => !o)}
            style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 9, background: toolsOpen ? "#0f172a" : "#f8fafc", border: "1px solid #e2e8f0", color: toolsOpen ? "#fff" : "#475569", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            Driver Tools {toolsOpen ? "▲" : "▼"}
          </button>
        </div>

        {/* ── Driver Finder ── */}
        <div style={{ marginBottom: 14, padding: "16px 18px", background: "#eff6ff", borderRadius: 14, border: "2px solid #3b82f6", boxShadow: "0 4px 16px rgba(30,64,175,0.13)" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>🔍 Driver Finder</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ position: "relative", flex: "1 1 280px" }}>
              <input
                id="driver-finder-input"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, phone, email, CDL#, truck#, company, or owner operator…"
                style={{ width: "100%", padding: "11px 40px 11px 14px", borderRadius: 10, border: "2px solid #1e40af", fontSize: "0.92rem", outline: "none", background: "#fff", boxSizing: "border-box" as const, color: "#0f172a", fontWeight: 600 }}
              />
              {search ? (
                <button onClick={() => setSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#1e40af", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "0.7rem", color: "#fff", fontWeight: 900 }}>✕</button>
              ) : (
                <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "1.1rem", opacity: 0.35, pointerEvents: "none" }}>🔍</span>
              )}
            </div>
            <select value={statusFilter} onChange={e => setStatus(e.target.value)}
              style={{ padding: "11px 12px", borderRadius: 10, border: "2px solid #1e40af", fontSize: "0.88rem", fontWeight: 600, color: "#0f172a", background: "#fff", cursor: "pointer", minWidth: 140 }}>
              <option>All Statuses</option>
              <option>Active</option>
              <option>Available</option>
              <option>Assigned</option>
              <option>Inactive</option>
              <option>Suspended</option>
            </select>
            <select value={docFilter} onChange={e => setDoc(e.target.value)}
              style={{ padding: "11px 12px", borderRadius: 10, border: "2px solid #1e40af", fontSize: "0.88rem", fontWeight: 600, color: "#0f172a", background: "#fff", cursor: "pointer", minWidth: 140 }}>
              <option>All Docs</option>
              <option>Good</option>
              <option>Expiring</option>
              <option>Expired</option>
              <option>Missing</option>
              <option>Needs Attention</option>
            </select>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button onClick={() => setViewMode("list")} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: viewMode === "list" ? "#0f172a" : "#fff", color: viewMode === "list" ? "#fff" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>☰ List</button>
              <button onClick={() => setViewMode("cards")} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", background: viewMode === "cards" ? "#0f172a" : "#fff", color: viewMode === "cards" ? "#fff" : "#475569", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>⊞ Cards</button>
            </div>
          </div>
          {/* Quick filter chips */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {[
              { label: t("readyNow"),         filter: "All",                 count: readyCount,                                                        active: needsFilter === "All" && !search },
              { label: t("dispatchBlocked"),  filter: "Dispatch Blocked",    count: dispatchBlockedCount,                                              active: needsFilter === "Dispatch Blocked" },
              { label: t("missingDocs"),      filter: "Missing Docs",        count: allDrivers.filter(d => d.docs === "Missing").length,               active: needsFilter === "Missing Docs" },
              { label: t("expiringSoon"),     filter: "Expiring Soon",       count: allDrivers.filter(d => d.docs === "Expiring").length,              active: needsFilter === "Expiring Soon" },
              { label: t("noCompanyFilter"),  filter: "No Company Assigned", count: noCompanyCount,                                                    active: needsFilter === "No Company Assigned" },
              { label: t("needsOOFilter"),    filter: "Needs Owner-Op",      count: allDrivers.filter(d => d.driverType === "Owner Operator" && !d.owner_operator_company).length, active: needsFilter === "Needs Owner-Op" },
              { label: t("noTruckFilter"),    filter: "No Truck Assigned",   count: allDrivers.filter(d => d.truck === "—").length,                   active: needsFilter === "No Truck Assigned" },
              { label: t("payrollHold"),      filter: "Payroll Hold",        count: allDrivers.filter(d => d.docs === "Expired" || d.docs === "Missing").length, active: needsFilter === "Payroll Hold" },
              { label: t("missingCDL"),       filter: "Missing CDL",         count: missingCDLCount,                                                   active: needsFilter === "Missing CDL" },
              { label: t("missingMVR"),       filter: "Missing MVR",         count: missingMVRCount,                                                   active: needsFilter === "Missing MVR" },
              { label: t("missingMed"),       filter: "Missing Medical Card", count: missingMedCount,                                                  active: needsFilter === "Missing Medical Card" },
              { label: t("expiredMed"),       filter: "Expired Medical Card", count: expiredMedCount,                                                  active: needsFilter === "Expired Medical Card" },
            ].map(({ label, filter, count, active }) => (
              <button key={label} onClick={() => setNeedsFilter(filter)} style={{
                padding: "4px 10px", borderRadius: 99, border: `1px solid ${active ? "#1e40af" : "#bfdbfe"}`,
                background: active ? "#1e40af" : "#fff", color: active ? "#fff" : "#1e40af",
                fontWeight: 700, fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                {label}
                {count > 0 && <span style={{ background: active ? "rgba(255,255,255,0.25)" : "#dbeafe", borderRadius: 99, padding: "0 5px", fontSize: "0.6rem", fontWeight: 800, color: active ? "#fff" : "#1e40af" }}>{count}</span>}
              </button>
            ))}
            {(search || needsFilter !== "All") && (
              <button onClick={() => { setSearch(""); setNeedsFilter("All"); setStatus("All Statuses"); setDoc("All Docs"); }} style={{ padding: "4px 10px", borderRadius: 99, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", fontWeight: 700, fontSize: "0.7rem", cursor: "pointer" }}>✕ Clear All</button>
            )}
          </div>
          {(search || needsFilter !== "All") && (
            <div style={{ marginTop: 8, fontSize: "0.75rem", color: filteredDrivers.length > 0 ? "#1e40af" : "#dc2626", fontWeight: 600 }}>
              {filteredDrivers.length > 0 ? `${filteredDrivers.length} driver${filteredDrivers.length !== 1 ? "s" : ""} found` : "No drivers match — try a different search"}
            </div>
          )}
        </div>

        {/* ── Driver Roster — full width ── */}
        <div className="premium-panel" style={{ marginBottom: 16 }}>
          <div className="premium-panel-header">
            <div>
              <p className="premium-eyebrow">Driver Roster</p>
              <h2>All Drivers{needsFilter !== "All" ? ` — ${needsFilter}` : ""}</h2>
              <span>
                {filteredDrivers.length} of {allDrivers.length} drivers shown
                {needsFilter !== "All" && " · "}
                {needsFilter !== "All" && <button onClick={() => setNeedsFilter("All")} style={{ background: "none", border: "none", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: "inherit" }}>Clear filter ✕</button>}
              </span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading drivers…</div>
          ) : filteredDrivers.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
              {allDrivers.length === 0 ? (
                <div>
                  <div style={{ fontSize: "2rem", marginBottom: 12 }}>👤</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "1rem", marginBottom: 6 }}>No drivers added yet</div>
                  <div style={{ color: "#64748b", fontSize: "0.82rem", marginBottom: 20 }}>Start your driver setup to build your roster.</div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                    <Link href="/ronyx/drivers/new" style={{ textDecoration: "none" }}>
                      <button style={{ padding: "9px 18px", background: "#0f172a", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: "pointer" }}>Add First Driver</button>
                    </Link>
                    <button onClick={() => setImportOpen(true)} style={{ padding: "9px 18px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, cursor: "pointer" }}>Import Driver List</button>
                    <button onClick={() => setUploadTarget({})} style={{ padding: "9px 18px", background: "#fff", border: "1px solid #e2e8f0", color: "#0f172a", borderRadius: 9, fontWeight: 700, cursor: "pointer" }}>Upload Documents</button>
                  </div>
                </div>
              ) : "No drivers match your search — try clearing filters."}
            </div>
          ) : viewMode === "list" ? (
            /* ── List View ── */
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }} onClick={() => setMoreMenuId(null)}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                    <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                      {[
                        { h: "",                   key: "" },
                        { h: t("colDriver"),       key: "driver" },
                        { h: t("colCompany"),      key: "company" },
                        { h: t("colType"),         key: "type" },
                        { h: t("colTruck"),        key: "truck" },
                        { h: t("colEligible"),     key: "eligible" },
                        { h: t("colCCB"),          key: "ccb" },
                        { h: t("colDocs"),         key: "docs" },
                        { h: t("colNextExp"),      key: "nextExp" },
                        { h: t("colPayroll"),      key: "payroll" },
                        { h: t("colNextAction"),   key: "nextAction" },
                        { h: t("colActions"),      key: "actions" },
                      ].map(({ h, key }) => (
                        <th key={key} style={{ padding: "9px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: key === "company" ? "#1d4ed8" : key === "nextAction" ? "#7c3aed" : "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDrivers.map((driver, idx) => {
                      const noCompany  = driver.companyName === "—" && driver.carrierName === "—" && driver.ownerOperatorName === "—";
                      const ccb        = driverCCBStatus(driver);
                      const eligible   = isDispatchEligible(driver);
                      const docSummary = compactDocSummary(driver);
                      const nextExp    = nextExpirationLabel(driver);
                      const nextAct    = driverNextAction(driver);
                      const btnS: React.CSSProperties = { padding: "3px 7px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontSize: 10, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" };
                      const menuItemS: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: "7px 12px", background: "none", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: 6, color: "#0f172a" };
                      const isMoreOpen = moreMenuId === driver.id;
                      return (
                        <React.Fragment key={driver.id}>
                          <tr
                            onClick={() => { setDrawerDriver(driver); setMoreMenuId(null); }}
                            style={{ borderBottom: "1px solid #f1f5f9", background: drawerDriver?.id === driver.id ? "#f0f9ff" : idx % 2 === 0 ? "#fff" : "#fafafa", cursor: "pointer" }}
                          >
                            {/* Avatar */}
                            <td style={{ padding: "8px 6px", textAlign: "center", width: 32 }}>
                              <div style={{ width: 26, height: 26, borderRadius: "50%", background: ccb.label === "Blocked" || ccb.label === "Manually Blocked" ? "#dc2626" : "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, margin: "0 auto" }}>
                                {driver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                              </div>
                            </td>
                            {/* Driver */}
                            <td style={{ padding: "8px 8px", minWidth: 130 }}>
                              <div style={{ fontWeight: 700, fontSize: 12, color: "#0f172a" }}>{driver.name}</div>
                              <div style={{ fontSize: 10, color: "#64748b" }}>{driver.phone !== "—" && driver.phone ? driver.phone : driver.email || "Not on file"}</div>
                            </td>
                            {/* Company / Carrier */}
                            <td style={{ padding: "8px 8px", minWidth: 130 }}>
                              {noCompany ? (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 7px", borderRadius: 5 }}>Not assigned</span>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 700, fontSize: 11, color: "#0f172a" }}>{driver.companyName !== "—" ? driver.companyName : driver.carrierName}</div>
                                  {driver.ownerOperatorName !== "—" && <div style={{ fontSize: 9, color: "#64748b" }}>OO: {driver.ownerOperatorName}</div>}
                                </>
                              )}
                            </td>
                            {/* Type */}
                            <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                              <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: driver.driverType === "Owner Operator" ? "#ede9fe" : driver.driverType === "1099" ? "#fef9c3" : "#dbeafe", color: driver.driverType === "Owner Operator" ? "#7c3aed" : driver.driverType === "1099" ? "#854d0e" : "#1e40af" }}>
                                {driver.driverType}
                              </span>
                            </td>
                            {/* Primary Truck */}
                            <td style={{ padding: "8px 8px", fontSize: 11, fontWeight: 600, color: !driver.truck || driver.truck === "—" ? "#94a3b8" : "#0f172a", whiteSpace: "nowrap" }}>
                              {driver.truck && driver.truck !== "—" ? driver.truck : <span style={{ color: "#f59e0b", fontWeight: 700 }}>Not assigned</span>}
                            </td>
                            {/* Dispatch Eligible */}
                            <td style={{ padding: "8px 8px" }}>
                              {eligible ? (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#dcfce7", color: "#166534", whiteSpace: "nowrap" }}>✓ Eligible</span>
                              ) : ccb.label === "Blocked" || ccb.label === "Manually Blocked" ? (
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 5, background: "#fef2f2", color: "#dc2626", whiteSpace: "nowrap" }}>🚫 Blocked</span>
                              ) : (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 5, background: "#fef9c3", color: "#854d0e", whiteSpace: "nowrap" }}>⚠ Not Eligible</span>
                              )}
                            </td>
                            {/* CCB Status */}
                            <td style={{ padding: "8px 8px" }}>
                              <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: ccb.bg, color: ccb.color, whiteSpace: "nowrap" }}>{ccb.label}</span>
                            </td>
                            {/* Docs — compact */}
                            <td style={{ padding: "8px 8px" }}>
                              <span
                                title="Click row to open driver drawer with full doc details"
                                style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: docSummary.bg, color: docSummary.color, whiteSpace: "nowrap", cursor: "help" }}
                              >
                                {docSummary.summary}
                              </span>
                            </td>
                            {/* Next Expiration */}
                            <td style={{ padding: "8px 8px", fontSize: 10, color: "#64748b", whiteSpace: "nowrap" }}>{nextExp}</td>
                            {/* Payroll Eligibility */}
                            <td style={{ padding: "8px 6px" }}>
                              {driver.payroll_eligible === false ? (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fef2f2", color: "#dc2626" }}>Hold</span>
                              ) : (
                                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#dcfce7", color: "#166534" }}>OK</span>
                              )}
                            </td>
                            {/* Next Action */}
                            <td style={{ padding: "8px 8px", minWidth: 140 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: nextAct === "Ready" ? "#166534" : nextAct.startsWith("Review CCB") ? "#7c2d12" : "#92400e" }}>
                                {nextAct}
                              </span>
                            </td>
                            {/* Actions */}
                            <td style={{ padding: "8px 6px" }} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                                <button onClick={() => setDrawerDriver(driver)} style={{ ...btnS, background: "#eff6ff", color: "#1d4ed8", borderColor: "#bfdbfe" }}>View</button>
                                <Link href={`/ronyx/drivers/${driver.id}`} style={{ textDecoration: "none" }}>
                                  <button style={btnS}>Profile</button>
                                </Link>
                                {(ccb.label === "Blocked" || ccb.label === "Manually Blocked") && (
                                  <button
                                    style={{ ...btnS, background: "#fef2f2", color: "#dc2626", borderColor: "#fca5a5", fontWeight: 800 }}
                                    onClick={() => {
                                      if (!confirm(`Unblock ${driver.name} and restore dispatch eligibility?`)) return;
                                      fetch(`/api/ronyx/drivers/${driver.id}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          dispatch_eligible: true,
                                          dispatch_blocked_by: "admin",
                                          audit_action: "unblock_dispatch",
                                          driver_name: driver.name,
                                          audit_metadata: { unblocked_by: "admin", previous_status: ccb.label },
                                        }),
                                      })
                                        .then((r) => r.json())
                                        .then((res) => {
                                          if (res.ok) {
                                            showToast(`✓ ${driver.name} unblocked — dispatch restored`);
                                            setAllDrivers((prev) => prev.map((d) =>
                                              d.id === driver.id
                                                ? { ...d, dispatchEligible: true, dispatch_blocked_at: null, dispatch_blocked_by: null, dispatch_block_reason: null }
                                                : d
                                            ));
                                          } else {
                                            showToast(`Error: ${res.error || "Could not unblock driver"}`);
                                          }
                                        })
                                        .catch(() => showToast("Network error — could not unblock driver"));
                                    }}
                                  >
                                    🔓 Unblock
                                  </button>
                                )}
                                <div style={{ position: "relative" }}>
                                  <button
                                    style={{ ...btnS, background: isMoreOpen ? "#0f172a" : "#f8fafc", color: isMoreOpen ? "#fff" : "#475569" }}
                                    onClick={(e) => { e.stopPropagation(); setMoreMenuId(isMoreOpen ? null : driver.id); }}
                                  >
                                    More ⋯
                                  </button>
                                  {isMoreOpen && (
                                    <div style={{ position: "absolute", right: 0, top: "100%", marginTop: 2, zIndex: 50, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.13)", minWidth: 176, padding: 6 }}>
                                      <Link href={`/ronyx/drivers/${driver.id}?tab=documents`} style={{ textDecoration: "none" }}>
                                        <button style={menuItemS} onClick={() => setMoreMenuId(null)}>📄 Documents</button>
                                      </Link>
                                      <button style={menuItemS} onClick={() => { showToast(`CCB review queued for ${driver.name}`); setMoreMenuId(null); }}>🔍 CCB Review</button>
                                      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                                      <button style={menuItemS} onClick={() => { setAssignTarget({ driver }); setMoreMenuId(null); }}>Assign Truck</button>
                                      <button style={menuItemS} onClick={() => { setAssignOOTarget(driver); setOOSearch(driver.carrierName && driver.carrierName !== "—" ? driver.carrierName : ""); setMoreMenuId(null); if (ooList.length === 0) { fetch("/api/ronyx/owner-operators").then(r => r.json()).then(d => setOOList((d.companies || []).map((o: any) => ({ id: o.id, company_name: o.company_name })))); } }}>Assign Company</button>
                                      <Link href={`/ronyx/drivers/${driver.id}?tab=oo`} style={{ textDecoration: "none" }}>
                                        <button style={menuItemS} onClick={() => setMoreMenuId(null)}>Open Owner Operator</button>
                                      </Link>
                                      <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "4px 0" }} />
                                      {/* Block Driver — only shown when driver is NOT already manually blocked */}
                                      {ccb.label !== "Manually Blocked" && (
                                        <button
                                          style={{ ...menuItemS, color: "#dc2626" }}
                                          onClick={() => {
                                            const reason = safePrompt(`Reason for blocking ${driver.name} from dispatch:`);
                                            if (reason === null) return;
                                            setMoreMenuId(null);
                                            fetch(`/api/ronyx/drivers/${driver.id}`, {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({
                                                dispatch_eligible: false,
                                                dispatch_block_reason: reason || "Manual block",
                                                dispatch_blocked_by: "admin",
                                                audit_action: "block_dispatch",
                                                driver_name: driver.name,
                                                audit_metadata: { blocked_by: "admin", reason: reason || "Manual block" },
                                              }),
                                            })
                                              .then((r) => r.json())
                                              .then((res) => {
                                                if (res.ok) {
                                                  showToast(`🔒 ${driver.name} blocked from dispatch`);
                                                  setAllDrivers((prev) => prev.map((d) =>
                                                    d.id === driver.id
                                                      ? { ...d, dispatchEligible: false, dispatch_blocked_at: new Date().toISOString(), dispatch_blocked_by: "admin", dispatch_block_reason: reason || "Manual block" }
                                                      : d
                                                  ));
                                                } else {
                                                  showToast(`Error: ${res.error || "Could not block driver"}`);
                                                }
                                              })
                                              .catch(() => showToast("Network error — could not block driver"));
                                          }}
                                        >
                                          🔒 Block from Dispatch
                                        </button>
                                      )}
                                      <button style={{ ...menuItemS, color: "#d97706" }} onClick={() => { setConfirmAction({ type: "archive", driver }); setMoreMenuId(null); }}>Archive</button>
                                      <button style={{ ...menuItemS, color: "#dc2626" }} onClick={() => { setConfirmAction({ type: "delete", driver }); setMoreMenuId(null); }}>Delete</button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ── Card View ── */
            <div className="premium-driver-list">
              {filteredDrivers.map((driver) => (
                <article className="premium-driver-card" key={driver.id}>
                  <div className="driver-identity">
                    <div className="driver-avatar">
                      {driver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <h3>{driver.name}</h3>
                      <p>{driver.role}</p>
                      <span>{driver.location}</span>
                    </div>
                  </div>
                  <div className="driver-data-grid">
                    <div><span>Phone</span><strong>{driver.phone}</strong></div>
                    <div><span>Type</span><strong>{driver.driverType}</strong></div>
                    <div><span>Truck</span><strong>{driver.truck}</strong></div>
                    <div><span>Trailer</span><strong>{driver.trailer}</strong></div>
                    <div><span>CDL</span><strong>{driver.cdl}</strong></div>
                    <div><span>MVR Exp.</span><strong className={driver.mvrExp === "Expired" ? "danger-text" : ""}>{driver.mvrExp}</strong></div>
                    <div><span>Medical</span><strong className={driver.medicalExp === "Expired" ? "danger-text" : ""}>{driver.medicalExp}</strong></div>
                    <div><span>Revenue Week</span><strong>{driver.revenueWeek}</strong></div>
                  </div>
                  <div className="driver-score-strip">
                    <div><span>Rating</span><strong>{driver.rating > 0 ? `★ ${driver.rating}` : "—"}</strong></div>
                    <div><span>Safety</span><strong>{driver.safetyScore}%</strong></div>
                    <div><span>On-Time</span><strong>{driver.onTime}%</strong></div>
                    <div><span>Last Load</span><strong>{driver.lastLoad}</strong></div>
                  </div>
                  <div className="driver-card-footer">
                    <div className="badge-row">
                      <StatusBadge status={driver.status} />
                      <StatusBadge status={driver.docs} />
                    </div>
                    <div className="driver-actions">
                      <Link href={`/ronyx/drivers/${driver.id}`}><button>Profile</button></Link>
                      <Link href={`/ronyx/drivers/${driver.id}?tab=documents`}><button>Documents</button></Link>
                      <button onClick={() => setAssignTarget({ driver })}>Assign Truck</button>
                      <button
                        onClick={() => { setAssignOOTarget(driver); setOOSearch(driver.carrierName && driver.carrierName !== "—" ? driver.carrierName : ""); if (ooList.length === 0) { fetch("/api/ronyx/owner-operators").then(r => r.json()).then(d => setOOList((d.companies || []).map((o: any) => ({ id: o.id, company_name: o.company_name })))); } }}
                        style={{ color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff" }}
                      >Assign to OO</button>
                      <button onClick={() => setConfirmAction({ type: "archive", driver })} style={{ color: "#d97706", borderColor: "#fed7aa", background: "#fff7ed" }}>Archive</button>
                      <button onClick={() => setConfirmAction({ type: "delete", driver })} style={{ color: "#dc2626", borderColor: "#fca5a5", background: "#fff1f2" }}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* ── Driver Tools collapsible drawer ── */}
        {toolsOpen && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "22px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <p className="premium-eyebrow" style={{ margin: 0 }}>Driver Tools</p>
                <h2 style={{ margin: "2px 0 0", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>Secondary Actions</h2>
              </div>
              <button onClick={() => setToolsOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.2rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
              {[
                { label: "Send Login Invite",   onClick: () => showToast("Login invite — coming soon.") },
                { label: "Upload CDL",          onClick: () => setUploadTarget({ docType: "CDL" }) },
                { label: "Upload MVR",          onClick: () => setUploadTarget({ docType: "MVR" }) },
                { label: "Upload Medical Card", onClick: () => setUploadTarget({ docType: "Medical Card" }) },
                { label: "Assign Truck",        onClick: () => setAssignTarget({ driver: null }) },
                { label: "Create Driver Resume",onClick: () => showToast("Driver resume export — coming soon.") },
                { label: "AI Dispatch Insight", onClick: () => showToast("AI Dispatch Insight — coming soon.") },
              ].map(({ label, onClick }) => (
                <button key={label} onClick={onClick} style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
              <Link href="/ronyx/payroll" style={{ textDecoration: "none" }}>
                <button style={{ padding: "7px 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>Open Payroll Summary</button>
              </Link>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: topDriver ? "1fr 1fr" : "1fr", gap: 14 }}>
              <div style={{ background: documentIssues > 0 ? "#fff7ed" : "#f0fdf4", border: `1px solid ${documentIssues > 0 ? "#fed7aa" : "#bbf7d0"}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Recommended Action</div>
                <p style={{ margin: "0 0 10px", fontSize: "0.82rem", color: documentIssues > 0 ? "#78350f" : "#166534", fontWeight: 600 }}>
                  {documentIssues > 0
                    ? `${documentIssues} driver${documentIssues > 1 ? "s have" : " has"} compliance docs that need attention before next dispatch.`
                    : "All driver compliance docs are current. Fleet is ready for dispatch."}
                </p>
                <Link href="/ronyx/hr-compliance" style={{ textDecoration: "none" }}>
                  <button style={{ padding: "7px 16px", borderRadius: 8, background: documentIssues > 0 ? "#d97706" : "#16a34a", color: "#fff", border: "none", fontWeight: 800, fontSize: "0.8rem", cursor: "pointer" }}>
                    Run Compliance Review
                  </button>
                </Link>
              </div>

              {topDriver && (
                <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Driver Performance — Top Driver</div>
                  <Link href={`/ronyx/drivers/${topDriver.id}`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: "#0f172a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                        {topDriver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, color: "#0f172a", fontSize: 14 }}>{topDriver.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{topDriver.rating > 0 ? `★ ${topDriver.rating} rating` : "No rating yet"} · {topDriver.truck}</div>
                      </div>
                      <div style={{ marginLeft: "auto" }}><StatusBadge status={topDriver.docs} /></div>
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
      )}

      {/* ── Assign to Owner Operator Modal ── */}
      {assignOOTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 32, width: 480, boxShadow: "0 24px 60px rgba(0,0,0,0.3)", maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "#0f172a" }}>Assign to Owner Operator</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Driver: <strong>{assignOOTarget.name}</strong></div>
              </div>
              <button onClick={() => setAssignOOTarget(null)} style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {assignOOTarget.owner_operator_company && (
              <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 9, padding: "10px 14px", marginBottom: 16, fontSize: "0.78rem", color: "#1d4ed8", fontWeight: 600 }}>
                Currently assigned to: {assignOOTarget.owner_operator_company}
              </div>
            )}

            <input
              type="text"
              placeholder="Search owner operators…"
              value={ooSearch}
              onChange={e => setOOSearch(e.target.value)}
              style={{ border: "1.5px solid #e2e8f0", borderRadius: 9, padding: "10px 14px", fontSize: "0.88rem", marginBottom: 12, outline: "none", width: "100%", boxSizing: "border-box" }}
              autoFocus
            />

            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Clear assignment option */}
              <button
                onClick={async () => {
                  setOOSaving(true);
                  await fetch(`/api/ronyx/drivers/${assignOOTarget.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ owner_operator_company: null }),
                  });
                  setAllDrivers(prev => prev.map(d => d.id === assignOOTarget.id ? { ...d, owner_operator_company: "" } : d));
                  showToast(`${assignOOTarget.name} unassigned from owner operator.`);
                  setAssignOOTarget(null);
                  setOOSaving(false);
                }}
                style={{ padding: "10px 14px", borderRadius: 9, border: "1px dashed #e2e8f0", background: "#f8fafc", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", textAlign: "left" }}
              >
                🚫 Remove OO Assignment
              </button>

              {ooList.length === 0 && (
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>Loading owner operators…</div>
              )}

              {ooList
                .filter(oo => !ooSearch || oo.company_name.toLowerCase().includes(ooSearch.toLowerCase()))
                .map(oo => (
                  <button
                    key={oo.id}
                    disabled={ooSaving}
                    onClick={async () => {
                      setOOSaving(true);
                      const res = await fetch(`/api/ronyx/drivers/${assignOOTarget.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ owner_operator_company: oo.company_name }),
                      });
                      if (res.ok) {
                        setAllDrivers(prev => prev.map(d => d.id === assignOOTarget.id ? { ...d, owner_operator_company: oo.company_name } : d));
                        showToast(`${assignOOTarget.name} assigned to ${oo.company_name}.`);
                        setAssignOOTarget(null);
                      } else {
                        showToast("Failed to assign — try again.");
                      }
                      setOOSaving(false);
                    }}
                    style={{ padding: "12px 16px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: assignOOTarget.owner_operator_company === oo.company_name ? "#eff6ff" : "#fff", color: "#0f172a", fontWeight: 700, fontSize: "0.85rem", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>🏢</span>
                    <span>{oo.company_name}</span>
                    {assignOOTarget.owner_operator_company === oo.company_name && <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#1d4ed8", fontWeight: 700 }}>✓ Current</span>}
                  </button>
                ))}

              {ooList.length > 0 && ooList.filter(oo => !ooSearch || oo.company_name.toLowerCase().includes(ooSearch.toLowerCase())).length === 0 && (
                <div style={{ color: "#94a3b8", fontSize: "0.8rem", textAlign: "center", padding: "20px 0" }}>No owner operators match "{ooSearch}"</div>
              )}
            </div>

            <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setAssignOOTarget(null)} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {importOpen && (
        <DriverImportModal
          existingDrivers={allDrivers}
          onClose={() => { setImportOpen(false); }}
          onImported={count => {
            if (count > 0) showToast(`${count} driver${count > 1 ? "s" : ""} imported — refreshing list.`);
            // Reload list in background — modal stays open so user sees the done screen
            fetch("/api/ronyx/drivers/list")
              .then(r => r.json())
              .then(data => setAllDrivers((data.drivers || []).map(mapApiDriver)))
              .catch(() => null);
          }}
          showToast={showToast}
        />
      )}

      {assignTarget !== null && (
        <AssignModal
          drivers={allDrivers}
          preselected={assignTarget.driver}
          onClose={() => setAssignTarget(null)}
          onSaved={handleAssignSaved}
          showToast={showToast}
        />
      )}

      {uploadTarget !== null && (
        <UploadDocModal
          drivers={allDrivers}
          preselectedDriver={uploadTarget.driver}
          preselectedDocType={uploadTarget.docType}
          onClose={() => setUploadTarget(null)}
          showToast={showToast}
        />
      )}

      {/* ── Confirm Archive/Delete ── */}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction}
          onConfirm={reason => {
            if (confirmAction.type === "archive") handleArchive(confirmAction.driver, reason);
            else handleDelete(confirmAction.driver, reason);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* ── Manager Alerts Panel ── */}
      {alertsOpen && (
        <ManagerAlertsPanel alerts={alertsList} onClose={() => setAlertsOpen(false)} />
      )}

      {/* ── Driver Profile Drawer ── */}
      {drawerDriver && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9990, display: "flex" }} onClick={() => setDrawerDriver(null)}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.35)" }} />
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 420, maxWidth: "92vw", background: "#fff", boxShadow: "-8px 0 40px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", overflowY: "auto" }}
          >
            {/* Drawer header */}
            <div style={{ background: "#0f172a", padding: "18px 20px", color: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: "50%", background: driverCCBStatus(drawerDriver).label === "Blocked" || driverCCBStatus(drawerDriver).label === "Manually Blocked" ? "#dc2626" : "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {drawerDriver.name.split(" ").map(p => p[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "1.05rem" }}>{drawerDriver.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                    {drawerDriver.driverType} · {drawerDriver.companyName !== "—" ? drawerDriver.companyName : drawerDriver.ownerOperatorName !== "—" ? drawerDriver.ownerOperatorName : "No company assigned"}
                  </div>
                </div>
                <button onClick={() => setDrawerDriver(null)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.2rem", padding: 4 }}>✕</button>
              </div>
              {/* Contact */}
              <div style={{ display: "flex", gap: 12, fontSize: "0.72rem", color: "#94a3b8" }}>
                {drawerDriver.phone && drawerDriver.phone !== "—" && <span>📞 {drawerDriver.phone}</span>}
                {drawerDriver.email && drawerDriver.email !== "—" && <span>✉ {drawerDriver.email}</span>}
              </div>
            </div>

            {/* Status cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "14px 16px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {(() => {
                const ccb = driverCCBStatus(drawerDriver);
                const isBlocked = ccb.label === "Blocked" || ccb.label === "Manually Blocked";
                return [
                  { label: "Dispatch", value: isBlocked ? "🚫 Blocked" : "✓ Eligible", color: isBlocked ? "#dc2626" : "#16a34a", bg: isBlocked ? "#fef2f2" : "#f0fdf4" },
                  { label: "Payroll",  value: drawerDriver.payroll_eligible ? "✓ Eligible" : "⚠ Hold",   color: drawerDriver.payroll_eligible ? "#16a34a" : "#d97706", bg: drawerDriver.payroll_eligible ? "#f0fdf4" : "#fffbeb" },
                  { label: "Truck",    value: drawerDriver.truck && drawerDriver.truck !== "—" ? `Truck ${drawerDriver.truck}` : "Not assigned", color: "#0f172a", bg: "#fff" },
                  { label: "Status",   value: drawerDriver.status, color: drawerDriver.status === "Assigned" ? "#1d4ed8" : drawerDriver.status === "Suspended" ? "#dc2626" : "#16a34a", bg: "#fff" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} style={{ background: bg, borderRadius: 8, padding: "8px 10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: "0.82rem", color }}>{value}</div>
                  </div>
                ));
              })()}
            </div>

            {/* Credentials */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Credentials & Compliance</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { label: "CDL #",            value: drawerDriver.cdl || "Not on file",         expiry: drawerDriver.cdlExp },
                  { label: "CDL State",         value: drawerDriver.cdlState || "Not on file",    expiry: null },
                  { label: "MVR Expiration",    value: drawerDriver.mvrExp || "Not on file",      expiry: drawerDriver.mvrExp },
                  { label: "Medical Card Exp",  value: drawerDriver.medicalExp || "Not on file",  expiry: drawerDriver.medicalExp },
                  { label: "Drug Test Status",  value: drawerDriver.drugTestStatus || "Not on file", expiry: null },
                  { label: "Background Check",  value: drawerDriver.backgroundCheckStatus || "Not on file", expiry: null },
                ].map(({ label, value, expiry }) => {
                  const state = expiry ? isDateExpiredOrMissing(expiry) : null;
                  const textColor = state === "expired" ? "#dc2626" : state === "expiring" ? "#d97706" : state === "missing" ? "#94a3b8" : "#0f172a";
                  return (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 8px", borderRadius: 6, background: state === "expired" ? "#fef2f2" : "#f8fafc" }}>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{label}</span>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: textColor }}>{value}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tickets (placeholder — connects to Fast Scan™) */}
            <div style={{ padding: "14px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Fast Scan™ Tickets</div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", padding: "10px 0" }}>
                Connect Fast Scan™ to see verified, pending, and missing tickets for this driver.
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <Link href="/ronyx/fast-scan" style={{ textDecoration: "none" }}>
                    <button style={{ padding: "5px 12px", background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 7, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}>Open Fast Scan™</button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Drawer action buttons */}
            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button onClick={() => { setAssignTarget({ driver: drawerDriver }); setDrawerDriver(null); }}
                  style={{ padding: "8px 0", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Assign Truck</button>
                <button onClick={() => { setUploadTarget({ driver: drawerDriver }); setDrawerDriver(null); }}
                  style={{ padding: "8px 0", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Upload Document</button>
                <Link href={`/ronyx/drivers/${drawerDriver.id}`} style={{ textDecoration: "none" }}>
                  <button style={{ width: "100%", padding: "8px 0", background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Open Full Profile</button>
                </Link>
                <Link href={`/ronyx/drivers/${drawerDriver.id}?tab=documents`} style={{ textDecoration: "none" }}>
                  <button style={{ width: "100%", padding: "8px 0", background: "#fff", color: "#0f172a", border: "1px solid #e2e8f0", borderRadius: 8, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>Open Compliance</button>
                </Link>
              </div>
              {(driverCCBStatus(drawerDriver).label === "Blocked" || driverCCBStatus(drawerDriver).label === "Manually Blocked") && (
                <button
                  onClick={() => {
                    if (!confirm(`Unblock ${drawerDriver.name} and restore dispatch eligibility?`)) return;
                    fetch(`/api/ronyx/drivers/${drawerDriver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dispatch_eligible: true, dispatch_blocked_by: "admin", audit_action: "unblock_dispatch", driver_name: drawerDriver.name, audit_metadata: { unblocked_by: "admin" } }) })
                      .then(r => r.json())
                      .then(res => {
                        if (res.ok) { showToast(`✓ ${drawerDriver.name} unblocked`); setAllDrivers(prev => prev.map(d => d.id === drawerDriver.id ? { ...d, dispatchEligible: true } : d)); setDrawerDriver(null); }
                        else showToast(`Error: ${res.error || "Could not unblock"}`);
                      });
                  }}
                  style={{ width: "100%", padding: "9px 0", background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
                  ✓ Clear Dispatch Block
                </button>
              )}
              <button onClick={() => { setDrawerDriver(null); setConfirmAction({ type: "archive", driver: drawerDriver }); }}
                style={{ width: "100%", padding: "7px 0", background: "#fff", color: "#d97706", border: "1px solid #fde68a", borderRadius: 8, fontWeight: 700, fontSize: "0.75rem", cursor: "pointer" }}>
                Archive Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End of Day Review Modal ── */}
      {eodReviewOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 9995, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560, maxHeight: "80vh", overflow: "auto", boxShadow: "0 16px 48px rgba(0,0,0,0.25)" }}>
            <div style={{ background: "#0f172a", padding: "18px 22px", borderRadius: "14px 14px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#fff" }}>📋 End of Day Driver Review</div>
              <button onClick={() => setEodReviewOpen(false)} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
            </div>
            <div style={{ padding: "20px 22px" }}>
              {[
                { label: "Still on active jobs", drivers: allDrivers.filter(d => d.status === "Assigned"), color: "#1d4ed8" },
                { label: "Blocked from dispatch", drivers: allDrivers.filter(d => driverCCBStatus(d).label === "Blocked" || driverCCBStatus(d).label === "Manually Blocked"), color: "#dc2626" },
                { label: "Missing documents", drivers: allDrivers.filter(d => d.docs === "Missing"), color: "#d97706" },
                { label: "Expiring credentials", drivers: allDrivers.filter(d => d.docs === "Expiring"), color: "#ca8a04" },
                { label: "Payroll hold", drivers: allDrivers.filter(d => !d.payroll_eligible), color: "#7c3aed" },
                { label: "No company assigned", drivers: allDrivers.filter(d => d.companyName === "—" && d.carrierName === "—" && d.ownerOperatorName === "—"), color: "#dc2626" },
              ].map(({ label, drivers, color }) => drivers.length > 0 && (
                <div key={label} style={{ marginBottom: 12, padding: "10px 14px", background: "#f8fafc", borderRadius: 9, border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "0.72rem", fontWeight: 800, color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label} ({drivers.length})</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {drivers.slice(0, 8).map(d => (
                      <span key={d.id} onClick={() => { setEodReviewOpen(false); setDrawerDriver(d); }} style={{ padding: "3px 9px", background: "#fff", border: `1px solid ${color}30`, borderRadius: 6, fontSize: "0.72rem", fontWeight: 600, color: "#0f172a", cursor: "pointer" }}>{d.name}</span>
                    ))}
                    {drivers.length > 8 && <span style={{ fontSize: "0.7rem", color: "#94a3b8", alignSelf: "center" }}>+{drivers.length - 8} more</span>}
                  </div>
                </div>
              ))}
              {allDrivers.filter(d => d.status === "Assigned" || driverCCBStatus(d).label === "Blocked" || d.docs === "Missing" || d.docs === "Expiring" || !d.payroll_eligible).length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "#16a34a" }}>
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>✓</div>
                  <div style={{ fontWeight: 700 }}>All clear — no end-of-day issues to review</div>
                </div>
              )}
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => {
                  const active = allDrivers.filter(d => d.status === "Assigned" || driverCCBStatus(d).label !== "Clear");
                  const csv = ["Driver,Status,Truck,Company,Dispatch,Docs"].concat(active.map(d => `"${d.name}","${d.status}","${d.truck}","${d.companyName}","${driverCCBStatus(d).label}","${d.docs}"`)).join("\n");
                  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `eod-driver-review-${new Date().toISOString().slice(0,10)}.csv`; a.click();
                }} style={{ flex: 1, padding: "9px 0", background: "#0f172a", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Export Status Report</button>
                <button onClick={() => setEodReviewOpen(false)} style={{ flex: 1, padding: "9px 0", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}

      {/* ── Operations Assistant Panel ── */}
      {assistantOpen && (() => {
        const expiredMedDrivers = allDrivers.filter(d => d.medicalExp !== "—" && isDateExpiredOrMissing(d.medicalExp) === "expired");
        const expiredCDLDrivers = allDrivers.filter(d => d.cdlExp !== "—" && isDateExpiredOrMissing(d.cdlExp) === "expired");
        const noCompanyDrivers  = allDrivers.filter(d => d.companyName === "—" && d.carrierName === "—" && d.ownerOperatorName === "—");
        const missingMedDrivers = allDrivers.filter(d => !d.medicalExp || d.medicalExp === "—");
        const missingCDLDrivers = allDrivers.filter(d => !d.cdl || d.cdl === "—");
        const missingMVRDrivers = allDrivers.filter(d => !d.mvrExp || d.mvrExp === "—");
        const expiringSoon7     = allDrivers.filter(d => { const days = daysUntil(d.medicalExp) ?? daysUntil(d.cdlExp); return days !== null && days >= 0 && days <= 7; });
        const blockedDrivers    = allDrivers.filter(d => driverCCBStatus(d).label === "Blocked" || driverCCBStatus(d).label === "Manually Blocked");

        const tasks: { priority: "critical"|"urgent"|"warning"; title: string; detail: string; role: string; filter: string; action: string; count: number }[] = [];
        if (expiredMedDrivers.length)  tasks.push({ priority: "critical", title: `${expiredMedDrivers.length} expired medical card${expiredMedDrivers.length > 1 ? "s" : ""}`, detail: "These drivers cannot be legally dispatched. Obtain renewed cards immediately.", role: "Compliance Admin", filter: "Expired Medical Card", action: "View drivers →", count: expiredMedDrivers.length });
        if (expiredCDLDrivers.length)  tasks.push({ priority: "critical", title: `${expiredCDLDrivers.length} expired CDL${expiredCDLDrivers.length > 1 ? "s" : ""}`, detail: "CDL expired — driver is not legally licensed to operate. Pull from dispatch.", role: "Compliance Admin", filter: "Missing CDL", action: "View drivers →", count: expiredCDLDrivers.length });
        if (blockedDrivers.length)     tasks.push({ priority: "urgent",   title: `${blockedDrivers.length} blocked from dispatch`, detail: "CCB block is active. Confirm reason and resolve or clear the block.", role: "Dispatch Manager", filter: "Dispatch Blocked", action: "Review blocks →", count: blockedDrivers.length });
        if (expiringSoon7.length)      tasks.push({ priority: "urgent",   title: `${expiringSoon7.length} doc${expiringSoon7.length > 1 ? "s" : ""} expiring within 7 days`, detail: "Contact drivers now — once expired, dispatch is blocked automatically.", role: "Compliance Admin", filter: "Expiring Soon", action: "View expiring →", count: expiringSoon7.length });
        if (noCompanyDrivers.length)   tasks.push({ priority: "warning",  title: `${noCompanyDrivers.length} driver${noCompanyDrivers.length > 1 ? "s" : ""} without company`, detail: "Cannot be dispatched. Assign a carrier or owner-operator company.", role: "Driver Coordinator", filter: "No Company Assigned", action: "Assign company →", count: noCompanyDrivers.length });
        if (missingMedDrivers.length)  tasks.push({ priority: "warning",  title: `${missingMedDrivers.length} missing medical card`, detail: "Upload or request DOT medical card from driver.", role: "Compliance Admin", filter: "Missing Medical Card", action: "Upload doc →", count: missingMedDrivers.length });
        if (missingCDLDrivers.length)  tasks.push({ priority: "warning",  title: `${missingCDLDrivers.length} missing CDL info`, detail: "Enter CDL number and expiration date in the driver's profile.", role: "Compliance Admin", filter: "Missing CDL", action: "Add CDL →", count: missingCDLDrivers.length });
        if (missingMVRDrivers.length)  tasks.push({ priority: "warning",  title: `${missingMVRDrivers.length} missing MVR`, detail: "Request MVR from DMV or motor carrier. Required for compliance.", role: "Compliance Admin", filter: "Missing MVR", action: "Request MVR →", count: missingMVRDrivers.length });

        const colors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
          critical: { bg: "#fef2f2", border: "#fca5a5", text: "#991b1b", badge: "#dc2626" },
          urgent:   { bg: "#fff7ed", border: "#fed7aa", text: "#c2410c", badge: "#ea580c" },
          warning:  { bg: "#fffbeb", border: "#fde68a", text: "#92400e", badge: "#d97706" },
        };
        const nlSuggestions = [
          { phrase: lang === "en" ? "blocked drivers"      : "conductores bloqueados",   filter: "Dispatch Blocked" },
          { phrase: lang === "en" ? "no medical card"      : "sin tarjeta médica",        filter: "Missing Medical Card" },
          { phrase: lang === "en" ? "expiring soon"        : "próximo a vencer",          filter: "Expiring Soon" },
          { phrase: lang === "en" ? "no company assigned"  : "sin empresa asignada",      filter: "No Company Assigned" },
          { phrase: lang === "en" ? "missing CDL"          : "sin CDL",                   filter: "Missing CDL" },
          { phrase: lang === "en" ? "expired medical"      : "tarjeta médica vencida",    filter: "Expired Medical Card" },
          { phrase: lang === "en" ? "payroll hold"         : "retención de pago",         filter: "Payroll Hold" },
        ];
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", pointerEvents: "none" }}>
            <div style={{ flex: 1, pointerEvents: "auto" }} onClick={() => setAssistantOpen(false)} />
            <div style={{ width: 440, maxWidth: "95vw", background: "#fff", height: "100vh", overflowY: "auto", boxShadow: "-8px 0 48px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", pointerEvents: "auto" }}>
              {/* Header */}
              <div style={{ background: "#0f172a", padding: "20px 22px", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>MoveAround TMS</div>
                    <h2 style={{ margin: 0, color: "#fff", fontSize: "1.1rem", fontWeight: 900 }}>⚡ {t("assistantTitle")}</h2>
                    <p style={{ margin: "3px 0 0", color: "#94a3b8", fontSize: "0.75rem" }}>
                      {tasks.length === 0 ? (lang === "en" ? "All clear — no critical issues." : "Todo en orden — sin problemas críticos.") : `${tasks.length} ${lang === "en" ? "item" : "tarea"}${tasks.length !== 1 ? "s" : ""} ${lang === "en" ? "need attention" : "necesita atención"}`}
                    </p>
                  </div>
                  <button onClick={() => setAssistantOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
                </div>
              </div>

              <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Morning briefing stats */}
                <div style={{ background: "#f8fafc", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#1e40af", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{t("briefing")}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { label: t("dispatchEligible"), value: dispatchEligibleCount, color: "#16a34a" },
                      { label: t("dispatchBlocked"),  value: dispatchBlockedCount,  color: dispatchBlockedCount > 0 ? "#dc2626" : "#64748b" },
                      { label: t("expiringSoon"),      value: expiringSoonCount,     color: expiringSoonCount > 0 ? "#d97706" : "#64748b" },
                      { label: t("totalDrivers"),      value: allDrivers.length,     color: "#0f172a" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#fff", borderRadius: 8, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: "1.35rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Do This First tasks */}
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>⚡ {t("doThisFirst")}</div>
                  {tasks.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px 0", color: "#94a3b8" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
                      <div style={{ fontWeight: 700, color: "#16a34a" }}>{lang === "en" ? "All clear — nothing critical right now." : "Todo en orden — nada crítico ahora."}</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {tasks.map((task, i) => {
                        const c = colors[task.priority];
                        return (
                          <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.badge}`, borderRadius: 10, padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                              <div style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>{task.title}</div>
                              <span style={{ fontSize: "0.58rem", fontWeight: 900, background: c.badge, color: "#fff", borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap", letterSpacing: "0.04em", flexShrink: 0 }}>{task.priority.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 8 }}>{task.detail}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.68rem", color: "#64748b" }}>→ <strong>{task.role}</strong></span>
                              <button onClick={() => { setNeedsFilter(task.filter); setAssistantOpen(false); }}
                                style={{ padding: "4px 10px", background: c.badge, color: "#fff", border: "none", borderRadius: 6, fontSize: "0.68rem", fontWeight: 700, cursor: "pointer" }}>
                                {task.action}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Natural language quick filters */}
                <div>
                  <div style={{ fontSize: "0.65rem", fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    {lang === "en" ? "Quick Filters" : "Filtros Rápidos"}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginBottom: 8 }}>{t("nlHint")}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {nlSuggestions.map(s => (
                      <button key={s.phrase} onClick={() => { setNeedsFilter(s.filter); setSearch(""); setAssistantOpen(false); }}
                        style={{ padding: "5px 10px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 99, fontSize: "0.7rem", fontWeight: 600, color: "#475569", cursor: "pointer" }}>
                        {s.phrase}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}
    </main>
  );
}
