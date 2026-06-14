import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ── GET /api/ronyx/owner-operators ── list all OO companies with sub-data */
export async function GET() {
  const sb = createSupabaseServerClient();

  const { data: oos, error } = await sb
    .from("ronyx_owner_operators")
    .select("*")
    .order("company_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!oos || oos.length === 0) return NextResponse.json({ companies: [] });

  const ids = oos.map((o) => o.id);

  const [driversRes, trucksRes, docsRes, jobsRes] = await Promise.all([
    sb.from("ronyx_oo_drivers").select("*").in("oo_id", ids).order("name"),
    sb.from("ronyx_oo_trucks").select("*").in("oo_id", ids).order("truck_number"),
    sb.from("ronyx_oo_documents").select("*").in("oo_id", ids).order("uploaded_at", { ascending: false }),
    sb.from("ronyx_oo_jobs").select("*").in("oo_id", ids).order("load_date", { ascending: false }),
  ]);

  const drivers = driversRes.data || [];
  const trucks  = trucksRes.data  || [];
  const docs    = docsRes.data    || [];
  const jobs    = jobsRes.data    || [];

  const companies = oos.map((oo) => ({
    ...oo,
    drivers:  drivers.filter((d) => d.oo_id === oo.id),
    trucks:   trucks.filter((t)  => t.oo_id === oo.id),
    documents: docs.filter((d)   => d.oo_id === oo.id).map((d) => ({
      type: d.doc_type,
      uploaded_at: d.uploaded_at,
      file_name: d.file_name || "",
      expires_on: d.expires_on || undefined,
      _db_id: d.id,
    })),
    jobs: jobs.filter((j) => j.oo_id === oo.id),
  }));

  return NextResponse.json({ companies });
}

/* ── POST /api/ronyx/owner-operators ── create new OO company */
export async function POST(req: Request) {
  const sb = createSupabaseServerClient();
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_owner_operators")
    .insert({
      company_name:          body.company_name,
      contact_name:          body.contact_name          || null,
      contact_phone:         body.contact_phone         || null,
      contact_email:         body.contact_email         || null,
      business_address:      body.business_address      || null,
      mc_number:             body.mc_number             || null,
      dot_number:            body.dot_number            || null,
      ein:                   body.ein                   || null,
      insurance_agent_name:  body.insurance_agent_name  || null,
      insurance_agent_email: body.insurance_agent_email || null,
      insurance_agent_phone: body.insurance_agent_phone || null,
      notes:                 body.notes                 || null,
      last_contact_date:     body.last_contact_date     || null,
      status:                body.status                || "active",
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ company: { ...data, drivers: [], trucks: [], documents: [], jobs: [] } });
}
