import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

export const dynamic = 'force-dynamic';

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const driver_uuid = formData.get("driver_uuid") as string;
    const organization_id = formData.get("organization_id") as string;

    if (!file || !driver_uuid) {
      return NextResponse.json(
        { error: "Missing file or driver_uuid" },
        { status: 400 },
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB` },
        { status: 400 },
      );
    }

    // Validate file type (allow images and PDFs)
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Supported: Images (JPEG, PNG, GIF, WebP) and PDFs" },
        { status: 400 },
      );
    }

    // Verify driver exists and get organization_id if not provided
    const { data: driver, error: driverFetchError } = await supabase
      .from("drivers")
      .select("id, organization_id")
      .eq("driver_uuid", driver_uuid)
      .single();

    if (driverFetchError || !driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 },
      );
    }

    const orgId = organization_id || driver.organization_id;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Generate a ticket_uuid and unique path
    const ticket_uuid = uuidv4();
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectPath = `ticket-uploads/${orgId}/${driver_uuid}_${ticket_uuid}.${ext}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("ticket-uploads")
      .upload(objectPath, file, { 
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      return NextResponse.json(
        { error: error.message || "File upload failed" },
        { status: 500 },
      );
    }

    // Insert ticket row with organization_id
    const { error: insertError } = await supabase.from("tickets").insert({
      ticket_uuid,
      driver_uuid,
      organization_id: orgId,
      file_url: objectPath,
      file_name: safeFileName,
      file_size: file.size,
      file_type: file.type,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("Ticket insert error:", insertError);
      // Try to clean up uploaded file
      await supabase.storage.from("ticket-uploads").remove([objectPath]);
      return NextResponse.json(
        { error: insertError.message || "Failed to save ticket record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ 
      success: true,
      ticket_uuid, 
      path: objectPath,
      organization_id: orgId,
    });
  } catch (err: any) {
    console.error("Ticket upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 },
    );
  }
}
