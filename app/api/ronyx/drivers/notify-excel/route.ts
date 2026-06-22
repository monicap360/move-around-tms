import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import nodemailer from "nodemailer";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "sylviaypena@yahoo.com";

const COLUMNS: { header: string; key: string; width: number }[] = [
  { header: "Full Name",           key: "full_name",                width: 22 },
  { header: "Phone",               key: "phone",                    width: 16 },
  { header: "Email",               key: "email",                    width: 26 },
  { header: "Status",              key: "status",                   width: 12 },
  { header: "Driver Type",         key: "driver_type",              width: 12 },
  { header: "Position / Role",     key: "position_role",            width: 18 },
  { header: "CDL #",               key: "license_number",           width: 16 },
  { header: "CDL State",           key: "license_state",            width: 10 },
  { header: "CDL Expiration",      key: "license_expiration_date",  width: 16 },
  { header: "MVR Expiration",      key: "mvr_expiration",           width: 16 },
  { header: "Medical Card Exp.",   key: "medical_card_expiration",  width: 18 },
  { header: "Hire Date",           key: "hire_date",                width: 14 },
  { header: "Truck #",             key: "assigned_truck_number",    width: 10 },
  { header: "Pay Rate",            key: "pay_rate",                 width: 12 },
  { header: "Address",             key: "address",                  width: 30 },
  { header: "Emergency Contact",   key: "emergency_contact_name",   width: 22 },
  { header: "Emergency Phone",     key: "emergency_contact_phone",  width: 16 },
  { header: "Background Check",    key: "background_check_status",  width: 18 },
  { header: "Drug Test",           key: "drug_test_status",         width: 14 },
  { header: "Hazmat Training",     key: "hazmat_training",          width: 16 },
  { header: "Orientation Done",    key: "orientation_completed",    width: 16 },
  { header: "Supervisor",          key: "supervisor_name",          width: 20 },
];

async function buildExcel(drivers: Record<string, unknown>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  const ws = wb.addWorksheet("Driver Roster");

  ws.columns = COLUMNS;

  // Header row styling
  const headerRow = ws.getRow(1);
  headerRow.font    = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill    = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height  = 22;

  // Data rows
  drivers.forEach((driver) => {
    const row = ws.addRow(COLUMNS.map((c) => {
      const v = driver[c.key];
      if (typeof v === "boolean") return v ? "Yes" : "No";
      return v ?? "";
    }));
    row.font = { size: 10 };
    row.alignment = { vertical: "middle" };
  });

  // Alternating row color
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    if (rowNum % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
      });
    }
  });

  // Borders on all cells
  ws.eachRow((row) => {
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

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in your environment variables."
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Fetch all current drivers from the DB
    const supabase = supabaseAdmin;
    const { data: rows, error: dbErr } = await supabase
      .from("drivers")
      .select("id, name, phone, email, driver_profiles(*)")
      .order("created_at", { ascending: false });

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    // Flatten driver + profile
    const drivers = (rows || []).map((d: any) => {
      const p: any = Array.isArray(d.driver_profiles) ? d.driver_profiles[0] : d.driver_profiles;
      return {
        full_name:                p?.full_name                || d.name || "",
        phone:                    p?.phone                    || d.phone || "",
        email:                    p?.email                    || d.email || "",
        status:                   p?.status                   || "active",
        driver_type:              p?.driver_type              || "",
        position_role:            p?.position_role            || "",
        license_number:           p?.license_number           || "",
        license_state:            p?.license_state            || "",
        license_expiration_date:  p?.license_expiration_date  || "",
        mvr_expiration:           p?.mvr_expiration           || "",
        medical_card_expiration:  p?.medical_card_expiration  || "",
        hire_date:                p?.hire_date                || "",
        assigned_truck_number:    p?.assigned_truck_number    || "",
        pay_rate:                 p?.pay_rate                 ?? "",
        address:                  p?.address                  || "",
        emergency_contact_name:   p?.emergency_contact_name   || "",
        emergency_contact_phone:  p?.emergency_contact_phone  || "",
        background_check_status:  p?.background_check_status  || "",
        drug_test_status:         p?.drug_test_status         || "",
        hazmat_training:          p?.hazmat_training          ?? false,
        orientation_completed:    p?.orientation_completed    ?? false,
        supervisor_name:          p?.supervisor_name          || "",
      };
    });

    const excelBuffer = await buildExcel(drivers);

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
    const fileName = `Ronyx_Driver_Roster_${new Date().toISOString().slice(0, 10)}.xlsx`;

    const transport = createTransport();

    await transport.sendMail({
      from:    `"MoveAround TMS" <${process.env.GMAIL_USER}>`,
      to:      ADMIN_EMAIL,
      subject: `Driver Roster Updated — ${today}`,
      text:    `Hello,\n\nThe Ronyx driver roster has been updated. Please find the attached Excel file with all current driver information as of ${today}.\n\nTotal drivers: ${drivers.length}\n\n— MoveAround TMS`,
      html:    `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
            <h2 style="color:#fff;margin:0;font-size:18px;">MoveAround TMS</h2>
            <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Ronyx Logistics Portal</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 8px 8px;">
            <h3 style="margin:0 0 12px;color:#0f172a;">Driver Roster Updated</h3>
            <p style="color:#475569;line-height:1.6;">The Ronyx driver roster has been updated. The attached Excel file contains all current driver information as of <strong>${today}</strong>.</p>
            <div style="background:#1e40af;color:#fff;display:inline-block;padding:6px 16px;border-radius:6px;font-size:14px;font-weight:600;margin:12px 0;">
              Total Drivers: ${drivers.length}
            </div>
            <p style="color:#94a3b8;font-size:12px;margin-top:20px;">This is an automated message from MoveAround TMS.</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename:    fileName,
          content:     excelBuffer,
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      ],
    });

    return NextResponse.json({ ok: true, driverCount: drivers.length, sentTo: ADMIN_EMAIL });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send notification" }, { status: 500 });
  }
}
