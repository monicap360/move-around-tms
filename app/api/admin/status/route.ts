import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();

  // Get the current user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user)
    return NextResponse.json({ isAdmin: false, email: null }, { status: 200 });

  // Check if they're in admin_users via the helper
  const { data: isAdmin } = await supabase.rpc("is_admin");

  return NextResponse.json({
    isAdmin: !!isAdmin,
    email: user.email,
  });
}
