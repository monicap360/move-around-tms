import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Accept multipart form-data: full_name (string), avatar (File optional)
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const form = await req.formData();
  const fullName = (form.get("full_name") as string | null) ?? null;
  const avatar = form.get("avatar") as File | null;

  let avatar_url: string | null = null;

  if (avatar) {
    // Validate file type
    if (!avatar.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    if (avatar.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 },
      );
    }

    // Safe filename
    const base = avatar.name.replace(/[^\w.\- ]+/g, "_").slice(0, 180);
    const filePath = `${user.id}/${Date.now()}_${base}`;

    // Delete existing avatar files for this user
    const { data: existingFiles } = await supabase.storage
      .from("avatars")
      .list(user.id);

    if (existingFiles && existingFiles.length > 0) {
      const filesToRemove = existingFiles.map(
        (file) => `${user.id}/${file.name}`,
      );
      await supabase.storage.from("avatars").remove(filesToRemove);
    }

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatar, { upsert: true });

    if (upErr)
      return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Get public URL
    const { data: pub } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);
    avatar_url = pub.publicUrl;
  }

  const patch: Record<string, any> = {};
  if (fullName !== null) patch.full_name = fullName;
  if (avatar_url) patch.avatar_url = avatar_url;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });
  }

  patch.updated_at = new Date().toISOString();

  // First, ensure the profiles table exists and has the right structure
  const { error: upsertErr } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...patch }, { onConflict: "id" });

  if (upsertErr) {
    // If profiles table doesn't exist, fall back to updating user metadata
    console.error(
      "Profiles table error, falling back to user metadata:",
      upsertErr,
    );

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          ...patch,
        },
      },
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, profile: { id: user.id, ...patch } });
}
