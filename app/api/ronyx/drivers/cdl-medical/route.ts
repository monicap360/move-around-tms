import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";

export const dynamic = "force-dynamic";

// Fleet-wide CDL & Medical editor — every owner-operator's drivers in one place.
// GET  → all OO drivers (org-scoped through their parent owner-operator company).
// PUT  → update one driver's CDL / medical fields by id.

const FIELDS = ["cdl_number", "cdl_state", "cdl_class", "cdl_expiration", "med_card_expiration", "med_card_number", "truck_number"] as const;

export async function GET() {
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ drivers: [], error: "Could not resolve your organization." });

  const { data: ooCos } = await sb.from("ronyx_owner_operators").select("id, company_name").eq("organization_id", orgId).limit(5000);
  const cos = ooCos || [];
  const byId: Record<string, string> = {};
  for (const c of cos as { id: string; company_name: string }[]) byId[c.id] = c.company_name;
  const ooIds = cos.map((c: { id: string }) => c.id);
  if (!ooIds.length) return NextResponse.json({ drivers: [] });

  const { data, error } = await sb.from("ronyx_oo_drivers")
    .select("id, oo_id, name, phone, cdl_number, cdl_state, cdl_class, cdl_expiration, med_card_expiration, med_card_number, truck_number, notes, status, updated_at")
    .in("oo_id", ooIds).neq("status", "inactive").limit(5000);
  if (error) return NextResponse.json({ drivers: [], error: error.message });

  // Almost no driver row carries its own truck_number — the trucks live in
  // ronyx_oo_trucks (assigned by name) and ronyx_driver_truck_assignments.
  // Derive each driver's truck(s) so the Truck # column is actually populated.
  const [{ data: trucks }, { data: assigns }, { data: driverDocs }] = await Promise.all([
    sb.from("ronyx_oo_trucks").select("id, oo_id, truck_number, assigned_driver_name, status").in("oo_id", ooIds).limit(10000),
    sb.from("ronyx_driver_truck_assignments").select("driver_id, truck_id, is_active").in("oo_id", ooIds).limit(10000),
    // Driver-tagged docs ("[Name] CDL License" / "[Name] Medical Card") so we can
    // flag which drivers still need their actual CARD image on file.
    sb.from("ronyx_oo_documents").select("oo_id, doc_type, file_url").in("oo_id", ooIds).like("doc_type", "[%]%").limit(20000),
  ]);
  const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Map driver (oo_id + normalized name) → whether a CDL / medical card file exists.
  const cardByDriver: Record<string, { cdl?: string; med?: string }> = {};
  for (const doc of driverDocs || []) {
    const m = /^\[(.*?)\]/.exec(doc.doc_type || ""); if (!m) continue;
    const k = `${doc.oo_id}|${norm(m[1])}`;
    const e = (cardByDriver[k] ||= {});
    if (/cdl|licen/i.test(doc.doc_type) && doc.file_url) e.cdl = doc.file_url;
    if (/medical|med.?card|physical/i.test(doc.doc_type) && doc.file_url) e.med = doc.file_url;
  }
  const activeTruck = (t: any) => !["inactive", "deleted", "sold", "retired", "out_of_service"].includes((t.status || "").toLowerCase());
  const truckNumById: Record<string, string> = {};
  const trucksByName: Record<string, string[]> = {};   // `${oo_id}|${normName}` → [truck_number]
  for (const t of trucks || []) {
    if (!t.truck_number) continue;
    truckNumById[t.id] = t.truck_number;
    if (activeTruck(t) && t.assigned_driver_name) {
      const k = `${t.oo_id}|${norm(t.assigned_driver_name)}`;
      (trucksByName[k] ||= []).push(t.truck_number);
    }
  }
  const trucksByDriverId: Record<string, string[]> = {};
  for (const a of assigns || []) {
    if (a.is_active === false) continue;
    const num = truckNumById[a.truck_id];
    if (num) (trucksByDriverId[a.driver_id] ||= []).push(num);
  }
  const uniqJoin = (arr?: string[]) => arr && arr.length ? [...new Set(arr)].join(", ") : "";

  const drivers = (data || []).map((d: any) => ({
    id: d.id, oo_id: d.oo_id, company: byId[d.oo_id] || "—", name: d.name || "",
    phone: d.phone || "", cdl_number: d.cdl_number || "", cdl_state: d.cdl_state || "",
    cdl_class: d.cdl_class || "", cdl_expiration: d.cdl_expiration || "",
    med_card_expiration: d.med_card_expiration || "", med_card_number: d.med_card_number || "",
    // Own field wins (it's manually editable); otherwise fall back to the
    // driver's active truck assignments, then trucks named to this driver.
    truck_number: d.truck_number
      || uniqJoin(trucksByDriverId[d.id])
      || uniqJoin(trucksByName[`${d.oo_id}|${norm(d.name)}`])
      || "",
    // Whether the actual CDL / medical CARD image is on file for this driver.
    cdl_card_url: cardByDriver[`${d.oo_id}|${norm(d.name)}`]?.cdl || "",
    med_card_url: cardByDriver[`${d.oo_id}|${norm(d.name)}`]?.med || "",
    imported: /\[IMPORTED/i.test(d.notes || ""), updated_at: d.updated_at || "",
  }));
  // Sort: soonest CDL/med expiration first (blanks last) so the at-risk drivers float up.
  drivers.sort((a, b) => {
    const ax = [a.cdl_expiration, a.med_card_expiration].filter(Boolean).sort()[0] || "9999";
    const bx = [b.cdl_expiration, b.med_card_expiration].filter(Boolean).sort()[0] || "9999";
    return ax < bx ? -1 : ax > bx ? 1 : (a.company + a.name).localeCompare(b.company + b.name);
  });
  const companies = (cos as { id: string; company_name: string }[])
    .map(c => ({ id: c.id, name: c.company_name }))
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Each company's real truck numbers, so the sheet can offer them as a picker
  // when staff assign a truck to a driver.
  const trucksByOo: Record<string, string[]> = {};
  for (const t of trucks || []) {
    if (!t.truck_number || !activeTruck(t)) continue;
    (trucksByOo[t.oo_id] ||= []);
    if (!trucksByOo[t.oo_id].includes(t.truck_number)) trucksByOo[t.oo_id].push(t.truck_number);
  }
  for (const k of Object.keys(trucksByOo)) trucksByOo[k].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return NextResponse.json({ drivers, companies, trucks_by_oo: trucksByOo });
}

