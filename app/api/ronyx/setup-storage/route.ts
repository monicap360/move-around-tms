import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Every storage bucket the app needs — one source of truth.
// All sensitive buckets are private. Signed URLs must be used for access.
// Only oo-logos is public (company branding, no personal data).
const REQUIRED_BUCKETS: { name: string; public: boolean; maxSize: number }[] = [
  // Primary Fast Scan bucket — ALL ticket scans, OCR files, upload-original
  { name: "tms-documents",           public: false, maxSize: 104857600 }, // Fast Scan primary: ticket images, PDFs, OCR source files
  // Tickets
  { name: "ticket-uploads",          public: false, maxSize: 10485760  }, // ticket images, POD, delivery receipts
  { name: "ronyx-files",             public: false, maxSize: 52428800  }, // fast scan legacy, driver doc fallback
  // Driver documents — CDL, MVR, med cards, etc. NEVER public
  { name: "ronyx-driver-documents",  public: false, maxSize: 20971520  }, // CDL, MVR, med cards, drug tests
  { name: "driver-photos",           public: false, maxSize: 5242880   }, // driver profile photos
  { name: "driver-applications",     public: false, maxSize: 52428800  }, // driver application resumes
  { name: "hr_docs",                 public: false, maxSize: 52428800  }, // driver onboarding / HR portal uploads
  // E-signatures — NEVER public (contains signed contracts, CDL images)
  { name: "esign",                   public: false, maxSize: 20971520  }, // e-signature envelopes and signed documents
  // Owner operators
  { name: "ronyx-imports",           public: false, maxSize: 52428800  }, // OO docs, COIs, compliance files, dispatch CSVs
  { name: "oo-logos",                public: true,  maxSize: 5242880   }, // OO company logos — public OK, no personal data
  // Maintenance
  { name: "maintenance-docs",        public: false, maxSize: 52428800  }, // maintenance work order attachments
  // General / shared
  { name: "company_assets",          public: false, maxSize: 52428800  }, // shared assets, templates
  { name: "avatars",                 public: false, maxSize: 5242880   }, // user profile photos — use signed URLs
  { name: "documents",               public: false, maxSize: 52428800  }, // compliance watermarked PDFs, provenance docs
  { name: "ronyx-branding",          public: false, maxSize: 10485760  }, // company branding assets
];

export async function GET() {
  const sb = supabaseAdmin;

  // Get list of existing buckets
  const { data: existing, error: listErr } = await sb.storage.listBuckets();
  if (listErr) {
    return NextResponse.json({ ok: false, error: `Cannot list buckets: ${listErr.message}` }, { status: 500 });
  }

  const existingNames = new Set((existing || []).map((b: any) => b.id || b.name));

  const results: { name: string; status: "existed" | "created" | "error"; error?: string }[] = [];

  for (const bucket of REQUIRED_BUCKETS) {
    if (existingNames.has(bucket.name)) {
      results.push({ name: bucket.name, status: "existed" });
      continue;
    }

    const { error: createErr } = await sb.storage.createBucket(bucket.name, {
      public: bucket.public,
      fileSizeLimit: bucket.maxSize,
    });

    if (createErr && !createErr.message?.toLowerCase().includes("already exist")) {
      results.push({ name: bucket.name, status: "error", error: createErr.message });
    } else {
      results.push({ name: bucket.name, status: "created" });
    }
  }

  const created = results.filter(r => r.status === "created").length;
  const existed = results.filter(r => r.status === "existed").length;
  const errors  = results.filter(r => r.status === "error");

  return NextResponse.json({
    ok:      errors.length === 0,
    created,
    existed,
    errors:  errors.length,
    buckets: results,
  });
}
