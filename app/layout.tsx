"use client";
import "./globals.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { ClientLayoutWrapper } from "./components";
import SupabaseProvider from "./lib/supabase-provider";
import { LoadingProvider } from "./components/ui/providers/use-loading";

  children,
}: {
  children: ReactNode;
}) {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js");
    }
    // Add to Home Screen prompt
    let deferredPrompt = null;
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('a2hs-btn');
      if (btn) btn.style.display = 'block';
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
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
        <button
          id="a2hs-btn"
          style={{display:'none',position:'fixed',bottom:24,right:24,zIndex:1000}}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow-lg"
          onClick={async () => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
              const { outcome } = await window.deferredPrompt.userChoice;
              if (outcome === 'accepted') {
                document.getElementById('a2hs-btn').style.display = 'none';
              }
            }
          }}
        >
          Add to Home Screen
        </button>
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
