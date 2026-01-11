import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const supabase = createServerAdmin();
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const driver_uuid = formData.get("driver_uuid") as string;

  if (!file || !driver_uuid) {
    return NextResponse.json(
      { error: "Missing file or driver_uuid" },
      { status: 400 },
    );
  }

  // Generate a ticket_uuid and unique path
  const ticket_uuid = uuidv4();
  const ext = file.name.split(".").pop();
  const objectPath = `ticket-uploads/${driver_uuid}_${ticket_uuid}.${ext}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from("ticket-uploads")
    .upload(objectPath, file, { contentType: file.type });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert ticket row
  await supabase.from("tickets").insert({
    ticket_uuid,
    driver_uuid,
    file_url: objectPath,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({ ticket_uuid, path: objectPath });
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
