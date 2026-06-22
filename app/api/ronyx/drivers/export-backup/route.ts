import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BACKUP_COLS: { header: string; key: string; width: number }[] = [
  { header: "Driver Name",             key: "driver_name",            width: 24 },
  { header: "CDL #",                   key: "cdl_number",             width: 18 },
  { header: "CDL Expiration",          key: "cdl_expiration_fmt",     width: 16 },
  { header: "Truck #",                 key: "truck_number",           width: 10 },
  { header: "Medical Card #",          key: "medical_card_number",    width: 18 },
  { header: "Medical Card Expiration", key: "medical_card_exp_fmt",   width: 20 },
  { header: "Job Assignment",          key: "job_assignment",         width: 18 },
  { header: "Company Name",            key: "company_name",           width: 20 },
  { header: "Driver Status",           key: "driver_status",          width: 14 },
  { header: "Dispatch Eligible",       key: "dispatch_eligible_fmt",  width: 16 },
  { header: "Payroll Eligible",        key: "payroll_eligible_fmt",   width: 14 },
  { header: "Compliance Flags",        key: "compliance_flags_fmt",   width: 34 },
  { header: "Last Updated",            key: "last_updated_fmt",       width: 18 },
  { header: "Notes",                   key: "notes",                  width: 32 },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

function flattenRow(r: any) {
  return {
    ...r,
    cdl_expiration_fmt:        fmtDate(r.cdl_expiration),
    medical_card_exp_fmt:      fmtDate(r.medical_card_expiration),
    dispatch_eligible_fmt:     r.dispatch_eligible ? "Yes" : "No",
    payroll_eligible_fmt:      r.payroll_eligible  ? "Yes" : "No",
    compliance_flags_fmt:      Array.isArray(r.compliance_flags) ? r.compliance_flags.join(", ") : (r.compliance_flags ?? ""),
    last_updated_fmt:          fmtDate(r.last_updated),
    driver_name:               r.driver_name ?? "",
    cdl_number:                r.cdl_number ?? "",
    truck_number:              r.truck_number ?? "",
    medical_card_number:       r.medical_card_number ?? "",
    job_assignment:            r.job_assignment ?? "",
    company_name:              r.company_name ?? "",
    driver_status:             r.driver_status ?? "",
    notes:                     r.notes ?? "",
  };
}

function addStyledSheet(
  wb: ExcelJS.Workbook,
  name: string,
  cols: { header: string; key: string; width: number }[],
  rows: Record<string, unknown>[],
) {
  const ws = wb.addWorksheet(name);
  ws.columns = cols;

  const hdr = ws.getRow(1);
  hdr.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  hdr.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  hdr.alignment = { vertical: "middle", horizontal: "center" };
  hdr.height    = 22;

  rows.forEach((r) => {
    const row = ws.addRow(cols.map((c) => r[c.key] ?? ""));
    row.font      = { size: 10 };
    row.alignment = { vertical: "middle" };
  });

  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    if (rowNum % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });
    }
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = {
        top:    { style: "thin", color: { argb: "FFE2E8F0" } },
        left:   { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right:  { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1 }];
  return ws;
}

export async function GET(_req: NextRequest) {
  const supabase = supabaseAdmin;
  const now = new Date();

  // Fetch via view (migration 113 required); fall back gracefully
  let rawRows: any[] = [];
  const { data: viewData, error: viewErr } = await supabase
    .from("driver_backup_data_view")
    .select("*")
    .order("driver_name", { ascending: true });

  if (!viewErr) {
    rawRows = viewData || [];
  } else {
    const { data: fallback } = await supabase
      .from("drivers")
      .select("id, full_name as driver_name, license_number as cdl_number, license_expiration_date as cdl_expiration, assigned_truck_number as truck_number, medical_card_expiration, status as driver_status, dispatch_eligible, payroll_eligible, compliance_flags, updated_at as last_updated, notes")
      .order("full_name", { ascending: true });
    rawRows = fallback || [];
  }

  const in60 = new Date(now.getTime() + 60 * 86400000);
  const allFlat = rawRows.map(flattenRow);

  const expiringSoon = rawRows.filter((r) => {
    const cdl = r.cdl_expiration ? new Date(r.cdl_expiration) : null;
    const med = r.medical_card_expiration ? new Date(r.medical_card_expiration) : null;
    return (cdl && cdl > now && cdl <= in60) || (med && med > now && med <= in60);
  }).map(flattenRow);

  const missingFields = rawRows.filter((r) => !r.cdl_number || !r.medical_card_number || !r.cdl_expiration || !r.medical_card_expiration).map((r) => ({
    ...flattenRow(r),
    missing_fields: [
      !r.cdl_number              ? "CDL #" : null,
      !r.cdl_expiration          ? "CDL Expiration" : null,
      !r.medical_card_number     ? "Medical Card #" : null,
      !r.medical_card_expiration ? "Medical Card Exp" : null,
    ].filter(Boolean).join(", "),
  }));

  const nameCounts = new Map<string, number>();
  rawRows.forEach((r) => {
    const n = (r.driver_name || "").trim().toLowerCase();
    nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
  });
  const possibleDups = rawRows
    .filter((r) => (nameCounts.get((r.driver_name || "").trim().toLowerCase()) || 0) > 1)
    .map(flattenRow);

  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = now;

  addStyledSheet(wb, "Driver Backup Data",       BACKUP_COLS, allFlat);
  addStyledSheet(wb, "Compliance Expiring Soon", BACKUP_COLS, expiringSoon);
  addStyledSheet(wb, "Missing Fields", [
    ...BACKUP_COLS.slice(0, 4),
    { header: "Missing Fields", key: "missing_fields", width: 40 },
    ...BACKUP_COLS.slice(8),
  ], missingFields);
  addStyledSheet(wb, "Possible Duplicates", BACKUP_COLS, possibleDups);

  // Summary sheet
  const sumWs = wb.addWorksheet("Export Summary");
  sumWs.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value",  key: "value",  width: 20 },
  ];
  const sumHdr = sumWs.getRow(1);
  sumHdr.font = { bold: true, color: { argb: "FFFFFFFF" } };
  sumHdr.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  [
    { metric: "Export Date",               value: now.toLocaleDateString("en-US") },
    { metric: "Total Drivers",             value: rawRows.length },
    { metric: "Expiring Within 60 Days",   value: expiringSoon.length },
    { metric: "Drivers w/ Missing Fields", value: missingFields.length },
    { metric: "Possible Duplicates",       value: possibleDups.length },
    { metric: "Generated By",              value: "MoveAround TMS — Ronyx Portal" },
  ].forEach((r) => sumWs.addRow(r));

  const buf  = await wb.xlsx.writeBuffer();
  const file = `Ronyx_Driver_Backup_${now.toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}
