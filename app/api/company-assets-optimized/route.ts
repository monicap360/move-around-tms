import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get("folder") || "default";
    const limit  = parseInt(searchParams.get("limit")  || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: assets, error } = await supabaseAdmin
      .from("company_assets_objects")
      .select("id, name, user_folder, created_at, updated_at, metadata")
      .eq("user_folder", folder)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const assetsWithUrls = await Promise.all(
      (assets || []).map(async (asset) => {
        try {
          const { data: signedUrl } = await supabaseAdmin.storage
            .from("company_assets")
            .createSignedUrl(asset.name, 3600);
          return {
            ...asset,
            url:       signedUrl?.signedUrl,
            size:      asset.metadata?.size,
            type:      asset.metadata?.mimetype,
            extension: asset.name.split(".").pop()?.toLowerCase(),
            isImage:   asset.metadata?.mimetype?.startsWith("image/"),
            isDocument: ["pdf", "doc", "docx", "txt"].includes(asset.name.split(".").pop()?.toLowerCase() || ""),
          };
        } catch {
          return { ...asset, url: null, size: asset.metadata?.size, type: asset.metadata?.mimetype };
        }
      }),
    );

    return NextResponse.json({
      data: assetsWithUrls,
      count: assetsWithUrls.length,
      pagination: { offset, limit, hasMore: assetsWithUrls.length === limit },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file     = formData.get("file") as File;
    const folder   = (formData.get("folder") as string) || "default";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = `${folder}/${Date.now()}_${safeName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("company_assets")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: newAsset } = await supabaseAdmin
      .from("company_assets_objects")
      .select("*")
      .eq("name", filePath)
      .single();

    return NextResponse.json({
      data: newAsset || { name: filePath, user_folder: folder, created_at: new Date().toISOString() },
      message: "File uploaded successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (!fileName) return NextResponse.json({ error: "File name required" }, { status: 400 });

    const { data: asset, error: checkError } = await supabaseAdmin
      .from("company_assets_objects")
      .select("name, user_folder")
      .eq("name", fileName)
      .single();

    if (checkError || !asset) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const { error: deleteError } = await supabaseAdmin.storage
      .from("company_assets")
      .remove([fileName]);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Delete failed" }, { status: 500 });
  }
}
