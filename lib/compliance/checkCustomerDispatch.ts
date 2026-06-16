export type RequirementStatus =
  | "required"
  | "optional"
  | "override_allowed"
  | "not_required"
  | "project_specific";

export type CheckStatus =
  | "passed"
  | "failed"
  | "warning"
  | "overridden"
  | "not_required"
  | "needs_review";

export type CustomerRequirement = {
  id: string;
  applies_to: "driver" | "truck" | "owner_operator" | "company" | "project";
  requirement_key: string;
  requirement_label: string;
  requirement_status: RequirementStatus;
  blocks_dispatch: boolean;
  requires_expiration_check: boolean;
  requires_manager_override: boolean;
};

export type ComplianceDoc = {
  document_type: string;
  status?: string | null;
  expiration_date?: string | null;
};

export type ComplianceOverride = {
  id: string;
  requirement_key: string;
  document_type?: string | null;
  customer_name?: string | null;
  project_name?: string | null;
  status: string;
  expiration_date?: string | null;
  approved_by_name?: string | null;
};

export type RequirementCheck = {
  requirement: CustomerRequirement;
  status: CheckStatus;
  override?: ComplianceOverride;
  blockReason: string | null;
  nextBestAction: string;
  aiGuidance: string;
};

export type DispatchCheckResult = {
  eligible: boolean;
  decision: "Eligible" | "Eligible with Override" | "Blocked" | "Needs Review";
  checks: RequirementCheck[];
  blocks: RequirementCheck[];
  warnings: RequirementCheck[];
  overrides: RequirementCheck[];
  nextBestAction: string;
  aiSummary: string;
};

export function checkCustomerDispatchRequirements({
  customerName,
  projectName,
  requirements,
  documents,
  overrides,
}: {
  customerName: string;
  projectName?: string | null;
  requirements: CustomerRequirement[];
  documents: ComplianceDoc[];
  overrides: ComplianceOverride[];
}): DispatchCheckResult {
  const today = new Date();

  function isExpired(date?: string | null) {
    if (!date) return false;
    return new Date(date) < today;
  }

  function hasValidDoc(key: string) {
    return documents.some((doc) => {
      if (doc.document_type !== key) return false;
      if (doc.status === "rejected") return false;
      if (doc.requires_expiration_check && isExpired(doc.expiration_date)) return false;
      return true;
    });
  }

  function getActiveOverride(key: string): ComplianceOverride | undefined {
    return overrides.find((o) => {
      if (o.requirement_key !== key && o.document_type !== key) return false;
      if (o.status !== "active") return false;
      if (o.customer_name && o.customer_name !== customerName) return false;
      if (o.project_name && projectName && o.project_name !== projectName) return false;
      if (isExpired(o.expiration_date)) return false;
      return true;
    });
  }

  const checks: RequirementCheck[] = requirements.map((req) => {
    if (req.requirement_status === "not_required") {
      return {
        requirement: req,
        status: "not_required",
        blockReason: null,
        nextBestAction: "No action needed.",
        aiGuidance: `${req.requirement_label} is not required for ${customerName}. No action needed.`,
      };
    }

    if (req.requirement_status === "project_specific") {
      return {
        requirement: req,
        status: "warning",
        blockReason: null,
        nextBestAction: "Verify if this project requires it.",
        aiGuidance: `${req.requirement_label} is only required for specific projects. Confirm with your project manager.`,
      };
    }

    if (req.requirement_status === "optional") {
      return {
        requirement: req,
        status: hasValidDoc(req.requirement_key) ? "passed" : "warning",
        blockReason: null,
        nextBestAction: "Optional — upload if available.",
        aiGuidance: `${req.requirement_label} is optional for ${customerName}. Upload if available but it will not block dispatch.`,
      };
    }

    if (hasValidDoc(req.requirement_key)) {
      return {
        requirement: req,
        status: "passed",
        blockReason: null,
        nextBestAction: "Requirement satisfied.",
        aiGuidance: `${req.requirement_label} is on file and valid.`,
      };
    }

    const activeOverride = getActiveOverride(req.requirement_key);

    if (req.requirement_status === "override_allowed" && activeOverride) {
      return {
        requirement: req,
        status: "overridden",
        override: activeOverride,
        blockReason: null,
        nextBestAction: "Dispatch allowed with override. Request updated document.",
        aiGuidance: `${req.requirement_label} is missing, but an active override approved by ${activeOverride.approved_by_name || "a manager"} allows dispatch. Still request the updated document.`,
      };
    }

    const failed = req.blocks_dispatch;
    return {
      requirement: req,
      status: failed ? "failed" : "warning",
      blockReason: failed ? `${req.requirement_label} is missing or expired.` : null,
      nextBestAction:
        req.requirement_status === "override_allowed"
          ? `Upload ${req.requirement_label} or request manager override.`
          : `Upload ${req.requirement_label}.`,
      aiGuidance:
        req.requirement_status === "override_allowed"
          ? `${req.requirement_label} is missing. ${customerName} allows a manager-approved override. Request the document or get override approval before dispatch.`
          : `${req.requirement_label} is required for ${customerName} before dispatch. Upload or collect this document.`,
    };
  });

  const blocks    = checks.filter((c) => c.status === "failed");
  const warnings  = checks.filter((c) => c.status === "warning");
  const overridden = checks.filter((c) => c.status === "overridden");

  const eligible = blocks.length === 0;
  const hasOverride = overridden.length > 0;

  const decision: DispatchCheckResult["decision"] = !eligible
    ? "Blocked"
    : hasOverride
    ? "Eligible with Override"
    : warnings.length > 0
    ? "Needs Review"
    : "Eligible";

  const nextBestAction = !eligible
    ? blocks[0].nextBestAction
    : hasOverride
    ? "Dispatch allowed with override. Request all outstanding documents."
    : "Driver, truck, and company meet all requirements for this customer.";

  const aiSummary = !eligible
    ? `Blocked: ${blocks.length} requirement${blocks.length > 1 ? "s" : ""} missing. ${blocks.map((b) => b.requirement.requirement_label).join(", ")}.`
    : hasOverride
    ? `Eligible with override. ${overridden.length} requirement${overridden.length > 1 ? "s" : ""} covered by manager approval.`
    : "All requirements satisfied. Ready for dispatch.";

  return { eligible, decision, checks, blocks, warnings, overrides: overridden, nextBestAction, aiSummary };
}
