// Service Worker for Ronyx Fleet Management Portal
// Version: 1.0.0

const CACHE_NAME = 'ronyx-fleet-v1.0.0';
const STATIC_CACHE_NAME = 'ronyx-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'ronyx-dynamic-v1.0.0';
const API_CACHE_NAME = 'ronyx-api-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './404.html',
  './manifest.json',
  './assets/css/main.css',
  './assets/js/main.js',
  './assets/images/ronyx_logo.svg',
  './assets/fonts/Poppins-Regular.woff2',
  './assets/fonts/Poppins-Medium.woff2',
  './assets/fonts/Poppins-SemiBold.woff2',
  './assets/fonts/Poppins-Bold.woff2'
];

// Dynamic content patterns to cache
const DYNAMIC_PATTERNS = [
  /^https:\/\/fonts\.googleapis\.com\/.*/,
  /^https:\/\/fonts\.gstatic\.com\/.*/,
  /^https:\/\/api\.supabase\.co\/.*/,
  /^https:\/\/wqeidcatuwqtzwhvmqfr\.supabase\.co\/.*/
];

// API endpoints to cache with different strategies
const API_PATTERNS = [
  { pattern: /\/auth\//, strategy: 'networkFirst' },
  { pattern: /\/dashboard\//, strategy: 'cacheFirst' },
  { pattern: /\/fleet\//, strategy: 'networkFirst' }
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker...', CACHE_NAME);
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting to activate immediately');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Pre-caching failed:', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker...', CACHE_NAME);
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old caches that don't match current version
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName.startsWith('ronyx-')
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
      .catch(error => {
        console.error('[SW] Activation failed:', error);
      })
  );
});

// Fetch Strategy
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticAsset(request.url)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isAPIRequest(request.url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isDynamicContent(request.url)) {
    event.respondWith(handleDynamicContent(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Check if request is for static asset
function isStaticAsset(url) {
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.includes('.css') ||
         url.includes('.js') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.svg') ||
         url.includes('.woff') ||
         url.includes('.woff2');
}

// Check if request is for API
function isAPIRequest(url) {
  return API_PATTERNS.some(pattern => pattern.pattern.test(url));
}

// Check if request is for dynamic content
function isDynamicContent(url) {
  return DYNAMIC_PATTERNS.some(pattern => pattern.test(url));
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  try {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle API requests with network-first strategy
async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    
    try {
      const networkResponse = await fetch(request, { 
        headers: {
          ...request.headers,
          'Cache-Control': 'no-cache'
        }
      });
      
      if (networkResponse.ok && request.method === 'GET') {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
      
    } catch (networkError) {
      console.warn('[SW] Network failed, trying cache:', networkError);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      throw networkError;
    }
    
  } catch (error) {
    console.error('[SW] API request failed:', error);
    return new Response(JSON.stringify({
      error: 'Service unavailable',
      message: 'Please check your connection and try again',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle dynamic content with stale-while-revalidate strategy
async function handleDynamicContent(request) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    // Return cached version immediately if available
    if (cachedResponse) {
      // Fetch fresh version in background
      fetch(request)
        .then(response => {
          if (response.ok) {
            cache.put(request, response);
          }
        })
        .catch(error => console.warn('[SW] Background fetch failed:', error));
      
      return cachedResponse;
    }
    
    // No cache available, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
    
  } catch (error) {
    console.error('[SW] Dynamic content fetch failed:', error);
    return new Response('Content not available offline', { status: 503 });
  }
}

// Handle generic requests
async function handleGenericRequest(request) {
  try {
    // Try network first for HTML pages
    if (request.headers.get('Accept')?.includes('text/html')) {
      try {
        const networkResponse = await fetch(request);
        return networkResponse;
      } catch (error) {
        // Return offline page for navigation requests
        const cache = await caches.open(STATIC_CACHE_NAME);
        const offlinePage = await cache.match('./404.html');
        return offlinePage || new Response('Page not available offline', { 
          status: 503,
          headers: { 'Content-Type': 'text/html' }
        });
      }
    }
    
    // For other requests, try cache first
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return fetch(request);
    
  } catch (error) {
    console.error('[SW] Generic request failed:', error);
    return new Response('Resource not available', { status: 503 });
  }
}

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

// Sync offline actions when connection is restored
async function syncOfflineActions() {
  try {
    // Get offline actions from IndexedDB or localStorage
    const offlineActions = JSON.parse(localStorage.getItem('ronyx-offline-actions') || '[]');
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        });
        
        // Remove successful action
        const index = offlineActions.indexOf(action);
        offlineActions.splice(index, 1);
        
      } catch (error) {
        console.error('[SW] Sync action failed:', error);
      }
    }
    
    // Update stored actions
    localStorage.setItem('ronyx-offline-actions', JSON.stringify(offlineActions));
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  const options = {
    body: event.data?.text() || 'New notification from Ronyx Fleet',
    icon: './assets/images/icon-192x192.png',
    badge: './assets/images/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open Dashboard',
        icon: './assets/images/action-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: './assets/images/action-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Ronyx Fleet Management', options)
  );
});

// Notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./index.html')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
        
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_NAME });
        break;
        
      case 'CLEAR_CACHE':
        clearAllCaches()
          .then(() => event.ports[0].postMessage({ success: true }))
          .catch(error => event.ports[0].postMessage({ error: error.message }));
        break;
    }
  }
});

// Clear all caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  const roxyxCaches = cacheNames.filter(name => name.startsWith('ronyx-'));
  
  return Promise.all(
    roxyxCaches.map(cacheName => caches.delete(cacheName))
  );
}

// Error handling
self.addEventListener('error', event => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] Unhandled Promise Rejection:', event.reason);
});

console.log('[SW] Service Worker loaded successfully');