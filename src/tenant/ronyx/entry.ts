import { RonyxTenantConfigLoader } from "./config";
import { RonyxDatabase } from "./database";
import { RonyxFeatureManager } from "./features";
import { RonyxBranding } from "./branding";
import { RonyxCompliance } from "./compliance";
import { RONYX_CONFIG } from "../../../shared/config/ronyx.config";

/**
 * MAIN RONYX ENTRY POINT
 * Initialize everything for ronyx.movearoundtms.com
 */
export class RonyxTenantEntry {
  public static initializeRonyxTenant() {
    console.log("🚀 Initializing Ronyx Tenant Configuration...");

    // 1. Load Ronyx Configuration
    const config = RonyxTenantConfigLoader.load();

    // 2. Initialize Database with Ronyx schema
    const database = RonyxDatabase.initialize(config.database);

    // 3. Setup Ronyx Feature Flags (ALL modules except PIT)
    const features = RonyxFeatureManager.setup({
      enabled: Object.entries(config.modules)
        .filter(([, value]) => value.enabled)
        .map(([key]) => key),
      disabled: Object.entries(config.modules)
        .filter(([, value]) => !value.enabled)
        .map(([key]) => key),
    });

    // 4. Apply Ronyx Branding
    const branding = RonyxBranding.apply({
      logo: RONYX_CONFIG.branding.logo,
      colors: {
        primary: RONYX_CONFIG.branding.primaryColor,
        secondary: RONYX_CONFIG.branding.secondaryColor,
      },
      companyName: RONYX_CONFIG.branding.companyName,
    });

    // 5. Setup Ronyx Compliance (TXDOT/FMCSA)
    const compliance = RonyxCompliance.configure({
      state: config.compliance.states[0] || "TX",
      requirements: [
        ...(config.compliance.requirements.txdot ? ["txdot"] : []),
        ...(config.compliance.requirements.fmcsa ? ["fmcsa"] : []),
        ...(config.compliance.requirements.drugTesting ? ["drug_testing"] : []),
        ...(config.compliance.requirements.clearinghouse ? ["clearinghouse"] : []),
        ...(config.compliance.requirements.medicalCards ? ["medical_cards"] : []),
        ...(config.compliance.requirements.hoursOfService ? ["hours_of_service"] : []),
      ],
    });

    // 6. Register Ronyx-specific routes
    this.registerRonyxRoutes();

    // 7. Initialize Ronyx-specific services
    this.initializeRonyxServices();

    console.log("✅ Ronyx Tenant Initialized for ronyx.movearoundtms.com");

    return {
      config,
      database,
      features,
      branding,
      compliance,
    };
  }

  private static registerRonyxRoutes() {
    void import("./api/ronyx-loads");
    void import("./api/ronyx-finance");
    void import("./api/ronyx-tickets");
    void import("./api/ronyx-materials");
    void import("./api/ronyx-compliance");

    void import("./middleware/ronyx-auth");
    void import("./middleware/ronyx-audit");
  }

  private static initializeRonyxServices() {
    void import("./services/ticket-intelligence");
    void import("./services/payroll-calculator");
    void import("./services/compliance-checker");
    void import("./services/material-rates");
  }
}
