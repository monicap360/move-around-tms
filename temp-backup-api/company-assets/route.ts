// app/api/company-assets/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      },
    );

    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("company_assets")
      .insert({
        user_id: userRes.user.id,
        asset_type: payload.asset_type,
        file_path: payload.file_path,
        original_filename: payload.original_filename,
        description: payload.description,
        file_size: payload.file_size,
        mime_type: payload.mime_type,
        tags: payload.tags,
        metadata: payload.metadata,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ data }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unknown error" },
      { status: 500 },
    );
  }
}
