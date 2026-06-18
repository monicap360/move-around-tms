import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/*
  POST /api/ronyx/owner-operators/bulk-import

  Body:
  {
    companies: [
      {
        company_name: string,
        mc_number?: string,
        dot_number?: string,
        drivers: [
          {
            name: string,
            cdl_number?: string,
            cdl_state?: string,
            cdl_expiration?: string,   // YYYY-MM-DD
            med_card_number?: string,
            med_card_expiration?: string,
            truck_number?: string,
            job_assignment?: string,
            notes?: string,
          }
        ]
      }
    ]
  }

  Creates OO companies (if not already existing by company_name) and
  bulk-inserts the drivers under each company.
*/
export async function POST(req: Request) {
  const sb = createSupabaseServerClient();
  const orgId = process.env.RONYX_ORG_ID || "00000000-0000-0000-0000-000000000001";
  const { companies } = await req.json();

  if (!Array.isArray(companies)) {
    return NextResponse.json({ error: "companies must be an array" }, { status: 400 });
  }

  const results: { company: string; created: boolean; drivers_added: number; errors: string[] }[] = [];

  for (const co of companies) {
    const companyErrors: string[] = [];

    // Find or create OO company
    let ooId: string | null = null;

    const { data: existing } = await sb
      .from("ronyx_owner_operators")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("company_name", co.company_name.trim())
      .maybeSingle();

    let created = false;
    if (existing) {
      ooId = existing.id;
    } else {
      const { data: newOO, error: createErr } = await sb
        .from("ronyx_owner_operators")
        .insert({
          organization_id: orgId,
          company_name: co.company_name.trim(),
          mc_number:    co.mc_number    || null,
          dot_number:   co.dot_number   || null,
          status:       "active",
        })
        .select("id")
        .single();

      if (createErr || !newOO) {
        results.push({ company: co.company_name, created: false, drivers_added: 0, errors: [createErr?.message || "Failed to create company"] });
        continue;
      }
      ooId = newOO.id;
      created = true;
    }

    // Insert drivers
    let driversAdded = 0;
    if (Array.isArray(co.drivers) && co.drivers.length > 0) {
      const rows = co.drivers
        .filter((d: Record<string, string>) => d.name && d.name.trim())
        .map((d: Record<string, string>) => ({
          oo_id:               ooId,
          name:                d.name.trim(),
          phone:               d.phone               || null,
          cdl_number:          d.cdl_number          || null,
          cdl_state:           d.cdl_state           || "TX",
          cdl_expiration:      d.cdl_expiration      || null,
          med_card_expiration: d.med_card_expiration || null,
          med_card_number:     d.med_card_number     || null,
          truck_number:        d.truck_number        || null,
          job_assignment:      d.job_assignment      || null,
          notes:               d.notes               || null,
          status:              "active",
        }));

      if (rows.length > 0) {
        const { data: inserted, error: dErr } = await sb.from("ronyx_oo_drivers").insert(rows).select("id");
        if (dErr) {
          companyErrors.push(`Drivers insert error: ${dErr.message}`);
        } else {
          driversAdded = inserted?.length || 0;
        }
      }
    }

    results.push({ company: co.company_name, created, drivers_added: driversAdded, errors: companyErrors });
  }

  const totalDrivers = results.reduce((s, r) => s + r.drivers_added, 0);
  return NextResponse.json({ ok: true, results, total_drivers_imported: totalDrivers });
}
