import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

const DATA_TYPES = ["tickets","drivers","trucks","owner_operators","payroll","customers","dispatch","custom"] as const;

async function resolveOrg(supabase: ReturnType<typeof createSupabaseServerClient>) {
  const envId = process.env.RONYX_ORG_ID;
  const orFilter = envId ? `id.eq.${envId},organization_code.eq.RONYX` : `organization_code.eq.RONYX`;
  const { data } = await supabase.from("organizations").select("id, name").or(orFilter).limit(1).single();
  return data ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const sb  = createSupabaseServerClient();
    const org = await resolveOrg(sb);
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const form     = await req.formData();
    const file     = form.get("file") as File | null;
    const dataType = (form.get("data_type") as string) || "custom";
    const desc     = (form.get("description") as string) || "";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i))
      return NextResponse.json({ error: "Only .xlsx, .xls, and .csv files are accepted." }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "File too large. Maximum 25 MB." }, { status: 400 });
    if (!DATA_TYPES.includes(dataType as any))
      return NextResponse.json({ error: "Invalid data_type" }, { status: 400 });

    const ts   = Date.now();
    const ext  = file.name.split(".").pop()?.toLowerCase() || "xlsx";
    const path = `excel-files/${org.id}/${ts}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const bytes  = await file.arrayBuffer();
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("ronyx-imports")
      .upload(path, bytes, {
        contentType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: false,
      });

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

    const { data: row, error: dbErr } = await supabaseAdmin
      .from("org_excel_files")
      .insert({
        organization_id:  org.id,
        file_name:        file.name,
        storage_path:     path,
        file_size_bytes:  file.size,
        data_type:        dataType,
        description:      desc || null,
      })
      .select("*")
      .single();

    if (dbErr) {
      void supabaseAdmin.storage.from("ronyx-imports").remove([path]);
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ file: row }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 });
  }
}
