export const RONYX_CONFIG = {
  // Tenant Identification
  tenantId: "ronyx",
  tenantName: "Ronyx Transportation",
  domain: "ronyx.movearoundtms.com",

  // Enabled Modules for Ronyx
  enabledModules: {
    loads: true,
    finance: true,
    tracking: true,
    hrCompliance: true,
    materials: true,
    tickets: true,
    dispatch: true,
    fleet: true,
    // PIT module explicitly disabled
    pit: false,
  },

  // Ronyx Business Rules
  businessRules: {
    // Aggregates-specific rates
    defaultRateTypes: ["per_ton", "per_yard", "per_load"],

    // Materials specific to Ronyx
    supportedMaterials: [
      "gravel",
      "sand",
      "limestone",
      "topsoil",
      "fill_dirt",
      "crushed_concrete",
    ],

    // TXDOT compliance requirements
    complianceRequirements: {
      txdot: true,
      fmcsa: true,
      drugTesting: true,
      clearinghouse: true,
    },

    // Payroll rules for Ronyx
    payroll: {
      settlementPeriod: "weekly",
      paymentMethods: ["direct_deposit", "check"],
      driverTypes: ["company_driver", "owner_operator"],
    },
  },

  // Ronyx Branding
  branding: {
    logo: "/branding/ronyx-logo.png",
    primaryColor: "#1E40AF",
    secondaryColor: "#F59E0B",
    companyName: "Ronyx Transportation",
  },
};
