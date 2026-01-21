export const RONYX_TENANT_CONFIG = {
  // IDENTIFICATION
  tenantId: "ronyx",
  tenantName: "Ronyx Transportation",
  domain: "ronyx.movearoundtms.com",

  // DATABASE CONFIGURATION
  database: {
    schema: "ronyx_schema",
    connection: process.env.RONYX_DB_URL || "postgresql://localhost:5432/ronyx",
    poolSize: 20,
    ssl: process.env.NODE_ENV === "production",
  },

  // MODULES CONFIGURATION (Entry point for feature control)
  modules: {
    loads: { enabled: true, permissions: ["view", "create", "edit"] },
    finance: { enabled: true, permissions: ["view", "process_payroll"] },
    tracking: { enabled: true, permissions: ["view_live", "view_history"] },
    hr: { enabled: true, permissions: ["view", "edit", "compliance"] },
    materials: { enabled: true, permissions: ["view", "edit_rates", "inventory"] },
    tickets: { enabled: true, permissions: ["upload", "view", "reconcile"] },
    pit: { enabled: false, permissions: [] },
  },

  // BUSINESS RULES ENTRY POINT
  businessRules: {
    rates: {
      defaultTypes: ["per_ton", "per_yard", "per_load"],
      roundTo: 2,
      fuelSurcharge: {
        enabled: true,
        calculation: "percentage_of_base",
        updateFrequency: "weekly",
      },
    },

    materials: {
      supported: [
        { id: "gravel", name: "Gravel", unit: "ton" },
        { id: "sand", name: "Sand", unit: "ton" },
        { id: "limestone", name: "Limestone", unit: "ton" },
        { id: "topsoil", name: "Topsoil", unit: "yard" },
        { id: "fill_dirt", name: "Fill Dirt", unit: "yard" },
        { id: "crushed_concrete", name: "Crushed Concrete", unit: "ton" },
      ],
    },

    payroll: {
      period: "weekly",
      cutoffDay: "Friday",
      paymentMethods: ["direct_deposit", "check"],
      driverTypes: ["company_driver", "owner_operator"],
    },
  },

  // COMPLIANCE ENTRY POINT
  compliance: {
    states: ["TX"],
    agencies: ["TXDOT", "FMCSA"],
    requirements: {
      drugTesting: true,
      clearinghouse: true,
      medicalCards: true,
      hoursOfService: true,
    },
  },
};

export type RonyxTenantConfig = typeof RONYX_TENANT_CONFIG;

export class RonyxTenantConfigLoader {
  static load(): RonyxTenantConfig {
    return RONYX_TENANT_CONFIG;
  }
}
