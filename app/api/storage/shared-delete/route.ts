import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { filePath } = await req.json();

  if (!filePath) {
    return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Only admins can delete shared files - check using database function
  const { data: isAdminResult, error: adminError } =
    await supabase.rpc("is_admin");

  if (adminError) {
    console.error("Error checking admin status:", adminError);
    return NextResponse.json(
      { error: "Failed to verify admin status" },
      { status: 500 },
    );
  }

  if (!isAdminResult) {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 },
    );
  }

  const { error } = await supabase.storage
    .from("company_assets")
    .remove([filePath]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
