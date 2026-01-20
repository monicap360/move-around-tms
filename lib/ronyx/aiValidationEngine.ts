import supabaseAdmin from "@/lib/supabaseAdmin";

type ValidationRule = {
  rule_id: number;
  rule_type: "distance" | "weight" | "time" | "location" | "photo" | "signature";
  rule_name: string;
  rule_logic: Record<string, any>;
  threshold: number | null;
  severity: "warning" | "error" | "block";
  auto_correct: boolean;
  project_specific: boolean;
  active: boolean;
};

export type TicketValidationInput = {
  ticket_id?: string | null;
  project_id?: string | null;
  customer_id?: string | null;
  truck_id?: string | null;
  driver_id?: string | null;
  material_type?: string | null;
  load_weight?: number | null;
  cubic_yards?: number | null;
  calculated_distance?: number | null;
  pickup_gps_lat?: number | null;
  pickup_gps_lon?: number | null;
  dump_gps_lat?: number | null;
  dump_gps_lon?: number | null;
  load_time?: string | null;
  dump_time?: string | null;
  waiting_minutes?: number | null;
  has_photo?: boolean | null;
  has_signature?: boolean | null;
  weight_ticket_verified?: boolean | null;
};

type ValidationResult = {
  type: ValidationRule["rule_type"];
  status: "passed" | "warning" | "error" | "corrected";
  rule_id?: number | null;
  actual_value?: number | null;
  expected_value?: number | null;
  variance_percent?: number | null;
  confidence_score?: number | null;
  correction?: {
    field: string;
    original: number | null;
    corrected: number | null;
    reason: string;
  } | null;
  notes?: string[];
};

type ValidationSummary = {
  passed: ValidationResult[];
  warnings: ValidationResult[];
  errors: ValidationResult[];
  corrections: ValidationResult[];
  confidenceScore: number;
};

const MATERIAL_DENSITY_TONS_PER_CY: Record<string, number> = {
  dirt: 1.35,
  gravel: 1.4,
  asphalt: 1.2,
  demolition: 1.0,
  concrete: 1.5,
  other: 1.2,
};

