// Automation Assistant Types
// Provides routine automation support - human dispatch/staff maintain oversight
// This is an ASSISTANT TOOL, not a replacement for human staff

export interface AutomationSuggestion {
  loadId: string;
  suggestedDriverId: string;
  reason: string;
  confidence: number;
  factors: string[];
  requiresReview: boolean;
  estimatedCost: number;
  estimatedTime: number;
}

export interface AutomationResult {
  suggestions: AutomationSuggestion[];
  requiresHumanReview: boolean;
  unprocessedLoads: string[];
  metadata: {
    totalLoads: number;
    suggestionsGenerated: number;
    executionTime: number;
    rulesApplied: string[];
  };
}

// Audit log for all automation actions
export interface AutomationAuditLog {
  id: string;
  timestamp: Date;
  action: 'suggestion_generated' | 'suggestion_accepted' | 'suggestion_rejected' | 'manual_override';
  loadId: string;
  driverId?: string;
  userId: string; // Human who approved/rejected
  reason?: string;
  metadata?: Record<string, any>;
}
