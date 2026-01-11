"use client";

import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Wifi, WifiOff, Download, Share, Smartphone } from "lucide-react";

export default function PWAStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("✅ Service Worker registered");
        })
        .catch((error) => {
          console.error("❌ Service Worker registration failed:", error);
        });
    }

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      console.log("🟢 Back online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log("🔴 Gone offline - PWA mode active");
    };

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Handle PWA installation
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      console.log("📱 PWA installed successfully");
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
        setShowInstallBanner(false);
      }
    }
  };

  if (!isOnline && !showInstallBanner) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Badge
          variant="secondary"
          className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-800 border-orange-300"
        >
          <WifiOff className="w-4 h-4" />
          Offline Mode
        </Badge>
      </div>
    );
  }

  return (
    <>
      {/* Online/Offline Status */}
      <div className="fixed top-4 right-4 z-50">
        <Badge
          variant={isOnline ? "default" : "secondary"}
          className={`flex items-center gap-2 px-3 py-2 ${
            isOnline
              ? "bg-green-100 text-green-800 border-green-300"
              : "bg-orange-100 text-orange-800 border-orange-300"
          }`}
        >
          {isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </div>

      {/* PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>

              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Install Ronyx TMS App
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Get faster access and work offline. Install our app for the
                  best mobile experience.
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={installPWA}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install App
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInstallBanner(false)}
                  >
                    Not Now
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInstallBanner(false)}
                className="p-1"
              >
                ×
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
