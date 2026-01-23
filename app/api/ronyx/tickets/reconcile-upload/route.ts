import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CsvRow = Record<string, string>;

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/\s+/g, "_");
}

function toNumber(value: string | undefined) {
  if (!value) return null;
  const num = Number(String(value).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function toString(value: string | undefined) {
  return value ? String(value).trim() : "";
}

function buildKey(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const value = toString(row[key]);
    if (value) return value;
  }
  return "";
}

function compareField(label: string, inputValue: string, systemValue: string) {
  if (!inputValue && !systemValue) return null;
  if (inputValue === systemValue) return null;
  return { field: label, input: inputValue, system: systemValue };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let csvText = "";

    if (contentType.includes("multipart")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      csvText = await req.text();
    }

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      return NextResponse.json(
        { error: parsed.errors[0]?.message || "CSV parse error" },
        { status: 400 },
      );
    }

    const rawRows = (parsed.data || []) as Record<string, string>[];
    if (!rawRows.length) {
      return NextResponse.json({ error: "CSV must include at least one row" }, { status: 400 });
    }

    const rows: CsvRow[] = rawRows.map((row) => {
      const normalized: CsvRow = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeader(key)] = value;
      });
      return normalized;
    });

    const ticketNumbers = Array.from(
      new Set(rows.map((row) => buildKey(row, ["ticket_number", "ticket_#", "ticket"])).filter(Boolean)),
    );
    const ticketIds = Array.from(new Set(rows.map((row) => toString(row.ticket_id)).filter(Boolean)));

    const supabase = createSupabaseServerClient();
    const ticketByNumber = new Map<string, any>();
    const ticketById = new Map<string, any>();

    if (ticketNumbers.length) {
      const { data } = await supabase
        .from("aggregate_tickets")
        .select("*")
        .in("ticket_number", ticketNumbers);
      (data || []).forEach((ticket) => {
        if (ticket.ticket_number) ticketByNumber.set(ticket.ticket_number, ticket);
      });
    }

    if (ticketIds.length) {
      const { data } = await supabase
        .from("aggregate_tickets")
        .select("*")
        .in("id", ticketIds);
      (data || []).forEach((ticket) => {
        if (ticket.id) ticketById.set(ticket.id, ticket);
      });
    }

    let matched = 0;
    let mismatched = 0;
    let missing = 0;

    const resultRows = rows.map((row, index) => {
      const ticketNumber = buildKey(row, ["ticket_number", "ticket_#", "ticket"]);
      const ticketId = toString(row.ticket_id);
      const matchedTicket =
        (ticketId && ticketById.get(ticketId)) ||
        (ticketNumber && ticketByNumber.get(ticketNumber)) ||
        null;

      if (!matchedTicket) {
        missing += 1;
        return {
          index,
          matched: false,
          differences: [],
          input: row,
          corrected: row,
        };
      }

      matched += 1;

      const differences = [
        compareField("ticket_number", ticketNumber, toString(matchedTicket.ticket_number)),
        compareField("ticket_date", toString(row.ticket_date || row.date), toString(matchedTicket.ticket_date)),
        compareField("driver_name", toString(row.driver_name), toString(matchedTicket.driver_name)),
        compareField("material", toString(row.material), toString(matchedTicket.material)),
        compareField("quantity", toString(row.quantity), matchedTicket.quantity?.toString?.() || ""),
        compareField("unit_type", toString(row.unit_type), toString(matchedTicket.unit_type)),
        compareField("gross_weight", toString(row.gross_weight), matchedTicket.gross_weight?.toString?.() || ""),
        compareField("tare_weight", toString(row.tare_weight), matchedTicket.tare_weight?.toString?.() || ""),
        compareField("net_weight", toString(row.net_weight), matchedTicket.net_weight?.toString?.() || ""),
        compareField("bill_rate", toString(row.bill_rate), matchedTicket.bill_rate?.toString?.() || ""),
      ].filter(Boolean);

      if (differences.length) mismatched += 1;

      const corrected = {
        ...row,
        ticket_number: matchedTicket.ticket_number || row.ticket_number,
        ticket_date: matchedTicket.ticket_date || row.ticket_date || row.date,
        driver_name: matchedTicket.driver_name || row.driver_name,
        material: matchedTicket.material || row.material,
        quantity: matchedTicket.quantity ?? toNumber(row.quantity) ?? row.quantity,
        unit_type: matchedTicket.unit_type || row.unit_type,
        gross_weight: matchedTicket.gross_weight ?? toNumber(row.gross_weight) ?? row.gross_weight,
        tare_weight: matchedTicket.tare_weight ?? toNumber(row.tare_weight) ?? row.tare_weight,
        net_weight: matchedTicket.net_weight ?? toNumber(row.net_weight) ?? row.net_weight,
        bill_rate: matchedTicket.bill_rate ?? toNumber(row.bill_rate) ?? row.bill_rate,
      };

      return {
        index,
        matched: true,
        differences,
        input: row,
        corrected,
      };
    });

    const correctedCsv = Papa.unparse(
      resultRows.map((row) => row.corrected),
      { quotes: false },
    );

    return NextResponse.json({
      summary: {
        total: rows.length,
        matched,
        mismatched,
        missing,
      },
      rows: resultRows,
      correctedCsv,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to process CSV" }, { status: 500 });
  }
}
