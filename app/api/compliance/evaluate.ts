import type { NextApiRequest, NextApiResponse } from "next";
import { evaluateCompliance, getViolations } from "@/lib/compliance/engine";
import type { ComplianceContext } from "@/lib/compliance/types";
import type { Scan, Document, ScanResult, Ticket } from "@/lib/fastscan/types";

// For demo: mock Fast Scan data
const scans: Scan[] = [];
const documents: Document[] = [];
const results: ScanResult[] = [];
const tickets: Ticket[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { organizationId, scanId } = req.body;
  if (!organizationId || !scanId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const scan = scans.find(
    (s) => s.id === scanId && s.organizationId === organizationId,
  );
  if (!scan) {
    return res.status(404).json({ error: "Scan not found" });
  }
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

  const resultsList = evaluateCompliance(context);
  const violations = getViolations(context);

  return res.status(200).json({ results: resultsList, violations });
}
