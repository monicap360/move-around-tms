import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import type { ReactNode } from "react";
import { ClientLayoutWrapper } from "./components";
import SupabaseProvider from "./lib/supabase-provider";
import { LoadingProvider } from "./components/ui/providers/use-loading";

import { defaultBranding } from "../branding.config";
import { getBrandingConfig } from "../lib/branding";
import { headers } from "next/headers";

// Server component to fetch branding config by domain
// Move Around TMS - Ronyx Logistics LLC - Mission Critical Operations
export default async function RootLayout(props: { children: ReactNode }) {
  let branding = defaultBranding;
  // On server, get domain from next/headers
  let domain = "";
  try {
    const h = headers();
    domain = h.get("host") || "";
    branding = await getBrandingConfig(domain);
  } catch {}
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0E0F12" />
        <meta
          name="description"
          content="Move Around TMS - Enterprise Transportation Management System - Ronyx Logistics LLC"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href={branding.faviconUrl} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta
          name="apple-mobile-web-app-title"
          content="Move Around TMS"
        />
      </head>
      <body className="h-screen bg-space-deep text-text-primary">
        <SupabaseProvider>
          <LoadingProvider>
            <ClientLayoutWrapper>{props.children}</ClientLayoutWrapper>
          </LoadingProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
