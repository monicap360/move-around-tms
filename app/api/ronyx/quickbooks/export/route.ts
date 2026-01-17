import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function toIifNumber(value: number) {
  return Number(value || 0).toFixed(2);
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "invoices";

  if (type !== "invoices") {
    return NextResponse.json({ error: "Unsupported export type" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ronyx_invoices")
    .select("*")
    .order("issued_date", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const lines = [
    "!TRNS\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
    "!SPL\tDATE\tACCNT\tNAME\tAMOUNT\tMEMO",
    "!ENDTRNS",
  ];

  (data || []).forEach((invoice) => {
    const date = formatDate(invoice.issued_date);
    const customer = invoice.customer_name || "Customer";
    const amount = toIifNumber(invoice.total_amount || 0);
    const memo = invoice.invoice_number || "Invoice";
    lines.push(`TRNS\t${date}\tAccounts Receivable\t${customer}\t${amount}\t${memo}`);
    lines.push(`SPL\t${date}\tSales\t${customer}\t-${amount}\t${memo}`);
    lines.push("ENDTRNS");
  });

  const content = lines.join("\n");
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="ronyx-${type}-${new Date()
        .toISOString()
        .slice(0, 10)}.iif"`,
    },
  });
}
