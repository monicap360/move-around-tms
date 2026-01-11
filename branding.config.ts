// Central branding config for white-labeling
export interface BrandingConfig {
  companyName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
}

export const defaultBranding: BrandingConfig = {
  companyName: "Ronyx Logistics TMS",
  logoUrl: "/logo.png",
  faviconUrl: "/favicon.ico",
  primaryColor: "#3b82f6",
  accentColor: "#2563eb",
  backgroundColor: "#f8fafc",
};

// In future: fetch per-tenant branding from Supabase or domain
