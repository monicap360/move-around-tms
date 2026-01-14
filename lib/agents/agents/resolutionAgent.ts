/**
 * Resolution Agent - Support Killer
 * Diagnoses ticket failures, explains violations, walks onboarding
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ToolRegistry } from "../toolRegistry";
import { AuditLogger } from "../auditLogger";
import { PermissionGate } from "../permissionGate";

export interface ResolutionContext {
  organizationId: string;
  userId: string;
  ticketId?: string;
  violationId?: string;
  userMessage: string;
  currentPage?: string;
}

export interface ResolutionResponse {
  message: string;
  actions: Array<{
    type: string;
    payload: Record<string, any>;
    description: string;
    requiresApproval: boolean;
  }>;
  confidence: number;
  diagnostics?: Record<string, any>;
}

export class ResolutionAgent {
  private supabase = createSupabaseServerClient();
  private toolRegistry = new ToolRegistry();
  private auditLogger = new AuditLogger();
  private permissionGate = new PermissionGate();
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  /**
   * Process user request and provide resolution
   */
  async resolve(context: ResolutionContext): Promise<ResolutionResponse> {
    const { organizationId, userId, userMessage, ticketId, violationId } = context;

    // Enforce organization isolation
    await this.permissionGate.enforceOrgIsolation(this.agentId, organizationId);

    // Log user message
    await this.auditLogger.logConversation({
      agentId: this.agentId,
      organizationId,
      userId,
      message: userMessage,
      role: 'user',
      context: {
        ticket_id: ticketId,
        violation_id: violationId,
        page: context.currentPage,
      },
    });

    // Route to appropriate handler
    if (ticketId || userMessage.toLowerCase().includes('ticket')) {
      return await this.handleTicketIssue(context);
    }

    if (violationId || userMessage.toLowerCase().includes('violation')) {
      return await this.handleViolation(context);
    }

    if (userMessage.toLowerCase().includes('onboard') || userMessage.toLowerCase().includes('how to')) {
      return await this.handleOnboarding(context);
    }

    // Generic help
    return await this.handleGenericHelp(context);
  }

  /**
   * Diagnose ticket upload failures
   */
  private async handleTicketIssue(context: ResolutionContext): Promise<ResolutionResponse> {
    const { ticketId, organizationId } = context;

    // Read ticket data
    const canRead = await this.permissionGate.canRead(this.agentId, 'tickets');
    if (!canRead) {
      return {
        message: "I don't have permission to read tickets. Please contact your administrator.",
        actions: [],
        confidence: 0,
      };
    }

    let diagnostics: Record<string, any> = {};

    if (ticketId) {
      // Get ticket details
      const { data: ticket } = await this.supabase
        .from('aggregate_tickets')
        .select('*')
        .eq('id', ticketId)
        .eq('organization_id', organizationId)
        .single();

      if (ticket) {
        diagnostics.ticket = {
          id: ticket.id,
          status: ticket.status,
          error: ticket.ocr_error || ticket.processing_error,
          upload_status: ticket.upload_status,
        };
      }
    }

    // Read upload logs
    const canReadLogs = await this.permissionGate.canRead(this.agentId, 'upload_logs');
    if (canReadLogs && ticketId) {
      // Get upload logs for this ticket
      diagnostics.uploadLogs = [];
    }

    // Generate diagnosis
    const message = this.generateDiagnosis(diagnostics);
    const actions = await this.generateActions(diagnostics, context);

    // Log agent response
    await this.auditLogger.logConversation({
      agentId: this.agentId,
      organizationId: context.organizationId,
      userId: context.userId,
      message,
      role: 'agent',
      context: { diagnostics },
    });

    return {
      message,
      actions,
      confidence: 0.8,
      diagnostics,
    };
  }

  /**
   * Explain violations in plain English
   */
  private async handleViolation(context: ResolutionContext): Promise<ResolutionResponse> {
    const { violationId, organizationId } = context;

    const canRead = await this.permissionGate.canRead(this.agentId, 'violations');
    if (!canRead) {
      return {
        message: "I don't have permission to read violations.",
        actions: [],
        confidence: 0,
      };
    }

    let violation: any = null;
    if (violationId) {
      const { data } = await this.supabase
        .from('violations')
        .select('*')
        .eq('id', violationId)
        .eq('organization_id', organizationId)
        .single();

      violation = data;
    }

    const message = violation
      ? this.explainViolation(violation)
      : "I can help explain violations. Please provide a violation ID or describe the issue.";

    await this.auditLogger.logConversation({
      agentId: this.agentId,
      organizationId: context.organizationId,
      userId: context.userId,
      message,
      role: 'agent',
    });

    return {
      message,
      actions: [],
      confidence: 0.9,
    };
  }

  /**
   * Walk through onboarding step-by-step
   */
  private async handleOnboarding(context: ResolutionContext): Promise<ResolutionResponse> {
    const message = `I'll help you get started! Here's a step-by-step guide:

1. **Upload Your First Ticket**: Go to Upload Ticket and take a photo or upload a PDF
2. **Review Extracted Data**: The system will automatically extract partner, material, and quantity
3. **Approve Tickets**: Review and approve tickets in the Review Tickets section
4. **Set Up Rates**: Configure material rates in Material & Rate Management
5. **Generate Payroll**: Once tickets are approved, generate payroll reports

Would you like me to guide you through any specific step?`;

    await this.auditLogger.logConversation({
      agentId: this.agentId,
      organizationId: context.organizationId,
      userId: context.userId,
      message,
      role: 'agent',
    });

    return {
      message,
      actions: [],
      confidence: 1.0,
    };
  }

  /**
   * Handle generic help requests
   */
  private async handleGenericHelp(context: ResolutionContext): Promise<ResolutionResponse> {
    const message = `I'm the Resolution Agent. I can help you with:

• **Ticket Issues**: Diagnose upload failures and processing errors
• **Violations**: Explain violations in plain English
• **Onboarding**: Walk you through setup step-by-step
• **Support**: Draft support tickets with diagnostics

What would you like help with?`;

    await this.auditLogger.logConversation({
      agentId: this.agentId,
      organizationId: context.organizationId,
      userId: context.userId,
      message,
      role: 'agent',
    });

    return {
      message,
      actions: [],
      confidence: 1.0,
    };
  }

  /**
   * Generate diagnosis message
   */
  private generateDiagnosis(diagnostics: Record<string, any>): string {
    if (diagnostics.ticket?.error) {
      return `I found an issue with your ticket upload:

**Error**: ${diagnostics.ticket.error}

**Status**: ${diagnostics.ticket.status}

**Recommendation**: ${this.getRecommendation(diagnostics.ticket.error)}`;
    }

    return "I've analyzed your ticket. Everything looks good! If you're experiencing issues, please provide more details.";
  }

  /**
   * Get recommendation based on error
   */
  private getRecommendation(error: string): string {
    if (error.includes('OCR') || error.includes('extract')) {
      return "The image quality may be too low. Try taking a clearer photo with better lighting.";
    }
    if (error.includes('partner') || error.includes('match')) {
      return "The partner name wasn't recognized. Check that the partner is set up in Material & Rate Management.";
    }
    return "Please review the ticket details and try uploading again. If the issue persists, I can draft a support ticket.";
  }

  /**
   * Generate actions based on diagnostics
   */
  private async generateActions(
    diagnostics: Record<string, any>,
    context: ResolutionContext
  ): Promise<Array<{ type: string; payload: Record<string, any>; description: string; requiresApproval: boolean }>> {
    const actions = [];

    // If there's an error, offer to create support ticket
    if (diagnostics.ticket?.error) {
      const canWrite = await this.permissionGate.canWrite(this.agentId, 'support_tickets');
      if (canWrite) {
        actions.push({
          type: 'create_support_ticket',
          payload: {
            title: `Ticket Upload Issue: ${diagnostics.ticket.id}`,
            description: `Error: ${diagnostics.ticket.error}\nTicket ID: ${diagnostics.ticket.id}`,
            diagnostics: diagnostics,
          },
          description: 'Draft a support ticket with diagnostics',
          requiresApproval: true,
        });
      }
    }

    return actions;
  }

  /**
   * Explain violation in plain English
   */
  private explainViolation(violation: any): string {
    return `Here's what this violation means:

**Type**: ${violation.type || 'Unknown'}
**Severity**: ${violation.severity || 'Medium'}
**Description**: ${violation.description || 'No description available'}

**What to do**: ${violation.remediation || 'Review the violation details and take appropriate action.'}`;
  }
}
