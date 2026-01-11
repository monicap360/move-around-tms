import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || user.id;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Use the optimized view instead of direct storage queries
    const { data: assets, error } = await supabase
      .from("company_assets_objects")
      .select(
        `
        id,
        name,
        user_folder,
        created_at,
        updated_at,
        metadata
      `,
      )
      .eq("user_folder", folder)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching assets:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for file access
    const assetsWithUrls = await Promise.all(
      (assets || []).map(async (asset) => {
        try {
          const { data: signedUrl } = await supabase.storage
            .from("company_assets")
            .createSignedUrl(asset.name, 3600); // 1 hour expiry

          return {
            ...asset,
            url: signedUrl?.signedUrl,
            // Parse metadata for additional info
            size: asset.metadata?.size,
            type: asset.metadata?.mimetype,
            // Extract file extension and type
            extension: asset.name.split(".").pop()?.toLowerCase(),
            isImage: asset.metadata?.mimetype?.startsWith("image/"),
            isDocument: ["pdf", "doc", "docx", "txt"].includes(
              asset.name.split(".").pop()?.toLowerCase() || "",
            ),
          };
        } catch (urlError) {
          console.warn(`Failed to generate URL for ${asset.name}:`, urlError);
          return {
            ...asset,
            url: null,
            size: asset.metadata?.size,
            type: asset.metadata?.mimetype,
          };
        }
      }),
    );

    return NextResponse.json({
      data: assetsWithUrls,
      count: assetsWithUrls.length,
      pagination: {
        offset,
        limit,
        hasMore: assetsWithUrls.length === limit,
      },
    });
  } catch (error) {
    console.error("Company assets API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || user.id;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10MB)" },
        { status: 400 },
      );
    }

    // Generate safe filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${folder}/${timestamp}_${safeName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company_assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // The optimized view will automatically include this new file
    // Get the uploaded file info using our optimized view
    const { data: newAsset, error: fetchError } = await supabase
      .from("company_assets_objects")
      .select("*")
      .eq("name", filePath)
      .single();

    if (fetchError) {
      // File uploaded but couldn't fetch from view - still success
      console.warn("Upload succeeded but view fetch failed:", fetchError);
    }

    return NextResponse.json({
      data: newAsset || {
        name: filePath,
        user_folder: folder,
        created_at: new Date().toISOString(),
      },
      message: "File uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json(
        { error: "File name required" },
        { status: 400 },
      );
    }

    // Verify user owns this file using our optimized view
    const { data: asset, error: checkError } = await supabase
      .from("company_assets_objects")
      .select("name, user_folder")
      .eq("name", fileName)
      .eq("user_folder", user.id)
      .single();

    if (checkError || !asset) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 },
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("company_assets")
      .remove([fileName]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      {
        error: "Delete failed",
        details: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 },
    );
  }
}
