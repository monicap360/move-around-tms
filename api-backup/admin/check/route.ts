import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Define the expected response shape
interface AdminCheckResponse {
  isAdmin: boolean;
  email: string | null;
  error?: string;
}

// Type-safe function handler
export async function GET(
  request: Request,
): Promise<NextResponse<AdminCheckResponse>> {
  try {
    // Initialize Supabase client (server-side)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get("cookie");
            if (!cookieHeader) return [];

            return cookieHeader.split(";").map((cookie) => {
              const [name, ...rest] = cookie.trim().split("=");
              return { name, value: rest.join("=") };
            });
          },
          setAll(cookiesToSet) {
            // In server components, we can't set cookies, so we ignore this
          },
        },
      },
    );

    // Get the current user session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Supabase user error:", userError.message);
      return NextResponse.json(
        { isAdmin: false, email: null, error: userError.message },
        { status: 401 },
      );
    }

    // If no user logged in
    if (!user) {
      return NextResponse.json(
        { isAdmin: false, email: null },
        { status: 200 },
      );
    }

    // 🔹 Call Postgres function "is_admin"
    const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin", {
      user_id: user.id,
    });

    if (rpcError) {
      console.error("Error calling is_admin:", rpcError.message);
      return NextResponse.json(
        { isAdmin: false, email: user.email || null, error: rpcError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { isAdmin: !!isAdmin, email: user.email || null },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Unhandled error in /api/admin/check:", err);
    return NextResponse.json(
      { isAdmin: false, email: null, error: err.message },
      { status: 500 },
    );
  }
}
