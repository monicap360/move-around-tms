import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest, { params }: any) {
  const supabase = createServerAdmin();
  const ticketId = params.ticket_id;

  // Fetch the ticket record to get the storage path
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("image_path")
    .eq("id", ticketId)
    .single();

  if (error || !ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  // Generate a signed URL for the image (private bucket)
  const { data: signed, error: urlError } = await supabase.storage
    .from("tickets")
    .createSignedUrl(ticket.image_path, 60 * 60); // 1 hour

  if (urlError || !signed?.signedUrl) {
    return NextResponse.json({ error: "Could not generate signed URL" }, { status: 500 });
  }

  return NextResponse.json({ public_url: signed.signedUrl });
}

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
