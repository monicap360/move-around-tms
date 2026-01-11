import {
  ComplianceResultInput,
  ScanInput,
  DocumentInput,
} from "./metrics.inputs";
import { createClient } from "@supabase/supabase-js";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing Supabase configuration");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchComplianceResults(
  organizationId: string,
): Promise<ComplianceResultInput[]> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Query compliance_items table for compliance results
    const { data: complianceItems, error } = await supabase
      .from("compliance_items")
      .select("id, item_type, status, expiration_date, created_at")
      .eq("status", "Active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching compliance results:", error);
      return [];
    }

    // Transform to ComplianceResultInput format
    return (complianceItems || []).map((item) => {
      // Determine status based on expiration date and item status
      let status: "pass" | "warn" | "fail" = "pass";
      if (item.expiration_date) {
        const expDate = new Date(item.expiration_date);
        const now = new Date();
        const daysUntilExp = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExp < 0) {
          status = "fail"; // Expired
        } else if (daysUntilExp <= 30) {
          status = "warn"; // Expiring soon
        }
      }

      return {
        id: item.id,
        organizationId,
        status,
        occurredAt: item.created_at || new Date().toISOString(),
        violations: item.status !== "Active" ? [
          {
            code: item.item_type || "COMPLIANCE_ITEM",
            label: item.item_type || "Compliance Item",
            evidenceIds: [],
          }
        ] : [],
      };
    });
  } catch (err) {
    console.error("Error in fetchComplianceResults:", err);
    return [];
  }
}

export async function fetchScans(organizationId: string): Promise<ScanInput[]> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Query aggregate_tickets table for OCR scans
    const { data: tickets, error } = await supabase
      .from("aggregate_tickets")
      .select("id, organization_id, ocr_processed_at, ocr_confidence, created_at")
      .eq("organization_id", organizationId)
      .not("ocr_processed_at", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching scans:", error);
      return [];
    }

    // Transform to ScanInput format
    return (tickets || []).map((ticket) => ({
      id: ticket.id,
      organizationId: ticket.organization_id || organizationId,
      createdAt: ticket.ocr_processed_at || ticket.created_at || new Date().toISOString(),
      ocrConfidence: ticket.ocr_confidence || null,
    }));
  } catch (err) {
    console.error("Error in fetchScans:", err);
    return [];
  }
}

export async function fetchDocuments(
  organizationId: string,
): Promise<DocumentInput[]> {
  try {
    const supabase = getSupabaseAdmin();
    
    // Query driver_documents table for documents
    // Note: organizationId filtering might need to join with drivers table
    const { data: documents, error } = await supabase
      .from("driver_documents")
      .select("id, doc_type, expiration_date, driver_id")
      .order("expiration_date", { ascending: true, nullsLast: true });

    if (error) {
      console.error("Error fetching documents:", error);
      return [];
    }

    // Transform to DocumentInput format
    return (documents || []).map((doc) => ({
      id: doc.id,
      organizationId, // Note: may need to join with drivers to get actual org ID
      type: doc.doc_type || "Unknown",
      expiresAt: doc.expiration_date || null,
    }));
  } catch (err) {
    console.error("Error in fetchDocuments:", err);
    return [];
  }
}
