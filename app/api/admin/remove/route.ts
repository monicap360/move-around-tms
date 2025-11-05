import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { user_id } = await req.json();

  if (!user_id)
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  // Auth check
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin)
    return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });

  // Prevent removing yourself as admin
  if (user.id === user_id) {
    return NextResponse.json({ error: "Cannot remove yourself as admin" }, { status: 400 });
  }

  // Delete from admin_users
  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("user_id", user_id);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, removed: user_id });
}