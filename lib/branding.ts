import { createClient } from "@supabase/supabase-js";
import type { BrandingConfig } from "../branding.config";

export async function getBrandingConfig(
  domain: string,
): Promise<BrandingConfig> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  // Try to fetch branding config for the domain
  const { data, error } = await supabase
    .from("branding")
    .select(
      "companyName,logoUrl,faviconUrl,primaryColor,accentColor,backgroundColor",
    )
    .eq("domain", domain)
    .single();
  if (error || !data) {
    // fallback to default
    const { defaultBranding } = await import("../branding.config");
    return defaultBranding;
  }
  return data as BrandingConfig;
}
