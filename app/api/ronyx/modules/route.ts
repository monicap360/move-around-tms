import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const DEFAULT_ROWS: Record<string, { title: string; subtitle: string; status: string }[]> = {
  dispatch: [
    { title: "LD-5081 • Pit 7 → I‑45 Jobsite", subtitle: "Driver: D. Perez", status: "In Transit" },
    { title: "LD-5084 • Pit 3 → Beltway 8", subtitle: "Driver: S. Grant", status: "Loading" },
    { title: "LD-5087 • Pit 5 → Katy Site", subtitle: "Driver: J. Lane", status: "Queued" },
  ],
  loads: [
    { title: "LD-5069 • Pit 2 → Downtown", subtitle: "Material: Base", status: "Delivered" },
    { title: "LD-5074 • Pit 7 → I‑10", subtitle: "Material: Gravel", status: "In Transit" },
    { title: "LD-5079 • Pit 3 → Loop 610", subtitle: "Material: Sand", status: "Loading" },
  ],
  workflows: [
    { title: "Order → Dispatch", subtitle: "Auto-assign trucks by availability", status: "Enabled" },
    { title: "Dispatch → Ticket", subtitle: "TicketFlash OCR + validation", status: "Enabled" },
    { title: "Ticket → Invoice", subtitle: "Invoice auto-generated on approval", status: "Enabled" },
  ],
  "driver-app": [
    { title: "Mobile Ticket Upload", subtitle: "Camera + OCR capture", status: "Live" },
    { title: "Status Updates", subtitle: "Loaded / Empty / At Site", status: "Live" },
    { title: "GPS Proof", subtitle: "Pickup and dropoff timestamps", status: "Live" },
  ],
  portal: [
    { title: "Live Load Visibility", subtitle: "Customer view of in-progress loads", status: "Ready" },
    { title: "Digital Tickets", subtitle: "Downloadable POD + ticket images", status: "Ready" },
    { title: "Statements", subtitle: "Invoice history + balances", status: "Ready" },
  ],
  integrations: [
    { title: "Accounting Sync", subtitle: "QuickBooks / Sage mapping", status: "Planned" },
    { title: "Telematics", subtitle: "GPS + ELD providers", status: "Ready" },
    { title: "Scale House", subtitle: "Ticket validation feeds", status: "Ready" },
  ],
  drivers: [
    { title: "D. Perez", subtitle: "Available • 9.2 hrs on duty", status: "Ready" },
    { title: "S. Grant", subtitle: "On load LD-5084", status: "On Route" },
    { title: "J. Lane", subtitle: "Pit queue • 32 min", status: "Idle Alert" },
  ],
  trucks: [
    { title: "Truck 18 • Kenworth", subtitle: "2,410 hrs • Next service 3 days", status: "Due Soon" },
    { title: "Truck 22 • Mack", subtitle: "On load LD-5074", status: "Active" },
    { title: "Truck 31 • Freightliner", subtitle: "Idle 18 min", status: "Idle Alert" },
  ],
  tickets: [
    { title: "T-884 • Gravel", subtitle: "Weight mismatch flagged", status: "Needs Review" },
    { title: "T-889 • Sand", subtitle: "OCR complete", status: "Pending" },
    { title: "T-892 • Base", subtitle: "Approved", status: "Approved" },
  ],
  maintenance: [
    { title: "Truck 18 • Brake service", subtitle: "Due in 3 days", status: "Scheduled" },
    { title: "Truck 31 • Oil change", subtitle: "Overdue 120 miles", status: "Critical" },
    { title: "Truck 22 • Tire rotation", subtitle: "Due next week", status: "Planned" },
  ],
  billing: [
    { title: "INV-2041 • $12,480", subtitle: "Customer: Gulf Aggregate", status: "Processing" },
    { title: "INV-2037 • $8,230", subtitle: "Customer: Metro Paving", status: "Paid" },
    { title: "INV-2043 • $6,900", subtitle: "Customer: City Site", status: "Unpaid" },
  ],
  finance: [
    { title: "Cash Flow Snapshot", subtitle: "14-day outlook", status: "Ready" },
    { title: "Settlement Batch", subtitle: "Week 03 • $48,220", status: "Processing" },
    { title: "Unbilled Revenue", subtitle: "$12,480 pending", status: "Review" },
  ],
  accounting: [
    { title: "General Ledger", subtitle: "Exported to QuickBooks", status: "Ready" },
    { title: "Journal Entries", subtitle: "12 pending approvals", status: "Review" },
    { title: "Month-End Close", subtitle: "3 tasks remaining", status: "In Progress" },
  ],
  "accounts-receivable": [
    { title: "Metro Paving", subtitle: "$12,480 • 14 days overdue", status: "Past Due" },
    { title: "Gulf Aggregate", subtitle: "$8,230 • Due in 7 days", status: "Open" },
    { title: "City Site", subtitle: "$6,900 • Paid", status: "Cleared" },
  ],
  compliance: [
    { title: "Driver J. Lane", subtitle: "HOS limit approaching", status: "Warning" },
    { title: "Truck 18", subtitle: "Inspection due", status: "Due Soon" },
    { title: "Ticket T-884", subtitle: "Missing signature", status: "Needs Review" },
  ],
  fmcsa: [
    { title: "DQ File Review", subtitle: "3 drivers pending", status: "Review" },
    { title: "Drug & Alcohol Clearinghouse", subtitle: "Consent updates", status: "Due" },
    { title: "Annual MVR Check", subtitle: "8 drivers completed", status: "Complete" },
  ],
  tracking: [
    { title: "LD-5081", subtitle: "8 mins to jobsite", status: "On Route" },
    { title: "LD-5084", subtitle: "At pit queue 12 mins", status: "Queued" },
    { title: "LD-5087", subtitle: "Waiting to load", status: "Loading" },
  ],
  materials: [
    { title: "Crushed Stone", subtitle: "Base rate $32/ton • Inventory: 4,200T", status: "Active" },
    { title: "Sand & Gravel", subtitle: "Base rate $28/ton • Inventory: 2,750T", status: "Watch" },
    { title: "Topsoil", subtitle: "Base rate $24/yard • Inventory: 1,980Y", status: "Active" },
  ],
  hr: [
    { title: "Driver Onboarding", subtitle: "3 new hires waiting on docs", status: "In Progress" },
    { title: "Compliance Alerts", subtitle: "5 expiring CDL / medical cards", status: "Review" },
    { title: "Payroll Prep", subtitle: "Week 03 tickets pending", status: "Ready" },
  ],
  payroll: [
    { title: "Pay Run • Week 03", subtitle: "12 drivers • $48,220", status: "Processing" },
    { title: "D. Perez", subtitle: "28 tickets • $3,420", status: "Ready" },
    { title: "S. Grant", subtitle: "24 tickets • $2,980", status: "Ready" },
  ],
  reports: [
    { title: "Weekly Profit Report", subtitle: "Empty miles down 3%", status: "Ready" },
    { title: "Ticket Discrepancy Report", subtitle: "3 flagged tickets", status: "Review" },
    { title: "Driver Efficiency", subtitle: "Top: D. Perez", status: "Ready" },
  ],
  settings: [
    { title: "Company Info", subtitle: "Ronyx Logistics LLC", status: "Configured" },
    { title: "Rate Defaults", subtitle: "Per Load • $420", status: "Configured" },
    { title: "User Roles", subtitle: "7 active users", status: "Configured" },
  ],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");

  if (!section) {
    return NextResponse.json({ error: "Missing section" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("ronyx_module_items")
    .select("*")
    .eq("section", section)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((data || []).length === 0 && DEFAULT_ROWS[section]) {
    const { error: insertError } = await supabase.from("ronyx_module_items").insert(
      DEFAULT_ROWS[section].map((row) => ({
        section,
        title: row.title,
        subtitle: row.subtitle,
        status: row.status,
      })),
    );
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    const { data: seeded } = await supabase
      .from("ronyx_module_items")
      .select("*")
      .eq("section", section)
      .order("created_at", { ascending: true });
    return NextResponse.json({ rows: seeded || [] });
  }

  return NextResponse.json({ rows: data || [] });
}

export async function PUT(request: Request) {
  const { searchParams } = new URL(request.url);
  const section = searchParams.get("section");

  if (!section) {
    return NextResponse.json({ error: "Missing section" }, { status: 400 });
  }

  const payload = await request.json();
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];

  const supabase = createSupabaseServerClient();
  const { error: deleteError } = await supabase.from("ronyx_module_items").delete().eq("section", section);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const { error: insertError } = await supabase.from("ronyx_module_items").insert(
    rows.map((row: { title: string; subtitle?: string; status?: string }) => ({
      section,
      title: row.title,
      subtitle: row.subtitle || "",
      status: row.status || "",
    })),
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
