import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/admin/users
// List all users with their roles
// Requires admin token for authorization

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized" },
    { status: 401 },
  );
}

export async function GET(req: NextRequest) {
  // Verify admin token
  const authHeader = req.headers.get("authorization") || "";
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken) {
    console.warn("ADMIN_TOKEN not set");
    return unauthorized();
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return unauthorized();
  }

  try {
    // Get all users from auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error("Failed to list auth users", authError);
      return NextResponse.json(
        { ok: false, message: "Failed to list users" },
        { status: 500 },
      );
    }

    // Get all user roles
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, company");

    if (rolesError) {
      console.error("Failed to fetch user roles", rolesError);
      return NextResponse.json(
        { ok: false, message: "Failed to fetch roles" },
        { status: 500 },
      );
    }

    // Merge auth users with their roles
    const users = authData.users.map((user) => {
      const userRole = rolesData?.find((r) => r.user_id === user.id);
      return {
        id: user.id,
        email: user.email || "—",
        role: userRole?.role || "none",
        company: userRole?.company || "—",
      };
    });

    return NextResponse.json({ ok: true, users });
  } catch (error: any) {
    console.error("Unexpected error listing users", error);
    return NextResponse.json(
      { ok: false, message: "Internal server error" },
      { status: 500 },
    );
  }
}
