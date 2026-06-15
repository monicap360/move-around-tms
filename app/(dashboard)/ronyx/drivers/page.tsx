"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";

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
    id:          d.id,
    name:        d.full_name || d.name || "Unknown",
    role:        d.position_role || "Driver",
    phone:       d.phone || "—",
    email:       d.email || "—",
    location:    d.address ? d.address.split(",").slice(-2).join(",").trim() : "—",
    truck:       d.assigned_truck_number || "—",
    trailer:     "—",
    status:      normalizeStatus(d.status),
    driverType:  normalizeDrType(d.driver_type),
    cdl:         d.license_number || "—",
    cdlState:    d.license_state  || "—",
    cdlExp,
    mvrExp,
    medicalExp,
    docs:        computeDocStatus({ cdlExp: d.license_expiration_date, mvrExp: d.mvr_expiration, medicalExp: d.medical_card_expiration }),
    rating:      Number(d.rating) || 0,
    safetyScore: 100,
    onTime:      100,
    lastLoad:    "—",
    revenueWeek: "—",
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
const DOC_TYPES = ["MVR", "Medical Card", "CDL", "Drug Test", "Background Check", "Insurance Certificate"];

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
  const [driverId, setDriverId] = useState(preselectedDriver?.id ?? "");
  const [docType, setDocType]   = useState(preselectedDocType ?? "");
  const [file, setFile]         = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!driverId) { showToast("Select a driver."); return; }
    if (!docType)  { showToast("Select a document type."); return; }
    if (!file)     { showToast("Choose a file to upload."); return; }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("driverId", driverId);
      form.append("doc_type", docType);
      form.append("file", file);
      const res = await fetch("/api/ronyx/drivers/documents", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Upload failed");
      }
      showToast(`${docType} uploaded successfully.`);
      onClose();
    } catch (err: any) {
      showToast(err?.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
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
              <span style={{ color: "#94a3b8", fontSize: 13 }}>Click to select PDF, JPG, or PNG</span>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

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
  const [importResult, setImportResult] = useState<{ imported?: number; updated?: number; skipped?: number; failed?: number; errors?: string[] } | null>(null);

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
      let wb: XLSX.WorkBook;

      if (nameLower.endsWith(".csv")) {
        const text = await file.text();
        wb = XLSX.read(text, { type: "string" });
      } else {
        const buffer = await file.arrayBuffer();
        wb = XLSX.read(new Uint8Array(buffer), { type: "array", cellDates: true });
      }

      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

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
    setStep("importing");
    try {
      const payload = rows
        .filter(r => {
          if (r._importStatus === "duplicate") {
            const action = dupActions[r._idx] ?? "skip";
            return action !== "skip";
          }
          return r._importStatus !== "skip";
        })
        .map(r => ({
          ...r,
          _dup_action: r._importStatus === "duplicate" ? (dupActions[r._idx] ?? "skip") : undefined,
        }));

      const res = await fetch("/api/ronyx/drivers/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: payload, file_name: fileName, upload_type: isPdf ? "pdf" : "excel" }),
      });
      const data = await res.json();
      setImportResult(data);
      setStep("done");
      if (data.imported > 0 || data.updated > 0) {
        onImported((data.imported || 0) + (data.updated || 0));
        showToast(`Import complete — ${data.imported || 0} created, ${data.updated || 0} updated.`);
      }
    } catch {
      showToast("Import failed — check connection.");
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
                                  <button onClick={() => setRows(prev => prev.map(r => r._idx === row._idx ? { ...r, _importStatus: r._importStatus === "skip" ? "ready" : "skip" } : r))}
                                    style={{ fontSize: "0.65rem", padding: "3px 8px", borderRadius: 6, border: "1px solid #e2e8f0", cursor: "pointer",
                                      background: row._importStatus === "skip" ? "#f0fdf4" : "#fff1f2",
                                      color: row._importStatus === "skip" ? "#15803d" : "#dc2626" }}>
                                    {row._importStatus === "skip" ? "Include" : "Skip"}
                                  </button>
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
                          ⬆ Import {importable} Driver{importable !== 1 ? "s" : ""}
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
              <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", marginBottom: 8 }}>Importing Drivers…</div>
              <div style={{ color: "#64748b", fontSize: "0.83rem" }}>Creating records, checking duplicates, generating compliance alerts…</div>
              <div style={{ height: 6, background: "#e2e8f0", borderRadius: 99, margin: "24px auto", maxWidth: 320, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: "#1d4ed8", borderRadius: 99, animation: "indeterminate 1.5s ease-in-out infinite" }} />
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
              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 10, padding: 14, marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 8, fontSize: "0.8rem" }}>Errors</div>
                  {importResult.errors.slice(0, 5).map((e, i) => (
                    <div key={i} style={{ fontSize: "0.75rem", color: "#7f1d1d", marginBottom: 4 }}>• {e}</div>
                  ))}
                </div>
              )}
              <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: 10, padding: 14, marginBottom: 20, fontSize: "0.78rem", color: "#92400e" }}>
                <strong>Next steps:</strong> Go to Driver Management and verify compliance dates for each imported driver.
                Set Dispatch Eligible = Yes only after compliance is confirmed.
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: 10, background: "#1d4ed8", color: "#fff", border: "none", fontWeight: 800, cursor: "pointer" }}>
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

