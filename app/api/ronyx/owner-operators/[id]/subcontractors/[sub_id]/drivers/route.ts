import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* POST — add a driver to a subcontractor */
export async function POST(req: Request, { params }: { params: { id: string; sub_id: string } }) {
  const sb   = createSupabaseServerClient();
  const body = await req.json();

  const { data, error } = await sb
    .from("ronyx_oo_subcontractor_drivers")
    .insert({
      sub_id:         params.sub_id,
      oo_id:          params.id,
      name:           body.name,
      phone:          body.phone          || null,
      cdl_number:     body.cdl_number     || null,
      cdl_expiration: body.cdl_expiration || null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ driver: data });
}
