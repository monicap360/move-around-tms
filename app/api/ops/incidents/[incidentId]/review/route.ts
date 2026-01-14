import { NextRequest, NextResponse } from "next/server";
import { PostIncidentLearning } from "@/lib/ops/postIncidentLearning";

export const dynamic = 'force-dynamic';

/**
 * POST /api/ops/incidents/[incidentId]/review
 * Review incident and generate learnings
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  try {
    const { incidentId } = params;
    const learning = new PostIncidentLearning();
    const review = await learning.reviewIncident(incidentId);

    return NextResponse.json({ review });
  } catch (error: any) {
    console.error("Review incident error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
