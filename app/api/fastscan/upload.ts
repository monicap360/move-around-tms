import type { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";
import type { Scan, Document, ScanResult } from "@/lib/fastscan/types";

// In-memory store for demo purposes
const scans: Scan[] = [];
const documents: Document[] = [];
const results: ScanResult[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simulate upload and OCR
  const { organizationId, ticketId, fileUrl, fileType } = req.body;
  if (!organizationId || !ticketId || !fileUrl || !fileType) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const scanId = uuidv4();
  const documentId = uuidv4();
  const resultId = uuidv4();

  const scan: Scan = {
    id: scanId,
    organizationId,
    ticketId,
    documentId,
    createdAt: new Date().toISOString(),
    status: "processed",
    resultId,
  };

  const document: Document = {
    id: documentId,
    organizationId,
    scanId,
    type: fileType,
    url: fileUrl,
    uploadedAt: new Date().toISOString(),
  };

  // Mock OCR result
  const scanResult: ScanResult = {
    id: resultId,
    scanId,
    organizationId,
    extractedText: "MOCK_OCR_TEXT",
    ocrStatus: "success",
    processedAt: new Date().toISOString(),
  };

  scans.push(scan);
  documents.push(document);
  results.push(scanResult);

  return res.status(200).json({ scan, document, scanResult });
}
