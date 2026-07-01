import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DocRouting = {
  company_name: string | null;
  driver_name: string | null;
  doc_type: string | null;
  // Extra fields used to auto-fill / create the owner-operator record (less data entry)
  mc_number: string | null;
  dot_number: string | null;
  ein: string | null;
  business_address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  raw?: string;
};

/**
 * Reads a PDF or image with Claude vision and extracts just the fields needed to
 * route the document to the right place (company / driver / doc type). Used when a
 * filename doesn't contain enough to match — i.e. "scan001.pdf" or "document.pdf".
 * Returns null if no Anthropic key, unsupported file type, or extraction fails
 * (callers should fall back to filename routing).
 */
export async function extractDocRouting(buffer: Buffer, mimeType: string): Promise<DocRouting | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const isPDF   = mimeType === "application/pdf";
  const isImage = (mimeType || "").startsWith("image/");
  if (!isPDF && !isImage) return null;

  const base64 = buffer.toString("base64");
  const contentBlock: any = isPDF
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image",    source: { type: "base64", media_type: mimeType || "image/jpeg", data: base64 } };

  const prompt = `You are reading a trucking / transportation document inside a TMS to route it AND to capture company details so staff don't have to type them. Identify:
- company_name: the carrier / owner-operator company name as written (e.g. "Fan Fan Trucking LLC"), or null
- driver_name: the driver's full name IF this is a driver-specific document (CDL/driver license, medical card/DOT physical, MVR), otherwise null
- doc_type: best match from exactly this list: "Contract", "W-9 / Tax Form", "Auto Liability Insurance", "General Liability Insurance", "Cargo Insurance", "Insurance Certificate (COI)", "CDL License", "Medical Card", "MVR", "Voided Check", "MC Authority", "Other"
- mc_number: the MC / motor-carrier number as DIGITS ONLY (no "MC" prefix), or null
- dot_number: the USDOT number as DIGITS ONLY, or null
- ein: the EIN / federal tax ID (format ##-#######), or null
- business_address: the company's full mailing/physical address on ONE line, or null
- contact_name: a primary contact person's full name, or null
- contact_phone: a primary phone number, or null
- contact_email: a primary email address, or null

Respond with ONLY a compact JSON object and nothing else:
{"company_name":"...","driver_name":"...","doc_type":"...","mc_number":"...","dot_number":"...","ein":"...","business_address":"...","contact_name":"...","contact_phone":"...","contact_email":"..."}
Use null (not empty string) for anything you cannot determine. Do NOT guess.`;

  try {
    const resp = await anthropic.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 300,
      messages:   [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
    } as any);

    const text = (resp.content.find((c: any) => c.type === "text") as any)?.text ?? "";
    const m = text.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    const clean = (v: any) => (v && String(v).trim() && String(v).toLowerCase() !== "null" ? String(v).trim() : null);
    return {
      company_name:     clean(j.company_name),
      driver_name:      clean(j.driver_name),
      doc_type:         clean(j.doc_type),
      mc_number:        clean(j.mc_number)?.replace(/[^0-9]/g, "") || null,
      dot_number:       clean(j.dot_number)?.replace(/[^0-9]/g, "") || null,
      ein:              clean(j.ein),
      business_address: clean(j.business_address),
      contact_name:     clean(j.contact_name),
      contact_phone:    clean(j.contact_phone),
      contact_email:    clean(j.contact_email),
      raw:              text.slice(0, 300),
    };
  } catch {
    return null;
  }
}

export type CoiFields = {
  insurance_provider: string | null; // insurer / agency
  policy_number: string | null;
  effective_date: string | null;     // YYYY-MM-DD
  expiration_date: string | null;    // YYYY-MM-DD
  named_insured: string | null;      // the insured carrier
  auto_liability_amount: string | null;
  general_liability_amount: string | null;
};

// YYYY-MM-DD or null
function isoDate(v: any): string | null {
  if (!v) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null") return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/**
 * Reads a Certificate of Insurance (COI) with Claude vision and pulls the policy
 * details so staff don't retype them: insurer, policy #, effective/expiration
 * dates, named insured, and coverage limits. Returns null if no key / unsupported
 * type / failure. Dates come back as YYYY-MM-DD.
 */
export async function extractCoiFields(buffer: Buffer, mimeType: string): Promise<CoiFields | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  const isPDF = mimeType === "application/pdf";
  const isImage = (mimeType || "").startsWith("image/");
  if (!isPDF && !isImage) return null;

  const base64 = buffer.toString("base64");
  const contentBlock: any = isPDF
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: mimeType || "image/jpeg", data: base64 } };

  const prompt = `You are reading an ACORD Certificate of Insurance (COI) for a trucking carrier. Extract exactly these fields:
- insurance_provider: the insurer or issuing agency name (prefer the insurance carrier / "INSURER" name; else the agency/producer), or null
- policy_number: the policy number for the Auto Liability line (or the primary policy shown), or null
- effective_date: the policy EFFECTIVE date (policy start) in YYYY-MM-DD, or null
- expiration_date: the policy EXPIRATION date (policy end) in YYYY-MM-DD, or null
- named_insured: the "INSURED" company name (the carrier this COI covers), or null
- auto_liability_amount: the Auto Liability combined single limit as a number with commas (e.g. "1,000,000"), or null
- general_liability_amount: the General Liability each-occurrence limit (e.g. "1,000,000"), or null

If multiple coverage lines have different dates, use the Auto Liability line's effective/expiration dates. Respond with ONLY this JSON and nothing else:
{"insurance_provider":"...","policy_number":"...","effective_date":"YYYY-MM-DD","expiration_date":"YYYY-MM-DD","named_insured":"...","auto_liability_amount":"...","general_liability_amount":"..."}
Use null (not "") for anything you cannot read. Do NOT guess dates.`;

  try {
    const resp = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompt }] }],
    } as any);
    const text = (resp.content.find((c: any) => c.type === "text") as any)?.text ?? "";
    const m = text.match(/\{[\s\S]*?\}/);
    if (!m) return null;
    const j = JSON.parse(m[0]);
    const clean = (v: any) => (v && String(v).trim() && String(v).toLowerCase() !== "null" ? String(v).trim() : null);
    return {
      insurance_provider:        clean(j.insurance_provider),
      policy_number:             clean(j.policy_number),
      effective_date:            isoDate(j.effective_date),
      expiration_date:           isoDate(j.expiration_date),
      named_insured:             clean(j.named_insured),
      auto_liability_amount:     clean(j.auto_liability_amount),
      general_liability_amount:  clean(j.general_liability_amount),
    };
  } catch {
    return null;
  }
}
