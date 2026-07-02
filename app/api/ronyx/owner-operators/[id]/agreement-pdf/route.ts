import supabaseAdmin from "@/lib/supabaseAdmin";
import { resolveOrgId } from "@/lib/auth/resolveOrgId";
import { buildFillableAgreementPdf } from "@/lib/subhauler-agreement-pdf";

export const dynamic = "force-dynamic";

// GET → a fillable (AcroForm) Subhauler Agreement PDF pre-filled from this
// owner-operator's registration data. Staff download it and hand it off; the
// interactive fields let the subhauler edit/complete in any PDF reader.
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const orgId = await resolveOrgId();
  if (!orgId) return new Response("Organization not resolved", { status: 400 });

  const { data: oo, error } = await supabaseAdmin
    .from("ronyx_owner_operators")
    .select("company_name, business_address, contact_name, contact_phone, contact_email, mc_number, dot_number, ein")
    .eq("id", id).eq("organization_id", orgId).single();
  if (error || !oo) return new Response("Owner-operator not found", { status: 404 });

  const bytes = await buildFillableAgreementPdf(oo);
  const safe = (oo.company_name || "Subhauler").replace(/[^a-z0-9]+/gi, "_");
  return new Response(bytes as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safe}_Subhauler_Agreement.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
