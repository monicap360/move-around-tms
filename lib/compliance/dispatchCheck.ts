// Dispatch Guard compliance check — evaluates a driver/OO against
// customer-specific rules and active overrides before dispatch assignment.
//
// Returns a ComplianceResult with eligible flag, exact block reasons,
// active override badges, and the recommended next action.

export type ComplianceResult = {
  eligible:    boolean;
  warnings:    string[];
  blocks:      string[];
  overrides:   string[];   // human-readable override badges
  nextAction:  string;
};

type DriverRecord = {
  company_name?:      string | null;
  carrier_name?:      string | null;
  owner_operator_id?: string | null;
  employment_type?:   string | null;
  dispatch_eligible?: boolean;
  block_reason?:      string | null;
};

type OwnerOperatorRecord = {
  id?:           string;
  company_name?: string | null;
  status?:       string | null;
} | null;

type CustomerRules = {
  auto_liability_required?:         boolean;
  general_liability_required?:      boolean;
  cargo_required?:                  boolean;
  cargo_override_allowed?:          boolean;
  workers_comp_required?:           boolean;
  workers_comp_override_allowed?:   boolean;
  driver_cdl_required?:             boolean;
  driver_medical_card_required?:    boolean;
  mvr_required?:                    boolean;
  drug_test_required?:              boolean;
  background_check_required?:       boolean;
  loan_agreement_required_if_loan?: boolean;
} | null;

type DocumentRecord = {
  doc_type:        string;
  status?:         string | null;
  expires_on?:     string | null;
  expiration_date?:string | null;   // alias used in some tables
};

type OverrideRecord = {
  document_type:    string;
  status:           string;
  customer_name?:   string | null;
  expiration_date?: string | null;
  approved_by_name?:string | null;
};

