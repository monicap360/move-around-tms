"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";

// ─── Types ─────────────────────────────────────────────────────────────────

type ModuleType = "dispatch" | "drivers" | "payroll" | "owner_operators" | "tickets" | "compliance" | "general";
type Phase      = "idle" | "analyzing" | "review" | "importing" | "done";
type Safety     = "safe" | "safe_with_warnings" | "needs_review" | "unsafe";
type Severity   = "error" | "warning" | "info";
type Lang       = "en" | "es";

interface ColMap {
  source:     string;
  target:     string | null;
  label:      string;
  required:   boolean;
  recognized: boolean;
  affects:    string;
  sample:     string;
}

interface DataIssue {
  severity:  Severity;
  title:     string;
  detail:    string;
  rows:      number;
  col?:      string;
  role:      string;
  autoFixed: boolean;
}

interface Intel {
  fileName:    string;
  ext:         string;
  module:      ModuleType;
  moduleLabel: string;
  confidence:  number;
  rowCount:    number;
  colCount:    number;
  headers:     string[];
  mappings:    ColMap[];
  issues:      DataIssue[];
  safety:      Safety;
  safetyMsg:   string;
  nextAction:  string;
  rows:        Record<string, string>[];
}

interface ImportResult {
  ok:         boolean;
  imported:   number;
  updated:    number;
  skipped:    number;
  failed:     number;
  errors:     string[];
  nextAction: string;
}

interface HistoryItem {
  id:               string;
  module:           string;
  source_file_name: string;
  file_type:        string;
  file_size_bytes:  number;
  uploaded_at:      string;
}

// ─── Labels (i18n) ──────────────────────────────────────────────────────────

const L: Record<Lang, Record<string, string>> = {
  en: {
    title:       "Intel Import Center™",
    powered:     "Powered by MoveAround TMS",
    subtitle:    "Turn spreadsheets, ticket exports, PDFs, and operational files into verified work.",
    helper:      "Upload a file. We identify it, map the data, catch issues, and send each item where it belongs.",
    drop:        "Drop your file here, or",
    browse:      "Browse Files",
    supported:   "Excel, CSV, PDF · Max 50MB",
    history:     "Import History",
    profiles:    "Saved Mapping Profiles",
    help:        "Help",
    close:       "← Back",
    analyzing:   "Analyzing file…",
    stepRead:    "Reading file",
    stepDetect:  "Detecting data type",
    stepMap:     "Mapping columns",
    stepQuality: "Checking data quality",
    safeLabel:   "Safe to Import",
    warnLabel:   "Import with Warnings",
    reviewLabel: "Needs Review",
    unsafeLabel: "Not Ready",
    colMapped:   "Recognized",
    colUnknown:  "Not recognized — will be ignored",
    noIssues:    "No issues found. Data looks clean.",
    importBtn:   "Import",
    importingMsg:"Importing…",
    dryRun:      "Dry run (preview only, no changes saved)",
    nextActionLabel: "Next action",
    resultSummary: "Import complete",
    importAnother: "Import another file",
    noProfiles:   "No saved profiles yet.",
    profilesNote: "Mapping profiles let you save column arrangements for files you import regularly.",
  },
  es: {
    title:       "Centro de Importación Intel™",
    powered:     "Impulsado por MoveAround TMS",
    subtitle:    "Convierte hojas de cálculo, exportaciones de tickets, PDFs y archivos operativos en trabajo verificado.",
    helper:      "Sube un archivo. Lo identificamos, mapeamos los datos, detectamos problemas y enviamos cada elemento donde corresponde.",
    drop:        "Suelta tu archivo aquí, o",
    browse:      "Buscar Archivos",
    supported:   "Excel, CSV, PDF · Máx 50MB",
    history:     "Historial de Importaciones",
    profiles:    "Perfiles de Mapeo Guardados",
    help:        "Ayuda",
    close:       "← Volver",
    analyzing:   "Analizando archivo…",
    stepRead:    "Leyendo archivo",
    stepDetect:  "Detectando tipo de datos",
    stepMap:     "Mapeando columnas",
    stepQuality: "Verificando calidad de datos",
    safeLabel:   "Listo para Importar",
    warnLabel:   "Importar con Advertencias",
    reviewLabel: "Necesita Revisión",
    unsafeLabel: "No está listo",
    colMapped:   "Reconocido",
    colUnknown:  "No reconocido — será ignorado",
    noIssues:    "Sin problemas. Los datos se ven limpios.",
    importBtn:   "Importar",
    importingMsg:"Importando…",
    dryRun:      "Simulacro (solo vista previa, sin cambios)",
    nextActionLabel: "Próximo paso",
    resultSummary: "Importación completa",
    importAnother: "Importar otro archivo",
    noProfiles:   "Aún no hay perfiles guardados.",
    profilesNote: "Los perfiles de mapeo te permiten guardar disposiciones de columnas para archivos que importas regularmente.",
  },
};

// ─── Column field definitions per module ────────────────────────────────────

interface FieldDef { key: string; label: string; aliases: string[]; required: boolean; affects: string }

