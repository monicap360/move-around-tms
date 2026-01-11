import { NextResponse } from "next/server";

type ReqBody = {
  driverId?: string;
  driverName?: string;
  currentTruck?: string;
  requiredTruckType?: string;
};

// Simple in-memory mock data used when no real DB is configured.
const MOCK_TRUCKS = [
  { unit: "T-101", status: "Ready", truck_type: "enddump" },
  { unit: "T-102", status: "In Maintenance", truck_type: "flatbed" },
  { unit: "T-103", status: "Ready", truck_type: "flatbed" },
  { unit: "T-104", status: "Ready", truck_type: "tanker" },
];

const MOCK_QUALS: Record<string, string[]> = {
  // driverName -> list of qualified truck_type ids/names
  "Lilia G.": ["flatbed"],
  "Robert M.": ["enddump", "flatbed"],
  "Santiago P.": ["tanker"],
};

export async function POST(request: Request) {
  try {
    const body: ReqBody = await request.json().catch(() => ({}));

    // If you have SUPABASE_URL and SUPABASE_SERVICE_KEY set, you can
    // implement a real query against Supabase here. For now we return
    // a mock suggestion based on the provided driver name or requiredTruckType.
    const { driverName, requiredTruckType } = body;

    const neededType =
      requiredTruckType || (driverName ? undefined : undefined);

    // If driverName provided, use mock qualifications map
    const quals = driverName ? MOCK_QUALS[driverName] || [] : [];

    // Find first READY truck that matches qualification or requiredType
    const candidate = MOCK_TRUCKS.find(
      (t) =>
        t.status === "Ready" &&
        (neededType
          ? t.truck_type === neededType
          : quals.length
            ? quals.includes(t.truck_type)
            : true),
    );

    if (!candidate) {
      return NextResponse.json(
        { ok: false, message: "No available qualified truck found (mock)." },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { ok: true, suggestedTruck: candidate },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || String(err) },
      { status: 500 },
    );
  }
}
