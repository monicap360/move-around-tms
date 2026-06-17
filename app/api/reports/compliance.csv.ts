// app/api/reports/compliance.csv.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveWindow } from "@/src/dashboard/window";
import { buildDashboardOverview } from "@/src/dashboard/metrics.aggregate";
import {
  fetchComplianceResults,
  fetchScans,
  fetchDocuments,
} from "@/src/dashboard/data.adapters";
import { toCSV } from "@/src/reports/csv.util";

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
    const rows = [
      [
        "Window",
        "Pass",
        "Warn",
        "Fail",
        "Top Violations",
        "Expiring Docs",
        "Total Scans",
        "Avg OCR Confidence",
      ],
      [
        metrics.window.label,
        String(metrics.compliance.statusCounts.pass),
        String(metrics.compliance.statusCounts.warn),
        String(metrics.compliance.statusCounts.fail),
        metrics.compliance.topViolations
          .map((v) => `${v.code} (${v.count})`)
          .join("; "),
        String(metrics.documents.expiringSoon.length),
        String(metrics.scans.total),
        String(metrics.ocr.averageConfidence ?? ""),
      ],
    ];
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="compliance.csv"',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to generate report" },
      { status: 400 },
    );
  }
}

