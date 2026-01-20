import { NextRequest, NextResponse } from "next/server";
import { samsara, keepTruckin, geotab } from "@/integrations/eld";

export const dynamic = "force-dynamic";

function resolveProvider(providerId: string | undefined) {
  switch ((providerId || "").toLowerCase()) {
    case "samsara":
      return samsara;
    case "motive":
    case "keeptruckin":
      return keepTruckin;
    case "geotab":
      return geotab;
    default:
      return null;
  }
}

export async function GET(req: NextRequest, { params }: any) {
  const provider = resolveProvider(params?.provider);
  if (!provider) {
    return NextResponse.json(
      { error: "Unsupported provider" },
      { status: 400 },
    );
  }

  try {
    const data = await provider.fetchDriverLocations({ useProxy: false });
    return NextResponse.json({ provider: provider.name, data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load driver locations" },
      { status: 500 },
    );
  }
}
