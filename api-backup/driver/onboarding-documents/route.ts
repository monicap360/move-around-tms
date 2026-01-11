import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const {
      driverEmail,
      documentType,
      fileUrl,
      fileName,
      expirationDate,
      status = "uploaded",
    } = await req.json();

    if (!driverEmail || !documentType || !fileUrl) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Missing required fields: driverEmail, documentType, fileUrl",
        },
        { status: 400 },
      );
    }

    // Insert or update document record
    const { data, error } = await supabaseAdmin
      .from("driver_onboarding_documents")
      .upsert({
        driver_email: driverEmail,
        document_type: documentType,
        file_url: fileUrl,
        file_name: fileName,
        expiration_date: expirationDate,
        status: status,
        uploaded_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to save document record" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      document: data,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const driverEmail = searchParams.get("driverEmail");

    let query = supabaseAdmin
      .from("driver_onboarding_documents")
      .select("*")
      .order("uploaded_at", { ascending: false });

    if (driverEmail) {
      query = query.eq("driver_email", driverEmail);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to fetch documents" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      documents: data || [],
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { documentId, status, approvedBy, rejectionReason } =
      await req.json();

    if (!documentId || !status) {
      return NextResponse.json(
        { ok: false, message: "Missing required fields: documentId, status" },
        { status: 400 },
      );
    }

    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString(),
    };

    if (status === "approved") {
      updateData.approved_by = approvedBy;
      updateData.approved_at = new Date().toISOString();
    } else if (status === "rejected") {
      updateData.rejection_reason = rejectionReason;
      updateData.approved_by = approvedBy;
    }

    const { data, error } = await supabaseAdmin
      .from("driver_onboarding_documents")
      .update(updateData)
      .eq("id", documentId)
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { ok: false, message: "Failed to update document" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      document: data,
    });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { ok: false, message: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
