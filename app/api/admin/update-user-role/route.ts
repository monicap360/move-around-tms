import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// PATCH /api/admin/update-user-role
// Update a user's role in user_roles table
// Requires admin token for authorization

type Role = "owner" | "admin" | "manager" | "hr" | "office" | "driver";

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized" },
    { status: 401 },
  );
}

export async function PATCH(req: NextRequest) {
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

  // Parse request body
  let body: { userId: string; role: Role };

  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: "Invalid JSON" },
      { status: 400 },
    );
  }

  const { userId, role } = body;

  if (!userId || !role) {
    return NextResponse.json(
      { ok: false, message: "Missing required fields: userId, role" },
      { status: 400 },
    );
  }

  // Validate role
  const validRoles: Role[] = [
    "owner",
    "admin",
    "manager",
    "hr",
    "office",
    "driver",
  ];
  if (!validRoles.includes(role)) {
    return NextResponse.json(
      {
        ok: false,
        message: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Update role in user_roles table
  const { error } = await supabaseAdmin
    .from("user_roles")
    .update({ role })
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to update role", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Failed to update role" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updated: { userId, role } });
}
