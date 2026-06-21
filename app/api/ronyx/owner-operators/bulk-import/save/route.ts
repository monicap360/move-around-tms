import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "ronyx-imports";

export async function POST(req: NextRequest) {
  const sb   = supabaseAdmin;
  const form = await req.formData();

  const rowsJson = form.get("rows") as string | null;
  if (!rowsJson) return NextResponse.json({ error: "No rows provided" }, { status: 400 });

  let rows: Record<string, string>[];
  try { rows = JSON.parse(rowsJson); } catch { return NextResponse.json({ error: "Invalid rows JSON" }, { status: 400 }); }

  // Optional: store original file as backup
  const file     = form.get("file") as File | null;
  const doBackup = form.get("backup") === "1";
  let backupUrl: string | null = null;

  if (file && doBackup) {
    const { data: buckets } = await sb.storage.listBuckets();
    if (!buckets?.find((b: any) => b.id === BUCKET)) {
      await sb.storage.createBucket(BUCKET, { public: false });
    }
    const ts       = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = `oo-bulk-import/${ts}-${file.name}`;
    await sb.storage.from(BUCKET).upload(filePath, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream" });
    const { data: urlData } = sb.storage.from(BUCKET).getPublicUrl(filePath);
    backupUrl = urlData?.publicUrl ?? null;
  }

  // Fetch existing company names for dedup
  const { data: existing } = await sb.from("ronyx_owner_operators").select("company_name");
  const existingNames = new Set((existing || []).map((r: any) => r.company_name?.toLowerCase().trim()));

  let inserted = 0;
  let skipped  = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const companyName = (row.company_name || "").trim();
    if (!companyName) { skipped++; continue; }

    if (existingNames.has(companyName.toLowerCase())) { skipped++; continue; }

    const { error } = await sb.from("ronyx_owner_operators").insert({
      company_name:          companyName,
      contact_name:          row.contact_name          || null,
      contact_phone:         row.contact_phone         || null,
      contact_email:         row.contact_email         || null,
      business_address:      row.business_address      || null,
      ein:                   row.ein                   || null,
      dot_number:            row.dot_number            || null,
      mc_number:             row.mc_number             || null,
      insurance_agent_name:  row.insurance_agent_name  || null,
      insurance_agent_email: row.insurance_agent_email || null,
      insurance_agent_phone: row.insurance_agent_phone || null,
      notes:                 row.notes                 || null,
      status:                row.status                || "active",
    });

    if (error) {
      errors.push(`${companyName}: ${error.message}`);
    } else {
      inserted++;
      existingNames.add(companyName.toLowerCase());
    }
  }

  return NextResponse.json({ inserted, skipped, errors, backup_url: backupUrl });
}
