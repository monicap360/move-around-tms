import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  // Get the current user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("avatar") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 },
      );
    }

    // Create file path
    const fileExtension = file.name.split(".").pop();
    const fileName = `${user.id}.${fileExtension}`;
    const filePath = `avatars/${fileName}`;

    // Delete existing avatar if it exists
    const { data: existingFiles } = await supabase.storage
      .from("company_assets")
      .list("avatars", { search: user.id });

    if (existingFiles && existingFiles.length > 0) {
      for (const existingFile of existingFiles) {
        await supabase.storage
          .from("company_assets")
          .remove([`avatars/${existingFile.name}`]);
      }
    }

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("company_assets")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("company_assets").getPublicUrl(filePath);

    // Update user metadata with avatar URL
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          avatar_url: publicUrl,
        },
      },
    );

    if (updateError) {
      console.error("Failed to update user metadata:", updateError);
      // Don't fail the request if metadata update fails
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const supabase = await createSupabaseServerClient();

  // Get the current user
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Find and delete user's avatar files
    const { data: existingFiles } = await supabase.storage
      .from("company_assets")
      .list("avatars", { search: user.id });

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map((file) => `avatars/${file.name}`);

      const { error: deleteError } = await supabase.storage
        .from("company_assets")
        .remove(filesToRemove);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 },
        );
      }
    }

    // Remove avatar URL from user metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          avatar_url: null,
        },
      },
    );

    if (updateError) {
      console.error("Failed to update user metadata:", updateError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar delete error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
