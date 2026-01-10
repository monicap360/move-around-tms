// src/reports/csv.util.ts
export function toCSV(rows: string[][]): string {
  return rows.map(r => r.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n')
}
