import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/ronyx/payout-import
// Body: { project_name, week_start, week_end, loads: [{company_name, truck_number, load_date, origin, destination, loads_count, rate, total}] }
export async function POST(req: Request) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  const { project_name, week_start, week_end, loads } = body as {
    project_name: string;
    week_start:   string;
    week_end:     string;
    loads: {
      company_name:  string;
      truck_number:  string;
      load_date:     string;
      origin:        string;
      destination:   string;
      loads_count:   number;
      rate:          number;
      total:         number;
      notes?:        string;
    }[];
  };

  if (!loads?.length) return NextResponse.json({ error: "No loads provided" }, { status: 400 });

  // Collect unique OO company names
  const uniqueCompanies = [...new Set(loads.map((l) => l.company_name).filter(Boolean))];

  // Fetch existing OOs
  const { data: existingOOs } = await sb
    .from("ronyx_owner_operators")
    .select("id, company_name")
    .in("company_name", uniqueCompanies);

  const ooMap: Record<string, string> = {};
  (existingOOs || []).forEach((o: any) => { ooMap[o.company_name.toLowerCase()] = o.id; });

  // Create missing OOs
  const missing = uniqueCompanies.filter((n) => !ooMap[n.toLowerCase()]);
  if (missing.length > 0) {
    const { data: created } = await sb
      .from("ronyx_owner_operators")
      .insert(missing.map((n) => ({ company_name: n, status: "active" })))
      .select("id, company_name");
    (created || []).forEach((o: any) => { ooMap[o.company_name.toLowerCase()] = o.id; });
  }

  // Insert all load records as oo_jobs
  const jobRows = loads.map((l) => ({
    oo_id:             ooMap[l.company_name.toLowerCase()],
    project_name:      project_name || "Domino Project",
    load_date:         l.load_date,
    truck_number:      l.truck_number,
    origin:            l.origin || null,
    destination:       l.destination || null,
    material:          "limestone",
    tons:              l.loads_count,
    gross_revenue:     l.total,
    oo_rate:           l.total,
    margin:            0,
    ticket_status:     "Verified",
    settlement_status: "Pending",
    notes:             l.notes || null,
  })).filter((r) => r.oo_id);

  const { data: inserted, error } = await sb
    .from("ronyx_oo_jobs")
    .insert(jobRows)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok:           true,
    jobs_created: inserted?.length ?? 0,
    oos_created:  missing.length,
    oos_matched:  uniqueCompanies.length - missing.length,
  });
}
