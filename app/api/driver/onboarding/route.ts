import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const {
      driverEmail,
      currentStep,
      personalInfo,
      employmentInfo,
      status = "in_progress",
    } = await req.json();

    if (!driverEmail) {
      return NextResponse.json(
        { ok: false, message: "Missing required field: driverEmail" },
        { status: 400 },
      );
    }

    // Insert or update onboarding record
    const { data, error } = await supabaseAdmin
      .from("driver_onboarding")
      .upsert({
        driver_email: driverEmail,
        current_step: currentStep || 1,
        status: status,
        personal_info: personalInfo,
        employment_info: employmentInfo,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to save onboarding record" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      onboarding: data,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverEmail = searchParams.get("driverEmail");

    let query = supabaseAdmin
      .from("driver_onboarding")
      .select("*")
      .order("started_at", { ascending: false });

    if (driverEmail) {
      query = query.eq("driver_email", driverEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to fetch onboarding records" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      records: data || [],
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { driverEmail, updates } = await req.json();

    if (!driverEmail || !updates) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields: driverEmail, updates" },
        { status: 400 },
      );
    }

    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("driver_onboarding")
      .update(updateData)
      .eq("driver_email", driverEmail)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to update onboarding record" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      onboarding: data,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
