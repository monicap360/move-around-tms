import { NextRequest, NextResponse } from "next/server";
import { CustomerProtection } from "@/lib/ops/customerProtection";

export const dynamic = 'force-dynamic';

/**
 * GET /api/ops/incidents/[incidentId]/customer-impact
 * Get customer impact assessment and draft status message
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  try {
    const { incidentId } = params;
    const protection = new CustomerProtection();

    const impact = await protection.detectImpact(incidentId);
    const statusMessage = await protection.draftStatusMessage(incidentId);

    return NextResponse.json({
      impact,
      statusMessage,
    });
  } catch (error: any) {
    console.error("Customer impact error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ops/incidents/[incidentId]/customer-impact
 * Save draft status message (requires approval before sending)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { incidentId: string } }
) {
  try {
    const { incidentId } = params;
    const body = await req.json();
    const protection = new CustomerProtection();

    await protection.saveDraftMessage(incidentId, body.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Save draft message error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