const MODULE_FIELDS: Record<ModuleType, FieldDef[]> = {
  dispatch: [
    { key: "driver_name", label: "Driver Name",  aliases: ["driver","driver name","name","employee","operator"],            required: true,  affects: "Driver assignment, payroll matching" },
    { key: "date",        label: "Date",          aliases: ["date","dispatch date","job date","work date","start time"],     required: true,  affects: "Scheduling, payroll period" },
    { key: "truck",       label: "Truck #",        aliases: ["truck","truck #","unit","vehicle","truck number","equipment"], required: false, affects: "Truck assignment, ticket matching" },
    { key: "job_type",    label: "Job Type",       aliases: ["job","job type","type","work type","job service","category"],  required: false, affects: "Job classification" },
    { key: "location",    label: "Location/Site",  aliases: ["location","site","pit","customer","pickup site","dropoff"],    required: false, affects: "Job routing" },
    { key: "rmis_code",   label: "RMIS Code",      aliases: ["rmis","compliance","note","code","status","flag","job status"],required: false, affects: "Compliance, dispatch blocking" },
    { key: "hours",       label: "Hours",          aliases: ["hours","hrs","time","duration","quantity"],                    required: false, affects: "Payroll calculation" },
  ],
  drivers: [
    { key: "driver_name",            label: "Full Name",      aliases: ["name","full name","driver name","employee name","driver"],        required: true,  affects: "Driver record" },
    { key: "phone",                  label: "Phone",          aliases: ["phone","cell","mobile","telephone","contact"],                    required: false, affects: "Communication" },
    { key: "email",                  label: "Email",          aliases: ["email","e-mail","mail","email address"],                          required: false, affects: "Notifications, portal access" },
    { key: "cdl_number",             label: "CDL Number",     aliases: ["cdl","cdl #","license","license number","cdl number"],            required: false, affects: "Compliance records" },
    { key: "cdl_expiration",         label: "CDL Expiration", aliases: ["cdl exp","cdl expiration","license exp","cdl expire"],            required: false, affects: "Dispatch eligibility alerts" },
    { key: "medical_card_expiration",label: "Medical Card",   aliases: ["medical","med card","physical exp","dot medical","med exp"],      required: false, affects: "Dispatch eligibility" },
    { key: "mvr_expiration",         label: "MVR Date",       aliases: ["mvr","mvr date","motor vehicle record","mvr exp"],               required: false, affects: "Compliance" },
    { key: "driver_type",            label: "Driver Type",    aliases: ["type","driver type","employment type","w2","1099","pay type"],    required: false, affects: "Payroll classification" },
    { key: "truck_number",           label: "Truck / Unit",   aliases: ["truck","truck #","unit","assigned truck","truck number"],         required: false, affects: "Truck assignment" },
    { key: "company_name",           label: "Company",        aliases: ["company","carrier","owner operator","oo company","company name"], required: false, affects: "Carrier assignment" },
    { key: "status",                 label: "Status",         aliases: ["status","active","inactive","employment status"],                 required: false, affects: "Driver status" },
  ],
  payroll: [
    { key: "driver_name", label: "Driver",   aliases: ["driver","name","employee","driver name"],                                required: true,  affects: "Pay record" },
    { key: "amount",      label: "Amount",   aliases: ["amount","pay","gross","total","payment","earnings","payout"],            required: true,  affects: "Payroll disbursement" },
    { key: "date",        label: "Pay Date", aliases: ["date","pay date","period","pay period","week ending","week start"],      required: false, affects: "Pay period" },
    { key: "ticket",      label: "Ticket #", aliases: ["ticket","ticket #","job #","invoice","load #","ticket number"],          required: false, affects: "Ticket matching" },
    { key: "tons",        label: "Tons",     aliases: ["tons","weight","net tons","material tons","net weight","loads"],         required: false, affects: "Rate calculation" },
    { key: "rate",        label: "Rate",     aliases: ["rate","pay rate","per ton","ton rate","rate per ton"],                   required: false, affects: "Payroll verification" },
  ],
  owner_operators: [
    { key: "company_name", label: "Company Name",   aliases: ["company","company name","operator","business","oo name","vendor"],  required: true,  affects: "OO record" },
    { key: "ein",          label: "EIN",            aliases: ["ein","tax id","federal id","fein","tax number"],                    required: false, affects: "Tax compliance" },
    { key: "contact",      label: "Contact Name",   aliases: ["contact","contact name","owner","principal","agent"],              required: false, affects: "Communication" },
    { key: "phone",        label: "Phone",          aliases: ["phone","telephone","cell"],                                        required: false, affects: "Communication" },
    { key: "coi_exp",      label: "COI Expiration", aliases: ["coi","insurance exp","coi exp","liability exp","coi expiration"],  required: false, affects: "Dispatch eligibility" },
    { key: "w9",           label: "W-9 On File",    aliases: ["w9","w-9","tax form","w9 status","w9 received"],                   required: false, affects: "Payment processing" },
  ],
  tickets: [
    { key: "ticket_no", label: "Ticket #",   aliases: ["ticket","ticket #","ticket no","number","load","ticket number"],         required: true,  affects: "Ticket record" },
    { key: "date",      label: "Date",        aliases: ["date","ticket date","load date"],                                        required: false, affects: "Timeline" },
    { key: "driver",    label: "Driver",      aliases: ["driver","driver name","operator"],                                       required: false, affects: "Driver assignment" },
    { key: "material",  label: "Material",    aliases: ["material","product","commodity","type","dirt type"],                     required: false, affects: "Job classification" },
    { key: "tons",      label: "Tons",        aliases: ["tons","weight","net tons","net weight"],                                 required: false, affects: "Billing, payroll" },
    { key: "customer",  label: "Customer",    aliases: ["customer","client","job","project"],                                     required: false, affects: "Billing" },
  ],
  compliance: [
    { key: "doc_type",   label: "Document Type",      aliases: ["type","document","doc type","form"],                             required: true,  affects: "Compliance tracking" },
    { key: "entity",     label: "Driver / Entity",    aliases: ["driver","name","entity","company"],                              required: true,  affects: "Record association" },
    { key: "expiration", label: "Expiration",         aliases: ["expiration","exp","expires","valid through","expiry date"],     required: false, affects: "Alerts, dispatch eligibility" },
    { key: "status",     label: "Status",             aliases: ["status","received","on file","verified","collected"],            required: false, affects: "Compliance status" },
  ],
  general: [],
};

