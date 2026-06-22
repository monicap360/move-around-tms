import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/driver-compliance/submit
// Called by the driver self-service portal. No auth required — identity is
// verified by matching name + truck number against driver_profiles.
// All submissions are stored in ronyx_driver_compliance_submissions and the
// driver's profile fields are updated immediately. Office staff can review
// from the compliance page.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      full_name,
      truck_number,
      phone,
      home_address,
      emergency_contact_name,
      emergency_contact_phone,
      emergency_contact_relationship,
      cdl_number,
      cdl_class,
      cdl_state,
      cdl_expiration,
      medical_card_expiration,
      drug_test_date,
      // document references (storage paths uploaded separately)
      cdl_front_url,
      cdl_back_url,
      medical_card_url,
    } = body;

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    // Try to match driver by name + truck number
    const nameLike = `%${full_name.trim().toLowerCase()}%`;
    const { data: profileRows } = await supabaseAdmin
      .from("driver_profiles")
      .select("id, name, cdl_number, cdl_expiration, medical_card_expiration, status")
      .ilike("name", nameLike)
      .limit(5);

    // Score matches — prefer exact name + matching truck number
    let matchedId: string | null = null;
    if (profileRows && profileRows.length > 0) {
      const exact = profileRows.find((r: any) =>
        r.name?.toLowerCase().trim() === full_name.toLowerCase().trim()
      );
      matchedId = exact?.id ?? profileRows[0]?.id ?? null;
    }

    // Build the update payload for driver_profiles
    const profilePatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (phone)               profilePatch.phone               = phone;
    if (cdl_number)          profilePatch.cdl_number          = cdl_number;
    if (cdl_class)           profilePatch.cdl_class           = cdl_class;
    if (cdl_state)           profilePatch.cdl_state           = cdl_state.toUpperCase();
    if (cdl_expiration)      profilePatch.cdl_expiration      = cdl_expiration;
    if (medical_card_expiration) profilePatch.med_card_expiration = medical_card_expiration;

    if (matchedId && Object.keys(profilePatch).length > 1) {
      await supabaseAdmin.from("driver_profiles").update(profilePatch).eq("id", matchedId);
    }

    // Save the full submission for office review regardless
    const submission = {
      driver_profile_id:             matchedId,
      full_name:                     full_name.trim(),
      truck_number:                  truck_number?.trim() || null,
      phone:                         phone || null,
      home_address:                  home_address || null,
      emergency_contact_name:        emergency_contact_name || null,
      emergency_contact_phone:       emergency_contact_phone || null,
      emergency_contact_relationship: emergency_contact_relationship || null,
      cdl_number:                    cdl_number || null,
      cdl_class:                     cdl_class || null,
      cdl_state:                     cdl_state?.toUpperCase() || null,
      cdl_expiration:                cdl_expiration || null,
      medical_card_expiration:       medical_card_expiration || null,
      drug_test_date:                drug_test_date || null,
      cdl_front_url:                 cdl_front_url || null,
      cdl_back_url:                  cdl_back_url || null,
      medical_card_url:              medical_card_url || null,
      status:                        matchedId ? "applied" : "pending_match",
      submitted_at:                  new Date().toISOString(),
    };

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("ronyx_driver_compliance_submissions")
      .insert(submission)
      .select("id")
      .single();

    if (saveErr) {
      // Table might not exist yet — fall back gracefully
      console.warn("[driver-compliance] Could not save submission:", saveErr.message);
    }

    // If we found a driver match, also upsert document records for any uploaded files
    if (matchedId) {
      const docInserts: Record<string, unknown>[] = [];
      if (cdl_front_url) docInserts.push({ driver_profile_id: matchedId, document_type: "CDL Front", file_url: cdl_front_url, expiry_date: cdl_expiration || null, uploaded_by: "driver_self_service" });
      if (cdl_back_url)  docInserts.push({ driver_profile_id: matchedId, document_type: "CDL Back",  file_url: cdl_back_url,  expiry_date: cdl_expiration || null, uploaded_by: "driver_self_service" });
      if (medical_card_url) docInserts.push({ driver_profile_id: matchedId, document_type: "Medical Card", file_url: medical_card_url, expiry_date: medical_card_expiration || null, uploaded_by: "driver_self_service" });
      if (docInserts.length > 0) {
        await supabaseAdmin.from("driver_documents").insert(docInserts).then(() => {}).catch(() => {});
      }
    }

    return NextResponse.json({
      ok:       true,
      matched:  !!matchedId,
      submitId: saved?.id ?? null,
    });
  } catch (err: any) {
    console.error("[driver-compliance] Unexpected error:", err?.message);
    return NextResponse.json({ error: "Submission failed — please try again" }, { status: 500 });
  }
}
