// Provider-neutral normalized carrier data type.
// CCB and all UI reads this — never the raw provider response.

export type InsuranceLine = {
  verified: boolean;
  amount?: number | null;
  expires?: string | null;   // ISO date
  provider?: string | null;
  policy_number?: string | null;
};

export type NormalizedCarrierData = {
  legal_name?: string | null;
  dba_name?: string | null;
  mc_number?: string | null;
  dot_number?: string | null;
  ein?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  authority: {
    status: "active" | "inactive" | "revoked" | "pending" | "unknown";
    common?: boolean;
    contract?: boolean;
    broker?: boolean;
    granted_at?: string | null;
    revoked_at?: string | null;
  };
  safety: {
    rating: "satisfactory" | "conditional" | "unsatisfactory" | "not_rated";
    rating_date?: string | null;
    out_of_service: boolean;
    oos_rate_vehicle?: number | null;
    oos_rate_driver?: number | null;
    total_inspections?: number | null;
    crashes_fatal?: number | null;
    crashes_injury?: number | null;
  };
  insurance: {
    auto_liability?: InsuranceLine;
    cargo?: InsuranceLine;
    workers_comp?: InsuranceLine;
    general_liability?: InsuranceLine;
    bond?: InsuranceLine;
  };
  overall_status: "clear" | "needs_attention" | "blocked" | "unknown";
  compliance_issues: string[];   // human-readable list of problems found
  data_source: string;           // "rmis" | "saferwatch" | "mycarrierportal" | "fmcsa"
  snapshot_id?: string | null;
};

// Evaluate normalized data and produce CCB tasks payload
export type CCBTaskSpec = {
  task_type: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  due_date?: string | null;
  document_type?: string | null;
};

const DAYS = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const daysUntil = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.floor(diff / 86_400_000);
};

export function deriveOverallStatus(d: NormalizedCarrierData): "clear" | "needs_attention" | "blocked" {
  if (d.authority.status === "revoked" || d.safety.out_of_service) return "blocked";
  if (d.compliance_issues.length > 0 || d.authority.status === "inactive") return "needs_attention";
  return "clear";
}

export function deriveCCBTasks(d: NormalizedCarrierData, ooId: string, ooName: string): CCBTaskSpec[] {
  const tasks: CCBTaskSpec[] = [];

  if (d.authority.status === "revoked") {
    tasks.push({ task_type: "carrier_authority_revoked", title: `${ooName} — Authority Revoked`, description: "FMCSA operating authority has been revoked. This carrier must not be dispatched.", priority: "critical", due_date: DAYS(0) });
  } else if (d.authority.status === "inactive") {
    tasks.push({ task_type: "carrier_authority_inactive", title: `${ooName} — Authority Inactive`, description: "Carrier operating authority is currently inactive. Verify before dispatch.", priority: "high", due_date: DAYS(1) });
  }

  if (d.safety.out_of_service) {
    tasks.push({ task_type: "carrier_oos", title: `${ooName} — Out of Service Order`, description: "Active out-of-service order found. Carrier cannot be legally dispatched until resolved.", priority: "critical", due_date: DAYS(0) });
  } else if (d.safety.rating === "unsatisfactory") {
    tasks.push({ task_type: "carrier_safety_rating", title: `${ooName} — Unsatisfactory Safety Rating`, description: "Carrier has an Unsatisfactory FMCSA safety rating. Review before dispatch.", priority: "high", due_date: DAYS(3) });
  } else if (d.safety.rating === "conditional") {
    tasks.push({ task_type: "carrier_safety_rating", title: `${ooName} — Conditional Safety Rating`, description: "Carrier has a Conditional FMCSA safety rating. Review corrective actions.", priority: "medium", due_date: DAYS(7) });
  }

  const ins = d.insurance;
  const checkLine = (line: InsuranceLine | undefined, label: string, docType: string) => {
    if (!line) return;
    if (!line.verified) {
      tasks.push({ task_type: "insurance_not_verified", title: `${ooName} — ${label} Not on File`, description: `${label} could not be verified through the provider. Request a current certificate.`, priority: "high", due_date: DAYS(3), document_type: docType });
    } else {
      const days = daysUntil(line.expires);
      if (days !== null && days <= 0) {
        tasks.push({ task_type: "insurance_expired", title: `${ooName} — ${label} Expired`, description: `${label} expired ${Math.abs(days)} day(s) ago. Carrier is not eligible for dispatch until renewed.`, priority: "critical", due_date: DAYS(0), document_type: docType });
      } else if (days !== null && days <= 30) {
        tasks.push({ task_type: "insurance_expiring", title: `${ooName} — ${label} Expires in ${days} day(s)`, description: `Request renewed ${label} certificate from carrier or agent.`, priority: days <= 7 ? "high" : "medium", due_date: DAYS(days - 7 > 0 ? days - 7 : 0), document_type: docType });
      }
    }
  };

  checkLine(ins.auto_liability,    "Auto Liability",      "coi");
  checkLine(ins.cargo,             "Cargo Insurance",     "coi");
  checkLine(ins.workers_comp,      "Workers Comp",        "workers_comp");
  checkLine(ins.general_liability, "General Liability",   "coi");

  return tasks;
}

