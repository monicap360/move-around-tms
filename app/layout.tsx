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

// Server component to fetch branding config by domain
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
        <meta name="theme-color" content={branding.primaryColor} />
        <meta
          name="description"
          content={`Enterprise Transportation Management System for ${branding.companyName}`}
        />
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
      <body className="h-screen bg-gray-100 text-gray-800">
        {/* Add to Home Screen button logic should be handled in a client component for proper prompt management */}
        <div id="a2hs-btn-container"></div>
        <header className="w-full flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
          <img
            src={branding.logoUrl}
            alt="Logo"
            className="h-8 w-8 rounded mr-2"
            style={{ background: "white" }}
          />
          <span
            className="font-bold text-lg"
            style={{ color: branding.primaryColor }}
          >
            {branding.companyName}
          </span>
        </header>
        <SupabaseProvider>
          <LoadingProvider>
            <I18nProvider>
              <ClientLayoutWrapper>{props.children}</ClientLayoutWrapper>
            </I18nProvider>
          </LoadingProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
