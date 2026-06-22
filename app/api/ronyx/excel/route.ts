import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BLUE  = "FF1D4ED8";
const WHITE = "FFFFFFFF";
const GRAY  = "FFF8FAFC";
const DARK  = "FF0F172A";

function headerStyle(ws: ExcelJS.Worksheet, rowNum: number, cols: number) {
  const row = ws.getRow(rowNum);
  row.height = 28;
  for (let c = 1; c <= cols; c++) {
    const cell = row.getCell(c);
    cell.font  = { bold: true, color: { argb: WHITE }, size: 11, name: "Calibri" };
    cell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF93C5FD" } },
    };
  }
  row.commit();
}

function dataRow(ws: ExcelJS.Worksheet, rowNum: number, cols: number, even: boolean) {
  const row = ws.getRow(rowNum);
  row.height = 20;
  for (let c = 1; c <= cols; c++) {
    const cell = row.getCell(c);
    if (even) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRAY } };
    cell.alignment = { vertical: "middle" };
  }
  row.commit();
}

function titleRow(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  const t = ws.getCell("A1");
  t.value = title;
  t.font  = { bold: true, size: 14, color: { argb: DARK }, name: "Calibri" };
  t.alignment = { vertical: "middle", horizontal: "left" };
  ws.getRow(1).height = 32;

  ws.mergeCells(2, 1, 2, cols);
  const s = ws.getCell("A2");
  s.value = subtitle;
  s.font  = { size: 9, color: { argb: "FF64748B" }, name: "Calibri" };
  s.alignment = { vertical: "middle" };
  ws.getRow(2).height = 18;
}

async function resolveOrg(supabase: typeof supabaseAdmin) {
  const envId = process.env.RONYX_ORG_ID;
  const orFilter = envId ? `id.eq.${envId},organization_code.eq.RONYX` : `organization_code.eq.RONYX`;
  const { data } = await supabase.from("organizations").select("id, name").or(orFilter).limit(1).single();
  return data ?? { id: "", name: "MoveAround TMS" };
}

// ── Generators ────────────────────────────────────────────────────────────────

async function genTickets(orgId: string, orgName: string, params: URLSearchParams) {
  const from = params.get("from");
  const to   = params.get("to");
  const wb   = new ExcelJS.Workbook();
  wb.creator  = "MoveAround TMS";
  wb.created  = new Date();

  let q = supabaseAdmin
    .from("aggregate_tickets")
    .select("ticket_number,ticket_date,driver_name,truck_number,material,load_site,dump_site,quantity,unit,ticket_amount,status,payment_status,customer_name,project_name,created_at")
    .eq("organization_id", orgId)
    .order("ticket_date", { ascending: false });
  if (from) q = q.gte("ticket_date", from);
  if (to)   q = q.lte("ticket_date", to);
  q = q.limit(5000);

  const { data } = await q;
  const rows = data || [];

  const ws = wb.addWorksheet("Tickets");
  const generated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  titleRow(ws, `${orgName} — Tickets`, `Generated: ${generated} CST  |  ${rows.length} records`, 14);

  ws.columns = [
    { key: "ticket_number",  width: 16 },
    { key: "ticket_date",    width: 13 },
    { key: "driver_name",    width: 22 },
    { key: "truck_number",   width: 13 },
    { key: "customer_name",  width: 24 },
    { key: "project_name",   width: 24 },
    { key: "material",       width: 18 },
    { key: "load_site",      width: 26 },
    { key: "dump_site",      width: 26 },
    { key: "quantity",       width: 11 },
    { key: "unit",           width: 9  },
    { key: "ticket_amount",  width: 14 },
    { key: "status",         width: 18 },
    { key: "payment_status", width: 16 },
  ];

  const HDR_ROW = 3;
  ws.getRow(HDR_ROW).values = [
    "Ticket #", "Date", "Driver", "Truck", "Customer", "Project",
    "Material", "Load Site", "Dump Site", "Quantity", "Unit",
    "Amount ($)", "Status", "Payment",
  ];
  headerStyle(ws, HDR_ROW, 14);
  ws.autoFilter = { from: { row: HDR_ROW, column: 1 }, to: { row: HDR_ROW, column: 14 } };
  ws.views = [{ state: "frozen", ySplit: HDR_ROW }];

  rows.forEach((r: any, i) => {
    const rn = HDR_ROW + 1 + i;
    ws.getRow(rn).values = [
      r.ticket_number, r.ticket_date, r.driver_name, r.truck_number,
      r.customer_name, r.project_name, r.material, r.load_site, r.dump_site,
      r.quantity ? Number(r.quantity) : null, r.unit,
      r.ticket_amount ? Number(r.ticket_amount) : null,
      r.status, r.payment_status,
    ];
    ws.getColumn(12).numFmt = '"$"#,##0.00';
    ws.getColumn(10).numFmt = "#,##0.000";
    dataRow(ws, rn, 14, i % 2 === 0);
  });

  return wb;
}

