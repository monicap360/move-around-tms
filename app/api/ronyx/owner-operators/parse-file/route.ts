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
      const bytes = await file.arrayBuffer();
      const XLSX = (await import("xlsx")).default;
      const wb = XLSX.read(bytes, { type: "array", cellDates: true });

      // Use the first sheet
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];

      // Convert to array-of-arrays
      const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      // Convert to TSV
      const tsv = aoa
        .filter((row) => row.some((c) => String(c).trim()))
        .map((row) =>
          row
            .map((c) => {
              // Format dates properly
              if (c instanceof Date) {
                const y = c.getFullYear();
                const m = String(c.getMonth() + 1).padStart(2, "0");
                const d = String(c.getDate()).padStart(2, "0");
                return `${y}-${m}-${d}`;
              }
              return String(c ?? "").replace(/\t/g, " ").replace(/\n/g, " ");
            })
            .join("\t")
        )
        .join("\n");

      return NextResponse.json({ text: tsv, type: "xlsx", sheet: sheetName, sheets: wb.SheetNames });
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

