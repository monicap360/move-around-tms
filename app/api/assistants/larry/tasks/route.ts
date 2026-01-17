import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    tasks: [
      { id: "larry-1", title: "Connect accounting system", status: "pending" },
      { id: "larry-2", title: "Upload driver documents", status: "in_progress" },
      { id: "larry-3", title: "Configure rate cards", status: "pending" },
      { id: "larry-4", title: "Enable dispatch workflows", status: "completed" },
    ],
  });
}
