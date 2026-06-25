import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";
import Anthropic from "@anthropic-ai/sdk";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Field definitions ───────────────────────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "mc_number","dot_number","ein","tin","tin_number","policy","policy_number",
  "auto_liability_policy","cargo_policy","gl_policy","workers_comp_policy",
  "bank_name","account_num","routing_num","loan_amount","deduction",
  "auto_liability_exp","cargo_exp","gl_exp","workers_comp_exp",
  "cdl_number","cdl_exp","med_cert_exp","expiration_date",
  "dispatch_eligible","compliance_status","pay_rate",
]);

function isSensitive(key: string): boolean {
  const k = key.toLowerCase().replace(/[^a-z_]/g, "");
  return SENSITIVE_KEYS.has(k) || k.includes("expir") || k.includes("policy") || k.includes("tax");
}

function detectDocType(fileName: string, textHint: string): string {
  const n = fileName.toLowerCase();
  const t = textHint.toLowerCase();
  if (n.includes("coi") || n.includes("certificate") || t.includes("certificate of insurance") || t.includes("acord"))
    return "coi";
  if (n.includes("cdl") || n.includes("license") || t.includes("commercial driver"))
    return "cdl";
  if (n.includes("mvr") || t.includes("motor vehicle record"))
    return "mvr";
  if (n.includes("medical") || n.includes("med card") || t.includes("medical examiner"))
    return "medical_card";
  if (n.includes("w-9") || n.includes("w9") || t.includes("taxpayer identification"))
    return "w9";
  if (n.includes("contract") || n.includes("agreement"))
    return "contract";
  if (n.includes("payroll") || n.includes("settlement") || n.includes("payout"))
    return "payroll";
  if (n.includes("driver") || n.includes("roster"))
    return "driver_roster";
  return "general";
}

function buildPrompt(docType: string, fileName: string): string {
  const fieldHints: Record<string, string> = {
    coi:  "insurance carrier names, policy numbers, effective dates, expiration dates (Auto Liability, Cargo, General Liability, Workers Comp), certificate holder, named insured, MC/DOT number if present",
    cdl:  "driver full name, CDL number, CDL state, CDL class (A/B/C), CDL expiration date, date of birth, endorsements",
    mvr:  "driver name, license number, state, MVR date, violation count, accident history summary",
    medical_card: "driver name, medical examiner name, NPI, certificate number, national registry number, expiration date",
    w9:   "legal name, business name, address, TIN type (SSN or EIN), TIN number (only last 4 if redacted), signature date",
    contract: "party names, effective date, term length, pay rate, deductions, equipment types",
    payroll:  "driver names, amounts, dates, ticket numbers, tons, rates",
    driver_roster: "driver names, phone, email, CDL numbers, CDL expiration, medical card expiration, truck numbers, employment type (W2/1099)",
    general: "all identifiable fields including names, numbers, ID numbers, dates, financial values, addresses",
  };

  return `You are extracting structured data from a transportation document for a TMS system.

Document: ${fileName}
Type: ${docType}

Extract ALL relevant fields. For each field return a JSON object in this EXACT format:
{"key":"snake_case_key","label":"Human Label","value":"extracted value or null","confidence":85,"source":"where found","category":"identity|insurance|driver|compliance|financial","sensitive":false}

Focus on: ${fieldHints[docType] ?? fieldHints.general}

Rules:
- Dates: MM/DD/YYYY format
- null if not found (not empty string)
- confidence: 95+ clearly stated, 75-94 probably correct, <75 uncertain
- sensitive: true for MC#, DOT#, EIN, policy numbers, expirations, banking, CDL numbers
- category: identity (names/IDs), insurance (COI fields), driver (CDL/med/MVR), compliance (dates/status), financial (pay/deductions)

Return ONLY a valid JSON array like: [{"key":"...","label":"...","value":"...","confidence":85,"source":"...","category":"identity","sensitive":false}]
No other text before or after.`;
}

// ─── Org resolver ─────────────────────────────────────────────────────────────

async function resolveOrg(userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabaseAdmin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", userId)
    .single();
  return data?.org_id ?? null;
}

// ─── POST /api/ronyx/intel-verify/extract ────────────────────────────────────

