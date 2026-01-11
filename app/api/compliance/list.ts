import type { NextApiRequest, NextApiResponse } from "next";
import { getViolations } from "@/lib/compliance/engine";
import type { ComplianceContext } from "@/lib/compliance/types";
import type { Scan, Document, ScanResult, Ticket } from "@/lib/fastscan/types";

// For demo: mock Fast Scan data
const scans: Scan[] = [];
const documents: Document[] = [];
const results: ScanResult[] = [];
const tickets: Ticket[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { organizationId } = req.query;
  if (!organizationId || typeof organizationId !== "string") {
    return res.status(400).json({ error: "Missing organizationId" });
  }
  // For each scan, evaluate violations
  const violations = scans
    .filter((s) => s.organizationId === organizationId)
    .map((scan) => {
      const document = documents.find((d) => d.scanId === scan.id);
      const scanResult = results.find((r) => r.scanId === scan.id);
      const ticket = tickets.find((t) => t.id === scan.ticketId);
      const context: ComplianceContext = {
        organizationId,
        scan,
        document,
        scanResult,
        ticket,
      };
      return getViolations(context);
    })
    .flat();
  return res.status(200).json({ violations });
}
