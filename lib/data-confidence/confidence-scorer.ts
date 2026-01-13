// Data Confidence Scorer
// Compares new data against historical averages (driver, site, global)
// Scores confidence (0-1), not correctness

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ConfidenceScore {
  score: number; // 0-1
  reason: string;
  baselineType: 'driver_historical' | 'site_historical' | 'global';
  baselineValue: number;
  actualValue: number;
  deviationPercentage: number;
}

interface HistoricalAverage {
  average: number;
  count: number;
  period: string; // '30d', '90d'
}

/**
 * Calculate confidence score for a field value
 * Compares against historical averages (driver, site, global)
 */
export async function scoreFieldConfidence(
  entityType: 'ticket' | 'load' | 'document',
  entityId: string,
  fieldName: string,
  actualValue: number,
  driverId?: string,
  siteId?: string,
  days: number = 90
): Promise<ConfidenceScore> {
  // Get historical averages
  const driverAvg = driverId 
    ? await getDriverHistoricalAverage(driverId, fieldName, days)
    : null;
  
  const siteAvg = siteId
    ? await getSiteHistoricalAverage(siteId, fieldName, days)
    : null;
  
  // Prefer driver average, fallback to site, then global
  const baseline = driverAvg || siteAvg || await getGlobalHistoricalAverage(fieldName, days);
  
  if (!baseline || baseline.count === 0) {
    return {
      score: 0.5, // Unknown baseline = medium confidence
      reason: 'No historical data available for comparison',
      baselineType: 'global',
      baselineValue: 0,
      actualValue,
      deviationPercentage: 0,
    };
  }
  
  // Calculate deviation percentage
  const deviationPct = baseline.average > 0
    ? Math.abs((actualValue - baseline.average) / baseline.average) * 100
    : 100;
  
  // Convert deviation to confidence score (0-1)
  // Small deviations = high confidence, large deviations = low confidence
  let confidence = 0.5;
  if (deviationPct <= 5) confidence = 0.95;
  else if (deviationPct <= 10) confidence = 0.85;
  else if (deviationPct <= 20) confidence = 0.70;
  else if (deviationPct <= 30) confidence = 0.55;
  else if (deviationPct <= 50) confidence = 0.40;
  else confidence = 0.25;
  
  const baselineType = driverAvg ? 'driver_historical' : siteAvg ? 'site_historical' : 'global';
  
  return {
    score: confidence,
    reason: generateReason(fieldName, deviationPct, baselineType, baseline.period),
    baselineType,
    baselineValue: baseline.average,
    actualValue,
    deviationPercentage: deviationPct,
  };
}

/**
 * Get driver's historical average for a field
 */
async function getDriverHistoricalAverage(
  driverId: string,
  fieldName: string,
  days: number
): Promise<HistoricalAverage | null> {
  const supabase = createSupabaseServerClient();
  
  // Map field names to database columns
  const columnMap: Record<string, string> = {
    'quantity': 'quantity',
    'net_weight': 'quantity', // Fallback if net_weight column doesn't exist
    'pay_rate': 'pay_rate',
    'bill_rate': 'bill_rate',
  };
  
  const column = columnMap[fieldName] || 'quantity';
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  try {
    const { data, error } = await supabase
      .from('aggregate_tickets')
      .select(column)
      .eq('driver_id', driverId)
      .gte('ticket_date', cutoffDate.toISOString().split('T')[0])
      .not(column, 'is', null);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    const values = data.map((row: any) => parseFloat(row[column]) || 0).filter((v: number) => v > 0);
    if (values.length === 0) return null;
    
    const average = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    
    return {
      average,
      count: values.length,
      period: `${days}d`,
    };
  } catch (err) {
    console.error('Error getting driver historical average:', err);
    return null;
  }
}

/**
 * Get site's historical average for a field
 * Note: Sites may not be directly tracked in aggregate_tickets
 * This is a placeholder for when site tracking is available
 */
async function getSiteHistoricalAverage(
  siteId: string,
  fieldName: string,
  days: number
): Promise<HistoricalAverage | null> {
  // TODO: Implement when site_id is available in aggregate_tickets
  // For now, return null to fallback to global average
  return null;
}

/**
 * Get global historical average for a field
 */
async function getGlobalHistoricalAverage(
  fieldName: string,
  days: number
): Promise<HistoricalAverage | null> {
  const supabase = createSupabaseServerClient();
  
  const columnMap: Record<string, string> = {
    'quantity': 'quantity',
    'net_weight': 'quantity',
    'pay_rate': 'pay_rate',
    'bill_rate': 'bill_rate',
  };
  
  const column = columnMap[fieldName] || 'quantity';
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  try {
    const { data, error } = await supabase
      .from('aggregate_tickets')
      .select(column)
      .gte('ticket_date', cutoffDate.toISOString().split('T')[0])
      .not(column, 'is', null);
    
    if (error || !data || data.length === 0) {
      return null;
    }
    
    const values = data.map((row: any) => parseFloat(row[column]) || 0).filter((v: number) => v > 0);
    if (values.length === 0) return null;
    
    const average = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
    
    return {
      average,
      count: values.length,
      period: `${days}d`,
    };
  } catch (err) {
    console.error('Error getting global historical average:', err);
    return null;
  }
}

/**
 * Generate human-readable reason for confidence score
 */
function generateReason(
  fieldName: string,
  deviationPct: number,
  baselineType: string,
  period: string
): string {
  const baselineLabel = baselineType === 'driver_historical' 
    ? "this driver's" 
    : baselineType === 'site_historical'
    ? "this site's"
    : "historical";
  
  return `${fieldName} deviates ${deviationPct.toFixed(1)}% from ${baselineLabel} ${period} baseline`;
}

/**
 * Check for anomalies (low confidence events)
 */
export function isAnomaly(confidenceScore: ConfidenceScore): boolean {
  return confidenceScore.score < 0.5; // Low confidence = potential anomaly
}

/**
 * Determine anomaly severity
 */
export function getAnomalySeverity(confidenceScore: ConfidenceScore): 'low' | 'medium' | 'high' | 'critical' {
  if (confidenceScore.score >= 0.7) return 'low';
  if (confidenceScore.score >= 0.5) return 'medium';
  if (confidenceScore.score >= 0.3) return 'high';
  return 'critical';
}
