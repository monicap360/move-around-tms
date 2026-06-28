// Built-in per-state OPERATIONAL trucking reference for Rory.
//
// ⚠️ This is a quick-reference for dispatch planning — NOT legal advice and NOT a
// substitute for the state DOT. Federal baselines (weight/axle/HOS) are uniform and
// stable; per-state dimensions, chain/idling rules, and especially OVERSIZE/OVERWEIGHT
// PERMIT specifics change and must be confirmed with the state's permit office before
// dispatching. Every tool answer carries the DISCLAIMER below.
//
// Sources: FMCSA federal limits + each state's DOT/DMV permit office (links per state).

export const DISCLAIMER =
  "Quick-reference for dispatch planning only — not legal advice. Confirm current limits, seasonal chain requirements, and any oversize/overweight permits with the state's DOT/permit office before dispatching.";

// Federal rules that apply nationwide to interstate carriers (same in every state).
export const FEDERAL_TRUCKING = {
  max_gross_weight_lbs: 80000,
  single_axle_lbs: 20000,
  tandem_axle_lbs: 34000,
  bridge_formula: "Federal Bridge Formula governs axle-group weights (FMCSA / 23 CFR 658).",
  standard_width_in: 102, // 8'6"
  hours_of_service: {
    driving_limit: "11 hours driving after 10 consecutive hours off duty",
    window: "14-hour on-duty window (cannot drive beyond it)",
    break: "30-minute break required after 8 cumulative hours of driving",
    weekly: "60 hours/7 days or 70 hours/8 days; reset with 34+ consecutive hours off",
    note: "Federal HOS applies to interstate commerce in all states. Intrastate-only HOS may differ by state.",
  },
  ifta_irp: "IFTA (fuel tax) and IRP (apportioned registration) apply across the 48 contiguous states for qualified vehicles.",
};

export type StateTruckingRule = {
  state: string;
  abbr: string;
  max_gross_lbs: number;
  single_axle_lbs: number;
  tandem_axle_lbs: number;
  max_width_in: number;
  max_height: string;
  max_trailer_len: string;
  chain_law: string;
  idling_limit: string;
  permit_authority: string;
  permit_url: string;
  notes: string;
};

const H136 = `13'6"`;
const H140 = `14'0"`;
const LEN53 = `53' trailer on designated highways`;
const CHAIN_MTN = "Seasonal — chains/traction devices required on mountain routes when posted (typically Oct–Apr); carry chains.";
const CHAIN_NONE = "No statewide chain mandate; obey posted signs and weather/traction advisories.";
const IDLE_NONE = "No statewide idling limit (local/municipal limits may apply).";

function mk(
  state: string, abbr: string,
  o: Partial<Pick<StateTruckingRule, "max_height" | "max_trailer_len" | "chain_law" | "idling_limit" | "notes">> & { auth: string; url: string },
): StateTruckingRule {
  return {
    state, abbr,
    max_gross_lbs: 80000, single_axle_lbs: 20000, tandem_axle_lbs: 34000, max_width_in: 102,
    max_height: o.max_height ?? H136,
    max_trailer_len: o.max_trailer_len ?? LEN53,
    chain_law: o.chain_law ?? CHAIN_NONE,
    idling_limit: o.idling_limit ?? IDLE_NONE,
    permit_authority: o.auth, permit_url: o.url, notes: o.notes ?? "",
  };
}

