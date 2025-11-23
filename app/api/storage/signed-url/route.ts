import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "../../_supabase";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { filePath, expiresIn = 3600 } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: "Missing filePath" }, { status: 400 });
    }

    const { data, error } = await supabase.storage
      .from("company_assets")
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data?.signedUrl, expiresIn });

  } catch (err: any) {
    console.error('Signed URL API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
