/**
 * Compliance rules and validation functions
 */

export interface ComplianceResult {
  compliant: boolean;
  violations: string[];
  warnings: string[];
}

/**
 * Check if driver is compliant
 */
export function checkDriverCompliance(driver: any): ComplianceResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check CDL expiration
  if (driver.cdl_expiration) {
    const expDate = new Date(driver.cdl_expiration);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      violations.push("CDL expired");
    } else if (daysUntilExpiry < 30) {
      warnings.push(`CDL expires in ${daysUntilExpiry} days`);
    }
  }

  // Check medical certificate
  if (driver.medical_expiration) {
    const expDate = new Date(driver.medical_expiration);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      violations.push("Medical certificate expired");
    } else if (daysUntilExpiry < 30) {
      warnings.push(`Medical certificate expires in ${daysUntilExpiry} days`);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Check if truck is compliant
 */
export function checkTruckCompliance(truck: any): ComplianceResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check registration expiration
  if (truck.registration_expiration) {
    const expDate = new Date(truck.registration_expiration);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      violations.push("Registration expired");
    } else if (daysUntilExpiry < 30) {
      warnings.push(`Registration expires in ${daysUntilExpiry} days`);
    }
  }

  // Check inspection expiration
  if (truck.inspection_expiration) {
    const expDate = new Date(truck.inspection_expiration);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      violations.push("Inspection expired");
    } else if (daysUntilExpiry < 30) {
      warnings.push(`Inspection expires in ${daysUntilExpiry} days`);
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
    warnings,
  };
}

/**
 * Validate DVIR (Driver Vehicle Inspection Report)
 */
export function validateDVIR(dvir: any, state: string = "federal"): {
  missingFields: string[];
  invalidDefects: string[];
  intervalOk: boolean;
} {
  const missingFields: string[] = [];
  const invalidDefects: string[] = [];
  let intervalOk = true;

  // Required fields
  if (!dvir.company) missingFields.push("company");
  if (!dvir.date) missingFields.push("date");
  if (!dvir.truckNumber) missingFields.push("truckNumber");
  if (!dvir.driverName) missingFields.push("driverName");
  if (!dvir.driverSignature) missingFields.push("driverSignature");

  // Check inspection items
  if (!dvir.inspection || Object.keys(dvir.inspection).length === 0) {
    missingFields.push("inspection");
  }

  // Validate defects (simplified - in production would check against state/federal rules)
  if (dvir.inspection) {
    const defects = Object.entries(dvir.inspection).filter(([_, status]) => status === "defect");
    if (defects.length > 0 && !dvir.remarks) {
      invalidDefects.push("remarks required for defects");
    }
  }

  // Check inspection interval (simplified - would check against last inspection date)
  // For now, always return true

  return {
    missingFields,
    invalidDefects,
    intervalOk,
  };
}
