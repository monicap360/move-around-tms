import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function GET() {
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

    // Query the optimized view instead of raw storage.objects
    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching files:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Process files to add useful metadata
    const processedFiles = (data || []).map((file) => ({
      ...file,
      // Extract file info from metadata
      size: file.metadata?.size || 0,
      type: file.metadata?.mimetype || "unknown",
      // Extract file extension
      extension: file.name.split(".").pop()?.toLowerCase() || "",
      // Determine file category
      isImage: file.metadata?.mimetype?.startsWith("image/") || false,
      isDocument: ["pdf", "doc", "docx", "txt", "xlsx", "pptx"].includes(
        file.name.split(".").pop()?.toLowerCase() || "",
      ),
      // Format size for display
      sizeFormatted: formatFileSize(file.metadata?.size || 0),
      // Extract just the filename (remove folder path)
      fileName: file.name.split("/").pop() || file.name,
    }));

    // Sylvia, Veronica, and Monica can see all files automatically (RLS)
    // Others will only see their own based on your view + RLS policy
    return NextResponse.json({
      ok: true,
      files: processedFiles,
      count: processedFiles.length,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error("Storage list API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
