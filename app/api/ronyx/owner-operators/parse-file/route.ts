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

  // ── PDF: extract text and attempt to reconstruct tabular rows ────────
  if (name.endsWith(".pdf")) {
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      const raw = data.text;
      const tsv = pdfTextToTsv(raw);
      return NextResponse.json({ text: tsv, type: "pdf", raw_text: raw });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `PDF parse failed: ${msg}` }, { status: 500 });
    }
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

/* ── PDF text → TSV ─────────────────────────────────────────────────── */
function pdfTextToTsv(raw: string): string {
  const lines = raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) return "";

  // Detect if lines look like they have consistent whitespace-separated columns
  // by checking for lines with multiple whitespace gaps (tabular PDF export)
  const tsv = lines.map(line => {
    // Collapse multiple spaces/tabs into tab delimiters
    // PDF text extraction often separates columns with 2+ spaces
    return line
      .replace(/\r/g, "")
      .replace(/  +/g, "\t")  // 2+ spaces → tab
      .replace(/\t+/g, "\t"); // collapse multiple tabs
  });

  // Filter out lines that don't have at least 2 columns (likely page headers/footers)
  const dataLines = tsv.filter(l => l.includes("\t"));

  if (dataLines.length === 0) {
    // Fallback: return raw lines as single-column (user can map manually)
    return lines.join("\n");
  }

  return dataLines.join("\n");
}