// Normalize RMIS-style response into NormalizedCarrierData
// Adjust field paths when real RMIS API docs are available.
export function normalizeRMIS(raw: any, snapshotId?: string): NormalizedCarrierData {
  const carrier = raw?.carrier ?? raw?.CarrierInfo ?? raw ?? {};
  const ins     = carrier.insurance ?? carrier.Insurance ?? {};
  const auth    = carrier.authority ?? carrier.Authority ?? {};
  const safety  = carrier.safety   ?? carrier.Safety    ?? {};

  const authorityStatus = (auth.commonAuthority ?? auth.status ?? "").toLowerCase();
  const safetyRating    = (safety.rating ?? safety.safetyRating ?? "").toLowerCase();
  const oos             = safety.outOfService === true || safety.outOfServiceFlag === "Y";

  const mapLine = (obj: any): InsuranceLine => ({
    verified:      obj?.verified !== false && obj?.onFile !== false && !!obj,
    amount:        obj?.amount ?? obj?.coverageAmount ?? null,
    expires:       obj?.expirationDate ?? obj?.expires ?? null,
    provider:      obj?.provider ?? obj?.insurer ?? null,
    policy_number: obj?.policyNumber ?? obj?.policy ?? null,
  });

  const issues: string[] = [];
  if (authorityStatus === "revoked")                     issues.push("Operating authority revoked");
  if (authorityStatus === "inactive")                    issues.push("Operating authority inactive");
  if (oos)                                               issues.push("Active out-of-service order");
  if (safetyRating === "unsatisfactory")                 issues.push("Unsatisfactory safety rating");
  if (safetyRating === "conditional")                    issues.push("Conditional safety rating");
  if (!ins.autoLiability?.verified && !ins.auto?.verified) issues.push("Auto liability not on file");

  const normalized: NormalizedCarrierData = {
    legal_name: carrier.legalName ?? carrier.name ?? null,
    dba_name:   carrier.dbaName ?? null,
    mc_number:  carrier.mcNumber ?? carrier.mc ?? null,
    dot_number: carrier.dotNumber ?? carrier.dot ?? null,
    address:    carrier.address ?? null,
    phone:      carrier.phone ?? null,
    authority: {
      status:    (["active","inactive","revoked","pending"].includes(authorityStatus) ? authorityStatus : "unknown") as any,
      common:    auth.commonAuthority === "A" || auth.common === true,
      contract:  auth.contractAuthority === "A" || auth.contract === true,
      broker:    auth.brokerAuthority === "A" || auth.broker === true,
      granted_at: auth.grantedDate ?? null,
      revoked_at: auth.revokedDate ?? null,
    },
    safety: {
      rating:            (["satisfactory","conditional","unsatisfactory"].includes(safetyRating) ? safetyRating : "not_rated") as any,
      rating_date:       safety.ratingDate ?? null,
      out_of_service:    oos,
      oos_rate_vehicle:  safety.vehicleOosRate ?? null,
      oos_rate_driver:   safety.driverOosRate  ?? null,
      total_inspections: safety.totalInspections ?? null,
      crashes_fatal:     safety.fatalCrashes ?? null,
      crashes_injury:    safety.injuryCrashes ?? null,
    },
    insurance: {
      auto_liability:    mapLine(ins.autoLiability ?? ins.auto),
      cargo:             mapLine(ins.cargo),
      workers_comp:      mapLine(ins.workersComp ?? ins.workerComp),
      general_liability: mapLine(ins.generalLiability ?? ins.gl),
      bond:              mapLine(ins.bond),
    },
    overall_status: "unknown",
    compliance_issues: issues,
    data_source: "rmis",
    snapshot_id: snapshotId ?? null,
  };

  normalized.overall_status = deriveOverallStatus(normalized);
  return normalized;
}

