import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user's session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || user.id;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${Math.round(maxSize / 1024 / 1024)}MB`,
        },
        { status: 400 },
      );
    }

    // Validate file type (allow common formats)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: "File type not allowed. Supported: Images, PDFs, Documents",
        },
        { status: 400 },
      );
    }

    // Generate safe filename with timestamp
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, "_") // Replace special chars
      .replace(/_{2,}/g, "_") // Replace multiple underscores
      .toLowerCase();

    const filePath = `${folder}/${timestamp}_${safeName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company_assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Wait a moment for the view to update, then fetch the new file info
    setTimeout(async () => {
      try {
        const { data: newFile } = await supabase
          .from("company_assets_objects")
          .select("*")
          .eq("name", filePath)
          .single();
      } catch (e) {
        // Silent fail - file uploaded successfully anyway
      }
    }, 1000);

    return NextResponse.json({
      ok: true,
      message: "File uploaded successfully",
      file: {
        name: filePath,
        originalName: file.name,
        size: file.size,
        type: file.type,
        user_folder: folder,
        created_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
