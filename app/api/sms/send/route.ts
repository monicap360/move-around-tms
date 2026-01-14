import { NextRequest, NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

// Dynamic import for Twilio (optional dependency)
let twilio: any = null;
try {
  twilio = require("twilio");
} catch (e) {
  // Twilio not installed - will return error if used
}

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM_NUMBER;
const client = accountSid && authToken && twilio ? twilio(accountSid, authToken) : null;

// POST: Send SMS for compliance notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message } = body;
    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing to or message" },
        { status: 400 },
      );
    }
    if (!client || !fromNumber) {
      return NextResponse.json(
        { error: "Twilio not configured" },
        { status: 500 },
      );
    }
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to,
    });
    return NextResponse.json({ ok: true, sid: result.sid });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