const MODULE_LABELS: Record<ModuleType, string> = {
  dispatch:        "Daily Dispatch / RMIS",
  drivers:         "Driver Roster",
  payroll:         "Payroll / Settlement",
  owner_operators: "Owner Operators",
  tickets:         "Ticket / Load Data",
  compliance:      "Compliance Documents",
  general:         "General File",
};

const MODULE_ROUTES: Record<string, string> = {
  dispatch:        "/ronyx/dispatch",
  drivers:         "/ronyx/drivers",
  payroll:         "/ronyx/payroll",
  owner_operators: "/ronyx/owner-operators",
  tickets:         "/ronyx/fast-scan",
  compliance:      "/ronyx/compliance",
};

// ─── Detection logic ─────────────────────────────────────────────────────────

function detectModule(fileName: string, headers: string[]): { module: ModuleType; confidence: number } {
  const name = fileName.toLowerCase();
  const hdrs = headers.map(h => h.toLowerCase()).join(" | ");

  if (name.includes("dispatch") || name.includes("rmis") || name.includes("schedule") || name.includes("tabitha"))
    return { module: "dispatch", confidence: 95 };
  if (name.includes("payout") || name.includes("indiana") || name.includes("settlement"))
    return { module: "payroll", confidence: 95 };
  if ((name.includes("driver") || name.includes("roster")) && !name.includes("dispatch"))
    return { module: "drivers", confidence: 90 };
  if (name.includes("owner") || name.includes(" oo ") || name.includes("-oo-") || name.includes("subhauler"))
    return { module: "owner_operators", confidence: 90 };
  if (name.includes("ticket") || name.includes("scan") || name.includes("load"))
    return { module: "tickets", confidence: 85 };
  if (name.includes("coi") || name.includes("compliance") || name.includes("insurance") || name.includes("w9"))
    return { module: "compliance", confidence: 85 };
  if (name.includes("payroll"))
    return { module: "payroll", confidence: 88 };

  if (hdrs.includes("rmis") || (hdrs.includes("driver") && hdrs.includes("date") && hdrs.includes("truck")))
    return { module: "dispatch", confidence: 82 };
  if (hdrs.includes("cdl") || hdrs.includes("medical") || (hdrs.includes("driver") && hdrs.includes("license")))
    return { module: "drivers", confidence: 80 };
  if (hdrs.includes("ein") || hdrs.includes("company name") || hdrs.includes("coi"))
    return { module: "owner_operators", confidence: 78 };
  if (hdrs.includes("settlement") || hdrs.includes("payout") || (hdrs.includes("amount") && hdrs.includes("driver")))
    return { module: "payroll", confidence: 76 };
  if (hdrs.includes("ticket") || (hdrs.includes("tons") && hdrs.includes("material")))
    return { module: "tickets", confidence: 75 };

  return { module: "general", confidence: 40 };
}

