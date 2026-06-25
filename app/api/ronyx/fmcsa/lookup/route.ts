import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// POST /api/ronyx/fmcsa/lookup
// Body: { dot_number?: string, mc_number?: string, oo_id?: string }
//
// Reads the FMCSA web key from ronyx_integrations (server-side only).
// Never reads from process.env. Never returns the key to the browser.
// Every lookup is written to ronyx_fmcsa_lookup_log for audit.
//
// FMCSA QCMobile API — free, requires a registered web key:
// https://ai.fmcsa.dot.gov/SMS/Tools/RequestAccess
//
// What FMCSA actually returns (do not over-promise):
//   - Carrier legal name and DBA
//   - Operating status (active / inactive / revoked)
//   - Physical/mailing address
//   - Phone number on file
//   - MC docket number
//   - USDOT number
//   - Safety rating (satisfactory / conditional / unsatisfactory / none)
//   - Insurance on file (carrier authority record — NOT a full policy detail)
//
// What FMCSA does NOT reliably return:
//   - Actual insurance policy expiration dates
//   - COI details (use RMIS or uploaded docs for that)
//   - Individual driver compliance

const FMCSA_BASE = "https://mobile.fmcsa.dot.gov/qc/services";

type FmcsaCarrier = {
  legalName?:       string;
  dbaName?:         string;
  dotNumber?:       string;
  allowedToOperate?: string;
  bipdInsuranceOnFile?: string;
  cargoInsuranceOnFile?: string;
  safetyRating?:    string;
  safetyRatingDate?: string;
  operatingStatus?: string;
  phyStreet?:       string;
  phyCity?:         string;
  phyState?:        string;
  phyZipcode?:      string;
  telephone?:       string;
  totalDrivers?:    string | number;
  totalPowerUnits?: string | number;
};

async function fetchCarrierByDot(dot: string, webKey: string): Promise<FmcsaCarrier | null> {
  const url = `${FMCSA_BASE}/carriers/${encodeURIComponent(dot)}?webKey=${encodeURIComponent(webKey)}`;
  const res  = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.content?.carrier ?? json?.carrier ?? null;
}

async function fetchCarrierByMc(mc: string, webKey: string): Promise<FmcsaCarrier | null> {
  // MC numbers can have leading zeros and the "MC-" prefix
  const clean = mc.replace(/[^0-9]/g, "");
  const url   = `${FMCSA_BASE}/carriers/docket/${encodeURIComponent(clean)}?webKey=${encodeURIComponent(webKey)}`;
  const res   = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const json  = await res.json();
  // Docket endpoint returns an array — take first result
  const list  = json?.content?.carriers ?? json?.carriers ?? [];
  return list[0]?.carrier ?? list[0] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dot_number, mc_number, oo_id } = body as {
      dot_number?: string; mc_number?: string; oo_id?: string;
    };

    if (!dot_number && !mc_number) {
      return NextResponse.json({ error: "Provide dot_number or mc_number" }, { status: 400 });
    }

    // ── Read API key from integrations table (never from env, never to browser) ──
    const { data: intRow } = await supabaseAdmin
      .from("ronyx_integrations")
      .select("api_key, enabled")
      .eq("name", "FMCSA")
      .single();

    if (!intRow?.api_key) {
      return NextResponse.json({
        error:       "FMCSA web key not configured",
        needsSetup:  true,
        setupPath:   "/ronyx/settings/integrations",
      }, { status: 503 });
    }

    if (!intRow.enabled) {
      return NextResponse.json({ error: "FMCSA integration is disabled" }, { status: 503 });
    }

    const webKey = intRow.api_key as string;

    // ── Call FMCSA ──────────────────────────────────────────────────────────
    let carrier: FmcsaCarrier | null = null;
    let lookupType = "";

    if (dot_number) {
      carrier    = await fetchCarrierByDot(dot_number.replace(/[^0-9]/g, ""), webKey);
      lookupType = "dot";
    }
    if (!carrier && mc_number) {
      carrier    = await fetchCarrierByMc(mc_number, webKey);
      lookupType = "mc";
    }

    // ── Normalize response ──────────────────────────────────────────────────
    const result = carrier ? {
      found:              true,
      legal_name:         carrier.legalName      ?? null,
      dba_name:           carrier.dbaName        ?? null,
      dot_number:         carrier.dotNumber      ?? dot_number ?? null,
      operating_status:   carrier.operatingStatus ?? carrier.allowedToOperate ?? null,
      allowed_to_operate: carrier.allowedToOperate === "Y",
      safety_rating:      carrier.safetyRating   ?? "Not Rated",
      safety_rating_date: carrier.safetyRatingDate ?? null,
      bipd_insurance_on_file: carrier.bipdInsuranceOnFile ?? null,
      cargo_insurance_on_file: carrier.cargoInsuranceOnFile ?? null,
      address:            [carrier.phyStreet, carrier.phyCity, carrier.phyState, carrier.phyZipcode].filter(Boolean).join(", ") || null,
      telephone:          carrier.telephone      ?? null,
      total_drivers:      carrier.totalDrivers   ?? null,
      total_power_units:  carrier.totalPowerUnits ?? null,
      // Important caveat — always surface this to the UI
      data_note:          "Authority and identity data from FMCSA. Insurance policy details require a separate COI from the carrier.",
      verified_at:        new Date().toISOString(),
    } : {
      found:       false,
      data_note:   "Carrier not found in FMCSA database. Verify MC/DOT number is correct.",
      verified_at: new Date().toISOString(),
    };

    // ── Audit log every lookup ──────────────────────────────────────────────
    void supabaseAdmin.from("ronyx_fmcsa_lookup_log").insert({
      oo_id:        oo_id      ?? null,
      dot_number:   dot_number ?? null,
      mc_number:    mc_number  ?? null,
      lookup_type:  lookupType,
      found:        result.found,
      result_snapshot: carrier ?? null,
      looked_up_at: new Date().toISOString(),
    }).then(() => {}, () => {});

    // ── If OO matched and carrier found, update OO's fmcsa_verified_at ─────
    if (oo_id && result.found) {
      void supabaseAdmin.from("ronyx_owner_operators").update({
        fmcsa_verified_at:     new Date().toISOString(),
        fmcsa_operating_status: result.operating_status ?? null,
        fmcsa_safety_rating:    result.safety_rating    ?? null,
        fmcsa_legal_name:       result.legal_name       ?? null,
      }).eq("id", oo_id).then(() => {}, () => {});
    }

    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err?.message ?? "FMCSA lookup failed";
    // Distinguish timeout from other errors
    const isTimeout = msg.includes("timeout") || msg.includes("abort");
    return NextResponse.json(
      { error: isTimeout ? "FMCSA API timed out — try again" : msg },
      { status: isTimeout ? 504 : 500 }
    );
  }
}