export const STATE_TRUCKING_RULES: Record<string, StateTruckingRule> = {
  AL: mk("Alabama", "AL", { auth: "Alabama DOT — Oversize/Overweight Permits", url: "https://www.dot.state.al.us" }),
  AK: mk("Alaska", "AK", { max_height: H140, chain_law: CHAIN_MTN, auth: "Alaska DOT&PF", url: "https://dot.alaska.gov" }),
  AZ: mk("Arizona", "AZ", { max_height: H140, chain_law: CHAIN_MTN, idling_limit: "Restrictions in some areas; confirm locally.", auth: "Arizona DOT — Permits", url: "https://azdot.gov" }),
  AR: mk("Arkansas", "AR", { auth: "Arkansas DOT (ARDOT)", url: "https://www.ardot.gov" }),
  CA: mk("California", "CA", { max_height: H140, chain_law: CHAIN_MTN, idling_limit: "5-minute idling limit (CARB), plus stricter local rules.", notes: "CARB Clean Truck/emissions rules apply. Kingpin-to-rear-axle limits enforced.", auth: "Caltrans — Transportation Permits", url: "https://dot.ca.gov" }),
  CO: mk("Colorado", "CO", { max_height: H140, chain_law: "Seasonal traction/chain law on I-70 mountain corridor and posted routes (Sep–May).", idling_limit: "Local idling limits (e.g., Denver); confirm.", auth: "Colorado DOT (CDOT) Permits", url: "https://www.codot.gov" }),
  CT: mk("Connecticut", "CT", { idling_limit: "3-minute idling limit (statewide).", auth: "Connecticut DOT", url: "https://portal.ct.gov/DOT" }),
  DE: mk("Delaware", "DE", { idling_limit: "3-minute idling limit (statewide).", auth: "DelDOT", url: "https://deldot.gov" }),
  FL: mk("Florida", "FL", { auth: "Florida DOT — Permits", url: "https://www.fdot.gov" }),
  GA: mk("Georgia", "GA", { auth: "Georgia DOT — Permits", url: "https://www.dot.ga.gov" }),
  HI: mk("Hawaii", "HI", { max_trailer_len: "Shorter combination limits — confirm.", auth: "Hawaii DOT", url: "https://hidot.hawaii.gov" }),
  ID: mk("Idaho", "ID", { max_height: H140, chain_law: CHAIN_MTN, notes: "Some routes allow >80,000 lbs with permit.", auth: "Idaho Transportation Dept (ITD)", url: "https://itd.idaho.gov" }),
  IL: mk("Illinois", "IL", { idling_limit: "Idling limits in Chicago/Cook County areas.", auth: "Illinois DOT (IDOT)", url: "https://idot.illinois.gov" }),
  IN: mk("Indiana", "IN", { auth: "INDOT — Permits", url: "https://www.in.gov/indot" }),
  IA: mk("Iowa", "IA", { auth: "Iowa DOT — Motor Carrier", url: "https://iowadot.gov" }),
  KS: mk("Kansas", "KS", { max_height: H140, auth: "Kansas DOT (KDOT)", url: "https://www.ksdot.org" }),
  KY: mk("Kentucky", "KY", { auth: "Kentucky Transportation Cabinet", url: "https://transportation.ky.gov" }),
  LA: mk("Louisiana", "LA", { auth: "Louisiana DOTD", url: "https://wwwsp.dotd.la.gov" }),
  ME: mk("Maine", "ME", { auth: "Maine DOT", url: "https://www.maine.gov/mdot" }),
  MD: mk("Maryland", "MD", { idling_limit: "5-minute idling limit (statewide).", auth: "Maryland SHA — Hauling Permits", url: "https://roads.maryland.gov" }),
  MA: mk("Massachusetts", "MA", { idling_limit: "5-minute idling limit (statewide).", auth: "MassDOT", url: "https://www.mass.gov/massdot" }),
  MI: mk("Michigan", "MI", { notes: "Special multi-axle configurations allow higher gross weights with permit.", auth: "Michigan DOT (MDOT)", url: "https://www.michigan.gov/mdot" }),
  MN: mk("Minnesota", "MN", { idling_limit: "3-minute idling limit (statewide, with exceptions).", auth: "Minnesota DOT (MnDOT)", url: "https://www.dot.state.mn.us" }),
  MS: mk("Mississippi", "MS", { auth: "Mississippi DOT (MDOT)", url: "https://mdot.ms.gov" }),
  MO: mk("Missouri", "MO", { auth: "Missouri DOT (MoDOT)", url: "https://www.modot.org" }),
  MT: mk("Montana", "MT", { max_height: H140, chain_law: CHAIN_MTN, notes: "Higher gross weights allowed on some routes with permit.", auth: "Montana DOT (MDT)", url: "https://www.mdt.mt.gov" }),
  NE: mk("Nebraska", "NE", { max_height: H140, auth: "Nebraska DOT", url: "https://dot.nebraska.gov" }),
  NV: mk("Nevada", "NV", { max_height: H140, chain_law: CHAIN_MTN, auth: "Nevada DOT (NDOT)", url: "https://www.dot.nv.gov" }),
  NH: mk("New Hampshire", "NH", { auth: "New Hampshire DOT", url: "https://www.nh.gov/dot" }),
  NJ: mk("New Jersey", "NJ", { idling_limit: "3-minute idling limit (statewide).", auth: "NJDOT", url: "https://www.nj.gov/transportation" }),
  NM: mk("New Mexico", "NM", { max_height: H140, auth: "New Mexico DOT (NMDOT) / MTD", url: "https://dot.nm.gov" }),
  NY: mk("New York", "NY", { idling_limit: "5-minute idling limit (stricter in NYC).", notes: "Lower bridge clearances in NYC metro — route carefully.", auth: "NYSDOT", url: "https://www.dot.ny.gov" }),
  NC: mk("North Carolina", "NC", { auth: "NCDOT — Oversize/Overweight", url: "https://www.ncdot.gov" }),
  ND: mk("North Dakota", "ND", { max_height: H140, auth: "North Dakota DOT (NDDOT)", url: "https://www.dot.nd.gov" }),
  OH: mk("Ohio", "OH", { auth: "Ohio DOT (ODOT) — Permits", url: "https://www.transportation.ohio.gov" }),
  OK: mk("Oklahoma", "OK", { max_height: H140, auth: "Oklahoma DOT (ODOT) / OK Corp. Comm.", url: "https://oklahoma.gov/odot" }),
  OR: mk("Oregon", "OR", { max_height: H140, chain_law: CHAIN_MTN, notes: "Oregon weight-mile tax applies; OD permits via ODOT MCTD.", auth: "Oregon DOT — Motor Carrier (MCTD)", url: "https://www.oregon.gov/odot" }),
  PA: mk("Pennsylvania", "PA", { idling_limit: "5-minute idling limit (Diesel Idling Act).", auth: "PennDOT", url: "https://www.penndot.pa.gov" }),
  RI: mk("Rhode Island", "RI", { idling_limit: "5-minute idling limit (statewide).", auth: "Rhode Island DOT (RIDOT)", url: "https://www.dot.ri.gov" }),
  SC: mk("South Carolina", "SC", { auth: "SCDOT", url: "https://www.scdot.org" }),
  SD: mk("South Dakota", "SD", { max_height: H140, auth: "South Dakota DOT (SDDOT)", url: "https://dot.sd.gov" }),
  TN: mk("Tennessee", "TN", { auth: "Tennessee DOT (TDOT)", url: "https://www.tn.gov/tdot" }),
  TX: mk("Texas", "TX", { max_height: H140, notes: "OS/OW permits issued by TxDMV (not TxDOT). 53' trailer standard.", auth: "Texas DMV — Motor Carrier Permits", url: "https://www.txdmv.gov" }),
  UT: mk("Utah", "UT", { max_height: H140, chain_law: CHAIN_MTN, auth: "Utah DOT (UDOT)", url: "https://www.udot.utah.gov" }),
  VT: mk("Vermont", "VT", { idling_limit: "5-minute idling limit (statewide).", auth: "Vermont Agency of Transportation (VTrans)", url: "https://vtrans.vermont.gov" }),
  VA: mk("Virginia", "VA", { idling_limit: "10-minute idling limit (3 min in some areas).", auth: "Virginia DMV / VDOT — Hauling Permits", url: "https://www.virginiadot.org" }),
  WA: mk("Washington", "WA", { max_height: H140, chain_law: CHAIN_MTN, auth: "Washington State DOT (WSDOT)", url: "https://wsdot.wa.gov" }),
  WV: mk("West Virginia", "WV", { chain_law: "Chains permitted/required on posted mountain routes in winter.", auth: "West Virginia DOT (WVDOT)", url: "https://transportation.wv.gov" }),
  WI: mk("Wisconsin", "WI", { auth: "Wisconsin DOT (WisDOT)", url: "https://wisconsindot.gov" }),
  WY: mk("Wyoming", "WY", { max_height: H140, chain_law: CHAIN_MTN, notes: "Wind/closure alerts common on I-80; check WYDOT 511.", auth: "Wyoming DOT (WYDOT)", url: "https://www.dot.state.wy.us" }),
  DC: mk("District of Columbia", "DC", { idling_limit: "3-minute idling limit.", notes: "Restricted truck routes downtown; oversize via DDOT.", auth: "DDOT", url: "https://ddot.dc.gov" }),
};

