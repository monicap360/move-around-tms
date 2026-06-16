import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Companies from the subhauler agreement — always seed these as OOs
const REQUIRED_OOS = [
  { company_name: "TC Redwine Services, LLC",          business_address: "",                                    status: "active" },
  { company_name: "BAS Equipment & Trucking LLC",       business_address: "P.O. Box 36, Throckmorton, TX 76483", status: "active" },
  { company_name: "M.A. Mortenson Company",            business_address: "700 Meadow Ln, Minneapolis MN 55422", status: "active" },
];

async function buildResponse(sb: ReturnType<typeof createSupabaseServerClient>, oos: any[]) {
  if (!oos.length) return NextResponse.json({ companies: [] });

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
    drivers:   drivers.filter((d) => d.oo_id === oo.id),
    trucks:    trucks.filter((t)  => t.oo_id === oo.id),
    documents: docs.filter((d) => d.oo_id === oo.id).map((d) => ({
      type:        d.doc_type,
      uploaded_at: d.uploaded_at,
      file_name:   d.file_name || "",
      expires_on:  d.expires_on || undefined,
      _db_id:      d.id,
    })),
    jobs: jobs.filter((j) => j.oo_id === oo.id),
  }));

  return NextResponse.json({ companies });
}

/* ── GET /api/ronyx/owner-operators ─────────────────────────── */
export async function GET() {
  const sb = createSupabaseServerClient();

  const { data: oos, error } = await sb
    .from("ronyx_owner_operators")
    .select("*")
    .order("company_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Ensure required OO companies always exist
  const existingNames = (oos || []).map((o: any) => o.company_name.toLowerCase());
  const missing = REQUIRED_OOS.filter(
    (r) => !existingNames.includes(r.company_name.toLowerCase())
  );
  if (missing.length > 0) {
    await sb.from("ronyx_owner_operators").insert(missing);
    const { data: refreshed } = await sb
      .from("ronyx_owner_operators")
      .select("*")
      .order("company_name", { ascending: true });
    return buildResponse(sb, refreshed || []);
  }

  return buildResponse(sb, oos || []);
}

/* ── POST /api/ronyx/owner-operators ── create new OO company */
export async function POST(req: Request) {
  const sb   = createSupabaseServerClient();
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
