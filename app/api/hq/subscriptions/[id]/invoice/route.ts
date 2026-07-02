import supabaseAdmin from "@/lib/supabaseAdmin";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const dynamic = "force-dynamic";

const san = (s: any) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E]/g, "");

// GET → a professional invoice PDF for this subscription, with ACH/check
// payment instructions pulled from HQ billing settings (hq_settings).
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const { data: s } = await supabaseAdmin.from("hq_subscriptions").select("*").eq("id", id).single();
  if (!s) return new Response("Subscription not found", { status: 404 });

  const { data: settings } = await supabaseAdmin.from("hq_settings").select("key, value");
  const cfg: Record<string, string> = {};
  for (const r of settings || []) cfg[r.key] = r.value;
  const from = cfg["billing_from"] || "MoveAround TMS";
  const bank = cfg["billing_bank"] || "[Add your bank name in Billing settings]";
  const routing = cfg["billing_routing"] || "[routing #]";
  const account = cfg["billing_account"] || "[account #]";
  const remit = cfg["billing_remit"] || "[Add your mailing address for checks]";

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([612, 792]);
  const M = 54; let y = 792 - M;
  const navy = rgb(0.05, 0.12, 0.28), gray = rgb(0.4, 0.4, 0.4);
  const text = (t: string, x: number, yy: number, size = 10, f = font, color = rgb(0.1, 0.1, 0.1)) => page.drawText(san(t), { x, y: yy, size, font: f, color });

  text("MoveAround TMS", M, y, 20, bold, navy); text("INVOICE", 612 - M - font.widthOfTextAtSize("INVOICE", 20) - 40, y, 20, bold, navy); y -= 16;
  text("Move Smarter. Deliver Better.", M, y, 9, font, gray); y -= 30;

  const invNo = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${id.slice(0, 6).toUpperCase()}`;
  const today = new Date().toISOString().slice(0, 10);
  text(`Invoice #: ${invNo}`, 612 - M - 200, y, 10, bold); y -= 14;
  text(`Date: ${today}`, 612 - M - 200, y, 10); y -= 14;
  text(`Due: ${s.next_due_date || today}`, 612 - M - 200, y, 10, bold, s.next_due_date && s.next_due_date < today ? rgb(0.86, 0.15, 0.15) : rgb(0.1, 0.1, 0.1));

  let yb = 792 - M - 46;
  text("BILL TO", M, yb, 9, bold, gray); yb -= 15;
  text(s.customer_company || "", M, yb, 12, bold); yb -= 14;
  if (s.contact_name) { text(s.contact_name, M, yb, 10); yb -= 13; }
  if (s.email) { text(s.email, M, yb, 10, font, gray); yb -= 13; }

  y = Math.min(y, yb) - 30;
  // line item table
  page.drawRectangle({ x: M, y: y - 4, width: 612 - 2 * M, height: 24, color: rgb(0.95, 0.96, 0.98) });
  text("DESCRIPTION", M + 8, y + 4, 9, bold, gray); text("AMOUNT", 612 - M - 90, y + 4, 9, bold, gray); y -= 26;
  const cycle = s.billing_cycle === "annual" ? "Annual" : "Monthly";
  text(`${s.plan_name || "MoveAround TMS"} — ${cycle} subscription`, M + 8, y, 11); text(`$${Number(s.amount || 0).toLocaleString()}`, 612 - M - 90, y, 11, bold); y -= 22;
  page.drawLine({ start: { x: M, y: y + 6 }, end: { x: 612 - M, y: y + 6 }, thickness: 1, color: rgb(0.85, 0.87, 0.9) }); y -= 8;
  text("TOTAL DUE", 612 - M - 200, y, 12, bold); text(`$${Number(s.amount || 0).toLocaleString()}`, 612 - M - 90, y, 13, bold, navy); y -= 40;

  // payment instructions
  page.drawRectangle({ x: M, y: y - 96, width: 612 - 2 * M, height: 100, color: rgb(0.97, 0.98, 1), borderColor: rgb(0.8, 0.85, 0.95), borderWidth: 1 });
  text("PAYMENT INSTRUCTIONS (ACH or Check — no card needed)", M + 10, y - 12, 9, bold, navy);
  text(`ACH / Bank transfer to ${from}:`, M + 10, y - 30, 10, bold);
  text(`Bank: ${bank}    Routing: ${routing}    Account: ${account}`, M + 10, y - 44, 9);
  text(`Or mail a check to: ${remit}`, M + 10, y - 62, 10);
  text(`Please include invoice # ${invNo} with your payment.`, M + 10, y - 80, 9, font, gray);
  y -= 120;
  text("Thank you for your business.", M, y, 10, font, gray);

  const bytes = await pdf.save();
  const safe = san(s.customer_company).replace(/[^a-z0-9]+/gi, "_") || "Customer";
  return new Response(bytes as any, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${safe}_${invNo}.pdf"`, "Cache-Control": "no-store" } });
}
