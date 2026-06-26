import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import type { ReactNode } from "react";
import { ClientLayoutWrapper } from "./components";
import SupabaseProvider from "./lib/supabase-provider";
import { LoadingProvider } from "./components/ui/providers/use-loading";
import { I18nProvider } from "./lib/i18n/context";

import { defaultBranding } from "../branding.config";
import { getBrandingConfig } from "../lib/branding";
import { headers } from "next/headers";

// Force the entire app to render dynamically (on-demand), never statically at build.
// This app is 100% data-driven and the build does branding/Supabase fetches in this
// layout + many pages. Render's build sandbox can't complete those build-time fetches
// (they hang -> silent build failure), while every other environment can. Rendering
// on-demand removes all build-time fetching, so the build no longer depends on the
// build environment's network. (Verified: same code builds fine on GitHub CI.)
export const dynamic = "force-dynamic";

// Server component to fetch branding config by domain
export default async function RootLayout(props: { children: ReactNode }) {
  let branding = defaultBranding;
  // On server, get domain from next/headers
  let domain = "";
  try {
    const h = await headers();
    domain = h.get("host") || "";
    branding = await getBrandingConfig(domain);
  } catch {}
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content={branding.primaryColor} />
        <meta
          name="description"
          content={`Enterprise Transportation Management System for ${branding.companyName}`}
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href={branding.faviconUrl} />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="apple-mobile-web-app-title"
          content={branding.companyName}
        />
        <style>{`:root { --color-primary: ${branding.primaryColor}; --color-accent: ${branding.accentColor}; --color-background: ${branding.backgroundColor}; }`}</style>
      </head>
      <body>
        <SupabaseProvider>
          <LoadingProvider>
            <I18nProvider>
              {props.children}
            </I18nProvider>
          </LoadingProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