async function genDrivers(orgId: string, orgName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  const { data } = await supabaseAdmin
    .from("driver_profiles")
    .select("name,cdl_number,cdl_class,cdl_expiration,status,phone,email,home_state,hire_date,termination_date,notes")
    .eq("organization_id", orgId)
    .order("name");

  const rows = data || [];
  const ws = wb.addWorksheet("Drivers");
  const generated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  titleRow(ws, `${orgName} — Driver Roster`, `Generated: ${generated} CST  |  ${rows.length} drivers`, 11);

  ws.columns = [
    { key: "name",             width: 26 },
    { key: "status",           width: 12 },
    { key: "phone",            width: 16 },
    { key: "email",            width: 28 },
    { key: "cdl_number",       width: 18 },
    { key: "cdl_class",        width: 11 },
    { key: "cdl_expiration",   width: 14 },
    { key: "home_state",       width: 12 },
    { key: "hire_date",        width: 12 },
    { key: "termination_date", width: 16 },
    { key: "notes",            width: 32 },
  ];

  const HDR_ROW = 3;
  ws.getRow(HDR_ROW).values = [
    "Driver Name", "Status", "Phone", "Email",
    "CDL #", "CDL Class", "CDL Expires", "Home State",
    "Hire Date", "Term. Date", "Notes",
  ];
  headerStyle(ws, HDR_ROW, 11);
  ws.autoFilter = { from: { row: HDR_ROW, column: 1 }, to: { row: HDR_ROW, column: 11 } };
  ws.views = [{ state: "frozen", ySplit: HDR_ROW }];

  rows.forEach((r: any, i) => {
    const rn = HDR_ROW + 1 + i;
    ws.getRow(rn).values = [
      r.name, r.status, r.phone, r.email,
      r.cdl_number, r.cdl_class, r.cdl_expiration, r.home_state,
      r.hire_date, r.termination_date, r.notes,
    ];
    dataRow(ws, rn, 11, i % 2 === 0);
  });

  return wb;
}

async function genTrucks(orgId: string, orgName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  const { data } = await supabaseAdmin
    .from("ronyx_trucks")
    .select("truck_number,make,model,year,vin,license_plate,license_state,status,truck_type,payload_capacity,notes")
    .eq("organization_id", orgId)
    .order("truck_number");

  const rows = data || [];
  const ws = wb.addWorksheet("Trucks");
  const generated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  titleRow(ws, `${orgName} — Fleet`, `Generated: ${generated} CST  |  ${rows.length} trucks`, 11);

  ws.columns = [
    { key: "truck_number",      width: 14 },
    { key: "status",            width: 12 },
    { key: "make",              width: 14 },
    { key: "model",             width: 16 },
    { key: "year",              width: 8  },
    { key: "truck_type",        width: 16 },
    { key: "payload_capacity",  width: 16 },
    { key: "vin",               width: 20 },
    { key: "license_plate",     width: 14 },
    { key: "license_state",     width: 12 },
    { key: "notes",             width: 32 },
  ];

  const HDR_ROW = 3;
  ws.getRow(HDR_ROW).values = [
    "Truck #", "Status", "Make", "Model", "Year",
    "Type", "Payload Cap.", "VIN", "Plate #", "Plate State", "Notes",
  ];
  headerStyle(ws, HDR_ROW, 11);
  ws.autoFilter = { from: { row: HDR_ROW, column: 1 }, to: { row: HDR_ROW, column: 11 } };
  ws.views = [{ state: "frozen", ySplit: HDR_ROW }];

  rows.forEach((r: any, i) => {
    const rn = HDR_ROW + 1 + i;
    ws.getRow(rn).values = [
      r.truck_number, r.status, r.make, r.model, r.year,
      r.truck_type, r.payload_capacity, r.vin,
      r.license_plate, r.license_state, r.notes,
    ];
    dataRow(ws, rn, 11, i % 2 === 0);
  });

  return wb;
}

