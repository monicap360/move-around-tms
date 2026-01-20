// app/api/notifications/preferences.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getPreferences,
  setPreferences,
} from "@/src/notifications/preferences.store";

function getOrganizationId(req: NextRequest): string {
  const company = req.headers.get("x-organization-id");
  if (!company) throw new Error("Missing organization context");
  return company;
}

export async function GET(req: NextRequest) {
  try {
    const organizationId = getOrganizationId(req);
    const prefs = getPreferences(organizationId);
    return NextResponse.json(prefs, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to load preferences" },
      { status: 400 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const organizationId = getOrganizationId(req);
    const updates = await req.json();
    setPreferences(organizationId, updates);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Failed to update preferences" },
      { status: 400 },
    );
  }
}

