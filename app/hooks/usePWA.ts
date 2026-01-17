"use client";

import { useEffect, useState } from "react";

export function usePWA() {
  const [isOnline, setIsOnline] = useState(true);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Register service worker (Ronyx subdomain only)
    if (
      "serviceWorker" in navigator &&
      window.location.host.startsWith("ronyx.")
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);

          // Handle service worker updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // New content is available, prompt user to refresh
                  if (
                    confirm("New version available! Would you like to update?")
                  ) {
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener("message", (event) => {
        if (event.data && event.data.type) {
          switch (event.data.type) {
            case "NOTIFICATIONS_UPDATED":
              // Handle notification updates
              window.dispatchEvent(
                new CustomEvent("notificationsUpdated", {
                  detail: event.data.data,
                }),
              );
              break;
          }
        }
      });
    }

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Handle PWA installation
    window.addEventListener("appinstalled", () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log("PWA was installed");
    });

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        console.log("Notification permission:", permission);
      });
    }

    // Cleanup
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
      console.log("PWA install outcome:", outcome);

      if (outcome === "accepted") {
        setIsInstallable(false);
        setDeferredPrompt(null);
      }
    }
  };

  const shareContent = async (data: {
    title: string;
    text: string;
    url: string;
  }) => {
    if (navigator.share) {
      try {
        await navigator.share(data);
        return true;
      } catch (error) {
        console.log("Share failed:", error);
        return false;
      }
    }
    return false;
  };

  const requestBackgroundSync = async (tag: string) => {
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      const registration = await navigator.serviceWorker.ready;
      return (registration as any).sync.register(tag);
    }
  };

  const cacheTicketOffline = (ticket: any) => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.controller?.postMessage({
        type: "CACHE_TICKET_OFFLINE",
        ticket,
      });
    }
  };

  return {
    isOnline,
    isInstallable,
    installPWA,
    shareContent,
    requestBackgroundSync,
    cacheTicketOffline,
  };
}
