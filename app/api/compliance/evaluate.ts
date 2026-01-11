import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function createServerAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerAdmin();
    const body = await request.json();
    const { organizationId, scanId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Get driver documents for compliance check
    const { data: documents } = await supabase
      .from("driver_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .not("expiration_date", "is", null);

    // Get compliance results if available
    const { data: existingResults } = await supabase
      .from("compliance_results")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Evaluate compliance
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    let compliant = true;

    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysFromNow = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Check for expiring documents
    (documents || []).forEach((doc: any) => {
      if (doc.expiration_date) {
        const expDate = new Date(doc.expiration_date);
        if (expDate < today) {
          issues.push(`${doc.doc_type || 'Document'} expired on ${expDate.toLocaleDateString()}`);
          score -= 10;
          compliant = false;
          recommendations.push(`Renew expired ${doc.doc_type || 'document'}`);
        } else if (expDate <= thirtyDaysFromNow) {
          issues.push(`${doc.doc_type || 'Document'} expiring soon (${expDate.toLocaleDateString()})`);
          score -= 5;
          recommendations.push(`Renew ${doc.doc_type || 'document'} before expiration`);
        } else if (expDate <= sixtyDaysFromNow) {
          recommendations.push(`Plan to renew ${doc.doc_type || 'document'} (expires ${expDate.toLocaleDateString()})`);
        }
      }
    });

    // Check for missing critical documents
    const requiredDocs = ["CDL License", "Medical Certificate", "Insurance"];
    const existingDocTypes = (documents || []).map((d: any) => d.doc_type).filter(Boolean);
    requiredDocs.forEach((required) => {
      if (!existingDocTypes.some((type: string) => type.toLowerCase().includes(required.toLowerCase()))) {
        issues.push(`Missing ${required}`);
        score -= 15;
        compliant = false;
        recommendations.push(`Upload ${required}`);
      }
    });

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Store compliance result
    if (scanId || organizationId) {
      await supabase.from("compliance_results").insert({
        organization_id: organizationId,
        scan_id: scanId || null,
        compliant: compliant,
        score: score,
        issues: issues,
        recommendations: recommendations,
        evaluated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      compliant,
      score: Math.round(score),
      issues,
      recommendations,
    });
  } catch (error: any) {
    console.error("Error evaluating compliance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate compliance" },
      { status: 500 },
    );
  }
}
