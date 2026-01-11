import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized" },
    { status: 401 },
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expectedToken = process.env.ADMIN_TOKEN;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`)
    return unauthorized();

  const { data, error } = await supabaseAdmin
    .from("driver_documents")
    .select("*, drivers:driver_id(id, name))")
    .eq("status", "Pending Manager Review")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json(
      { ok: false, message: error.message },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, documents: data });
}
