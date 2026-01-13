import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    // ✅ Create Supabase client at runtime ONLY
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const formData = await req.formData();

    const name = formData.get("name")?.toString() || "";
    const email = formData.get("email")?.toString() || "";
    const phone = formData.get("phone")?.toString() || "";
    const experience = formData.get("experience")?.toString() || "";
    const licenseType = formData.get("licenseType")?.toString() || "";
    const notes = formData.get("notes")?.toString() || "";
    const resume = formData.get("resume") as File | null;

    let resumeUrl: string | null = null;

    // ✅ Upload resume if present
    if (resume) {
      const filePath = `resumes/${Date.now()}_${resume.name}`;

      const { data, error } = await supabase.storage
        .from("driver-applications")
        .upload(filePath, resume, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        return NextResponse.json(
          { error: "Resume upload failed" },
          { status: 500 }
        );
      }

      resumeUrl = supabase.storage
        .from("driver-applications")
        .getPublicUrl(data.path).publicUrl;
    }

    // ✅ Insert application record
    const { error: insertError } = await supabase
      .from("driver_applications")
      .insert({
        name,
        email,
        phone,
        experience,
        license_type: licenseType,
        notes,
        resume_url: resumeUrl,
      });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to save application" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
