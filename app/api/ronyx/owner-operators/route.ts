import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// ── Org resolution ─────────────────────────────────────────────────────────
// Returns the explicit RONYX_ORG_ID env var when set.
// Falls back to null (no filter) so the GET query returns all OOs.
// This is safe: the Ronyx namespace is single-tenant and supabaseAdmin
// (service role) bypasses RLS. Migrations 165/200 can leave the
// organizations table with a synthetic ID that doesn't match OO rows —
// doing no filter is safer than filtering to the wrong ID.

function resolveOrgId(): string | null {
  return process.env.RONYX_ORG_ID ?? null;
}

// ── Known owner operator companies — seeded on first load ──────────────────

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
  { company_name: "Cesar Lia Trucking",                status: "active" },
  { company_name: "Chase Trux Trucking",               status: "active" },
  { company_name: "Chavez Transports",                 status: "active" },
  { company_name: "Coyans Trucking LLC",               status: "active" },
  { company_name: "A Transport",                       status: "active" },
  { company_name: "A Lone Journey Transportation LLC", status: "active" },
  { company_name: "A&S Trucking",                      status: "active" },
  { company_name: "ACtive Society LLC",                status: "active" },
  { company_name: "Adams Enterprices Inc",             status: "active" },
  { company_name: "AGA Trucking LLC",                  status: "active" },
];

// ── Build full response with related data ──────────────────────────────────

async function buildResponse(oos: any[]) {
  if (!oos.length) return NextResponse.json({ companies: [] });

  const ids = oos.map((o) => o.id);

  const safe = async (q: Promise<{ data: any[] | null; error: any }>) => {
    try { const r = await q; return r.data || []; } catch { return []; }
  };

  const [drivers, trucks, docs, jobs, subs, dta, cois] = await Promise.all([
    safe(supabaseAdmin.from("ronyx_oo_drivers").select("*").in("oo_id", ids).order("name") as any),
    safe(supabaseAdmin.from("ronyx_oo_trucks").select("*").in("oo_id", ids).order("truck_number") as any),
    safe(supabaseAdmin.from("ronyx_oo_documents").select("*").in("oo_id", ids).order("uploaded_at", { ascending: false }) as any),
    safe(supabaseAdmin.from("ronyx_oo_jobs").select("*").in("oo_id", ids).order("load_date", { ascending: false }) as any),
    safe(supabaseAdmin.from("ronyx_oo_subcontractors").select("*, drivers:ronyx_oo_subcontractor_drivers(*)").in("oo_id", ids).order("company_name") as any),
    safe(supabaseAdmin.from("ronyx_driver_truck_assignments")
      .select("id, oo_id, driver_id, truck_id, priority, assignment_type, requires_manager_approval, notes")
      .in("oo_id", ids)
      .eq("is_active", true)
      .order("priority") as any),
    safe(supabaseAdmin.from("ronyx_oo_coi_documents").select("*").in("oo_id", ids).order("coi_group") as any),
  ]);

  const companies = oos.map((oo) => ({
    ...oo,
    drivers:   drivers.filter((d: any) => d.oo_id === oo.id),
    trucks:    trucks.filter((t: any) => t.oo_id === oo.id).map((t: any) => ({
      ...t,
      approved_driver_ids: dta.filter((a: any) => a.truck_id === t.id).map((a: any) => a.driver_id),
    })),
    driver_truck_assignments: dta.filter((a: any) => a.oo_id === oo.id),
    coi_documents: cois.filter((c: any) => c.oo_id === oo.id),
    documents: docs.filter((d: any) => d.oo_id === oo.id).map((d: any) => ({
      type:        d.doc_type,
      uploaded_at: d.uploaded_at,
      file_name:   d.file_name  || "",
      expires_on:  d.expires_on || undefined,
      issued_on:   d.issued_on  || undefined,
      file_url:    d.file_url   || undefined,
      _db_id:      d.id,
    })),
    jobs: jobs.filter((j: any) => j.oo_id === oo.id),
    subcontractors: (subs as any[]).filter((s: any) => s.oo_id === oo.id).map((s: any) => ({
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

/* ── GET /api/ronyx/owner-operators ──────────────────────────────────────── */
export async function GET() {
  try {
    // Resolve org — returns env var or null (no filter)
    const orgId = resolveOrgId();
    if (!orgId) {
      console.error("[OO] Could not resolve org ID — RONYX_ORG_ID env:", process.env.RONYX_ORG_ID);
      // Fall through without org filter rather than blocking
    }

    // Build query — filter by org when we have an ID
    let q = supabaseAdmin
      .from("ronyx_owner_operators")
      .select("*")
      .order("company_name", { ascending: true });
    if (orgId) q = (q as any).or(`organization_id.eq.${orgId},organization_id.is.null`);

    const { data: oos, error } = await q;

    if (error) {
      console.error("[OO] DB error loading owner operators:", error.message, error.code);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const existing = oos || [];

    // Seed any missing required OO companies
    if (orgId) {
      const missing: Record<string, unknown>[] = [];
      const updates: { id: string; patch: Record<string, string> }[] = [];

      for (const req of REQUIRED_OOS) {
        const found = existing.find(
          (o: any) => o.company_name.toLowerCase() === req.company_name.toLowerCase()
        );
        if (!found) {
          missing.push({ ...req, organization_id: orgId });
        } else {
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

      if (missing.length > 0) {
        const { error: insertErr } = await supabaseAdmin.from("ronyx_owner_operators").insert(missing);
        if (insertErr) console.warn("[OO] Could not seed missing OOs:", insertErr.message);
      }
      for (const { id, patch } of updates) {
        void supabaseAdmin.from("ronyx_owner_operators").update(patch).eq("id", id);
      }

      if (missing.length > 0) {
        const { data: refreshed } = await supabaseAdmin
          .from("ronyx_owner_operators")
          .select("*")
          .or(`organization_id.eq.${orgId},organization_id.is.null`)
          .order("company_name", { ascending: true });
        return buildResponse(refreshed || []);
      }
    }

    return buildResponse(existing);
  } catch (err: any) {
    console.error("[OO] Unexpected error:", err?.message, err?.stack);
    return NextResponse.json({ error: err?.message || "Unexpected server error loading owner operators" }, { status: 500 });
  }
}

/* ── POST /api/ronyx/owner-operators — create new OO company ─────────────── */
export async function POST(req: Request) {
  try {
    const orgId = resolveOrgId();
    const body  = await req.json();

    const { data, error } = await supabaseAdmin
      .from("ronyx_owner_operators")
      .insert({
        organization_id:       orgId,
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
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected error" }, { status: 500 });
  }
}