// Normalize SaferWatch response
export function normalizeSaferWatch(raw: any, snapshotId?: string): NormalizedCarrierData {
  const carrier = raw?.carrier ?? raw?.Carrier ?? raw ?? {};
  const ins     = carrier.insurance ?? {};
  const auth    = carrier.authority ?? {};
  const safety  = carrier.safety ?? {};

  const authorityStatus = (auth.status ?? carrier.authorityStatus ?? "").toLowerCase();
  const safetyRating    = (safety.rating ?? carrier.safetyRating ?? "").toLowerCase();
  const oos             = carrier.outOfService === true || safety.outOfService === true;

  const mapLine = (obj: any): InsuranceLine => ({
    verified:      !!(obj?.verified || obj?.onFile || obj?.active),
    amount:        obj?.amount ?? null,
    expires:       obj?.expirationDate ?? obj?.expDate ?? null,
    provider:      obj?.provider ?? null,
    policy_number: obj?.policyNumber ?? null,
  });

  const issues: string[] = [];
  if (authorityStatus === "revoked")  issues.push("Operating authority revoked");
  if (authorityStatus === "inactive") issues.push("Operating authority inactive");
  if (oos)                            issues.push("Active out-of-service order");
  if (safetyRating === "unsatisfactory") issues.push("Unsatisfactory safety rating");

  const normalized: NormalizedCarrierData = {
    legal_name: carrier.legalName ?? carrier.name ?? null,
    mc_number:  carrier.mcNumber  ?? null,
    dot_number: carrier.dotNumber ?? null,
    authority: {
      status: (["active","inactive","revoked","pending"].includes(authorityStatus) ? authorityStatus : "unknown") as any,
      common:  auth.common === true,
      contract: auth.contract === true,
    },
    safety: {
      rating:            (["satisfactory","conditional","unsatisfactory"].includes(safetyRating) ? safetyRating : "not_rated") as any,
      out_of_service:    oos,
      rating_date:       safety.ratingDate ?? null,
      oos_rate_vehicle:  safety.vehicleOosRate ?? null,
      oos_rate_driver:   safety.driverOosRate  ?? null,
      total_inspections: safety.totalInspections ?? null,
    },
    insurance: {
      auto_liability:    mapLine(ins.auto),
      cargo:             mapLine(ins.cargo),
      workers_comp:      mapLine(ins.workersComp),
      general_liability: mapLine(ins.gl),
    },
    overall_status: "unknown",
    compliance_issues: issues,
    data_source: "saferwatch",
    snapshot_id: snapshotId ?? null,
  };

  normalized.overall_status = deriveOverallStatus(normalized);
  return normalized;
}