// POST — add a new driver to an owner-operator company.
export async function POST(req: NextRequest) {
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.oo_id) return NextResponse.json({ error: "Pick an owner operator." }, { status: 400 });
  if (!body.name?.trim()) return NextResponse.json({ error: "Driver name is required." }, { status: 400 });

  // Confirm the company belongs to this org before inserting.
  const { data: oo } = await sb.from("ronyx_owner_operators").select("id, company_name").eq("id", body.oo_id).eq("organization_id", orgId).maybeSingle();
  if (!oo) return NextResponse.json({ error: "That owner operator was not found." }, { status: 404 });

  const insert: Record<string, unknown> = { oo_id: body.oo_id, name: body.name.trim(), status: "active" };
  for (const f of [...FIELDS, "phone"]) if (body[f]) insert[f] = body[f];

  const { data, error } = await sb.from("ronyx_oo_drivers").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, driver: data, company: oo.company_name });
}

export async function PUT(req: NextRequest) {
  const sb = supabaseAdmin;
  const orgId = await resolveOrgId();
  if (!orgId) return NextResponse.json({ error: "Could not resolve your organization." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of FIELDS) if (f in body) patch[f] = body[f] === "" ? null : body[f];

  const { data, error } = await sb.from("ronyx_oo_drivers").update(patch).eq("id", body.id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, driver: data });
}