function mapColumns(headers: string[], module: ModuleType, rows: Record<string, string>[]): ColMap[] {
  const fields = MODULE_FIELDS[module] ?? [];
  const usedTargets = new Set<string>();

  return headers.map(header => {
    const norm = header.toLowerCase().trim().replace(/[#*_]/g, " ").replace(/\s+/g, " ");
    let bestField: FieldDef | null = null;
    let bestScore = 0;

    for (const field of fields) {
      if (usedTargets.has(field.key)) continue;
      for (const alias of field.aliases) {
        const score = alias === norm ? 1.0
          : norm === alias ? 1.0
          : norm.includes(alias) && alias.length > 3 ? 0.85
          : alias.includes(norm) && norm.length > 3 ? 0.75
          : 0;
        if (score > bestScore) { bestScore = score; bestField = field; }
      }
    }

    const sample = rows.slice(0, 3).map(r => String(r[header] ?? "")).filter(Boolean).join(", ").slice(0, 45);

    if (bestField && bestScore >= 0.75) {
      usedTargets.add(bestField.key);
      return { source: header, target: bestField.key, label: bestField.label, required: bestField.required, recognized: true, affects: bestField.affects, sample };
    }
    return { source: header, target: null, label: header, required: false, recognized: false, affects: "—", sample };
  });
}

function assessQuality(mappings: ColMap[], rows: Record<string, string>[], module: ModuleType): { issues: DataIssue[]; safety: Safety; safetyMsg: string } {
  const issues: DataIssue[] = [];
  const fields = MODULE_FIELDS[module] ?? [];

  // Missing required columns
  for (const field of fields.filter(f => f.required)) {
    if (!mappings.find(m => m.target === field.key)) {
      issues.push({ severity: "error", title: `Missing required column: "${field.label}"`, detail: `No column in this file matched "${field.label}". This is required for ${MODULE_LABELS[module]} import.`, rows: rows.length, role: "Office Manager", autoFixed: false });
    }
  }

  // Empty required values
  for (const m of mappings.filter(m => m.required && m.recognized)) {
    const empty = rows.filter(r => !String(r[m.source] ?? "").trim()).length;
    if (empty > 0) {
      issues.push({ severity: empty > rows.length / 2 ? "error" : "warning", title: `${empty} row${empty > 1 ? "s" : ""} missing "${m.label}"`, detail: `${empty} of ${rows.length} rows have no value for "${m.label}". These rows will be skipped during import.`, rows: empty, col: m.source, role: "Compliance Admin", autoFixed: false });
    }
  }

  // Unrecognized columns
  const unknown = mappings.filter(m => !m.recognized);
  if (unknown.length > 0) {
    issues.push({ severity: "info", title: `${unknown.length} unrecognized column${unknown.length > 1 ? "s" : ""} will be ignored`, detail: `Columns not mapped: ${unknown.map(m => `"${m.source}"`).join(", ")}. They will not be imported and will not cause errors.`, rows: 0, role: "—", autoFixed: true });
  }

  // Short-year dates
  for (const m of mappings.filter(m => m.target?.includes("exp") || m.target === "date")) {
    const samples = rows.slice(0, 8).map(r => String(r[m.source] ?? "")).filter(Boolean);
    if (samples.some(v => /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(v))) {
      issues.push({ severity: "info", title: `Dates in "${m.source}" will be auto-converted`, detail: `Dates appear to use 2-digit years (MM/DD/YY). These will be automatically converted to 4-digit years before import.`, rows: 0, col: m.source, role: "—", autoFixed: true });
    }
  }

  // Empty file
  if (rows.length === 0) {
    issues.push({ severity: "error", title: "File appears to be empty", detail: "No data rows were found. Check that the correct sheet is active and the file has rows below the header.", rows: 0, role: "Office Manager", autoFixed: false });
  }

  const errors   = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");

  let safety: Safety;
  let safetyMsg: string;
  if (errors.length > 0) {
    safety    = errors.some(e => e.title.includes("Missing required")) ? "unsafe" : "needs_review";
    safetyMsg = errors.length === 1 ? errors[0].title : `${errors.length} errors must be resolved before import.`;
  } else if (warnings.length > 0) {
    safety    = "safe_with_warnings";
    safetyMsg = `Ready to import. ${warnings.length} warning${warnings.length > 1 ? "s" : ""} — some rows may be skipped.`;
  } else {
    safety    = "safe";
    safetyMsg = "All required columns recognized. Data looks clean. Safe to import.";
  }

  return { issues, safety, safetyMsg };
}

function getNextAction(module: ModuleType, safety: Safety): string {
  if (safety === "unsafe") return "Resolve the errors above before importing.";
  switch (module) {
    case "dispatch":        return "Review driver matches and RMIS codes, then import to Dispatch Command Center™.";
    case "drivers":         return "Review the column mapping, then import to the Driver Directory.";
    case "payroll":         return "Review driver amounts and ticket matches, then import to Payroll.";
    case "owner_operators": return "Review company names and COI dates, then import to Owner Operators.";
    case "tickets":         return "Review ticket numbers and driver matches, then import to Fast Scan.";
    case "compliance":      return "Review document types and expiration dates, then import to Compliance.";
    default:                return "Review the file data, then import or route to the appropriate module.";
  }
}

// ─── File parsing ────────────────────────────────────────────────────────────

async function parseFile(file: File): Promise<Intel> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary", raw: false, cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const arr = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { raw: false, defval: "" });
        const headers = arr.length > 0 ? Object.keys(arr[0]) : [];
        const rows = arr as Record<string, string>[];

        const ext = (file.name.split(".").pop() ?? "file").toUpperCase();
        const { module, confidence } = detectModule(file.name, headers);
        const mappings = mapColumns(headers, module, rows);
        const { issues, safety, safetyMsg } = assessQuality(mappings, rows, module);

        resolve({
          fileName:    file.name,
          ext,
          module,
          moduleLabel: MODULE_LABELS[module],
          confidence,
          rowCount:    rows.length,
          colCount:    headers.length,
          headers,
          mappings,
          issues,
          safety,
          safetyMsg,
          nextAction:  getNextAction(module, safety),
          rows,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsBinaryString(file);
  });
}

// ─── Transform rows for import ───────────────────────────────────────────────

function transformRows(rows: Record<string, string>[], mappings: ColMap[]): Record<string, string>[] {
  const recognized = mappings.filter(m => m.target !== null);
  return rows.map(row => {
    const out: Record<string, string> = {};
    for (const m of recognized) {
      if (m.target) out[m.target] = String(row[m.source] ?? "");
    }
    return out;
  });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  page:    { fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc", minHeight: "100vh" } as React.CSSProperties,
  header:  { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 } as React.CSSProperties,
  btn:     (bg: string, color = "#fff") => ({ padding: "7px 14px", background: bg, color, border: bg === "transparent" ? "1px solid #e2e8f0" : "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties),
  panel:   { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20, marginBottom: 16 } as React.CSSProperties,
  label:   { fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 } as React.CSSProperties,
};

const SAFETY_STYLE: Record<Safety, { bg: string; color: string; border: string; text: (l: Lang) => string }> = {
  safe:               { bg: "#f0fdf4", color: "#16a34a", border: "#86efac", text: l => L[l].safeLabel },
  safe_with_warnings: { bg: "#fefce8", color: "#a16207", border: "#fde047", text: l => L[l].warnLabel },
  needs_review:       { bg: "#fff7ed", color: "#c2410c", border: "#fdba74", text: l => L[l].reviewLabel },
  unsafe:             { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5", text: l => L[l].unsafeLabel },
};

const SEV_COLOR: Record<Severity, { color: string; bg: string; icon: string }> = {
  error:   { color: "#dc2626", bg: "#fef2f2", icon: "✕" },
  warning: { color: "#d97706", bg: "#fffbeb", icon: "⚠" },
  info:    { color: "#2563eb", bg: "#eff6ff", icon: "i" },
};

// ─── Main component ──────────────────────────────────────────────────────────

export default function IntelImportCenterPage() {
  const [phase,       setPhase]       = useState<Phase>("idle");
  const [intel,       setIntel]       = useState<Intel | null>(null);
  const [result,      setResult]      = useState<ImportResult | null>(null);
  const [progress,    setProgress]    = useState(0);
  const [error,       setError]       = useState<string | null>(null);
  const [lang,        setLang]        = useState<Lang>("en");
  const [dryRun,      setDryRun]      = useState(false);
  const [dragging,    setDragging]    = useState(false);
  const [panel,       setPanel]       = useState<"history" | "profiles" | "help" | null>(null);
  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const t = (k: string) => L[lang][k] ?? k;

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch("/api/ronyx/upload-file");
      const data = await res.json();
      setHistory(data.uploads ?? []);
    } catch { /* graceful */ }
    setHistLoading(false);
  }, []);

  useEffect(() => {
    if (panel === "history") void loadHistory();
  }, [panel, loadHistory]);

  const handleFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploadedFile(file);
    setPhase("analyzing");
    setError(null);
    setProgress(0);
    try {
      await new Promise(r => setTimeout(r, 120)); // allow UI to render
      setProgress(40);
      const intelResult = await parseFile(file);
      setProgress(100);
      setIntel(intelResult);
      setPhase("review");
    } catch (e) {
      setError(`Could not read "${file.name}". Make sure it is a valid Excel or CSV file.`);
      setPhase("idle");
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(async () => {
    if (!intel) return;
    if (dryRun) {
      setResult({ ok: true, imported: intel.rowCount, updated: 0, skipped: 0, failed: 0, errors: [], nextAction: `Dry run complete. ${intel.rowCount} rows would have been imported. No changes were saved.` });
      setPhase("done");
      return;
    }

    setPhase("importing");
    setProgress(10);

    try {
      let importResult: ImportResult;

      if (intel.module === "drivers") {
        const mapped = transformRows(intel.rows, intel.mappings);
        const driverRows = mapped.map(r => ({
          driver_name:             r.driver_name ?? "",
          phone:                   r.phone ?? "",
          email:                   r.email ?? "",
          driver_type:             r.driver_type ?? "W2",
          truck_number:            r.truck_number ?? "",
          cdl_number:              r.cdl_number ?? "",
          cdl_state:               "",
          cdl_expiration:          r.cdl_expiration ?? "",
          medical_card_number:     "",
          medical_card_expiration: r.medical_card_expiration ?? "",
          job_assignment:          "",
          company_name:            r.company_name ?? "",
          mvr_expiration:          r.mvr_expiration ?? "",
          drug_test_expiration:    "",
          background_check_status: "",
          hire_date:               "",
          pay_rate:                "",
          pay_type:                r.driver_type ?? "",
          owner_operator_company:  "",
          status:                  r.status ?? "Active",
          notes:                   "",
          _issues:                 [],
          _importStatus:           "pending",
        }));
        setProgress(50);
        const res = await fetch("/api/ronyx/drivers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: driverRows, file_name: intel.fileName, upload_type: "excel" }),
        });
        const data = await res.json();
        setProgress(100);
        importResult = {
          ok:         res.ok,
          imported:   data.imported   ?? 0,
          updated:    data.updated    ?? 0,
          skipped:    data.skipped    ?? 0,
          failed:     data.failed     ?? 0,
          errors:     data.errors     ?? [],
          nextAction: res.ok ? "Go to the Driver Directory to review imported drivers." : (data.error ?? "Import failed — check errors below."),
        };
      } else {
        // All other modules: upload the original file
        if (!uploadedFile) throw new Error("File not available. Please re-upload.");
        setProgress(40);
        const formData = new FormData();
        formData.append("file",   uploadedFile);
        formData.append("module", intel.module);
        const res = await fetch("/api/ronyx/upload-file", { method: "POST", body: formData });
        const data = await res.json();
        setProgress(100);
        const hint = data.routing_hint ?? intel.module;
        const route = MODULE_ROUTES[hint] ?? MODULE_ROUTES[intel.module] ?? "/ronyx";
        importResult = {
          ok:         data.ok ?? res.ok,
          imported:   intel.rowCount,
          updated:    0,
          skipped:    0,
          failed:     data.ok ? 0 : intel.rowCount,
          errors:     data.ok ? [] : [data.error ?? "Upload failed"],
          nextAction: data.ok ? `File stored and tracked. Open ${intel.moduleLabel} to process the imported rows.` : "Upload failed — check your connection and try again.",
        };
        void route; // route used for context only in this result
      }

      setResult(importResult);
      setPhase("done");
    } catch (e) {
      setError(`Import failed: ${e instanceof Error ? e.message : "Unknown error"}`);
      setPhase("review");
    }
  }, [intel, dryRun, uploadedFile]);

  const reset = () => {
    setPhase("idle");
    setIntel(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setUploadedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ─── Slide panel ────────────────────────────────────────────────────────

  const renderPanel = () => {
    if (!panel) return null;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }} onClick={() => setPanel(null)}>
        <div style={{ flex: 1 }} />
        <div style={{ width: 420, background: "#fff", borderLeft: "1px solid #e2e8f0", height: "100vh", overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: "18px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>
              {panel === "history" ? t("history") : panel === "profiles" ? t("profiles") : t("help")}
            </span>
            <button onClick={() => setPanel(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}>✕</button>
          </div>
          <div style={{ padding: 20, flex: 1 }}>
            {panel === "history" && (
              histLoading ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading…</div> :
              history.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No import history yet.</div> :
              history.map(h => (
                <div key={h.id} style={{ padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 2 }}>{h.source_file_name}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{h.module} · {h.file_type?.toUpperCase()} · {h.file_size_bytes ? `${Math.round(h.file_size_bytes / 1024)}KB` : ""}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{h.uploaded_at ? new Date(h.uploaded_at).toLocaleString() : ""}</div>
                </div>
              ))
            )}
            {panel === "profiles" && (
              <div>
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
                  <div style={{ fontWeight: 700, color: "#475569", marginBottom: 8 }}>{t("noProfiles")}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{t("profilesNote")}</div>
                </div>
              </div>
            )}
            {panel === "help" && (
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                <p style={{ marginTop: 0 }}><strong>What is the Intel Import Center™?</strong><br />It reads files you upload, identifies the data type, maps columns to known fields, checks for quality issues, and routes each item to the correct module in MoveAround TMS.</p>
                <p><strong>Supported formats</strong><br />Excel (.xlsx, .xls), CSV (.csv), PDF (text-based). Files up to 50MB.</p>
                <p><strong>What does "recognized" mean?</strong><br />A column is recognized when its header matches a known field name. Unrecognized columns are ignored — they won't cause errors.</p>
                <p><strong>What is a dry run?</strong><br />Dry run analyzes the file without saving any changes. Use it to verify your data looks correct before committing.</p>
                <p><strong>What happens after import?</strong><br />For driver rosters, records are created or updated in the Driver Directory. For other modules, the file is stored and tracked — open the relevant module to process the rows.</p>
                <p><strong>Who should fix what?</strong><br />Each issue shows a role (e.g., "Compliance Admin"). This tells you who in your team is responsible for resolving it before the next import.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ─── Header ──────────────────────────────────────────────────────────────

  const renderHeader = () => (
    <div style={S.header}>
      <div>
        <div style={{ fontSize: "0.6rem", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>
          MoveAround TMS &nbsp;·&nbsp; {t("title")}
        </div>
        <div style={{ fontSize: 11, color: "#64748b" }}>{t("powered")}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Language selector */}
        <select value={lang} onChange={e => setLang(e.target.value as Lang)} style={{ padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#475569", background: "#fff", cursor: "pointer" }}>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
        <button onClick={() => setPanel(p => p === "history"  ? null : "history")}  style={S.btn("#f8fafc", "#475569")}>{t("history")}</button>
        <button onClick={() => setPanel(p => p === "profiles" ? null : "profiles")} style={S.btn("#f8fafc", "#475569")}>{t("profiles")}</button>
        <button onClick={() => setPanel(p => p === "help"     ? null : "help")}     style={S.btn("#f8fafc", "#475569")}>{t("help")}</button>
        <Link href="/ronyx" style={{ ...S.btn("#f1f5f9", "#475569"), textDecoration: "none" }}>{t("close")}</Link>
      </div>
    </div>
  );

  // ─── Idle phase ──────────────────────────────────────────────────────────

  if (phase === "idle") return (
    <div style={S.page}>
      {renderPanel()}
      {renderHeader()}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ margin: "0 0 10px", fontSize: "1.8rem", fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
            {t("title")}
          </h1>
          <p style={{ margin: "0 0 8px", fontSize: 15, color: "#64748b", lineHeight: 1.6 }}>{t("subtitle")}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#94a3b8" }}>{t("helper")}</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 20, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onClick={() => fileRef.current?.click()}
          style={{ border: `2px dashed ${dragging ? "#3b82f6" : "#cbd5e1"}`, borderRadius: 16, padding: "56px 32px", textAlign: "center", cursor: "pointer", background: dragging ? "#eff6ff" : "#fff", transition: "border-color 0.15s, background 0.15s" }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>⬆</div>
          <div style={{ fontSize: 15, color: "#475569", fontWeight: 600, marginBottom: 8 }}>
            {t("drop")} <span style={{ color: "#3b82f6", textDecoration: "underline" }}>{t("browse")}</span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{t("supported")}</div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); }} />
        </div>

        {/* File type legend */}
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 28, flexWrap: "wrap" }}>
          {[
            { icon: "📋", label: "Dispatch CSV", modules: "RMIS dispatch schedules" },
            { icon: "👤", label: "Driver Roster", modules: "CDL, medical, truck" },
            { icon: "💰", label: "Payout / Payroll", modules: "Indiana payouts, settlements" },
            { icon: "🏢", label: "Owner Operators", modules: "EIN, COI, W-9 status" },
          ].map(f => (
            <div key={f.label} style={{ textAlign: "center", minWidth: 110 }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{f.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a" }}>{f.label}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>{f.modules}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Analyzing phase ─────────────────────────────────────────────────────

  if (phase === "analyzing") return (
    <div style={S.page}>
      {renderHeader()}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 20 }}>
        <div style={{ width: 56, height: 56, border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{t("analyzing")}</div>
        <div style={{ width: 320, background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#3b82f6", borderRadius: 99, width: `${progress}%`, transition: "width 0.4s" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          {[t("stepRead"), t("stepDetect"), t("stepMap"), t("stepQuality")].map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: progress > i * 25 ? "#16a34a" : "#94a3b8" }}>
              <span style={{ fontSize: 16 }}>{progress > i * 25 ? "✓" : "○"}</span>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ─── Review phase ────────────────────────────────────────────────────────

  if (phase === "review" && intel) {
    const sStyle = SAFETY_STYLE[intel.safety];
    const errors = intel.issues.filter(i => i.severity === "error");
    const canImport = intel.safety !== "unsafe" || dryRun;

    return (
      <div style={S.page}>
        {renderPanel()}
        {renderHeader()}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Identity card + safety */}
          <div style={{ ...S.panel, display: "grid", gridTemplateColumns: "1fr auto", gap: 20, alignItems: "start" }}>
            <div>
              <span style={S.label}>Intel Report</span>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{intel.fileName}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                {[
                  ["Format",     intel.ext],
                  ["Module",     intel.moduleLabel],
                  ["Confidence", `${intel.confidence}%`],
                  ["Rows",       intel.rowCount.toLocaleString()],
                  ["Columns",    intel.colCount.toString()],
                  ["Recognized", `${intel.mappings.filter(m => m.recognized).length} / ${intel.colCount}`],
                ].map(([l, v]) => (
                  <div key={l} style={{ background: "#f8fafc", borderRadius: 8, padding: "6px 12px" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block" }}>{l}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ background: sStyle.bg, border: `1px solid ${sStyle.border}`, color: sStyle.color, borderRadius: 10, padding: "8px 16px", fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
                {sStyle.text(lang)}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", maxWidth: 240 }}>{intel.safetyMsg}</div>
            </div>
          </div>

          {/* Column mapping */}
          <div style={S.panel}>
            <span style={S.label}>Column Mapping — {intel.mappings.filter(m => m.recognized).length} of {intel.colCount} recognized</span>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Your Column", "Maps To", "Required", "Sample Data", "Affects"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 800, color: "#64748b", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {intel.mappings.map(m => (
                    <tr key={m.source} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0f172a" }}>{m.source}</td>
                      <td style={{ padding: "8px 12px" }}>
                        {m.recognized
                          ? <span style={{ background: "#f0fdf4", color: "#16a34a", fontWeight: 700, padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>✓ {m.label}</span>
                          : <span style={{ background: "#f1f5f9", color: "#94a3b8", fontWeight: 600, padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>— {t("colUnknown").split("—")[1]?.trim() || "Not recognized"}</span>}
                      </td>
                      <td style={{ padding: "8px 12px", color: m.required ? "#dc2626" : "#94a3b8", fontWeight: m.required ? 700 : 400, fontSize: 11 }}>{m.required ? "Required" : "Optional"}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.sample || "—"}</td>
                      <td style={{ padding: "8px 12px", color: "#64748b", fontSize: 11 }}>{m.affects}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data quality issues */}
          <div style={S.panel}>
            <span style={S.label}>Data Quality — {intel.issues.length === 0 ? "No issues" : `${errors.length} error${errors.length !== 1 ? "s" : ""}, ${intel.issues.filter(i => i.severity === "warning").length} warning${intel.issues.filter(i => i.severity === "warning").length !== 1 ? "s" : ""}`}</span>
            {intel.issues.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#16a34a", fontWeight: 700, fontSize: 13 }}>
                <span>✓</span> {t("noIssues")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {intel.issues.map((issue, i) => {
                  const s = SEV_COLOR[issue.severity];
                  return (
                    <div key={i} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10, padding: "12px 16px", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0 14px", alignItems: "start" }}>
                      <div style={{ width: 22, height: 22, borderRadius: "50%", background: s.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, flexShrink: 0, marginTop: 1 }}>
                        {s.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 3 }}>{issue.title}</div>
                        <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{issue.detail}</div>
                        {issue.col && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Column: {issue.col}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {issue.autoFixed
                          ? <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "3px 8px", borderRadius: 6 }}>Auto-fixed</span>
                          : <span style={{ fontSize: 10, fontWeight: 700, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: 6 }}>{issue.role}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview table */}
          {intel.rowCount > 0 && (
            <div style={S.panel}>
              <span style={S.label}>Preview — First {Math.min(5, intel.rowCount)} of {intel.rowCount} rows</span>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {intel.headers.slice(0, 8).map(h => (
                        <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: 11, borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap", maxWidth: 160 }}>{h}</th>
                      ))}
                      {intel.headers.length > 8 && <th style={{ padding: "7px 12px", color: "#94a3b8", fontSize: 11, borderBottom: "1px solid #e2e8f0" }}>+{intel.headers.length - 8} more</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {intel.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 ? "#fafafa" : "#fff" }}>
                        {intel.headers.slice(0, 8).map(h => (
                          <td key={h} style={{ padding: "7px 12px", color: "#0f172a", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {String(row[h] ?? "")}
                          </td>
                        ))}
                        {intel.headers.length > 8 && <td style={{ padding: "7px 12px", color: "#94a3b8", fontSize: 11 }}>…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Next action + import controls */}
          <div style={{ ...S.panel, background: canImport ? "#f0fdf4" : "#fef2f2", border: `1px solid ${canImport ? "#86efac" : "#fca5a5"}` }}>
            <span style={{ ...S.label, color: canImport ? "#16a34a" : "#dc2626" }}>{t("nextActionLabel")}</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 16 }}>{intel.nextAction}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", cursor: "pointer", fontWeight: 600 }}>
                <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
                {t("dryRun")}
              </label>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={reset} style={S.btn("#f1f5f9", "#475569")}>← Upload different file</button>
                <button
                  onClick={handleImport}
                  disabled={!canImport}
                  style={{ padding: "10px 24px", background: canImport ? "#1e40af" : "#94a3b8", color: "#fff", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: canImport ? "pointer" : "not-allowed" }}
                >
                  {dryRun ? "Run Dry Run" : `${t("importBtn")} ${intel.rowCount.toLocaleString()} rows →`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Importing phase ──────────────────────────────────────────────────────

  if (phase === "importing") return (
    <div style={S.page}>
      {renderHeader()}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", gap: 20 }}>
        <div style={{ width: 56, height: 56, border: "4px solid #e2e8f0", borderTopColor: "#1e40af", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{t("importingMsg")}</div>
        <div style={{ width: 320, background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", background: "#1e40af", borderRadius: 99, width: `${progress}%`, transition: "width 0.5s" }} />
        </div>
      </div>
    </div>
  );

  // ─── Done phase ───────────────────────────────────────────────────────────

  if (phase === "done" && result) {
    const module = intel?.module ?? "general";
    const destRoute = MODULE_ROUTES[module] ?? "/ronyx";
    return (
      <div style={S.page}>
        {renderHeader()}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>{result.ok ? "✓" : "⚠"}</div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a" }}>{t("resultSummary")}</h2>

          <div style={{ display: "flex", justifyContent: "center", gap: 16, margin: "24px 0", flexWrap: "wrap" }}>
            {[
              { label: "Imported", value: result.imported, color: "#16a34a" },
              { label: "Updated",  value: result.updated,  color: "#2563eb" },
              { label: "Skipped",  value: result.skipped,  color: "#d97706" },
              { label: "Failed",   value: result.failed,   color: "#dc2626" },
            ].map(s => (
              <div key={s.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 22px", minWidth: 90 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: 16, marginBottom: 20, textAlign: "left" }}>
              <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 8, fontSize: 13 }}>Errors</div>
              {result.errors.slice(0, 10).map((e, i) => <div key={i} style={{ fontSize: 12, color: "#7f1d1d", padding: "3px 0" }}>{e}</div>)}
            </div>
          )}

          <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 12, padding: "14px 20px", marginBottom: 28, textAlign: "left" }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 4 }}>{t("nextActionLabel")}</span>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{result.nextAction}</div>
          </div>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={reset} style={{ ...S.btn("#f1f5f9", "#475569"), padding: "10px 20px", fontSize: 13 }}>{t("importAnother")}</button>
            <Link href={destRoute} style={{ ...S.btn("#1e40af"), padding: "10px 20px", fontSize: 13, textDecoration: "none" }}>
              Open {intel?.moduleLabel ?? "Module"} →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
