// Ronyx Logistics TMS - Service Worker
// Provides offline capabilities and caching for mobile users

const CACHE_NAME = "ronyx-tms-v1.0.2";
const API_CACHE_NAME = "ronyx-tms-api-v1.0.2";

// Static assets to cache
const STATIC_ASSETS = [
  "/ronyx",
  "/manifest.json",
  "/ronyx/dispatch",
  "/ronyx/tickets",
  "/ronyx/loads",
  "/ronyx/drivers",
  "/ronyx/trucks",
  "/ronyx/backhaul",
  "/ronyx/maintenance",
  "/ronyx/billing",
  "/ronyx/reports",
  "/ronyx/settings",
  "/ronyx/compliance",
  "/offline.html",
];

// API endpoints to cache for offline access
const CACHEABLE_API_ROUTES = [
  "/api/health",
  "/api/hr/expiring",
  "/api/admin/notifications",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Installation complete");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Installation failed:", error);
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("[SW] Activation complete");
        return self.clients.claim();
      }),
  );
});

// Fetch event - handle network requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests (assets, etc.)
  event.respondWith(handleAssetRequest(request));
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some((route) =>
    url.pathname.startsWith(route),
  );

  if (!isCacheable) {
    // For non-cacheable APIs, just try network
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Network unavailable",
          offline: true,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  try {
    // Network first for API requests
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fallback to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Add offline indicator to cached API responses
      const data = await cachedResponse.json();
      return new Response(JSON.stringify({ ...data, offline: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "No cached data available",
        offline: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Handle navigation requests with cache-first strategy
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to offline page
    return (
      caches.match("/offline.html") ||
      new Response("Offline - Please check your connection", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}

// Handle asset requests with cache-first strategy
async function handleAssetRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful asset requests
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Asset request failed:", request.url);
    return new Response("Asset not available offline", { status: 404 });
  }
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "upload-tickets") {
    event.waitUntil(syncOfflineTickets());
  }

  if (event.tag === "sync-notifications") {
    event.waitUntil(syncNotifications());
  }
});

// Sync offline ticket uploads
async function syncOfflineTickets() {
  try {
    const offlineUploads = await getOfflineUploads();

    for (const upload of offlineUploads) {
      try {
        const response = await fetch("/api/aggregates/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${upload.token}`,
          },
          body: JSON.stringify(upload.data),
        });

        if (response.ok) {
          await removeOfflineUpload(upload.id);
          console.log("[SW] Synced offline upload:", upload.id);
        }
      } catch (error) {
        console.log("[SW] Failed to sync upload:", upload.id, error);
      }
    }
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// Sync notifications
async function syncNotifications() {
  try {
    const response = await fetch("/api/admin/notifications?limit=10", {
      headers: {
        Authorization: `Bearer ${await getStoredToken()}`,
      },
    });

    if (response.ok) {
      const data = await response.json();

      // Store notifications for offline access
      const cache = await caches.open(API_CACHE_NAME);
      cache.put("/api/admin/notifications", response.clone());

      // Send to all clients
      const clients = await self.clients.matchAll();
      clients.forEach((client) => {
        client.postMessage({
          type: "NOTIFICATIONS_UPDATED",
          data: data.items,
        });
      });
    }
  } catch (error) {
    console.log("[SW] Notification sync failed:", error);
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-72x72.png",
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [
      { action: "view", title: "View Details" },
      { action: "dismiss", title: "Dismiss" },
    ],
    tag: data.tag || "notification",
    requireInteraction: data.urgent || false,
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Ronyx Logistics",
      options,
    ),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "view") {
    const url = event.notification.data.url || "/";
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        // Check if there's already a window open
        for (const client of clients) {
          if (client.url === url && "focus" in client) {
            return client.focus();
          }
        }

        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      }),
    );
  }
});

// Helper functions for offline storage
async function getOfflineUploads() {
  // In a real implementation, this would use IndexedDB
  return JSON.parse(localStorage.getItem("offline_uploads") || "[]");
}

async function removeOfflineUpload(id) {
  const uploads = await getOfflineUploads();
  const filtered = uploads.filter((upload) => upload.id !== id);
  localStorage.setItem("offline_uploads", JSON.stringify(filtered));
}

async function getStoredToken() {
  // In a real implementation, this would securely retrieve the auth token
  return (
    localStorage.getItem("auth_token") || process.env.NEXT_PUBLIC_ADMIN_TOKEN
  );
}

// Message handling for client communication
self.addEventListener("message", (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        self.skipWaiting();
        break;

      case "CACHE_TICKET_OFFLINE":
        cacheTicketOffline(event.data.ticket);
        break;

      case "REQUEST_SYNC":
        if (
          "serviceWorker" in navigator &&
          "sync" in window.ServiceWorkerRegistration.prototype
        ) {
          self.registration.sync.register(event.data.tag);
        }
        break;
    }
  }
});

async function cacheTicketOffline(ticket) {
  try {
    const offlineUploads = await getOfflineUploads();
    const newUpload = {
      id: Date.now().toString(),
      data: ticket,
      timestamp: new Date().toISOString(),
      token: await getStoredToken(),
    };

    offlineUploads.push(newUpload);
    localStorage.setItem("offline_uploads", JSON.stringify(offlineUploads));

    // Request background sync when online
    if (
      "serviceWorker" in navigator &&
      "sync" in window.ServiceWorkerRegistration.prototype
    ) {
      await self.registration.sync.register("upload-tickets");
    }
  } catch (error) {
    console.error("[SW] Failed to cache ticket offline:", error);
  }
}
