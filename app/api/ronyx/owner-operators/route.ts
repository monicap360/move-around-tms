import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Known owner operator companies — always ensure these exist
const REQUIRED_OOS = [
  { company_name: "TC Redwine Services, LLC",          business_address: "",                                    status: "active" },
  { company_name: "BAS Equipment & Trucking LLC",       business_address: "P.O. Box 36, Throckmorton, TX 76483", status: "active" },
  { company_name: "M.A. Mortenson Company",            business_address: "700 Meadow Ln, Minneapolis MN 55422", status: "active" },
  {
    company_name:     "J&J Alvarado LLC",
    business_address: "3172 Mimosa St, Port Arthur, TX 77640",
    ein:              "84-2207150",
    status:           "active",
  },
  {
    company_name:          "Denesse Group Inc",
    business_address:      "23433 Dome St, Moreno Valley, CA 92553",
    contact_name:          "Denesse Duran",
    contact_email:         "denesse4@gmail.com",
    contact_phone:         "323-712-5010",
    ein:                   "83-3084898",
    dot_number:            "484120",
    status:                "active",
  },
  {
    company_name:          "Fan Fan Trucking LLC",
    business_address:      "2600 Twin City Hwy APT 3, Groves, TX 77619",
    contact_name:          "Alexander Bandera Sanchez",
    contact_email:         "alexanderbanderasanchez90@gmail.com",
    contact_phone:         "409-293-7900",
    ein:                   "99-4549020",
    dot_number:            "4448005",
    status:                "active",
  },
  {
    company_name:          "Urdaneta Trucking LLC",
    business_address:      "7800 Willowood Ln Apt C4, Port Arthur, TX 77642",
    contact_name:          "Reynaldo Urdaneta",
    contact_email:         "urdanetareynaldo12@gmail.com",
    contact_phone:         "346-592-8329",
    ein:                   "32-0925419",
    dot_number:            "4321209",
    status:                "active",
  },
];

async function buildResponse(sb: ReturnType<typeof createSupabaseServerClient>, oos: any[]) {
  if (!oos.length) return NextResponse.json({ companies: [] });

  const ids = oos.map((o) => o.id);
  const [driversRes, trucksRes, docsRes, jobsRes, subsRes, dtaRes] = await Promise.all([
    sb.from("ronyx_oo_drivers").select("*").in("oo_id", ids).order("name"),
    sb.from("ronyx_oo_trucks").select("*").in("oo_id", ids).order("truck_number"),
    sb.from("ronyx_oo_documents").select("*").in("oo_id", ids).order("uploaded_at", { ascending: false }),
    sb.from("ronyx_oo_jobs").select("*").in("oo_id", ids).order("load_date", { ascending: false }),
    sb.from("ronyx_oo_subcontractors").select("*, drivers:ronyx_oo_subcontractor_drivers(*)").in("oo_id", ids).order("company_name"),
    sb.from("ronyx_driver_truck_assignments")
      .select("id, oo_id, driver_id, truck_id, priority, assignment_type, requires_manager_approval, notes")
      .in("oo_id", ids)
      .eq("is_active", true)
      .order("priority"),
  ]);

  const drivers = driversRes.data || [];
  const trucks  = trucksRes.data  || [];
  const docs    = docsRes.data    || [];
  const jobs    = jobsRes.data    || [];
  const subs    = subsRes.data    || [];
  const dta     = dtaRes.data     || [];

  const companies = oos.map((oo) => ({
    ...oo,
    drivers:   drivers.filter((d) => d.oo_id === oo.id),
    trucks:    trucks.filter((t)  => t.oo_id === oo.id).map((t) => ({
      ...t,
      // approved drivers for this truck (denormalized for display in Fleet tab)
      approved_driver_ids: dta.filter((a: any) => a.truck_id === t.id).map((a: any) => a.driver_id),
    })),
    driver_truck_assignments: dta.filter((a: any) => a.oo_id === oo.id),
    documents: docs.filter((d) => d.oo_id === oo.id).map((d) => ({
      type:        d.doc_type,
      uploaded_at: d.uploaded_at,
      file_name:   d.file_name || "",
      expires_on:  d.expires_on || undefined,
      file_url:    d.file_url   || undefined,
      _db_id:      d.id,
    })),
    jobs: jobs.filter((j) => j.oo_id === oo.id),
    subcontractors: (subs as any[]).filter(s => s.oo_id === oo.id).map(s => ({
      id:            s.id,
      company_name:  s.company_name,
      contact_name:  s.contact_name  || "",
      contact_phone: s.contact_phone || "",
      contact_email: s.contact_email || "",
      mc_number:     s.mc_number     || "",
      dot_number:    s.dot_number    || "",
      drivers:       (s.drivers || []).map((d: any) => ({
        id:             d.id,
        name:           d.name,
        phone:          d.phone          || "",
        cdl_number:     d.cdl_number     || "",
        cdl_expiration: d.cdl_expiration || "",
      })),
    })),
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

  // Ensure required OO companies exist and have their known fields filled in
  const existing = oos || [];
  const missing: typeof REQUIRED_OOS = [];
  const updates: { id: string; patch: Record<string, string> }[] = [];

  for (const req of REQUIRED_OOS) {
    const found = existing.find(
      (o: any) => o.company_name.toLowerCase() === req.company_name.toLowerCase()
    );
    if (!found) {
      missing.push(req);
    } else {
      // Back-fill any known fields the DB record is missing
      const patch: Record<string, string> = {};
      if (!found.ein              && (req as any).ein)              patch.ein              = (req as any).ein;
      if (!found.business_address && (req as any).business_address) patch.business_address = (req as any).business_address;
      if (!found.contact_name     && (req as any).contact_name)     patch.contact_name     = (req as any).contact_name;
      if (!found.contact_email    && (req as any).contact_email)    patch.contact_email    = (req as any).contact_email;
      if (!found.contact_phone    && (req as any).contact_phone)    patch.contact_phone    = (req as any).contact_phone;
      if (!found.dot_number       && (req as any).dot_number)       patch.dot_number       = (req as any).dot_number;
      if (Object.keys(patch).length > 0) updates.push({ id: found.id, patch });
    }
  }

  const needsRefresh = missing.length > 0 || updates.length > 0;
  if (missing.length > 0) await sb.from("ronyx_owner_operators").insert(missing);
  for (const { id, patch } of updates) {
    await sb.from("ronyx_owner_operators").update(patch).eq("id", id);
  }

  if (needsRefresh) {
    const { data: refreshed } = await sb
      .from("ronyx_owner_operators")
      .select("*")
      .order("company_name", { ascending: true });
    return buildResponse(sb, refreshed || []);
  }

  return buildResponse(sb, existing);
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

  return NextResponse.json({ company: { ...data, drivers: [], trucks: [], documents: [], jobs: [], subcontractors: [] } });
}
