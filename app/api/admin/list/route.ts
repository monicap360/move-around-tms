import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createSupabaseServerClient();

  // Ensure caller is an admin
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin)
    return NextResponse.json(
      { error: "Forbidden: Admins only" },
      { status: 403 },
    );

  // Query admins with email lookup
  const { data, error } = await supabase
    .from("admin_users")
    .select(
      `
      user_id, 
      created_at, 
      role,
      active
    `,
    )
    .order("created_at", { ascending: true });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Get user emails from auth.users for each admin
  const adminWithEmails = await Promise.all(
    (data || []).map(async (admin) => {
      const { data: userInfo } = await supabase.auth.admin.getUserById(
        admin.user_id,
      );
      return {
        ...admin,
        email: userInfo.user?.email || "Unknown",
      };
    }),
  );

  return NextResponse.json({ admins: adminWithEmails });
}
