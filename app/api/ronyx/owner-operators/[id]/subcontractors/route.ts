import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* POST /api/ronyx/owner-operators/[id]/subcontractors — add a subcontractor */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_oo_subcontractors")
    .insert({
      oo_id:         params.id,
      company_name:  body.company_name,
      contact_name:  body.contact_name  || null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      mc_number:     body.mc_number     || null,
      dot_number:    body.dot_number    || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subcontractor: data });
}
