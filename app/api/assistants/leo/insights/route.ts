import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    insights: [
      {
        id: "leo-1",
        type: "eta",
        message: "LD-4021 ETA slipping by 12 minutes due to congestion on I-45.",
        action: "Notify customer + update dispatch",
      },
      {
        id: "leo-2",
        type: "optimization",
        message: "Backhaul opportunity: Pit 3 → Downtown Site adds +$185 margin.",
        action: "Assign to Truck #24",
      },
      {
        id: "leo-3",
        type: "risk",
        message: "Driver J. Lane is 30 min from HOS limit; recommend swap.",
        action: "Reassign load to K. Alston",
      },
    ],
  });
}
