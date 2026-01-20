/**
 * Generic Agent - Handles ops/sales/growth/health/learning with data summaries.
 */
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface GenericAgentContext {
  organizationId: string;
  userId: string;
  agentType: "ops" | "sales" | "growth" | "health" | "learning";
  userMessage: string;
}

export interface GenericAgentResponse {
  message: string;
  actions: Array<{
    type: string;
    payload: Record<string, any>;
    description: string;
    requiresApproval: boolean;
  }>;
  confidence: number;
  data?: Record<string, any>;
}

export class GenericAgent {
  private supabase = createSupabaseServerClient();

  async respond(context: GenericAgentContext): Promise<GenericAgentResponse> {
    switch (context.agentType) {
      case "ops":
        return this.handleOps(context.organizationId);
      case "sales":
        return this.handleSales(context.organizationId);
      case "growth":
        return this.handleGrowth(context.organizationId);
      case "health":
        return this.handleHealth(context.organizationId);
      case "learning":
        return this.handleLearning();
      default:
        return this.handleLearning();
    }
  }

  private async handleOps(organizationId: string): Promise<GenericAgentResponse> {
    const [ticketsRes, loadsRes, incidentsRes, payrollRes] = await Promise.all([
      this.supabase
        .from("aggregate_tickets")
        .select("id, status", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      this.supabase
        .from("loads")
        .select("id, status", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      this.supabase
        .from("tms_incidents")
        .select("id, severity", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "open"),
      this.supabase
        .from("payroll_jobs")
        .select("id, status", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["queued", "running"]),
    ]);

    const summary = {
      openTickets: ticketsRes.count || 0,
      activeLoads: loadsRes.count || 0,
      openIncidents: incidentsRes.count || 0,
      payrollJobs: payrollRes.count || 0,
    };

    return {
      message: `Ops snapshot: ${summary.openTickets} tickets, ${summary.activeLoads} loads, ${summary.openIncidents} open incidents, ${summary.payrollJobs} payroll jobs in queue.`,
      actions: [],
      confidence: 0.7,
      data: summary,
    };
  }

  private async handleSales(organizationId: string): Promise<GenericAgentResponse> {
    const { data: quotes } = await this.supabase
      .from("aggregate_quotes")
      .select("id, status")
      .eq("status", "Draft")
      .limit(50);

    const { data: signed } = await this.supabase
      .from("aggregate_quotes")
      .select("id, status")
      .eq("status", "Signed")
      .limit(50);

    const summary = {
      draftQuotes: quotes?.length || 0,
      signedQuotes: signed?.length || 0,
    };

    return {
      message: `Sales snapshot: ${summary.draftQuotes} draft quotes and ${summary.signedQuotes} signed quotes.`,
      actions: [],
      confidence: 0.65,
      data: summary,
    };
  }

  private async handleGrowth(organizationId: string): Promise<GenericAgentResponse> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count } = await this.supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    const summary = { newUsers30d: count || 0 };

    return {
      message: `Growth snapshot: ${summary.newUsers30d} new users in the last 30 days.`,
      actions: [],
      confidence: 0.6,
      data: summary,
    };
  }

  private async handleHealth(organizationId: string): Promise<GenericAgentResponse> {
    const { data: latest } = await this.supabase
      .from("tms_health_snapshots")
      .select("metrics, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return {
        message: "Health snapshot unavailable. No recent telemetry found.",
        actions: [],
        confidence: 0.4,
      };
    }

    return {
      message: "Health snapshot available. Memory, disk, and uptime metrics collected.",
      actions: [],
      confidence: 0.6,
      data: latest,
    };
  }

  private async handleLearning(): Promise<GenericAgentResponse> {
    return {
      message: "Learning module is ready to index SOPs, manuals, and FAQs. Share documents to begin.",
      actions: [],
      confidence: 0.5,
    };
  }
}