async function genOwnerOperators(orgId: string, orgName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  const { data: oos } = await supabaseAdmin
    .from("ronyx_owner_operators")
    .select("company_name,contact_name,contact_phone,contact_email,business_address,mc_number,dot_number,ein,status,notes")
    .eq("organization_id", orgId)
    .order("company_name");

  const rows = oos || [];
  const ws = wb.addWorksheet("Owner Operators");
  const generated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  titleRow(ws, `${orgName} — Owner Operators`, `Generated: ${generated} CST  |  ${rows.length} companies`, 10);

  ws.columns = [
    { key: "company_name",    width: 30 },
    { key: "status",          width: 12 },
    { key: "contact_name",    width: 22 },
    { key: "contact_phone",   width: 16 },
    { key: "contact_email",   width: 28 },
    { key: "business_address",width: 36 },
    { key: "mc_number",       width: 14 },
    { key: "dot_number",      width: 14 },
    { key: "ein",             width: 14 },
    { key: "notes",           width: 30 },
  ];

  const HDR_ROW = 3;
  ws.getRow(HDR_ROW).values = [
    "Company Name", "Status", "Contact", "Phone", "Email",
    "Address", "MC #", "DOT #", "EIN", "Notes",
  ];
  headerStyle(ws, HDR_ROW, 10);
  ws.autoFilter = { from: { row: HDR_ROW, column: 1 }, to: { row: HDR_ROW, column: 10 } };
  ws.views = [{ state: "frozen", ySplit: HDR_ROW }];

  rows.forEach((r: any, i) => {
    const rn = HDR_ROW + 1 + i;
    ws.getRow(rn).values = [
      r.company_name, r.status, r.contact_name, r.contact_phone,
      r.contact_email, r.business_address, r.mc_number,
      r.dot_number, r.ein, r.notes,
    ];
    dataRow(ws, rn, 10, i % 2 === 0);
  });

  return wb;
}

async function genPayroll(orgId: string, orgName: string, params: URLSearchParams) {
  const from = params.get("from");
  const to   = params.get("to");
  const wb   = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  let q = supabaseAdmin
    .from("payroll_invoices")
    .select("invoice_number,driver_name,pay_period_start,pay_period_end,total_loads,total_tons,gross_pay,total_deductions,net_pay,status,payment_method,notes")
    .eq("organization_id", orgId)
    .order("pay_period_end", { ascending: false });
  if (from) q = q.gte("pay_period_start", from);
  if (to)   q = q.lte("pay_period_end", to);
  q = q.limit(3000);

  const { data } = await q;
  const rows = data || [];

  const ws = wb.addWorksheet("Payroll");
  const generated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  titleRow(ws, `${orgName} — Payroll`, `Generated: ${generated} CST  |  ${rows.length} records`, 12);

  ws.columns = [
    { key: "invoice_number",   width: 16 },
    { key: "driver_name",      width: 24 },
    { key: "pay_period_start", width: 14 },
    { key: "pay_period_end",   width: 14 },
    { key: "total_loads",      width: 12 },
    { key: "total_tons",       width: 12 },
    { key: "gross_pay",        width: 13 },
    { key: "total_deductions", width: 15 },
    { key: "net_pay",          width: 13 },
    { key: "status",           width: 14 },
    { key: "payment_method",   width: 16 },
    { key: "notes",            width: 30 },
  ];

  const HDR_ROW = 3;
  ws.getRow(HDR_ROW).values = [
    "Invoice #", "Driver", "Period Start", "Period End",
    "Loads", "Tons", "Gross Pay", "Deductions", "Net Pay",
    "Status", "Payment Method", "Notes",
  ];
  headerStyle(ws, HDR_ROW, 12);
  ws.autoFilter = { from: { row: HDR_ROW, column: 1 }, to: { row: HDR_ROW, column: 12 } };
  ws.views = [{ state: "frozen", ySplit: HDR_ROW }];

  const moneyFmt = '"$"#,##0.00';
  rows.forEach((r: any, i) => {
    const rn = HDR_ROW + 1 + i;
    ws.getRow(rn).values = [
      r.invoice_number, r.driver_name, r.pay_period_start, r.pay_period_end,
      r.total_loads ? Number(r.total_loads) : null,
      r.total_tons  ? Number(r.total_tons)  : null,
      r.gross_pay   ? Number(r.gross_pay)   : null,
      r.total_deductions ? Number(r.total_deductions) : null,
      r.net_pay     ? Number(r.net_pay)     : null,
      r.status, r.payment_method, r.notes,
    ];
    ws.getRow(rn).getCell(7).numFmt = moneyFmt;
    ws.getRow(rn).getCell(8).numFmt = moneyFmt;
    ws.getRow(rn).getCell(9).numFmt = moneyFmt;
    ws.getRow(rn).getCell(6).numFmt = "#,##0.000";
    dataRow(ws, rn, 12, i % 2 === 0);
  });

  return wb;
}

