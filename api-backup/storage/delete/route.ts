import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function DELETE(request: NextRequest) {
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

    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 },
      );
    }

    // Verify user has access to this file using our optimized view
    const { data: fileData, error: accessError } = await supabase
      .from("company_assets_objects")
      .select("name, user_folder")
      .eq("name", filePath)
      .single();

    if (accessError || !fileData) {
      return NextResponse.json(
        { error: "File not found or access denied" },
        { status: 404 },
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from("company_assets")
      .remove([filePath]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "File deleted successfully",
      deletedFile: filePath,
    });
  } catch (error: any) {
    console.error("Delete API error:", error);
    return NextResponse.json(
      {
        error: "Delete failed",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
    }

    const { error } = await supabase.storage
      .from("company_assets")
      .remove([filePath]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Delete POST API error:", error);
    return NextResponse.json(
      {
        error: "Delete failed",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 },
    );
  }
}
