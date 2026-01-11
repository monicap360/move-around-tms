import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const orgCode = pathParts[pathParts.indexOf("company") + 1];

    if (!orgCode) {
      return NextResponse.json(
        { status: "error", error: "Missing organization code" },
        { status: 400 },
      );
    }

    const supabase = createServerAdmin();

    // Check database connectivity
    const { error: dbError } = await supabase
      .from("organizations")
      .select("id")
      .eq("organization_code", orgCode)
      .limit(1);

    if (dbError) {
      return NextResponse.json(
        {
          status: "error",
          error: "Database connectivity issue",
          details: dbError.message,
        },
        { status: 503 },
      );
    }

    // Get organization to verify it exists
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("organization_code", orgCode)
      .single();

    if (orgError || !org) {
      return NextResponse.json(
        {
          status: "error",
          error: "Organization not found",
        },
        { status: 404 },
      );
    }

    // Perform basic health checks
    const checks = {
      database: "ok",
      organization: "ok",
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      status: "ok",
      organization: {
        code: orgCode,
        id: org.id,
        name: org.name,
      },
      checks,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        error: err.message || "Health check failed",
      },
      { status: 500 },
    );
  }
}
