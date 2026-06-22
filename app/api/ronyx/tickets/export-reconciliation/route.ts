import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

// ARGB color map matching the client-side xlsx cell styles
const STATUS_COLOR: Record<string, string> = {
  corrected:  "FFC6EFCE", // green
  overridden: "FFBDD7EE", // blue
  flagged:    "FFFFEB9C", // yellow
  kept:       "FFD9D9D9", // grey
};
const DEFAULT_COLOR = "FFFFC7CE"; // red

export async function POST(req: Request) {
  try {
    const { headers, dataRows, statuses } = await req.json() as {
      headers: string[];
      dataRows: (string | number | null)[][];
      statuses: string[];
    };

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Corrected Reconciliation");

    // Header row
    const headerRow = ws.addRow(headers);
    headerRow.font = { bold: true };

    // Column widths
    const colWidths = [10,12,18,10,16,14,18,20,20,18,40,14,20,18];
    ws.columns = colWidths.map((width) => ({ width }));

    // Data rows with cell coloring
    dataRows.forEach((row, ri) => {
      const dataRow = ws.addRow(row);
      const status  = statuses[ri] ?? "";
      const argb    = STATUS_COLOR[status] ?? DEFAULT_COLOR;
      const fill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb } };

      // Status column (index 14, 1-based) and Corrected Value column (index 9)
      const statusCell = dataRow.getCell(14);
      const corrCell   = dataRow.getCell(9);
      statusCell.fill = fill;
      corrCell.fill   = fill;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Export failed" }, { status: 500 });
  }
}
