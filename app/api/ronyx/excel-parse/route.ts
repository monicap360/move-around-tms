import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// POST /api/ronyx/excel-parse — accepts an uploaded .xlsx/.xls file and returns
// its first worksheet converted to CSV text, so the existing CSV import pipeline
// (preview + runImport) can consume Excel uploads without any client-side parser.
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "file required" }, { status: 400 });

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: "No worksheet found in this file" }, { status: 400 });

    const cell = (v: unknown): string => {
      if (v == null) return "";
      if (typeof v === "object") {
        const o = v as Record<string, unknown>;
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof o.text === "string") return o.text;                 // hyperlink / rich text
        if (o.result != null) return String(o.result);                 // formula result
        if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map(r => r.text).join("");
        return "";
      }
      return String(v);
    };

    const lines: string[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = (row.values as unknown[]).slice(1).map(cell); // [0] is always empty in exceljs
      if (vals.every(v => v.trim() === "")) return;               // skip blank rows
      lines.push(vals.map(c => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(","));
    });

    return NextResponse.json({ csv: lines.join("\n"), rows: Math.max(0, lines.length - 1) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Could not read this Excel file" }, { status: 500 });
  }
}
