import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/*
  POST /api/ronyx/owner-operators/parse-file
  multipart/form-data with field "file" (PDF, CSV, TSV, XLS, XLSX)

  Returns { text: string, type: "pdf"|"csv"|"xlsx"|"tsv" }
  The text is TSV-formatted rows for the frontend column mapper.
*/
export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const name = file.name.toLowerCase();

  // ── Excel: XLSX / XLS ───────────────────────────────────────────────
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm")) {
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes);

      const sheets = workbook.worksheets.map((s) => s.name);
      const ws = workbook.worksheets[0];
      const sheetName = ws?.name ?? "Sheet1";

      const aoa: string[][] = [];
      ws?.eachRow({ includeEmpty: false }, (row) => {
        const vals = row.values as ExcelJS.CellValue[];
        const cells: string[] = [];
        for (let i = 1; i < vals.length; i++) {
          const v = vals[i];
          if (v instanceof Date) {
            const y = v.getFullYear();
            const m = String(v.getMonth() + 1).padStart(2, "0");
            const d = String(v.getDate()).padStart(2, "0");
            cells.push(`${y}-${m}-${d}`);
          } else if (v !== null && v !== undefined && typeof v === "object" && "text" in v) {
            cells.push(String((v as any).text));
          } else {
            cells.push(String(v ?? "").replace(/\t/g, " ").replace(/\n/g, " "));
          }
        }
        aoa.push(cells);
      });

      const tsv = aoa
        .filter((row) => row.some((c) => c.trim()))
        .map((row) => row.join("\t"))
        .join("\n");

      return NextResponse.json({ text: tsv, type: "xlsx", sheet: sheetName, sheets });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Excel parse failed: ${msg}` }, { status: 500 });
    }
  }

  // ── CSV: convert to TSV ──────────────────────────────────────────────
  if (name.endsWith(".csv")) {
    const text = await file.text();
    const tsv = csvToTsv(text);
    return NextResponse.json({ text: tsv, type: "csv" });
  }

  // ── PDF: not supported server-side — ask user to export as CSV ──────
  if (name.endsWith(".pdf")) {
    return NextResponse.json({
      error: "PDF upload is not supported. Please export your data as a CSV or Excel file from your system and upload that instead.",
      hint: "In most software: File → Export → CSV or Save As → .xlsx",
    }, { status: 415 });
  }

  // ── TSV / plain text ─────────────────────────────────────────────────
  if (name.endsWith(".tsv") || name.endsWith(".txt")) {
    const text = await file.text();
    return NextResponse.json({ text, type: "tsv" });
  }

  return NextResponse.json({ error: "Unsupported file type. Use XLSX, CSV, PDF, or TSV." }, { status: 400 });
}

/* ── CSV → TSV ──────────────────────────────────────────────────────── */
function csvToTsv(csv: string): string {
  return csv
    .split("\n")
    .map(line => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
          else { inQuote = !inQuote; }
        } else if (ch === "," && !inQuote) {
          cols.push(cur.trim()); cur = "";
        } else {
          cur += ch;
        }
      }
      cols.push(cur.trim());
      return cols.join("\t");
    })
    .join("\n");
}

