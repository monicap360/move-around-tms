import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

function unauthorized() {
  return NextResponse.json(
    { ok: false, message: "Unauthorized" },
    { status: 401 },
  );
}

// GET: Fetch all driver profiles for HR verification
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return unauthorized();
  }

  try {
    const { data: profiles, error } = await supabaseAdmin
      .from("drivers")
      .select(
        `
        id,
        name,
        email,
        phone,
        license_number,
        license_expiration,
        medical_card_expiration,
        profile_completed_by_driver,
        hr_verified,
        license_verified,
        medical_card_verified,
        documents_verified,
        hr_notes,
        license_document_url,
        medical_card_url
      `,
      )
      .order("profile_completion_date", { ascending: false });

    if (error) {
      console.error("Error fetching driver profiles:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to fetch profiles" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, profiles });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Unexpected error" },
      { status: 500 },
    );
  }
}

// POST: Update driver verification status
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const expectedToken = process.env.ADMIN_TOKEN;

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return unauthorized();
  }

  try {
    const body = await req.json();
    const { profileId, field, value, notes } = body;

    if (!profileId || !field) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Build update object
    const updateData: any = {
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    // If HR verified, add verification metadata
    if (field === "hr_verified" && value === true) {
      updateData.hr_verified_date = new Date().toISOString();
      // TODO: Get actual user email from JWT/session
      updateData.hr_verified_by = "hr@ronyxlogistics.com";
    }

    // Add notes if provided
    if (notes) {
      updateData.hr_notes = notes;
    }

    const { error } = await supabaseAdmin
      .from("drivers")
      .update(updateData)
      .eq("id", profileId);

    if (error) {
      console.error("Error updating driver verification:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to update verification" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, message: "Verification updated" });
  } catch (err: any) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { ok: false, message: err.message || "Unexpected error" },
      { status: 500 },
    );
  }
}