async function genCustomers(orgId: string, orgName: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MoveAround TMS";
  wb.created = new Date();

  const { data } = await supabaseAdmin
    .from("ronyx_customers")
    .select("company_name,contact_name,contact_phone,contact_email,billing_address,status,notes,created_at")
    .eq("organization_id", orgId)
    .order("company_name");

  const rows = data || [];
  const ws = wb.addWorksheet("Customers");
  const generated = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });
  titleRow(ws, `${orgName} — Customers`, `Generated: ${generated} CST  |  ${rows.length} customers`, 8);

  ws.columns = [
    { key: "company_name",    width: 30 },
    { key: "status",          width: 12 },
    { key: "contact_name",    width: 22 },
    { key: "contact_phone",   width: 16 },
    { key: "contact_email",   width: 28 },
    { key: "billing_address", width: 36 },
    { key: "notes",           width: 30 },
    { key: "created_at",      width: 14 },
  ];

  const HDR_ROW = 3;
  ws.getRow(HDR_ROW).values = [
    "Company Name", "Status", "Contact", "Phone", "Email",
    "Billing Address", "Notes", "Added On",
  ];
  headerStyle(ws, HDR_ROW, 8);
  ws.autoFilter = { from: { row: HDR_ROW, column: 1 }, to: { row: HDR_ROW, column: 8 } };
  ws.views = [{ state: "frozen", ySplit: HDR_ROW }];

  rows.forEach((r: any, i) => {
    const rn = HDR_ROW + 1 + i;
    ws.getRow(rn).values = [
      r.company_name, r.status, r.contact_name, r.contact_phone,
      r.contact_email, r.billing_address, r.notes,
      r.created_at ? r.created_at.slice(0, 10) : null,
    ];
    dataRow(ws, rn, 8, i % 2 === 0);
  });

  return wb;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") || "tickets";

  const sb  = supabaseAdmin;
  const org = await resolveOrg(sb);
  if (!org.id) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const safe = org.name.replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_");
  const date = new Date().toISOString().slice(0, 10);

  let wb: ExcelJS.Workbook;
  let filename: string;

  try {
    switch (type) {
      case "drivers":
        wb = await genDrivers(org.id, org.name);
        filename = `${safe}_Drivers_${date}.xlsx`;
        break;
      case "trucks":
        wb = await genTrucks(org.id, org.name);
        filename = `${safe}_Fleet_${date}.xlsx`;
        break;
      case "owner-operators":
        wb = await genOwnerOperators(org.id, org.name);
        filename = `${safe}_OwnerOperators_${date}.xlsx`;
        break;
      case "payroll":
        wb = await genPayroll(org.id, org.name, searchParams);
        filename = `${safe}_Payroll_${date}.xlsx`;
        break;
      case "customers":
        wb = await genCustomers(org.id, org.name);
        filename = `${safe}_Customers_${date}.xlsx`;
        break;
      default:
        wb = await genTickets(org.id, org.name, searchParams);
        filename = `${safe}_Tickets_${date}.xlsx`;
    }

    const buffer = await wb.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control":       "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Excel generation failed" }, { status: 500 });
  }
}

// ── POST handler — list stored files ─────────────────────────────────────────
// POST { action: "list" } → returns org_excel_files rows
// POST { action: "delete", id } → deletes file + storage object

export async function POST(req: NextRequest) {
  try {
    const sb   = supabaseAdmin;
    const org  = await resolveOrg(sb);
    if (!org.id) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const body   = await req.json();
    const action = body.action as string;

    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("org_excel_files")
        .select("*")
        .eq("organization_id", org.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ files: data || [] });
    }

    if (action === "delete") {
      const { id } = body;
      const { data: file } = await supabaseAdmin
        .from("org_excel_files")
        .select("storage_path, organization_id")
        .eq("id", id)
        .eq("organization_id", org.id)
        .single();

      if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

      await supabaseAdmin.storage.from("ronyx-imports").remove([file.storage_path]);
      await supabaseAdmin.from("org_excel_files").delete().eq("id", id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
