import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await supabaseAdmin;
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { new_password } = await req.json().catch(() => ({}) as any);

  if (
    !new_password ||
    typeof new_password !== "string" ||
    new_password.length < 8
  ) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  // Use Supabase Auth admin or user update. Server-side can call updateUser.
  const { error: pwErr } = await supabase.auth.updateUser({
    password: new_password,
  });

  if (pwErr)
    return NextResponse.json({ error: pwErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