export async function POST(req: NextRequest) {
  const formData   = await req.formData();
  const file       = formData.get("file") as File | null;
  const ooId       = formData.get("oo_id") as string | null;
  const docTypeOvr = formData.get("doc_type") as string | null;

  if (!file) return NextResponse.json({ ok: false, error: "No file provided" }, { status: 400 });

  const { data: { session } } = await supabaseAdmin.auth.getSession();
  const userId = session?.user?.id ?? null;
  const orgId  = await resolveOrg(userId);

  const ext     = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isExcel = ["xlsx", "xls"].includes(ext);
  const isCSV   = ext === "csv";
  const isPDF   = ext === "pdf";
  const isImage = ["jpg","jpeg","png","webp","gif","tiff","bmp"].includes(ext);

  let fields: any[] = [];
  let detectedDocType = docTypeOvr ?? detectDocType(file.name, "");
  let rawTextPreview  = "";
  let extractionError: string | null = null;

  try {
    if (isExcel || isCSV) {
      // ── Spreadsheet: parse with exceljs ───────────────────────
      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const ws = workbook.worksheets[0];

      const sheetHeaders: string[] = [];
      const arr: Record<string, string>[] = [];

      if (ws) {
        ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
          sheetHeaders[col - 1] = String(cell.value ?? "");
        });
        ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
          if (rowNum === 1) return;
          const obj: Record<string, string> = {};
          row.eachCell({ includeEmpty: true }, (cell, col) => {
            const h = sheetHeaders[col - 1];
            if (h) {
              const v = cell.value;
              obj[h] = v instanceof Date
                ? `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,"0")}-${String(v.getDate()).padStart(2,"0")}`
                : String(v ?? "");
            }
          });
          arr.push(obj);
        });
      }

      const headers = sheetHeaders.filter(Boolean);
      detectedDocType = docTypeOvr ?? detectDocType(file.name, headers.join(" "));
      rawTextPreview  = headers.join(", ");

      fields = headers.map((h, i) => {
        const key = h.toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_]/g,"").slice(0, 40);
        return {
          key:        key || `col_${i}`,
          label:      h,
          value:      arr[0]?.[h] ?? null,
          confidence: 90,
          source:     `Row 2, Column "${h}"`,
          category:   "compliance",
          sensitive:  isSensitive(key),
          row_count:  arr.length,
          sample_values: arr.slice(0, 3).map(r => r[h]).filter(Boolean),
        };
      });

    } else if (isPDF || isImage) {
      // ── PDF / Image: Claude extraction ────────────────────────
      const base64   = Buffer.from(await file.arrayBuffer()).toString("base64");
      const mimeType = isPDF ? "application/pdf" : (file.type || "image/jpeg") as string;
      const prompt   = buildPrompt(detectedDocType, file.name);

      const contentBlock: any = isPDF
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
        : { type: "image",    source: { type: "base64", media_type: mimeType,           data: base64 } };

      const response = await anthropic.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 3000,
        messages:   [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
      } as any);

      const text = response.content.find((c: any) => c.type === "text")?.text ?? "";
      rawTextPreview = text.slice(0, 500);

      const jsonMatch = text.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          fields = parsed.map((f: any) => ({
            key:        String(f.key ?? "unknown").replace(/[^a-z0-9_]/g, "").slice(0, 60),
            label:      String(f.label ?? f.key ?? ""),
            value:      f.value ?? null,
            confidence: Number(f.confidence) || 75,
            source:     String(f.source ?? ""),
            category:   String(f.category ?? "compliance"),
            sensitive:  Boolean(f.sensitive) || isSensitive(String(f.key ?? "")),
          }));
        }
      } else {
        extractionError = "Claude returned non-JSON response — fields could not be parsed.";
      }
    }
  } catch (e) {
    extractionError = e instanceof Error ? e.message : "Extraction failed";
  }

  // ─── Save to DB ───────────────────────────────────────────────────────────
  let uploadId:    string | null = null;
  let queueItemId: string | null = null;

  try {
    const { data: upRow } = await supabaseAdmin.from("original_uploads").insert({
      module:           "intel_verify",
      source_file_name: file.name,
      file_type:        ext,
      file_size_bytes:  file.size,
      mime_type:        file.type || null,
      is_original:      true,
      is_deleted:       false,
      notes:            JSON.stringify({ oo_id: ooId, doc_type: detectedDocType, org_id: orgId }),
    }).select("id").single();
    uploadId = upRow?.id ?? null;
  } catch { /* graceful */ }

  try {
    const high = fields.filter(f => (f.confidence ?? 0) >= 85 && f.value != null).length;
    const low  = fields.filter(f => (f.confidence ?? 0) <  85 && f.value != null).length;
    const { data: qRow } = await supabaseAdmin.from("intel_verify_queue").insert({
      org_id:              orgId,
      oo_id:               ooId,
      upload_id:           uploadId,
      file_name:           file.name,
      file_type:           ext,
      doc_type:            detectedDocType,
      extracted_fields:    fields,
      raw_text_preview:    rawTextPreview.slice(0, 2000),
      status:              fields.length > 0 ? "pending_review" : "extraction_failed",
      high_confidence_count: high,
      low_confidence_count:  low,
      extraction_error:    extractionError,
      created_by:          userId,
    }).select("id").single();
    queueItemId = qRow?.id ?? null;
  } catch { /* intel_verify_queue table may not exist yet */ }

  const highConf = fields.filter(f => (f.confidence ?? 0) >= 85 && f.value != null);
  const lowConf  = fields.filter(f => (f.confidence ?? 0) <  85 && f.value != null);

  return NextResponse.json({
    ok:             !extractionError || fields.length > 0,
    extraction_id:  queueItemId,
    upload_id:      uploadId,
    doc_type:       detectedDocType,
    file_name:      file.name,
    file_type:      ext,
    fields,
    high_confidence_fields: highConf,
    low_confidence_fields:  lowConf,
    total_found:    fields.filter(f => f.value != null).length,
    extraction_error: extractionError,
    note: extractionError && fields.length === 0
      ? "Extraction encountered an error. Check file type and try again."
      : undefined,
  });
}
