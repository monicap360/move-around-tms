import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req) {
  const { driver_uuid, file_name } = await req.json();
  const { data, error } = await supabase.storage
    .from("driver-logos")
    .createSignedUploadUrl(file_name);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}
