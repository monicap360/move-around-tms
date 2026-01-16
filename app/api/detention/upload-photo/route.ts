import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUCKET = "ronyx-files";

async function resolveOrganizationId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  requestedOrgId?: string | null,
) {
  if (!requestedOrgId) {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .single();
    return orgMember?.organization_id || null;
  }

  const { data: orgMember } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", requestedOrgId)
    .single();

  return orgMember?.organization_id || null;
}

async function ensureBucket(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === BUCKET);
  if (!exists) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
    if (demoMode) {
      return NextResponse.json({ success: true });
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const detentionEventId = formData.get("detention_event_id") as string | null;

    if (!file || !detentionEventId) {
      return NextResponse.json(
        { error: "file and detention_event_id are required" },
        { status: 400 },
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("detention_events")
      .select("id, organization_id, metadata")
      .eq("id", detentionEventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: "Detention event not found" }, { status: 404 });
    }

    const organizationId = await resolveOrganizationId(
      supabase,
      user.id,
      event.organization_id,
    );

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: jpg, png, webp, pdf" },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 10MB allowed." },
        { status: 400 },
      );
    }

    await ensureBucket(supabase);

    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectPath = `detention/${detentionEventId}/${Date.now()}-${safeFileName}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(objectPath, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(objectPath);

    const metadata = event.metadata || {};
    const existingPhotos = metadata.detention_photos || [];
    const updatedMetadata = {
      ...metadata,
      detention_photos: [
        ...existingPhotos,
        {
          url: publicUrlData?.publicUrl || null,
          uploaded_at: new Date().toISOString(),
          file_name: safeFileName,
        },
      ],
    };

    await supabase
      .from("detention_events")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", detentionEventId);

    return NextResponse.json({
      success: true,
      path: objectPath,
      public_url: publicUrlData?.publicUrl || null,
    });
  } catch (error: any) {
    console.error("Detention upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
