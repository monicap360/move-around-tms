import { NextRequest, NextResponse } from "next/server";

import { samsara } from "@/integrations/eld";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const apiKey = process.env.SAMSARA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Telematics not configured. Set SAMSARA_API_KEY to enable live tracking." },
      { status: 400 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const driverQuery = searchParams.get("driver")?.toLowerCase();

    const locations = await samsara.fetchDriverLocations();
    const filtered = driverQuery
      ? locations.filter((driver) => driver.name?.toLowerCase().includes(driverQuery))
      : locations;

    return NextResponse.json({ locations: filtered });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Telematics request failed." }, { status: 500 });
  }
}