/* ─── Main page ─────────────────────────────────────────── */
export default function DriversPage() {
  const router       = useRouter();
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
  const urlTab = searchParams.get("tab") as "roster" | "backup" | "import" | null;
  const [activeTab, setActiveTab]       = useState<"roster" | "backup">(urlTab === "backup" ? "backup" : "roster");
  const [backupRows, setBackupRows]     = useState<BackupDriverRow[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupSearch, setBackupSearch]   = useState("");
  const [emailSending, setEmailSending]   = useState(false);

  function showToast(msg: string) { setToast(msg); }

  useEffect(() => {
    fetch("/api/ronyx/drivers/list")
      .then((r) => r.json())
      .then((data) => setAllDrivers((data.drivers || []).map(mapApiDriver)))
      .catch(console.error)
      .finally(() => setLoading(false));
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
      d.email.toLowerCase().includes(q) || d.truck.toLowerCase().includes(q) || d.cdl.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All Statuses" || d.status === statusFilter;
    const matchDoc = docFilter === "All Docs" || d.docs === docFilter ||
      (docFilter === "Needs Attention" && ["Expiring", "Expired", "Missing"].includes(d.docs));
    return matchSearch && matchStatus && matchDoc;
  }), [allDrivers, search, statusFilter, docFilter]);

  const complianceAlerts = useMemo(() => buildAlerts(allDrivers), [allDrivers]);
  const activeDrivers    = allDrivers.filter((d) => d.status !== "Inactive").length;
  const availableDrivers = allDrivers.filter((d) => d.status === "Available").length;
  const assignedDrivers  = allDrivers.filter((d) => d.status === "Assigned").length;
  const documentIssues   = allDrivers.filter((d) => ["Expiring", "Expired", "Missing"].includes(d.docs)).length;
  const topDriver        = useMemo(() => [...allDrivers].sort((a, b) => b.rating - a.rating)[0] ?? null, [allDrivers]);

  return (
    <main className="premium-page">
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* ── Hero ── */}
      <section className="premium-hero">
        <div>
          <p className="premium-eyebrow">Fleet Command / Drivers</p>
          <h1>Driver Management</h1>
          <p>
            Manage driver profiles, compliance, MVRs, CDL records, medical cards,
            assignments, ratings, documents, and weekly performance from one command center.
          </p>
        </div>
        <div className="premium-hero-actions">
          <button
            className="premium-button ghost"
            onClick={() => {
              if (allDrivers.length === 0) { showToast("No drivers to export yet."); return; }
              exportDriversCSV(filteredDrivers.length > 0 ? filteredDrivers : allDrivers);
              showToast(`Exported ${filteredDrivers.length || allDrivers.length} drivers as CSV.`);
            }}
          >
            Export Drivers
          </button>
          <button
            className="premium-button dark"
            onClick={() => setUploadTarget({})}
          >
            Upload Documents
          </button>
          <button
            className="premium-button dark"
            onClick={() => setImportOpen(true)}
            style={{ background: "#1d4ed8", color: "#fff", border: "none" }}
          >
            ⬆ Import Driver List
          </button>
          <Link href="/ronyx/drivers/new" className="premium-button primary">
            + Add Driver
          </Link>
        </div>
      </section>

      {/* ── KPIs ── */}
      <section className="premium-kpi-grid">
        <div className="premium-kpi"><span>Total Drivers</span><strong>{loading ? "…" : allDrivers.length}</strong><p>In Ronyx system</p></div>
        <div className="premium-kpi"><span>Active Drivers</span><strong>{loading ? "…" : activeDrivers}</strong><p>Ready or currently assigned</p></div>
        <div className="premium-kpi success"><span>Available Now</span><strong>{loading ? "…" : availableDrivers}</strong><p>Ready for dispatch</p></div>
        <div className="premium-kpi blue"><span>Assigned</span><strong>{loading ? "…" : assignedDrivers}</strong><p>Currently on load</p></div>
        <div className="premium-kpi danger"><span>Compliance Issues</span><strong>{loading ? "…" : documentIssues}</strong><p>Expired or expiring docs</p></div>
      </section>

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e2e8f0", margin: "0 0 0 0", padding: "0 var(--page-gutter, 32px)" }}>
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
            {tab === "roster" ? "Driver Roster" : "Backup Data"}
          </button>
        ))}
      </div>

      {/* ── Backup Data tab ── */}
      {activeTab === "backup" && (
        <section style={{ padding: "24px var(--page-gutter, 32px)" }}>
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
      <section className="premium-layout">
        <div className="premium-main-column">

          {/* ── Compliance alerts ── */}
          {complianceAlerts.length > 0 && (
            <div className="premium-panel">
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

          {/* ── Driver directory ── */}
          <div className="premium-panel">
            <div className="premium-panel-header">
              <div>
                <p className="premium-eyebrow">Driver Directory</p>
                <h2>All Drivers</h2>
                <span>Search, filter, assign, suspend, and manage driver records.</span>
              </div>
            </div>

            <div className="premium-filter-bar">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, CDL, email, or truck..." />
              <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}>
                <option>All Statuses</option>
                <option>Active</option>
                <option>Available</option>
                <option>Assigned</option>
                <option>Inactive</option>
                <option>Suspended</option>
              </select>
              <select value={docFilter} onChange={(e) => setDoc(e.target.value)}>
                <option>All Docs</option>
                <option>Good</option>
                <option>Expiring</option>
                <option>Expired</option>
                <option>Missing</option>
                <option>Needs Attention</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>Loading drivers…</div>
            ) : filteredDrivers.length === 0 ? (
              <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                {allDrivers.length === 0
                  ? <>No drivers yet. <Link href="/ronyx/drivers/new" style={{ color: "#1e40af" }}>Add your first driver →</Link></>
                  : "No drivers match your filters."}
              </div>
            ) : (
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
                      <div>
                        <span>MVR Exp.</span>
                        <strong className={driver.mvrExp === "Expired" ? "danger-text" : ""}>{driver.mvrExp}</strong>
                      </div>
                      <div>
                        <span>Medical</span>
                        <strong className={driver.medicalExp === "Expired" ? "danger-text" : ""}>{driver.medicalExp}</strong>
                      </div>
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
                        <Link href={`/ronyx/drivers/${driver.id}`}>
                          <button>Profile</button>
                        </Link>
                        <Link href={`/ronyx/drivers/${driver.id}?tab=documents`}>
                          <button>Documents</button>
                        </Link>
                        <button onClick={() => setAssignTarget({ driver })}>Assign</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="premium-side-column">
          <div className="premium-panel">
            <p className="premium-eyebrow">Quick Actions</p>
            <h2>Driver Tools</h2>
            <div className="quick-action-list">
              <Link href="/ronyx/drivers/new" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Add New Driver</button>
              </Link>
              <button onClick={() => showToast("Login invite — coming soon.")}>
                Send Login Invite
              </button>
              <button onClick={() => setUploadTarget({ docType: "CDL" })}>
                Upload CDL
              </button>
              <button onClick={() => setUploadTarget({ docType: "MVR" })}>
                Upload MVR
              </button>
              <button onClick={() => setUploadTarget({ docType: "Medical Card" })}>
                Upload Medical Card
              </button>
              <button onClick={() => setAssignTarget({ driver: null })}>
                Assign Truck
              </button>
              <button onClick={() => showToast("Driver resume export — coming soon.")}>
                Create Driver Resume
              </button>
              <Link href="/ronyx/payroll" style={{ textDecoration: "none" }}>
                <button style={{ width: "100%" }}>Open Payroll Summary</button>
              </Link>
            </div>
          </div>

          <div className="premium-panel dark-panel">
            <p className="premium-eyebrow">AI Dispatch Insight</p>
            <h2>Recommended Actions</h2>
            <p>
              {documentIssues > 0
                ? `${documentIssues} driver${documentIssues > 1 ? "s have" : " has"} compliance docs that need attention before next dispatch.`
                : "All driver compliance docs are current. Fleet is ready for dispatch."}
            </p>
            <Link href="/ronyx/hr-compliance" style={{ textDecoration: "none" }}>
              <button className="premium-button primary full">Run Compliance Review</button>
            </Link>
          </div>

          {topDriver && (
            <div className="premium-panel">
              <p className="premium-eyebrow">Driver Performance</p>
              <h2>Top Driver</h2>
              <Link href={`/ronyx/drivers/${topDriver.id}`} style={{ textDecoration: "none" }}>
                <div className="top-driver-box" style={{ cursor: "pointer" }}>
                  <div className="driver-avatar large">
                    {topDriver.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                  </div>
                  <h3>{topDriver.name}</h3>
                  <p>{topDriver.rating > 0 ? `★ ${topDriver.rating} rating` : "No rating yet"} · {topDriver.truck}</p>
                  <StatusBadge status={topDriver.docs} />
                </div>
              </Link>
            </div>
          )}
        </aside>
      </section>
      )}

      {/* ── Modals ── */}
      {importOpen && (
        <DriverImportModal
          existingDrivers={allDrivers}
          onClose={() => { setImportOpen(false); }}
          onImported={count => {
            showToast(`${count} drivers imported — reloading…`);
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

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onDone={() => setToast("")} />}
    </main>
  );
}
