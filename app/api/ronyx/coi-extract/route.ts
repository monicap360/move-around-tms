import { NextResponse } from "next/server";
import { extractCoiFields } from "@/lib/doc-ai-extract";

export const dynamic = "force-dynamic";

// Reads an uploaded COI (PDF/image) and returns the policy details so the COI
// form auto-fills: insurer, policy #, effective/expiration dates, named insured,
// and coverage limits. Returns { ok:false } gracefully if it can't read it.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ ok: false, error: "No file" }, { status: 400 });
  if (file.size > 25 * 1024 * 1024) return NextResponse.json({ ok: false, error: "File too large" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const fields = await extractCoiFields(buffer, file.type || "application/octet-stream");
  if (!fields) return NextResponse.json({ ok: false, error: "Could not read the COI automatically." });
  return NextResponse.json({ ok: true, fields });
}
