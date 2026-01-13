import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const experience = formData.get("experience") as string;
    const licenseType = formData.get("licenseType") as string;
    const notes = formData.get("notes") as string;
    const resume = formData.get("resume") as File | null;

    // Upload resume if provided
    let resumeUrl = null;
    if (resume) {
      const { data, error } = await supabase.storage
        .from("driver-applications")
        .upload(`resumes/${Date.now()}_${resume.name}`, resume, {
          cacheControl: "3600",
          upsert: false,
        });
      if (error) throw new Error("Resume upload failed");
      resumeUrl = data?.path
        ? supabase.storage.from("driver-applications").getPublicUrl(data.path)
            .publicUrl
        : null;
    }

    // Insert application record
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
    if (insertError) throw new Error("Failed to save application");

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
