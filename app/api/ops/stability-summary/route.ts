import { NextRequest, NextResponse } from "next/server";
import { PostIncidentLearning } from "@/lib/ops/postIncidentLearning";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/stability-summary
 * Get weekly stability summary
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id') || undefined;

    const learning = new PostIncidentLearning();
    const summary = await learning.getWeeklySummary(organizationId);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("Stability summary error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
