import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const BUCKETS = [
  { name: "tms-documents",          label: "Fast Scan / Tickets (Primary)" },
  { name: "ronyx-driver-documents", label: "Driver Documents" },
  { name: "esign",                  label: "E-Signatures" },
  { name: "ronyx-imports",          label: "Imports / COIs / Dispatch" },
  { name: "ticket-uploads",         label: "Ticket Uploads" },
  { name: "maintenance-docs",       label: "Maintenance Docs" },
  { name: "ronyx-files",            label: "Legacy / General Files" },
];

async function getBucketStats(supabase: typeof supabaseAdmin, bucketName: string) {
  try {
    // List files recursively (up to 1000 per call — adequate for monitoring)
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list("", { limit: 1000, offset: 0 });

    if (error || !files) return { file_count: 0, total_bytes: 0, exists: false };

    let totalBytes = 0;
    let fileCount  = 0;
    const ninety   = Date.now() - 90 * 24 * 60 * 60 * 1000;
    let oldFiles   = 0;
    let largeFiles = 0;

    for (const f of files) {
      if (!f.id) continue; // skip folder placeholders
      fileCount++;
      const size = (f.metadata as any)?.size || 0;
      totalBytes += size;
      if (size > 5 * 1024 * 1024) largeFiles++;
      const created = new Date(f.created_at || 0).getTime();
      if (created < ninety) oldFiles++;
    }
    return { file_count: fileCount, total_bytes: totalBytes, old_files: oldFiles, large_files: largeFiles, exists: true };
  } catch {
    return { file_count: 0, total_bytes: 0, exists: false };
  }
}

async function getTableCount(supabase: typeof supabaseAdmin, table: string): Promise<number> {
  try {
    const { count, error } = await (supabase as any).from(table).select("id", { count: "exact", head: true });
    return error ? 0 : (count ?? 0);
  } catch { return 0; }
}

export async function GET() {
  const supabase = supabaseAdmin;

  // Parallel: bucket stats + table counts
  const [bucketResults, tableCounts] = await Promise.all([
    Promise.all(BUCKETS.map(async b => ({
      ...b,
      ...(await getBucketStats(supabase, b.name)),
    }))),
    Promise.all([
      getTableCount(supabase, "aggregate_tickets").then(n => ({ table: "aggregate_tickets",  label: "Aggregate Tickets",     count: n })),
      getTableCount(supabase, "original_uploads").then(n  => ({ table: "original_uploads",   label: "Original Upload Records", count: n })),
      getTableCount(supabase, "ronyx_driver_documents").then(n => ({ table: "ronyx_driver_documents", label: "Driver Documents", count: n })),
      getTableCount(supabase, "fast_scan_uploads").then(n => ({ table: "fast_scan_uploads",  label: "Fast Scan Upload Logs", count: n })),
      getTableCount(supabase, "ronyx_trucks").then(n      => ({ table: "ronyx_trucks",       label: "Trucks",                count: n })),
      getTableCount(supabase, "drivers").then(n           => ({ table: "drivers",            label: "Drivers",               count: n })),
      getTableCount(supabase, "ticket_audit_log").then(n  => ({ table: "ticket_audit_log",   label: "Audit Log Entries",     count: n })),
      getTableCount(supabase, "payroll_items").then(n     => ({ table: "payroll_items",      label: "Payroll Items",         count: n })),
    ]),
  ]);

  const totalStorageBytes = bucketResults.reduce((s, b) => s + (b.total_bytes || 0), 0);
  const totalFiles        = bucketResults.reduce((s, b) => s + (b.file_count  || 0), 0);
  const totalOldFiles     = bucketResults.reduce((s, b) => s + ((b as any).old_files || 0), 0);
  const totalLargeFiles   = bucketResults.reduce((s, b) => s + ((b as any).large_files || 0), 0);

  // Supabase free tier: 1 GB storage, 500 MB DB (estimate DB at 8 KB/row avg)
  const storageLimitBytes = 1 * 1024 * 1024 * 1024; // 1 GB
  const storageUsedPct    = Math.round((totalStorageBytes / storageLimitBytes) * 100);

  const totalDbRows   = tableCounts.reduce((s, t) => s + t.count, 0);
  const estDbBytes    = totalDbRows * 8 * 1024; // rough: 8 KB per row
  const dbLimitBytes  = 500 * 1024 * 1024; // 500 MB free tier DB
  const dbUsedPct     = Math.round((estDbBytes / dbLimitBytes) * 100);

  // Estimated cost: Supabase Pro = $25/mo includes 8 GB storage, $0.021/GB overage
  const overageGb     = Math.max(0, totalStorageBytes - 8 * 1024 * 1024 * 1024) / (1024 ** 3);
  const estMonthlyCost = overageGb > 0 ? 25 + overageGb * 0.021 : 25;

  const warnings: { level: "info" | "warning" | "critical" | "block"; message: string }[] = [];
  if (storageUsedPct >= 95) warnings.push({ level: "block",    message: "Storage at 95%+ — large uploads will be blocked" });
  else if (storageUsedPct >= 85) warnings.push({ level: "critical", message: "Storage at 85%+ — upgrade soon or archive old files" });
  else if (storageUsedPct >= 70) warnings.push({ level: "warning",  message: "Storage at 70%+ — monitor closely" });
  if (totalOldFiles > 50)  warnings.push({ level: "info", message: `${totalOldFiles} files older than 90 days — consider archiving` });
  if (totalLargeFiles > 0) warnings.push({ level: "info", message: `${totalLargeFiles} files over 5 MB — check for uncompressed scans` });

  return NextResponse.json({
    storage: {
      total_bytes:      totalStorageBytes,
      total_files:      totalFiles,
      old_files_90d:    totalOldFiles,
      large_files_5mb:  totalLargeFiles,
      limit_bytes:      storageLimitBytes,
      used_pct:         storageUsedPct,
      buckets:          bucketResults,
    },
    database: {
      total_rows:       totalDbRows,
      est_size_bytes:   estDbBytes,
      limit_bytes:      dbLimitBytes,
      used_pct:         dbUsedPct,
      tables:           tableCounts,
    },
    cost: {
      est_monthly_usd:  Math.round(estMonthlyCost * 100) / 100,
      plan:             "Pro ($25/mo base)",
      overage_gb:       Math.round(overageGb * 100) / 100,
    },
    warnings,
    generated_at: new Date().toISOString(),
  });
}
