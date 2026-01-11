// Email Quote Draft API
// Generate formatted email content for quote review and customer sending

import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

function authorize(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { quote_id, template_type = "customer" } = body;

  if (!quote_id) {
    return NextResponse.json({ error: "Missing quote_id" }, { status: 400 });
  }

  // Fetch quote details
  const { data: quote, error } = await supabaseAdmin
    .from("aggregate_quotes")
    .select("*")
    .eq("id", quote_id)
    .single();

  if (error || !quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  const profit = (quote.rate || 0) - (quote.pay_rate || 0);
  const marginPct =
    quote.rate > 0 ? ((profit / quote.rate) * 100).toFixed(1) : "0.0";

  // Generate email content based on template type
  let subject: string;
  let body_text: string;
  let body_html: string;

  if (template_type === "management") {
    // Internal review email for management
    subject = `Quote Review Required: ${quote.company} - ${quote.material || "Aggregate"}`;
    body_text = `
Quote Review Request

Company: ${quote.company}
Contact: ${quote.contact_name || "N/A"} <${quote.contact_email}>
Material: ${quote.material || "N/A"}

Pricing Details:
- Billing Type: ${quote.billing_type}
- Customer Rate: $${quote.rate?.toFixed(2)} per ${quote.billing_type}
- Driver Pay Rate: $${quote.pay_rate?.toFixed(2)} per ${quote.billing_type}
- Profit per Unit: $${profit.toFixed(2)} (${marginPct}% margin)

Notes: ${quote.notes || "None"}

Status: ${quote.status}

Please review and approve or reject this quote.
Quote ID: ${quote.id}
    `.trim();

    body_html = `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <h2 style="color: #0a3d91;">Quote Review Required</h2>
  
  <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <h3 style="margin-top: 0;">Company Information</h3>
    <p><strong>Company:</strong> ${quote.company}</p>
    <p><strong>Contact:</strong> ${quote.contact_name || "N/A"} &lt;${quote.contact_email}&gt;</p>
    <p><strong>Material:</strong> ${quote.material || "N/A"}</p>
  </div>

  <div style="background: #e8f4fd; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <h3 style="margin-top: 0;">Pricing Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td><strong>Billing Type:</strong></td>
        <td>${quote.billing_type}</td>
      </tr>
      <tr>
        <td><strong>Customer Rate:</strong></td>
        <td style="font-weight: bold; color: #0a3d91;">$${quote.rate?.toFixed(2)} per ${quote.billing_type}</td>
      </tr>
      <tr>
        <td><strong>Driver Pay Rate:</strong></td>
        <td>$${quote.pay_rate?.toFixed(2)} per ${quote.billing_type}</td>
      </tr>
      <tr>
        <td><strong>Profit per Unit:</strong></td>
        <td style="font-weight: bold; color: #16a34a;">$${profit.toFixed(2)} (${marginPct}% margin)</td>
      </tr>
    </table>
  </div>

  ${
    quote.notes
      ? `<div style="margin: 16px 0;">
    <strong>Notes:</strong><br>
    ${quote.notes.replace(/\n/g, "<br>")}
  </div>`
      : ""
  }

  <p style="margin-top: 24px;">
    <strong>Status:</strong> <span style="background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${quote.status}</span>
  </p>

  <p style="color: #666; font-size: 12px; margin-top: 24px;">Quote ID: ${quote.id}</p>
</div>
    `.trim();
  } else {
    // Customer-facing quote email
    subject = `Quote for ${quote.material || "Aggregate"} Hauling Services - ${quote.company}`;
    body_text = `
Dear ${quote.contact_name || "Valued Customer"},

Thank you for your interest in Ronyx Logistics' aggregate hauling services.

We are pleased to provide the following quote:

Service: ${quote.material || "Aggregate"} Hauling
Billing: $${quote.rate?.toFixed(2)} per ${quote.billing_type}

${quote.notes ? `Additional Details:\n${quote.notes}\n` : ""}

This quote is valid for 30 days from the date of this email.

To accept this quote, please reply to this email or contact us directly.

Best regards,
Ronyx Logistics LLC
    `.trim();

    body_html = `
<div style="font-family: Arial, sans-serif; max-width: 600px;">
  <div style="background: #0a3d91; color: white; padding: 20px; text-align: center;">
    <h1 style="margin: 0;">Ronyx Logistics LLC</h1>
    <p style="margin: 4px 0;">Professional Aggregate Hauling Services</p>
  </div>

  <div style="padding: 24px;">
    <p>Dear ${quote.contact_name || "Valued Customer"},</p>
    
    <p>Thank you for your interest in our aggregate hauling services.</p>

    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #0a3d91;">Quote Details</h2>
      <p><strong>Service:</strong> ${quote.material || "Aggregate"} Hauling</p>
      <p style="font-size: 20px; color: #0a3d91; margin: 12px 0;">
        <strong>$${quote.rate?.toFixed(2)}</strong> per ${quote.billing_type}
      </p>
    </div>

    ${
      quote.notes
        ? `<div style="margin: 20px 0;">
      <strong>Additional Information:</strong><br>
      ${quote.notes.replace(/\n/g, "<br>")}
    </div>`
        : ""
    }

    <p style="color: #666; font-size: 14px; margin-top: 24px;">
      This quote is valid for 30 days from the date of this email.
    </p>

    <p style="margin-top: 24px;">
      To accept this quote, please reply to this email or contact us directly.
    </p>

    <p style="margin-top: 32px;">
      Best regards,<br>
      <strong>Ronyx Logistics LLC</strong>
    </p>
  </div>

  <div style="background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #666;">
    © 2025 Ronyx Logistics LLC · Move Around TMS
  </div>
</div>
    `.trim();
  }

  return NextResponse.json({
    quote_id: quote.id,
    template_type,
    subject,
    body_text,
    body_html,
    to: template_type === "customer" ? quote.contact_email : null,
    quote_details: {
      company: quote.company,
      material: quote.material,
      rate: quote.rate,
      pay_rate: quote.pay_rate,
      profit,
      margin_pct: marginPct,
    },
  });
}
