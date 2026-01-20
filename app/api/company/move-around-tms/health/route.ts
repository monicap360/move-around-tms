import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function GET() {
  try {
    const supabase = createServerAdmin();
    const orgCode = "move-around-tms";

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
    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("organization_code", orgCode)
      .single();

    if (organizationError || !organization) {
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
        id: organization.id,
        name: organization.name,
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
