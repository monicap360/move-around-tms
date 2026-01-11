// Example: State and federal compliance rules for DVIR, maintenance, and driver actions
// This can be extended/updated as regulations change

export const COMPLIANCE_RULES = {
  federal: {
    dvir: {
      inspectionIntervalDays: 1, // Daily
      requiredFields: [
        "company",
        "date",
        "truckNumber",
        "odometer",
        "driverName",
        "driverSignature",
      ],
      defectCategories: [
        "brakes",
        "lights",
        "steering",
        "tires",
        "suspension",
        "fuel_system",
        "exhaust_system",
        "frame_body",
      ],
    },
    maintenance: {
      minIntervalMiles: 10000,
      minIntervalDays: 90,
    },
  },
  states: {
    CA: {
      dvir: {
        inspectionIntervalDays: 1,
        requiredFields: [
          "company",
          "date",
          "truckNumber",
          "odometer",
          "driverName",
          "driverSignature",
          "trailerNumber",
        ],
        defectCategories: [
          "brakes",
          "lights",
          "steering",
          "tires",
          "suspension",
          "fuel_system",
          "exhaust_system",
          "frame_body",
          "reflectors",
        ],
      },
      maintenance: {
        minIntervalMiles: 7500,
        minIntervalDays: 60,
      },
    },
    NY: {
      dvir: {
        inspectionIntervalDays: 1,
        requiredFields: [
          "company",
          "date",
          "truckNumber",
          "odometer",
          "driverName",
          "driverSignature",
        ],
        defectCategories: [
          "brakes",
          "lights",
          "steering",
          "tires",
          "suspension",
        ],
      },
      maintenance: {
        minIntervalMiles: 12000,
        minIntervalDays: 120,
      },
    },
    // Add more states as needed
  },
};

export function getComplianceRules(state) {
  return COMPLIANCE_RULES.states[state] || COMPLIANCE_RULES.federal;
}

export function validateDVIR(dvir, state) {
  const rules = getComplianceRules(state).dvir;
  const missingFields = rules.requiredFields.filter((f) => !dvir[f]);
  const invalidDefects = (
    dvir.inspection ? Object.keys(dvir.inspection) : []
  ).filter(
    (k) => rules.defectCategories && !rules.defectCategories.includes(k),
  );
  // Check inspection interval (assume dvir.date is ISO string)
  let intervalOk = true;
  if (dvir.lastInspectionDate) {
    const last = new Date(dvir.lastInspectionDate);
    const curr = new Date(dvir.date);
    const diffDays = Math.floor((curr - last) / (1000 * 60 * 60 * 24));
    intervalOk = diffDays <= rules.inspectionIntervalDays;
  }
  return {
    missingFields,
    invalidDefects,
    intervalOk,
  };
}