function haversineMiles(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
) {
  const R = 3958.8;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLon = ((to.lon - from.lon) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

function normalizeRuleLogic(rule: ValidationRule) {
  if (typeof rule.rule_logic === "string") {
    try {
      return JSON.parse(rule.rule_logic);
    } catch {
      return {};
    }
  }
  return rule.rule_logic || {};
}

async function loadValidationRules() {
  const { data, error } = await supabaseAdmin
    .from("ai_validation_rules")
    .select("*")
    .eq("active", true);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as ValidationRule[];
}

async function getTruckCapacity(truckId?: string | null) {
  if (!truckId) return null;
  const { data } = await supabaseAdmin
    .from("trucks")
    .select("capacity_tons")
    .eq("id", truckId)
    .maybeSingle();
  return data?.capacity_tons ? Number(data.capacity_tons) : null;
}

async function getProjectGeofences(projectId?: string | null) {
  let query = supabaseAdmin
    .from("location_geofences")
    .select("*")
    .eq("active", true);

  if (projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`);
  } else {
    query = query.is("project_id", null);
  }

  const { data } = await query;
  return data || [];
}

function calculateConfidenceScore(results: ValidationSummary) {
  const weights: Record<string, number> = {
    distance: 0.25,
    weight: 0.3,
    photo: 0.15,
    location: 0.2,
    time: 0.1,
    signature: 0.1,
  };

  const all = [
    ...results.passed,
    ...results.warnings,
    ...results.errors,
    ...results.corrections,
  ];

  let totalScore = 0;
  let totalWeight = 0;
  Object.entries(weights).forEach(([type, weight]) => {
    const match = all.find((item) => item.type === type);
    const confidence = match?.confidence_score ?? 0.7;
    totalScore += confidence * weight;
    totalWeight += weight;
  });

  if (!totalWeight) return 0.7;
  return Number((totalScore / totalWeight).toFixed(2));
}

function pushResult(summary: ValidationSummary, result: ValidationResult) {
  if (result.status === "passed") summary.passed.push(result);
  if (result.status === "warning") summary.warnings.push(result);
  if (result.status === "error") summary.errors.push(result);
  if (result.status === "corrected") summary.corrections.push(result);
}

export async function validateTicket(ticket: TicketValidationInput) {
  const rules = await loadValidationRules();
  const summary: ValidationSummary = {
    passed: [],
    warnings: [],
    errors: [],
    corrections: [],
    confidenceScore: 0.7,
  };

  const rulesByType = rules.reduce<Record<string, ValidationRule[]>>(
    (acc, rule) => {
      acc[rule.rule_type] = acc[rule.rule_type] || [];
      acc[rule.rule_type].push(rule);
      return acc;
    },
    {},
  );

  const distanceRule = rulesByType.distance?.[0];
  if (distanceRule) {
    const logic = normalizeRuleLogic(distanceRule);
    const hasCoords =
      ticket.pickup_gps_lat &&
      ticket.pickup_gps_lon &&
      ticket.dump_gps_lat &&
      ticket.dump_gps_lon;
    if (!hasCoords || ticket.calculated_distance == null) {
      pushResult(summary, {
        type: "distance",
        status: "warning",
        rule_id: distanceRule.rule_id,
        confidence_score: 0.6,
        notes: ["Missing GPS coordinates or claimed distance."],
      });
    } else {
      const actualDistance = haversineMiles(
        { lat: ticket.pickup_gps_lat!, lon: ticket.pickup_gps_lon! },
        { lat: ticket.dump_gps_lat!, lon: ticket.dump_gps_lon! },
      );
      const variance =
        Math.abs(ticket.calculated_distance - actualDistance) /
        Math.max(actualDistance, 1);
      const variancePercent = Number((variance * 100).toFixed(2));
      let status: ValidationResult["status"] = "passed";
      let correction: ValidationResult["correction"] = null;

      if (variancePercent > 10) {
        if (distanceRule.auto_correct) {
          status = "corrected";
          correction = {
            field: "calculated_distance",
            original: ticket.calculated_distance,
            corrected: actualDistance,
            reason: `GPS distance differs by ${variancePercent}%`,
          };
        } else {
          status = distanceRule.severity === "warning" ? "warning" : "error";
        }
      } else if (variancePercent > 5) {
        status = "warning";
      }

      pushResult(summary, {
        type: "distance",
        status,
        rule_id: distanceRule.rule_id,
        actual_value: actualDistance,
        expected_value: ticket.calculated_distance ?? null,
        variance_percent: variancePercent,
        confidence_score: 0.95,
        correction,
      });
    }
  }

  const weightRule = rulesByType.weight?.[0];
  if (weightRule) {
    const logic = normalizeRuleLogic(weightRule);
    const maxCapacity =
      (await getTruckCapacity(ticket.truck_id)) ??
      (logic.truck_capacity_tons ? Number(logic.truck_capacity_tons) : null);
    let status: ValidationResult["status"] = "passed";
    const notes: string[] = [];

    if (ticket.load_weight != null && maxCapacity != null) {
      if (ticket.load_weight > maxCapacity * 1.05) {
        status = weightRule.severity === "warning" ? "warning" : "error";
        notes.push(
          `Overload: ${ticket.load_weight.toFixed(1)}T > ${maxCapacity}T capacity.`,
        );
      }
    }

    const density = ticket.material_type
      ? MATERIAL_DENSITY_TONS_PER_CY[ticket.material_type]
      : null;
    if (density && ticket.cubic_yards && ticket.load_weight) {
      const expected = ticket.cubic_yards * density;
      const variance = Math.abs(ticket.load_weight - expected) / expected;
      if (variance > 0.15) {
        notes.push(
          `Weight inconsistent with material density. Expected ~${expected.toFixed(
            1,
          )}T.`,
        );
        if (status === "passed") status = "warning";
      }
    }

    pushResult(summary, {
      type: "weight",
      status,
      rule_id: weightRule.rule_id,
      actual_value: ticket.load_weight ?? null,
      expected_value: maxCapacity ?? null,
      confidence_score: 0.85,
      notes,
    });
  }

  const timeRule = rulesByType.time?.[0];
  if (timeRule) {
    const logic = normalizeRuleLogic(timeRule);
    if (!ticket.load_time || !ticket.dump_time) {
      pushResult(summary, {
        type: "time",
        status: "warning",
        rule_id: timeRule.rule_id,
        confidence_score: 0.6,
        notes: ["Missing load or dump timestamps."],
      });
    } else {
      const loadAt = new Date(ticket.load_time).getTime();
      const dumpAt = new Date(ticket.dump_time).getTime();
      const hours = Math.max(0, (dumpAt - loadAt) / (1000 * 60 * 60));
      const maxHours = logic.max_hours_per_trip
        ? Number(logic.max_hours_per_trip)
        : timeRule.threshold ?? null;
      let status: ValidationResult["status"] = "passed";
      if (maxHours && hours > maxHours) {
        status = timeRule.severity === "warning" ? "warning" : "error";
      }
      pushResult(summary, {
        type: "time",
        status,
        rule_id: timeRule.rule_id,
        actual_value: Number(hours.toFixed(2)),
        expected_value: maxHours ?? null,
        confidence_score: 0.75,
      });
    }
  }

  const photoRule = rulesByType.photo?.[0];
  if (photoRule) {
    const requiresPhoto = normalizeRuleLogic(photoRule).requires_photo ?? true;
    const hasPhoto = Boolean(ticket.has_photo);
    let status: ValidationResult["status"] = "passed";
    if (requiresPhoto && !hasPhoto) {
      status = photoRule.severity === "warning" ? "warning" : "error";
    }
    pushResult(summary, {
      type: "photo",
      status,
      rule_id: photoRule.rule_id,
      confidence_score: 0.8,
      notes: hasPhoto ? [] : ["Missing required photo."],
    });
  }

  const signatureRule = rulesByType.signature?.[0];
  if (signatureRule) {
    const requiresSignature =
      normalizeRuleLogic(signatureRule).requires_signature ?? true;
    const hasSignature = Boolean(ticket.has_signature);
    let status: ValidationResult["status"] = "passed";
    if (requiresSignature && !hasSignature) {
      status = signatureRule.severity === "warning" ? "warning" : "error";
    }
    pushResult(summary, {
      type: "signature",
      status,
      rule_id: signatureRule.rule_id,
      confidence_score: 0.8,
      notes: hasSignature ? [] : ["Missing required signature."],
    });
  }

  const locationRule = rulesByType.location?.[0];
  if (locationRule) {
    const logic = normalizeRuleLogic(locationRule);
    const geofences = await getProjectGeofences(ticket.project_id);
    if (!geofences.length) {
      pushResult(summary, {
        type: "location",
        status: "warning",
        rule_id: locationRule.rule_id,
        confidence_score: 0.5,
        notes: ["No geofences configured for project."],
      });
    } else {
      const pickupFence = geofences.find((f: any) => f.location_type === "pickup");
      const dumpFence = geofences.find((f: any) => f.location_type === "dump");
      const pickupValid =
        pickupFence &&
        ticket.pickup_gps_lat != null &&
        ticket.pickup_gps_lon != null &&
        haversineMiles(
          { lat: ticket.pickup_gps_lat, lon: ticket.pickup_gps_lon },
          { lat: pickupFence.center_lat, lon: pickupFence.center_lon },
        ) <= Number(pickupFence.radius_miles || 0.25);
      const dumpValid =
        dumpFence &&
        ticket.dump_gps_lat != null &&
        ticket.dump_gps_lon != null &&
        haversineMiles(
          { lat: ticket.dump_gps_lat, lon: ticket.dump_gps_lon },
          { lat: dumpFence.center_lat, lon: dumpFence.center_lon },
        ) <= Number(dumpFence.radius_miles || 0.25);

      let status: ValidationResult["status"] = "passed";
      const notes: string[] = [];
      if (!pickupValid) {
        status = locationRule.severity === "warning" ? "warning" : "error";
        notes.push("Pickup outside approved geofence.");
      }
      if (!dumpValid) {
        status = locationRule.severity === "warning" ? "warning" : "error";
        notes.push("Dump outside approved geofence.");
      }

      pushResult(summary, {
        type: "location",
        status,
        rule_id: locationRule.rule_id,
        confidence_score: 0.9,
        notes,
      });
    }
  }

  summary.confidenceScore = calculateConfidenceScore(summary);
  return summary;
}

export async function logValidations(
  ticketId: string | null | undefined,
  results: ValidationSummary,
) {
  if (!ticketId) return;
  const all = [
    ...results.passed,
    ...results.warnings,
    ...results.errors,
    ...results.corrections,
  ];
  if (!all.length) return;

  const rows = all.map((result) => ({
    ticket_id: ticketId,
    validation_type: result.type,
    validation_status:
      result.status === "warning" || result.status === "error"
        ? "failed"
        : result.status,
    rule_id: result.rule_id || null,
    actual_value: result.actual_value ?? null,
    expected_value: result.expected_value ?? null,
    variance_percent: result.variance_percent ?? null,
    confidence_score: result.confidence_score ?? null,
    auto_corrected_value: result.correction?.corrected ?? null,
    correction_note: result.correction?.reason ?? null,
  }));

  await supabaseAdmin.from("ticket_validation_log").insert(rows);
}
