import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BACKUP_COLS: { header: string; key: string; width: number }[] = [
  { header: "Driver Name",             key: "driver_name",           width: 24 },
  { header: "CDL #",                   key: "cdl_number",            width: 18 },
  { header: "CDL Expiration",          key: "cdl_expiration_fmt",    width: 16 },
  { header: "Truck #",                 key: "truck_number",          width: 10 },
  { header: "Medical Card #",          key: "medical_card_number",   width: 18 },
  { header: "Medical Card Exp.",       key: "medical_card_exp_fmt",  width: 20 },
  { header: "Job Assignment",          key: "job_assignment",        width: 18 },
  { header: "Company Name",            key: "company_name",          width: 20 },
  { header: "Driver Status",           key: "driver_status",         width: 14 },
  { header: "Dispatch Eligible",       key: "dispatch_eligible_fmt", width: 16 },
  { header: "Compliance Flags",        key: "compliance_flags_fmt",  width: 34 },
  { header: "Notes",                   key: "notes",                 width: 32 },
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
}

async function buildBackupExcel(rows: any[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  const ws = wb.addWorksheet("Driver Backup Data");
  ws.columns = BACKUP_COLS;

  const hdr = ws.getRow(1);
  hdr.font      = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  hdr.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  hdr.alignment = { vertical: "middle", horizontal: "center" };
  hdr.height    = 22;

  rows.forEach((r) => {
    const flat = {
      driver_name:           r.driver_name ?? "",
      cdl_number:            r.cdl_number ?? "",
      cdl_expiration_fmt:    fmtDate(r.cdl_expiration),
      truck_number:          r.truck_number ?? "",
      medical_card_number:   r.medical_card_number ?? "",
      medical_card_exp_fmt:  fmtDate(r.medical_card_expiration),
      job_assignment:        r.job_assignment ?? "",
      company_name:          r.company_name ?? "",
      driver_status:         r.driver_status ?? "",
      dispatch_eligible_fmt: r.dispatch_eligible ? "Yes" : "No",
      compliance_flags_fmt:  Array.isArray(r.compliance_flags) ? r.compliance_flags.join(", ") : (r.compliance_flags ?? ""),
      notes:                 r.notes ?? "",
    };
    const row = ws.addRow(BACKUP_COLS.map((c) => flat[c.key as keyof typeof flat] ?? ""));
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
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin;
  const body     = await req.json().catch(() => ({}));
  const toEmail  = body.to || process.env.DRIVER_BACKUP_EMAIL || "sylviaypena@yahoo.com";

  // Fetch backup data
  let rows: any[] = [];
  const { data: viewData, error: viewErr } = await supabase
    .from("driver_backup_data_view")
    .select("*")
    .order("driver_name", { ascending: true });

  if (!viewErr) {
    rows = viewData || [];
  } else {
    const { data: fallback } = await supabase
      .from("drivers")
      .select("id, full_name, license_number, license_expiration_date, assigned_truck_number, medical_card_expiration, status, dispatch_eligible, compliance_flags, notes, updated_at")
      .order("full_name", { ascending: true });
    rows = (fallback || []).map((d: any) => ({
      driver_name:             d.full_name,
      cdl_number:              d.license_number,
      cdl_expiration:          d.license_expiration_date,
      truck_number:            d.assigned_truck_number,
      medical_card_number:     null,
      medical_card_expiration: d.medical_card_expiration,
      job_assignment:          null,
      company_name:            null,
      driver_status:           d.status,
      dispatch_eligible:       d.dispatch_eligible,
      compliance_flags:        d.compliance_flags,
      notes:                   d.notes,
      last_updated:            d.updated_at,
    }));
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    // Log to audit trail and return graceful response
    await supabase.from("ticket_audit_log").insert({
      action:      "driver_backup_email_queued",
      description: `Driver backup email queued (SMTP not configured) — ${rows.length} drivers`,
      metadata:    { to: toEmail, driver_count: rows.length },
    }).maybeSingle();
    return NextResponse.json({
      ok: false,
      queued: true,
      message: "Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in environment variables.",
    });
  }

  const excel    = await buildBackupExcel(rows);
  const today    = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const fileName = `Ronyx_Driver_Backup_${new Date().toISOString().slice(0, 10)}.xlsx`;

  const now        = new Date();
  const in60       = new Date(now.getTime() + 60 * 86400000);
  const expiring   = rows.filter((r) => {
    const cdl = r.cdl_expiration          ? new Date(r.cdl_expiration)          : null;
    const med = r.medical_card_expiration ? new Date(r.medical_card_expiration) : null;
    return (cdl && cdl > now && cdl <= in60) || (med && med > now && med <= in60);
  }).length;
  const missing = rows.filter((r) => !r.cdl_number || !r.medical_card_number).length;

  const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

  await transport.sendMail({
    from:    `"MoveAround TMS" <${user}>`,
    to:      toEmail,
    subject: `Ronyx Driver Backup — ${today}`,
    text:    `Driver backup report for ${today}.\n\nTotal: ${rows.length}\nExpiring (60d): ${expiring}\nMissing Compliance: ${missing}\n\nSee attached Excel file.\n\n— MoveAround TMS`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;">
        <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h2 style="color:#fff;margin:0;font-size:18px;">MoveAround TMS</h2>
          <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Ronyx Driver Backup Report</p>
        </div>
        <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
          <h3 style="margin:0 0 12px;color:#0f172a;">Driver Backup — ${today}</h3>
          <p style="color:#475569;line-height:1.6;">The attached Excel file contains the current Ronyx driver backup data as of <strong>${today}</strong>.</p>
          <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;">
            <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 20px;text-align:center;">
              <div style="font-size:24px;font-weight:900;color:#1e40af;">${rows.length}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:4px;">Total Drivers</div>
            </div>
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 20px;text-align:center;">
              <div style="font-size:24px;font-weight:900;color:#d97706;">${expiring}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:4px;">Expiring (60d)</div>
            </div>
            <div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;padding:12px 20px;text-align:center;">
              <div style="font-size:24px;font-weight:900;color:#dc2626;">${missing}</div>
              <div style="font-size:11px;color:#64748b;font-weight:600;margin-top:4px;">Missing Compliance</div>
            </div>
          </div>
          <p style="color:#94a3b8;font-size:12px;margin-top:20px;">This is an automated message from MoveAround TMS — Ronyx Portal.</p>
        </div>
      </div>
    `,
    attachments: [{
      filename:    fileName,
      content:     excel,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }],
  });

  await supabase.from("ticket_audit_log").insert({
    action:      "driver_backup_email_sent",
    description: `Driver backup email sent to ${toEmail} — ${rows.length} drivers`,
    metadata:    { to: toEmail, driver_count: rows.length, expiring, missing },
  }).maybeSingle();

  return NextResponse.json({ ok: true, sentTo: toEmail, driverCount: rows.length });
}
