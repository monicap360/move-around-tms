import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SUBHAULER_AGREEMENT_TEXT } from "./subhauler-agreement-text";

export type AgreementReg = {
  company_name?: string | null;
  business_address?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  mc_number?: string | null;
  dot_number?: string | null;
  ein?: string | null;
};

const san = (s: string | null | undefined) =>
  (s || "")
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-").replace(/•/g, "-")
    .replace(/™/g, "(TM)").replace(/®/g, "(R)")
    .replace(/[^\x20-\x7E\n]/g, "");

// Builds a fillable (AcroForm) Subhauler Agreement PDF, pre-filled from the
// owner-operator's registration data. Interactive text fields let staff/subhaulers
// edit on-screen in any PDF reader.
export async function buildFillableAgreementPdf(reg: AgreementReg): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const form = pdf.getForm();
  const PW = 612, PH = 792, M = 54;
  let page = pdf.addPage([PW, PH]);
  let y = PH - M;
  const np = () => { page = pdf.addPage([PW, PH]); y = PH - M; };
  const ensure = (h: number) => { if (y - h < M) np(); };

  page.drawText("SUBHAULER AGREEMENT", { x: M, y, size: 20, font: bold, color: rgb(0.05, 0.12, 0.28) }); y -= 26;
  page.drawText("Ronyx Logistics - Owner-Operator / Subhauler", { x: M, y, size: 11, font }); y -= 14;
  page.drawText("Fillable form - details are pre-filled below; type to edit or complete.", { x: M, y, size: 8, font, color: rgb(0.4, 0.4, 0.4) }); y -= 26;

  const fields: [string, string, string][] = [
    ["Company / Subhauler Name", "company_name", san(reg.company_name)],
    ["Business Address", "business_address", san(reg.business_address)],
    ["Contact Name", "contact_name", san(reg.contact_name)],
    ["Phone", "contact_phone", san(reg.contact_phone)],
    ["Email", "contact_email", san(reg.contact_email)],
    ["MC Number", "mc_number", san(reg.mc_number)],
    ["USDOT Number", "dot_number", san(reg.dot_number)],
    ["EIN / Tax ID", "ein", san(reg.ein)],
    ["Effective Date", "effective_date", ""],
  ];
  for (const [label, key, val] of fields) {
    ensure(34);
    page.drawText(label, { x: M, y, size: 8, font: bold, color: rgb(0.35, 0.35, 0.35) }); y -= 13;
    const tf = form.createTextField("info_" + key);
    tf.setText(val);
    tf.addToPage(page, { x: M, y: y - 16, width: PW - 2 * M, height: 18, borderWidth: 1, borderColor: rgb(0.55, 0.6, 0.7) });
    tf.setFontSize(11);
    y -= 26;
  }

  np();
  page.drawText("AGREEMENT TERMS", { x: M, y, size: 13, font: bold, color: rgb(0.05, 0.12, 0.28) }); y -= 20;
  const maxW = PW - 2 * M;
  for (let para of san(SUBHAULER_AGREEMENT_TEXT).split("\n")) {
    para = para.replace(/\s+/g, " ").trim();
    if (!para) { y -= 5; continue; }
    let line = "";
    for (const w of para.split(" ")) {
      const t = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(t, 9) > maxW && line) { ensure(12); page.drawText(line, { x: M, y, size: 9, font }); y -= 12; line = w; }
      else line = t;
    }
    if (line) { ensure(12); page.drawText(line, { x: M, y, size: 9, font }); y -= 12; }
    y -= 4;
  }

  ensure(150); y -= 18;
  page.drawText("SIGNATURE", { x: M, y, size: 13, font: bold, color: rgb(0.05, 0.12, 0.28) }); y -= 26;
  for (const [label, key] of [["Printed Name", "sig_name"], ["Title", "sig_title"], ["Date", "sig_date"]]) {
    page.drawText(label, { x: M, y, size: 8, font: bold, color: rgb(0.35, 0.35, 0.35) }); y -= 13;
    const tf = form.createTextField(key);
    tf.addToPage(page, { x: M, y: y - 16, width: 300, height: 18, borderWidth: 1, borderColor: rgb(0.55, 0.6, 0.7) });
    tf.setFontSize(11); y -= 30;
  }
  page.drawText("Signature: ______________________________________", { x: M, y, size: 10, font });

  return pdf.save();
}
