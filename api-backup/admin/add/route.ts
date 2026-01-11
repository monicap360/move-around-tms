import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

type RequestBody = {
  email: string;
};

export async function POST(req: Request) {
  try {
    // Initialize Supabase client (server-side)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return [];
          },
          setAll(cookiesToSet) {
            // Server routes don't need cookie management
          },
        },
      },
    );

    // Parse request body
    const { email }: RequestBody = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // List users via Supabase Admin API
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
      return NextResponse.json(
        { error: `Failed to list users: ${error.message}` },
        { status: 500 },
      );
    }

    // Find the target user by email (type-safe)
    const targetUser = data.users.find(
      (u: { email?: string }) => u.email === email,
    );

    if (!targetUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Example: perform an admin action (customize as needed)
    return NextResponse.json({
      message: "User found successfully",
      user: {
        id: targetUser.id,
        email: targetUser.email,
        created_at: targetUser.created_at,
      },
    });
  } catch (err: any) {
    console.error("Unhandled error in /api/admin/add:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
