import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

type CellValue = string | number | boolean | null;

function formatCell(val: ExcelJS.CellValue): CellValue {
  if (val === null || val === undefined) return "";
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, "0");
    const d = String(val.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof val === "object" && val !== null) {
    if ("text" in val) return String((val as any).text);           // RichText
    if ("result" in val) return formatCell((val as any).result);   // Formula
    if ("error" in val) return "";                                  // Error cell
  }
  if (typeof val === "number" || typeof val === "boolean") return val;
  return String(val);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const name = file.name.toLowerCase();

    if (name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
      const text = await file.text();
      const delimiter = name.endsWith(".tsv") ? "\t" : ",";
      const rawLines = text.split(/\r?\n/).filter((l) => l.trim());
      const rows = rawLines.map((line) => {
        const cols: string[] = [];
        let cur = "";
        let inQ = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"') {
            if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
            else { inQ = !inQ; }
          } else if (ch === delimiter && !inQ) {
            cols.push(cur); cur = "";
          } else {
            cur += ch;
          }
        }
        cols.push(cur);
        return cols.map((c) => c.trim());
      });
      return NextResponse.json({ headers: rows[0] ?? [], rows: rows.slice(1), sheets: ["Sheet1"] });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheets = workbook.worksheets.map((s) => s.name);
    const ws = workbook.worksheets[0];
    if (!ws) return NextResponse.json({ headers: [], rows: [], sheets: [] });

    const allRows: CellValue[][] = [];
    let maxCols = 0;

    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = row.values as ExcelJS.CellValue[];
      const cells: CellValue[] = [];
      for (let i = 1; i < vals.length; i++) {
        cells.push(formatCell(vals[i]));
      }
      maxCols = Math.max(maxCols, cells.length);
      allRows.push(cells);
    });

    // Pad all rows to same width with ""
    const padded = allRows.map((r) => {
      while (r.length < maxCols) r.push("");
      return r;
    });

    const headers = padded[0]?.map((c) => String(c ?? "")) ?? [];
    return NextResponse.json({ headers, rows: padded.slice(1), sheets });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Parse failed" }, { status: 500 });
  }
}
