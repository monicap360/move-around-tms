// resolveCompany — single source of truth for looking up a company/carrier
// from a truck number, driver name, or both.
//
// Called by:
//   - Dispatch import (auto-fill company during CSV parse)
//   - Dispatch Guard (verify company before assignment)
//   - Fast Scan ticket match (show company on ticket card)
//   - Staff task creation (include company in task body)
//
// Matching order:
//   1. Exact truck number → ronyx_trucks.company_name
//   2. Exact driver name → drivers.company_name
//   3. Driver + truck assignment → driver_truck_pool
//   4. Owner operator assigned to truck → ronyx_trucks.owner_operator_id
//   5. Vendor name from latest dispatch import → dispatch_jobs.vendor_name
//   6. Returns needs_review if no match

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CompanyResolution = {
  company_name:        string | null;
  carrier_name:        string | null;
  owner_operator_id:   string | null;
  owner_operator_name: string | null;
  employment_type:     string | null;
  match_source:        "truck_number" | "driver_name" | "driver_truck_pool" | "owner_operator" | "vendor_name" | "unresolved";
  match_confidence:    "high" | "medium" | "low" | "none";
  needs_review:        boolean;
};

const UNRESOLVED: CompanyResolution = {
  company_name:        null,
  carrier_name:        null,
  owner_operator_id:   null,
  owner_operator_name: null,
  employment_type:     null,
  match_source:        "unresolved",
  match_confidence:    "none",
  needs_review:        true,
};

export async function resolveCompany({
  truckNumber,
  driverName,
  vendorName,
}: {
  truckNumber?: string | null;
  driverName?:  string | null;
  vendorName?:  string | null;
}): Promise<CompanyResolution> {
  const sb = createSupabaseServerClient();

  // ── 1. Exact truck number → ronyx_trucks ──────────────────────────────────
  if (truckNumber?.trim()) {
    const { data: truck } = await sb
      .from("ronyx_trucks")
      .select("company_name, carrier_name, owner_operator_id, owner_operator_name, assigned_driver_name")
      .ilike("truck_number", truckNumber.trim())
      .maybeSingle();

    if (truck?.company_name || truck?.owner_operator_name) {
      return {
        company_name:        truck.company_name ?? truck.owner_operator_name,
        carrier_name:        truck.carrier_name ?? null,
        owner_operator_id:   truck.owner_operator_id ?? null,
        owner_operator_name: truck.owner_operator_name ?? null,
        employment_type:     truck.owner_operator_id ? "Owner Operator Driver" : null,
        match_source:        truck.owner_operator_id ? "owner_operator" : "truck_number",
        match_confidence:    "high",
        needs_review:        false,
      };
    }
  }

  // ── 2. Exact driver name → drivers ────────────────────────────────────────
  if (driverName?.trim()) {
    const nameNorm = driverName.trim();
    const { data: driver } = await sb
      .from("drivers")
      .select("company_name, carrier_name, owner_operator_id, owner_operator_name, employment_type")
      .or(`full_name.ilike.${nameNorm},name.ilike.${nameNorm}`)
      .maybeSingle();

    if (driver?.company_name || driver?.owner_operator_name) {
      return {
        company_name:        driver.company_name ?? driver.owner_operator_name,
        carrier_name:        driver.carrier_name ?? null,
        owner_operator_id:   driver.owner_operator_id ?? null,
        owner_operator_name: driver.owner_operator_name ?? null,
        employment_type:     driver.employment_type ?? null,
        match_source:        "driver_name",
        match_confidence:    "high",
        needs_review:        false,
      };
    }
  }

  // ── 3. Driver + truck → driver_truck_pool ────────────────────────────────
  if (truckNumber?.trim() && driverName?.trim()) {
    const { data: pool } = await sb
      .from("ronyx_driver_truck_pool")
      .select("company_name, owner_operator_id")
      .ilike("truck_number", truckNumber.trim())
      .ilike("driver_name", driverName.trim())
      .maybeSingle();

    if (pool?.company_name) {
      return {
        company_name:        pool.company_name,
        carrier_name:        null,
        owner_operator_id:   pool.owner_operator_id ?? null,
        owner_operator_name: null,
        employment_type:     null,
        match_source:        "driver_truck_pool",
        match_confidence:    "medium",
        needs_review:        false,
      };
    }
  }

  // ── 4. Vendor name from recent dispatch jobs ──────────────────────────────
  if (vendorName?.trim()) {
    const { data: oo } = await sb
      .from("ronyx_owner_operators")
      .select("id, company_name")
      .ilike("company_name", `%${vendorName.trim()}%`)
      .maybeSingle();

    if (oo?.company_name) {
      return {
        company_name:        oo.company_name,
        carrier_name:        null,
        owner_operator_id:   oo.id,
        owner_operator_name: oo.company_name,
        employment_type:     "Owner Operator Driver",
        match_source:        "vendor_name",
        match_confidence:    "medium",
        needs_review:        false,
      };
    }
  }

  return UNRESOLVED;
}

// Lightweight sync version for use in the dispatch import parser (client-side).
// Only does string matching against a pre-fetched lookup map.
export function resolveCompanySync(
  truckNumber: string | null,
  driverName:  string | null,
  truckMap:    Map<string, { company_name: string; owner_operator_name?: string }>,
  driverMap:   Map<string, { company_name: string; employment_type?: string }>,
): Pick<CompanyResolution, "company_name" | "employment_type" | "match_source" | "needs_review"> {
  if (truckNumber) {
    const hit = truckMap.get(truckNumber.trim().toLowerCase());
    if (hit?.company_name) return { company_name: hit.company_name, employment_type: null, match_source: "truck_number", needs_review: false };
  }
  if (driverName) {
    const hit = driverMap.get(driverName.trim().toLowerCase());
    if (hit?.company_name) return { company_name: hit.company_name, employment_type: hit.employment_type ?? null, match_source: "driver_name", needs_review: false };
  }
  return { company_name: null, employment_type: null, match_source: "unresolved", needs_review: true };
}
