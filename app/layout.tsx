import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import type { ReactNode } from "react";
import { ClientLayoutWrapper } from "./components";
import SupabaseProvider from "./lib/supabase-provider";
import { LoadingProvider } from "./components/ui/providers/use-loading";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {

  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="description" content="Enterprise Transportation Management System for Ronyx Logistics LLC" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ronyx TMS" />
      </head>
      <body className="h-screen bg-gray-100 text-gray-800">
        <SupabaseProvider>
          <LoadingProvider>
            <ClientLayoutWrapper>
              {children}
            </ClientLayoutWrapper>
          </LoadingProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
