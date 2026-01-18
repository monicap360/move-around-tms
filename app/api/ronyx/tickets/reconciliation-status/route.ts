import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    rows: [
      {
        id: "tkt-001",
        ticket_number: "TKT-001",
        customer: "ABC Const",
        load: "Gravel",
        status: "matched",
        dispatched: { qty: 20, unit: "T", amount: 400 },
        delivered: { qty: 20, unit: "T", amount: 400 },
        billed: { qty: 20, unit: "T", amount: 400 },
      },
      {
        id: "tkt-002",
        ticket_number: "TKT-002",
        customer: "XYZ Build",
        load: "Concrete",
        status: "partial",
        dispatched: { qty: 15, unit: "T", amount: 300 },
        delivered: { qty: 17, unit: "T", amount: 340 },
        billed: { qty: 17, unit: "T", amount: 340 },
        variance: "Delivered +2T",
      },
      {
        id: "tkt-003",
        ticket_number: "TKT-003",
        customer: "LMN Co",
        load: "Sand",
        status: "mismatch",
        dispatched: { qty: 30, unit: "T", amount: 600 },
        delivered: { qty: 25, unit: "T", amount: 500 },
        billed: { qty: 30, unit: "T", amount: 600 },
        variance: "Delivered -5T",
      },
      {
        id: "tkt-004",
        ticket_number: "TKT-004",
        customer: "Delta Sites",
        load: "Topsoil",
        status: "pending",
        dispatched: { qty: 12, unit: "T", amount: 240 },
        delivered: { qty: 0, unit: "T", amount: 0 },
        billed: { qty: 0, unit: "T", amount: 0 },
      },
    ],
  });
}
