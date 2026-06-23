export type HeaderMapping = {
  pit_name?: string;
  [key: string]: string | undefined;
};

export type HeaderAnalysisResult = {
  headers: string[];
  mapping: HeaderMapping;
};

export function analyzePitCsvHeaders(rows: string[][]): HeaderAnalysisResult {
  const headers = rows[0] ?? [];
  return { headers, mapping: {} };
}
