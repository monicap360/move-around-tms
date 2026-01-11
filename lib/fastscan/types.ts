// Fast Scan Core Data Model

export interface Scan {
  id: string;
  organizationId: string;
  ticketId: string;
  documentId: string;
  createdAt: string;
  status: "pending" | "processed" | "failed";
  resultId?: string;
}

export interface Ticket {
  id: string;
  organizationId: string;
  number: string;
  driverId: string;
  createdAt: string;
  status: "open" | "closed" | "exception";
}

export interface Document {
  id: string;
  organizationId: string;
  scanId: string;
  type: "image" | "pdf" | "other";
  url: string;
  uploadedAt: string;
}

export interface ScanResult {
  id: string;
  scanId: string;
  organizationId: string;
  extractedText: string;
  ocrStatus: "pending" | "success" | "error";
  processedAt?: string;
  errorMessage?: string;
}
