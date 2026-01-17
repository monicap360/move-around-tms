import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const dynamic = "force-dynamic";

function verifySignature(rawBody: string, signature: string | null) {
  const verifier = process.env.QUICKBOOKS_WEBHOOK_VERIFIER;
  if (!verifier) {
    return false;
  }
  if (!signature) {
    return false;
  }
  const computed = crypto.createHmac("sha256", verifier).update(rawBody).digest("base64");
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("intuit-signature");
  const rawBody = await req.text();
  const isValid = verifySignature(rawBody, signature);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody || "{}");
    console.log("QuickBooks webhook received:", payload?.eventNotifications?.length || 0);
    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Webhook parse failed." }, { status: 400 });
  }
}
