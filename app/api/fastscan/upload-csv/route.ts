import { NextRequest, NextResponse } from "next/server";

// Accepts POST with CSV file in body (text/csv or multipart)
export async function POST(req: NextRequest) {
  let csv = "";
  if (req.headers.get("content-type")?.includes("multipart")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string")
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    csv = await file.text();
  } else {
    csv = await req.text();
  }
  try {
    const rows = csv.split(/\r?\n/).filter(Boolean);
    if (rows.length < 2)
      throw new Error("CSV must have header and at least one row");
    const header = rows[0].split(",").map((h) => h.trim().toLowerCase());
    // Expect: ticket_id,driver_name,truck_number,material,net_weight,load_date,source
    const idx = (name) => header.findIndex((h) => h === name);
    const seen = new Set();
    const tickets = [];
    for (let i = 1; i < rows.length; ++i) {
      const cols = rows[i].split(",");
      if (cols.length < 3) continue;
      const ticket_id = cols[idx("ticket_id")]?.trim();
      const driver_name = cols[idx("driver_name")]?.trim();
      const truck_number = cols[idx("truck_number")]?.trim();
      const material = cols[idx("material")]?.trim();
      const net_weight = parseFloat(cols[idx("net_weight")] || "0");
      const load_date = cols[idx("load_date")]?.trim();
      const source = cols[idx("source")]?.trim();
      let status = "clear";
      if (!ticket_id || seen.has(ticket_id)) status = "violation";
      else if (!driver_name) status = "violation";
      else if (!net_weight || isNaN(net_weight) || net_weight <= 0)
        status = "violation";
      else if (net_weight > 40) status = "needs_review";
      tickets.push({
        ticket_id,
        driver_name,
        truck_number,
        material,
        net_weight,
        load_date,
        source,
        status,
      });
      if (ticket_id) seen.add(ticket_id);
    }
    return NextResponse.json({ tickets });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to parse CSV" },
      { status: 400 },
    );
  }
}
