import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type DocRouting = {
  company_name: string | null;
  driver_name: string | null;
  doc_type: string | null;
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

  const prompt = `You are routing a trucking / transportation document inside a TMS. Read the document and identify ONLY:
- company_name: the carrier / owner-operator company name as written (e.g. "Fan Fan Trucking LLC"), or null if none
- driver_name: the driver's full name IF this is a driver-specific document (CDL/driver license, medical card/DOT physical, MVR), otherwise null
- doc_type: choose the best match from exactly this list: "Contract", "W-9 / Tax Form", "Auto Liability Insurance", "General Liability Insurance", "Cargo Insurance", "Insurance Certificate (COI)", "CDL License", "Medical Card", "MVR", "Voided Check", "MC Authority", "Other"

Respond with ONLY a compact JSON object and nothing else:
{"company_name": "...", "driver_name": "...", "doc_type": "..."}
Use null (not empty string) for anything you cannot determine.`;

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
      company_name: clean(j.company_name),
      driver_name:  clean(j.driver_name),
      doc_type:     clean(j.doc_type),
      raw:          text.slice(0, 300),
    };
  } catch {
    return null;
  }
}
