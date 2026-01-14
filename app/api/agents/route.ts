import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentRouter } from "@/lib/agents/agentRouter";
import { ResolutionAgent } from "@/lib/agents/agents/resolutionAgent";

export const dynamic = 'force-dynamic';

/**
 * POST /api/agents
 * Route user message to appropriate agent
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const body = await req.json();
    const { message, ticketId, violationId, currentPage } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get current user and organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 400 }
      );
    }

    // Route to agent
    const router = new AgentRouter();
    const agentResponse = await router.route({
      organizationId: profile.organization_id,
      userId: user.id,
      userMessage: message,
      ticketId,
      violationId,
      currentPage,
    });

    // Execute agent based on type
    let response;
    if (agentResponse.agentType === 'resolution') {
      const agent = new ResolutionAgent(agentResponse.agentId);
      response = await agent.resolve({
        organizationId: profile.organization_id,
        userId: user.id,
        ticketId,
        violationId,
        userMessage: message,
        currentPage,
      });
    } else {
      // Other agents will be implemented
      response = {
        message: "This agent type is not yet implemented.",
        actions: [],
        confidence: 0,
      };
    }

    return NextResponse.json({
      agentId: agentResponse.agentId,
      agentName: agentResponse.agentName,
      agentType: agentResponse.agentType,
      ...response,
    });
  } catch (error: any) {
    console.error("Agent route error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agents
 * Get available agents for organization
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: "User organization not found" },
        { status: 400 }
      );
    }

    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('name');

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    return NextResponse.json({ agents: agents || [] });
  } catch (error: any) {
    console.error("Get agents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
