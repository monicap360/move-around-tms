import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Every storage bucket the app needs — one source of truth
const REQUIRED_BUCKETS: { name: string; public: boolean; maxSize: number }[] = [
  { name: "ronyx-imports",           public: false, maxSize: 52428800  }, // OO docs, COIs, compliance files, dispatch CSVs
  { name: "company_assets",          public: false, maxSize: 52428800  }, // avatars, logos, templates, shared files
  { name: "ticket-uploads",          public: false, maxSize: 10485760  }, // ticket images, POD, delivery receipts
  { name: "ronyx-driver-documents",  public: false, maxSize: 20971520  }, // CDL, MVR, med cards, drug tests
  { name: "oo-logos",                public: true,  maxSize: 5242880   }, // OO company logos (public OK — not sensitive)
  { name: "ronyx-files",             public: false, maxSize: 52428800  }, // fast scan uploads, detention photos
  { name: "driver-photos",           public: false, maxSize: 5242880   }, // driver profile photos
  { name: "driver-logos",            public: false, maxSize: 5242880   }, // driver logos
  { name: "documents",               public: false, maxSize: 52428800  }, // watermarked PDFs, provenance docs
  { name: "driver-applications",     public: false, maxSize: 52428800  }, // driver application resumes
  { name: "maintenance-docs",        public: false, maxSize: 52428800  }, // maintenance work order attachments
  { name: "ronyx-branding",          public: false, maxSize: 10485760  }, // company branding assets
];

export async function GET() {
  const sb = createSupabaseServerClient();

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
