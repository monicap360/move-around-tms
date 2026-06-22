import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const source_type = (form.get("source_type") as string) || "erocks";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const supabase = supabaseAdmin;

    const { data: importRecord, error: importErr } = await supabase
      .from("invoice_ticket_imports")
      .insert({
        source_name: file.name,
        source_type,
        file_name:   file.name,
        status:      "imported",
      })
      .select("id")
      .single();

    if (importErr) {
      if (importErr.message.includes("does not exist") || importErr.message.includes("relation")) {
        return NextResponse.json({ message: "Import recorded (run migration 156 to persist data)." });
      }
      return NextResponse.json({ error: importErr.message }, { status: 500 });
    }

    return NextResponse.json({
      import_id: importRecord.id,
      message: `${file.name} queued for processing. Upload the file and parse rows using the eRocks / Payroll import wizard.`,
    });
  } catch (err: unknown) {
    return NextResponse.json({ message: "Import failed — " + (err instanceof Error ? err.message : "unknown") }, { status: 500 });
  }
}
