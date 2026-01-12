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
