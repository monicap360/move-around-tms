import { NextRequest, NextResponse } from "next/server";
import { resolveWindow } from "@/src/dashboard/window";
import { buildDashboardOverview } from "@/src/dashboard/metrics.aggregate";
import {
  fetchComplianceResults,
  fetchScans,
  fetchDocuments,
} from "@/src/dashboard/data.adapters";

// Example: resolve company from auth/session.
// Replace with your real auth integration.
function getOrganizationId(req: NextRequest): string {
  const company = req.headers.get("x-organization-id");
  if (!company) throw new Error("Missing organization context");
  return company;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const window = resolveWindow({
      window: searchParams.get("window") as any,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    const organizationId = getOrganizationId(req);

    const [complianceResults, scans, documents] = await Promise.all([
      fetchComplianceResults(organizationId),
      fetchScans(organizationId),
      fetchDocuments(organizationId),
    ]);

    const metrics = buildDashboardOverview(organizationId, window, {
      complianceResults,
      scans,
      documents,
    });

    return NextResponse.json(metrics, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to load dashboard metrics" },
      { status: 400 },
    );
  }
}

