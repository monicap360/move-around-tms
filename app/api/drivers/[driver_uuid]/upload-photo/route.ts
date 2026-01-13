import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "driver-photos";
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function POST(
  req: NextRequest,
  { params }: { params: { driver_uuid: string } },
) {
  try {
    const supabase = createSupabaseServerClient();
    // Validate driver_uuid
    const { driver_uuid } = params;
    if (!driver_uuid || typeof driver_uuid !== "string") {
      return NextResponse.json(
        { error: "Invalid driver UUID" },
        { status: 400 },
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validate file type and size
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 5MB)" },
        { status: 400 },
      );
    }

    // Ensure bucket exists
    const { data: bucketList } = await supabase.storage.listBuckets();
    if (!bucketList?.find((b: any) => b.id === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, { public: false });
    }

    // Upload file
    const ext = file.name.split(".").pop();
    const filePath = `${driver_uuid}/${uuidv4()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: true,
      });
    if (uploadError) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get signed URL
    const { data: signedUrlData } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days
    const photoUrl = signedUrlData?.signedUrl;

    // Update driver record
    await supabase
      .from("drivers")
      .update({ photo_url: photoUrl })
      .eq("driver_uuid", driver_uuid);

    return NextResponse.json({ url: photoUrl }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