export function checkDispatchCompliance({
  driver,
  ownerOperator,
  customerRules,
  documents,
  overrides,
  customerName,
}: {
  driver:        DriverRecord;
  ownerOperator: OwnerOperatorRecord;
  customerRules: CustomerRules;
  documents:     DocumentRecord[];
  overrides:     OverrideRecord[];
  customerName:  string;
}): ComplianceResult {
  const blocks:          string[] = [];
  const warnings:        string[] = [];
  const activeOverrides: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function isExpired(dateStr?: string | null): boolean {
    if (!dateStr) return true;
    return new Date(dateStr) < today;
  }

  function daysUntil(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000);
  }

  function hasActiveOverride(docType: string): { found: boolean; badge: string } {
    const match = overrides?.find(o => {
      if (o.document_type !== docType)         return false;
      if (o.status         !== "active")        return false;
      if (o.customer_name && o.customer_name !== customerName) return false;
      const exp = o.expiration_date;
      if (exp && new Date(exp) < today)         return false;
      return true;
    });
    if (!match) return { found: false, badge: "" };
    const until = match.expiration_date
      ? ` until ${new Date(match.expiration_date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })}`
      : "";
    const by = match.approved_by_name ? ` — approved by ${match.approved_by_name}` : "";
    const label = docType === "cargo_coi" ? "Cargo COI" : docType === "workers_comp" ? "Workers Comp" : docType;
    return { found: true, badge: `${label} override active${until}${by}` };
  }

  function hasValidDoc(type: string): boolean {
    return !!documents?.find(d => {
      const dtype = d.doc_type;
      if (dtype !== type)               return false;
      if (d.status === "rejected")      return false;
      const exp = d.expires_on ?? d.expiration_date;
      if (exp && isExpired(exp))        return false;
      return true;
    });
  }

  function expiringDoc(type: string, thresholdDays = 30): string | null {
    const doc = documents?.find(d => d.doc_type === type && d.status !== "rejected");
    const exp = doc?.expires_on ?? doc?.expiration_date;
    if (!exp) return null;
    const days = daysUntil(exp);
    if (days !== null && days >= 0 && days <= thresholdDays)
      return `${type.replace(/_/g, " ")} expires in ${days} day${days !== 1 ? "s" : ""}`;
    return null;
  }

  // ── Company / Carrier assignment ──────────────────────────────────────────
  if (!driver?.company_name && !driver?.carrier_name && !driver?.owner_operator_id) {
    blocks.push("Driver has no company or carrier assigned — cannot dispatch.");
  }

  // ── Driver documents ──────────────────────────────────────────────────────
  if (customerRules?.driver_cdl_required !== false) {
    if (!hasValidDoc("CDL") && !hasValidDoc("cdl")) {
      blocks.push("CDL / Driver License missing or expired.");
    } else {
      const w = expiringDoc("CDL") ?? expiringDoc("cdl");
      if (w) warnings.push(w);
    }
  }

  if (customerRules?.driver_medical_card_required !== false) {
    if (!hasValidDoc("Medical Card") && !hasValidDoc("medical_card")) {
      blocks.push("Medical Card missing or expired.");
    } else {
      const w = expiringDoc("Medical Card") ?? expiringDoc("medical_card");
      if (w) warnings.push(w);
    }
  }

  if (customerRules?.mvr_required !== false) {
    if (!hasValidDoc("MVR") && !hasValidDoc("mvr")) {
      blocks.push("MVR missing or not current.");
    } else {
      const w = expiringDoc("MVR") ?? expiringDoc("mvr");
      if (w) warnings.push(w);
    }
  }

  if (customerRules?.drug_test_required) {
    if (!hasValidDoc("Drug Test") && !hasValidDoc("drug_test")) {
      blocks.push("Drug Test required by customer but not on file.");
    }
  }

  if (customerRules?.background_check_required) {
    if (!hasValidDoc("Background Check") && !hasValidDoc("background_check")) {
      blocks.push("Background Check required by customer but not on file.");
    }
  }

  // ── COI checks ───────────────────────────────────────────────────────────
  if (customerRules?.cargo_required !== false) {
    if (!hasValidDoc("cargo_coi")) {
      const ovr = hasActiveOverride("cargo_coi");
      if (ovr.found) {
        activeOverrides.push(ovr.badge);
      } else if (customerRules?.cargo_override_allowed) {
        blocks.push("Cargo COI missing — override allowed but not yet approved by manager.");
      } else {
        blocks.push("Cargo COI missing or expired.");
      }
    } else {
      const w = expiringDoc("cargo_coi");
      if (w) warnings.push(w);
    }
  }

  if (customerRules?.workers_comp_required) {
    if (!hasValidDoc("workers_comp")) {
      const ovr = hasActiveOverride("workers_comp");
      if (ovr.found) {
        activeOverrides.push(ovr.badge);
      } else if (customerRules?.workers_comp_override_allowed) {
        blocks.push("Workers Comp required by customer — override allowed but not yet approved.");
      } else {
        blocks.push("Workers Comp missing or expired.");
      }
    } else {
      const w = expiringDoc("workers_comp");
      if (w) warnings.push(w);
    }
  }

  if (customerRules?.auto_liability_required !== false) {
    if (!hasValidDoc("auto_liability") && !hasValidDoc("Auto Liability")) {
      blocks.push("Auto Liability COI missing or expired.");
    }
  }

  if (customerRules?.general_liability_required) {
    if (!hasValidDoc("general_liability") && !hasValidDoc("General Liability")) {
      warnings.push("General Liability COI not on file — required by customer.");
    }
  }

  // ── OO status ─────────────────────────────────────────────────────────────
  if (ownerOperator && ownerOperator.status === "inactive") {
    blocks.push(`Owner operator ${ownerOperator.company_name ?? "unknown"} is inactive.`);
  }

  // ── Expiring overrides ────────────────────────────────────────────────────
  overrides?.forEach(o => {
    if (o.status !== "active") return;
    const days = daysUntil(o.expiration_date);
    if (days !== null && days >= 0 && days <= 7) {
      warnings.push(`Override for ${o.document_type} expires in ${days} day${days !== 1 ? "s" : ""} — renew soon.`);
    }
  });

  const nextAction =
    blocks.length > 0
      ? blocks[0].includes("company") ? "Assign driver to a company or carrier."
        : blocks[0].includes("CDL")    ? "Upload CDL or assign task to Compliance Admin."
        : blocks[0].includes("Medical")? "Upload Medical Card or assign task to Compliance Admin."
        : blocks[0].includes("MVR")    ? "Upload MVR or assign task to Compliance Admin."
        : blocks[0].includes("Cargo COI missing — override") ? "Request manager override approval for Cargo COI."
        : "Resolve compliance blocks or request manager override."
      : activeOverrides.length > 0
      ? "Eligible with active override — verify override expiration."
      : warnings.length > 0
      ? "Eligible — address expiring documents soon."
      : "Eligible for dispatch.";

  return {
    eligible:   blocks.length === 0,
    warnings,
    blocks,
    overrides:  activeOverrides,
    nextAction,
  };
}