const NAME_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.values(STATE_TRUCKING_RULES).map(r => [r.state.toLowerCase(), r.abbr]),
);

// Resolve a state by 2-letter abbr or full name (case-insensitive).
export function lookupStateRule(q: string): StateTruckingRule | null {
  if (!q) return null;
  const s = q.trim().toLowerCase();
  if (s.length === 2 && STATE_TRUCKING_RULES[s.toUpperCase()]) return STATE_TRUCKING_RULES[s.toUpperCase()];
  if (NAME_TO_ABBR[s]) return STATE_TRUCKING_RULES[NAME_TO_ABBR[s]];
  // partial name match (e.g., "north dak")
  const hit = Object.values(STATE_TRUCKING_RULES).find(r => r.state.toLowerCase().startsWith(s) || r.state.toLowerCase().includes(s));
  return hit ?? null;
}

export const ALL_STATE_NAMES = Object.values(STATE_TRUCKING_RULES).map(r => `${r.state} (${r.abbr})`);

// ── Federal carrier / driver / vehicle compliance requirements (FMCSA) ───────
// What it takes to operate legally in interstate commerce. Stable federal rules;
// dollar/threshold figures should still be confirmed against current FMCSA guidance.
export const TRUCKING_REQUIREMENTS: Record<string, { title: string; items: string[] }> = {
  operating_authority: {
    title: "Operating Authority & Registration",
    items: [
      "USDOT Number — required for interstate carriers (and intrastate in many states); identifies the carrier for safety/inspection records.",
      "MC / Operating Authority (FMCSA) — required for for-hire carriers hauling regulated commodities or passengers across state lines.",
      "UCR (Unified Carrier Registration) — annual fee for interstate carriers/brokers.",
      "BOC-3 — designation of a process agent in each state; required to activate operating authority.",
      "Display the USDOT number on both sides of the power unit.",
    ],
  },
  driver_qualification: {
    title: "Driver Qualification (DQ) File",
    items: [
      "Employment application, motor vehicle record (MVR) at hire and reviewed annually.",
      "Road test / equivalent certificate.",
      "Valid CDL with required endorsements; medical examiner's certificate.",
      "Drug & alcohol pre-employment test and Clearinghouse query.",
      "Annual list of violations; ongoing record-keeping for the duration of employment + 3 years.",
    ],
  },
  cdl: {
    title: "CDL Classes & Endorsements",
    items: [
      "Class A — combination vehicles with GCWR 26,001+ lbs where the towed unit is over 10,000 lbs.",
      "Class B — single vehicles 26,001+ lbs, or towing under 10,000 lbs.",
      "Class C — smaller vehicles carrying hazmat (placarded) or 16+ passengers.",
      "Endorsements: H (hazmat), N (tank), X (hazmat + tank), T (doubles/triples), P (passenger), S (school bus).",
      "Entry-Level Driver Training (ELDT) required before first CDL / upgrade / H,P,S endorsement.",
      "Minimum age 21 for interstate (18 intrastate; limited 18–20 interstate pilot).",
    ],
  },
  medical_card: {
    title: "DOT Medical Card (Physical)",
    items: [
      "DOT physical by a certified medical examiner on the National Registry.",
      "Medical Examiner's Certificate valid up to 24 months (shorter if a condition needs monitoring).",
      "Driver must carry/maintain a current card; CDL holders' status is reported to the state.",
    ],
  },
  drug_alcohol: {
    title: "Drug & Alcohol Program",
    items: [
      "Testing: pre-employment, random, post-accident, reasonable suspicion, return-to-duty, follow-up.",
      "FMCSA Clearinghouse: pre-employment full query + annual limited query for every CDL driver.",
      "DOT 5-panel drug test and alcohol testing under 49 CFR Part 40.",
      "Maintain a written policy and supervisor reasonable-suspicion training.",
    ],
  },
  hours_of_service: {
    title: "Hours of Service (HOS)",
    items: [
      "11 hours driving after 10 consecutive hours off duty.",
      "14-hour on-duty driving window.",
      "30-minute break after 8 cumulative hours driving.",
      "60 hours/7 days or 70 hours/8 days; 34-hour restart resets the weekly clock.",
      "Federal HOS applies interstate; intrastate-only limits may differ by state.",
    ],
  },
  eld: {
    title: "Electronic Logging Device (ELD)",
    items: [
      "ELD required to record HOS for most CMVs operating interstate.",
      "Limited exceptions (e.g., pre-2000 engines, short-haul air-mile exemption, limited drive-days).",
      "Driver must be able to display/transfer logs at roadside.",
    ],
  },
  vehicle_inspection: {
    title: "Vehicle Inspection & Maintenance",
    items: [
      "Annual DOT inspection per 49 CFR 396 (kept on file / decal as applicable).",
      "Driver Vehicle Inspection Report (DVIR) — pre-/post-trip; defects affecting safety must be repaired.",
      "Systematic maintenance and records retained for the required period.",
    ],
  },
  insurance: {
    title: "Insurance Minimums (FMCSA)",
    items: [
      "General freight (non-hazardous): $750,000 minimum public liability (most shippers/brokers require $1,000,000).",
      "Hazardous materials: $1,000,000–$5,000,000 depending on commodity/quantity.",
      "For-hire passenger: $1,500,000 (≤15 seats) to $5,000,000 (16+ seats).",
      "Cargo coverage commonly $100,000 (carrier/broker contracts often dictate amounts).",
    ],
  },
  taxes_registration: {
    title: "Taxes & Apportioned Registration",
    items: [
      "IRP (International Registration Plan) — apportioned plates for interstate vehicles over 26,000 lbs or 3+ axles.",
      "IFTA (International Fuel Tax Agreement) — quarterly fuel-tax reporting for qualified vehicles.",
      "Heavy Vehicle Use Tax — IRS Form 2290 for vehicles 55,000 lbs and over.",
      "UCR annual registration for interstate operations.",
    ],
  },
  hazmat: {
    title: "Hazardous Materials",
    items: [
      "Hazmat (H) endorsement with TSA security threat assessment for the driver.",
      "Proper shipping papers, labeling, marking, and placarding.",
      "HM registration with PHMSA; security plan and hazmat training (general/function/safety/security).",
      "Higher insurance minimums ($1M–$5M) apply.",
    ],
  },
  foreign_driver_licensing: {
    title: "Foreign Driver Licensing — Mexico & Venezuela (driving CMVs in Texas/US)",
    items: [
      "GENERAL: To drive a commercial vehicle (CDL-class) domestically in Texas, a driver must hold a valid US/Texas CDL OR, for cross-border operations only, a recognized home-country CDL under a reciprocity agreement. They must also meet all FMCSA driver-qualification rules (DOT medical card, drug & alcohol/Clearinghouse, English-language proficiency) and be lawfully present with work authorization.",
      "MEXICO — reciprocity: Mexico's Licencia Federal de Conductor (LFC) is recognized by FMCSA for CROSS-BORDER operations (a Mexico-domiciled carrier/driver operating in the US under the cross-border program). Because Mexico (and Canada) have CDL reciprocity, Mexican drivers do NOT get a 'non-domiciled' Texas CDL.",
      "MEXICO — to drive domestically for a US carrier: the driver must be lawfully present with US work authorization and obtain a regular Texas CDL once they establish Texas residency (pass TX knowledge + skills tests, surrender/transfer prior license as required).",
      "VENEZUELA — NOT a reciprocity country: a Venezuelan driver's license is NOT valid for commercial driving in the US. There is no LFC-style recognition.",
      "VENEZUELA — to drive a CMV in Texas: the driver must (1) be lawfully present with US work authorization (e.g., EAD/green card), (2) qualify for a Texas CDL or a Texas NON-DOMICILED CDL (issued to drivers domiciled in a foreign country that lacks CDL testing reciprocity), (3) pass the Texas CDL knowledge and skills tests, and (4) meet all FMCSA driver-qualification standards.",
      "NON-DOMICILED TEXAS CDL: available to drivers domiciled outside the US in a country WITHOUT a CDL testing agreement (applies to Venezuela; does NOT apply to Mexico/Canada, which use reciprocity). Requires proof of lawful presence/work authorization.",
      "ALWAYS REQUIRED regardless of country: valid DOT medical card, FMCSA English-Language-Proficiency standard, drug & alcohol program enrollment + Clearinghouse, and the carrier verifying work authorization (I-9/EAD).",
      "⚠️ This is immigration + licensing territory — NOT legal advice. Confirm specifics with the Texas DPS CDL office, FMCSA, and a qualified immigration attorney before hiring or dispatching a foreign-licensed driver.",
    ],
  },
};
